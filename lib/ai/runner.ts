import {randomUUID} from "node:crypto";
import {
  AgentMessageSchema,
  AgentProposalSchema,
  AgentProviderEventSchema,
  AgentUsageSchema,
  AIProviderRequestSchema,
  type AgentProviderError,
  type AgentToolCall,
  type AgentToolResult,
  type AgentUsage,
} from "@/lib/ai/schema";
import type {AIProvider} from "@/lib/ai/provider";
import {AIProviderAbortError} from "@/lib/ai/errors";
import type {AgentContextService,AgentSelectionSnapshot} from "@/lib/ai/context";
import type {AgentToolRegistry} from "@/lib/ai/tools/registry";
import type {AgentContextSnapshot} from "@/lib/ai/context";
import {
  AgentBudgetExceededError,
  AgentTurnBudgetTracker,
  type AgentTurnBudgetInput,
} from "@/lib/ai/budget";
import type {AgentSessionRepository} from "@/lib/ai/session/repository";
import {
  AgentSessionSchema,
  AgentTurnSchema,
  type AgentRuntimeError,
  type AgentSession,
  type AgentTurn,
} from "@/lib/ai/session/schema";

export type AgentRunnerInput={
  projectId:string;
  sessionId:string;
  userContent:string;
  selection?:Partial<AgentSelectionSnapshot>;
  budget?:AgentTurnBudgetInput;
  signal?:AbortSignal;
};

export type AgentRunnerDependencies={
  provider:AIProvider;
  context:Pick<AgentContextService,"build">;
  tools:AgentToolRegistry;
  sessions:AgentSessionRepository;
  now?:()=>string;
  nowMs?:()=>number;
  makeId?:()=>string;
};

class AgentProviderEventError extends Error{
  constructor(readonly details:AgentProviderError){super(details.message);this.name="AgentProviderEventError";}
}

const mergeUsage=(left:AgentUsage|undefined,right:AgentUsage|undefined):AgentUsage|undefined=>{
  if(!left&&!right)return undefined;
  const add=(key:keyof AgentUsage)=>{
    const a=left?.[key];const b=right?.[key];
    return a===undefined&&b===undefined?undefined:(a??0)+(b??0);
  };
  const inputTokens=add("inputTokens");
  const outputTokens=add("outputTokens");
  const totalTokens=add("totalTokens");
  return AgentUsageSchema.parse({
    ...(inputTokens!==undefined?{inputTokens}:{}),
    ...(outputTokens!==undefined?{outputTokens}:{}),
    ...(totalTokens!==undefined?{totalTokens}:{}),
  });
};

const updateTurn=(session:AgentSession,turnId:string,update:(turn:AgentTurn)=>AgentTurn):AgentSession=>({
  ...session,
  turns:session.turns.map(turn=>turn.id===turnId?update(turn):turn),
});

const runtimeError=(error:unknown,outerSignal?:AbortSignal,timedOut=false):AgentRuntimeError=>{
  if(error instanceof AgentBudgetExceededError){
    return{category:"budget",code:error.code,message:error.message,retryable:true};
  }
  if(timedOut){
    return{category:"budget",code:"wall_clock",message:"Agent turn exceeded the configured wall-clock budget.",retryable:true};
  }
  if(outerSignal?.aborted||error instanceof AIProviderAbortError){
    return{category:"cancelled",code:"cancelled",message:"Agent turn was cancelled.",retryable:true};
  }
  if(error instanceof AgentProviderEventError){
    return{category:"provider",code:error.details.code,message:error.details.message,retryable:error.details.retryable};
  }
  return{category:"provider",code:"provider",message:"AI provider request failed.",retryable:true};
};

const systemPrompt=(context:AgentContextSnapshot)=>[
  "You are the bounded Video OS Studio editing Agent.",
  "Use only the provided allow-listed tools. Never claim that a proposal has already mutated the Project.",
  "Project-changing ideas must remain reviewable proposals until a later explicit Apply boundary.",
  "Do not expose hidden chain-of-thought. Return concise user-facing rationale and results.",
  "Current bounded Project context follows as JSON:",
  JSON.stringify(context),
].join("\n");

const toolMessageContent=(call:AgentToolCall,result:AgentToolResult)=>{
  const content=JSON.stringify({call,result});
  if(content.length>100_000)throw new AgentBudgetExceededError("context_size","Agent tool result exceeded the message-size budget.");
  return content;
};

export const reconcileStaleProposals=(session:AgentSession,currentRevision:number):AgentSession=>{
  let changed=false;
  const proposals=session.proposals.map(proposal=>{
    if((proposal.status==="draft"||proposal.status==="reviewed")&&proposal.baseProjectRevision!==currentRevision){
      changed=true;
      return AgentProposalSchema.parse({...proposal,status:"stale"});
    }
    return proposal;
  });
  return changed?AgentSessionSchema.parse({...session,proposals}):session;
};

export class AgentRunner{
  private readonly now:()=>string;
  private readonly nowMs:()=>number;
  private readonly makeId:()=>string;

  constructor(private readonly dependencies:AgentRunnerDependencies){
    this.now=dependencies.now??(()=>new Date().toISOString());
    this.nowMs=dependencies.nowMs??(()=>Date.now());
    this.makeId=dependencies.makeId??randomUUID;
  }

  async runTurn(input:AgentRunnerInput):Promise<AgentSession>{
    return this.dependencies.sessions.withSessionLock(input.projectId,input.sessionId,async()=>{
      let session=await this.dependencies.sessions.require(input.projectId,input.sessionId);
      if(session.status!=="active")throw new Error("Closed Agent sessions cannot accept new turns.");
      if(session.providerId!==this.dependencies.provider.id)throw new Error("Agent session provider does not match the active provider.");

      const context=await this.dependencies.context.build(input.projectId,input.selection);
      session=reconcileStaleProposals(session,context.baseProjectRevision);
      const contextPrompt=systemPrompt(context);
      const budget=new AgentTurnBudgetTracker(input.budget,this.nowMs);
      budget.assertContextSize(contextPrompt);

      const turnId=this.makeId();
      const userMessageId=this.makeId();
      const startedAt=this.now();
      const userMessage=AgentMessageSchema.parse({id:userMessageId,role:"user",content:input.userContent,createdAt:startedAt});
      const turn=AgentTurnSchema.parse({
        id:turnId,
        baseProjectRevision:context.baseProjectRevision,
        userMessageId,
        startedAt,
        status:"running",
        providerRoundTrips:0,
        toolExecutions:[],
        proposalIds:[],
      });
      session=AgentSessionSchema.parse({
        ...session,
        messages:[...session.messages,userMessage],
        turns:[...session.turns,turn],
        lastContext:{baseProjectRevision:context.baseProjectRevision,selection:context.selection},
        updatedAt:startedAt,
      });
      await this.dependencies.sessions.save(session);

      let timedOut=false;
      try{
        for(;;){
          budget.beginProviderRoundTrip();
          session=updateTurn(session,turnId,current=>AgentTurnSchema.parse({...current,providerRoundTrips:budget.providerRoundTrips}));
          session=AgentSessionSchema.parse({...session,updatedAt:this.now()});
          await this.dependencies.sessions.save(session);

          const request=AIProviderRequestSchema.parse({
            system:contextPrompt,
            messages:session.messages.slice(-1_000),
            tools:this.dependencies.tools.listDefinitions(),
            ...(session.model?{model:session.model}:{}),
            maxOutputTokens:budget.budget.maxOutputTokens,
          });

          const controller=new AbortController();
          const onAbort=()=>controller.abort();
          if(input.signal?.aborted)controller.abort();
          else input.signal?.addEventListener("abort",onAbort,{once:true});
          const remaining=budget.remainingMs();
          if(remaining<=0)throw new AgentBudgetExceededError("wall_clock","Agent turn exceeded the configured wall-clock budget.");
          const timer=setTimeout(()=>{timedOut=true;controller.abort();},remaining);

          let text="";
          const calls:AgentToolCall[]=[];
          let roundUsage:AgentUsage|undefined;
          let completed=false;
          try{
            for await(const rawEvent of this.dependencies.provider.run(request,controller.signal)){
              budget.assertTime();
              const event=AgentProviderEventSchema.parse(rawEvent);
              if(event.type==="text-delta")text+=event.text;
              else if(event.type==="tool-call")calls.push(event.call);
              else if(event.type==="completed"){
                completed=true;
                roundUsage=mergeUsage(roundUsage,event.usage);
              }else if(event.type==="error")throw new AgentProviderEventError(event.error);
            }
          }finally{
            clearTimeout(timer);
            input.signal?.removeEventListener("abort",onAbort);
          }
          if(!completed)throw new AgentProviderEventError({code:"invalid_output",message:"AI provider stream ended without a completed event.",retryable:true});

          if(text.length>0){
            const assistantMessage=AgentMessageSchema.parse({id:this.makeId(),role:"assistant",content:text,createdAt:this.now()});
            session=AgentSessionSchema.parse({...session,messages:[...session.messages,assistantMessage],updatedAt:this.now()});
          }
          session=updateTurn(session,turnId,current=>AgentTurnSchema.parse({...current,usage:mergeUsage(current.usage,roundUsage)}));
          session=AgentSessionSchema.parse({...session,usage:mergeUsage(session.usage,roundUsage),updatedAt:this.now()});

          if(calls.length===0){
            const lastMessage=session.messages.at(-1);
            const assistantMessageId=lastMessage?.role==="assistant"?lastMessage.id:undefined;
            const completedAt=this.now();
            session=updateTurn(session,turnId,current=>AgentTurnSchema.parse({
              ...current,
              ...(assistantMessageId?{assistantMessageId}:{}),
              status:"completed",
              completedAt,
            }));
            session=AgentSessionSchema.parse({...session,updatedAt:completedAt});
            await this.dependencies.sessions.save(session);
            return session;
          }

          budget.consumeToolCalls(calls.length);
          for(const call of calls){
            const prior=session.turns.flatMap(item=>item.toolExecutions).find(item=>item.call.id===call.id);
            let result:AgentToolResult;
            if(prior){
              if(prior.call.toolId!==call.toolId||JSON.stringify(prior.call.arguments)!==JSON.stringify(call.arguments)){
                throw new AgentProviderEventError({code:"invalid_output",message:"AI provider reused a tool-call ID with different arguments.",retryable:false});
              }
              result=prior.result;
            }else{
              result=await this.dependencies.tools.execute(call,{sessionId:session.id,context,now:this.now,makeId:this.makeId});
              session=updateTurn(session,turnId,current=>AgentTurnSchema.parse({...current,toolExecutions:[...current.toolExecutions,{call,result}]}));
              if(result.status==="success"){
                const proposalResult=AgentProposalSchema.safeParse(result.output?.proposal);
                if(proposalResult.success&&!session.proposals.some(item=>item.id===proposalResult.data.id)){
                  session=AgentSessionSchema.parse({
                    ...session,
                    proposals:[...session.proposals,proposalResult.data],
                  });
                  session=updateTurn(session,turnId,current=>AgentTurnSchema.parse({...current,proposalIds:[...current.proposalIds,proposalResult.data.id]}));
                }
              }
            }
            const toolMessage=AgentMessageSchema.parse({
              id:this.makeId(),
              role:"tool",
              content:toolMessageContent(call,result),
              createdAt:this.now(),
              toolCallId:call.id,
              toolName:call.toolId,
            });
            session=AgentSessionSchema.parse({...session,messages:[...session.messages,toolMessage],updatedAt:this.now()});
            await this.dependencies.sessions.save(session);
          }
        }
      }catch(error){
        const details=runtimeError(error,input.signal,timedOut);
        const completedAt=this.now();
        const status=details.category==="cancelled"?"cancelled":details.category==="budget"?"budget-exhausted":"failed";
        session=updateTurn(session,turnId,current=>AgentTurnSchema.parse({...current,status,completedAt,error:details}));
        session=AgentSessionSchema.parse({...session,updatedAt:completedAt});
        await this.dependencies.sessions.save(session);
        return session;
      }
    });
  }
}
