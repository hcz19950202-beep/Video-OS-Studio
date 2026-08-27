import {z} from "zod";
import {AgentSelectionSnapshotSchema,AgentSessionIdSchema,type AgentProviderEvent} from "@/lib/ai";
import {createServerAgentSessionService,getAgentProviderRuntimeStatus} from "@/lib/server/agent-runtime";

export const runtime="nodejs";
type Context={params:Promise<{projectId:string;sessionId:string}>};

const RunTurnRequestSchema=z.object({
  userContent:z.string().trim().min(1).max(100_000),
  selection:AgentSelectionSnapshotSchema.partial().optional(),
}).strict();

const encoder=new TextEncoder();
const encodeEvent=(event:string,data:unknown)=>encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

export async function POST(request:Request,{params}:Context){
  let input:z.infer<typeof RunTurnRequestSchema>;
  let projectId:string;
  let sessionId:string;
  try{
    ({projectId,sessionId}=await params);
    sessionId=AgentSessionIdSchema.parse(sessionId);
    input=RunTurnRequestSchema.parse(await request.json());
  }catch{
    return Response.json({code:"INVALID_AGENT_TURN",message:"Agent turn input is invalid.",retryable:false,action:"Enter a non-empty editing goal and retry."},{status:400});
  }

  const provider=getAgentProviderRuntimeStatus();
  if(!provider.configured){
    return Response.json({code:"AGENT_PROVIDER_NOT_CONFIGURED",message:"Volcengine Agent Plan is not configured for the server runtime.",retryable:true,action:"Configure the local Agent Plan runtime and retry."},{status:503});
  }

  const abortController=new AbortController();
  const onRequestAbort=()=>abortController.abort();
  if(request.signal.aborted)abortController.abort();
  else request.signal.addEventListener("abort",onRequestAbort,{once:true});

  let streamClosed=false;
  const stream=new ReadableStream<Uint8Array>({
    start(controller){
      const send=(event:string,data:unknown)=>{
        if(streamClosed)return;
        try{controller.enqueue(encodeEvent(event,data));}catch{streamClosed=true;}
      };
      const finish=()=>{
        request.signal.removeEventListener("abort",onRequestAbort);
        if(streamClosed)return;
        streamClosed=true;
        try{controller.close();}catch{}
      };
      const observe=(event:AgentProviderEvent)=>{
        if(event.type==="text-delta")send("text-delta",{text:event.text});
        else if(event.type==="tool-call")send("tool-call",{callId:event.call.id,toolId:event.call.toolId});
        else if(event.type==="completed")send("provider-completed",{usage:event.usage});
        else if(event.type==="error")send("provider-error",{code:event.error.code,retryable:event.error.retryable});
      };

      send("turn-started",{sessionId,providerId:provider.providerId,model:provider.model});
      const service=createServerAgentSessionService(observe);
      void service.runTurn({projectId,sessionId,userContent:input.userContent,selection:input.selection,signal:abortController.signal}).then(session=>{
        const turn=session.turns.at(-1);
        if(!turn){
          send("turn-error",{code:"missing_turn",retryable:true});
          finish();
          return;
        }
        for(const execution of turn.toolExecutions){
          send("tool-result",{callId:execution.call.id,toolId:execution.call.toolId,status:execution.result.status});
        }
        for(const proposalId of turn.proposalIds){
          const proposal=session.proposals.find(item=>item.id===proposalId);
          if(proposal)send("proposal-ready",{id:proposal.id,title:proposal.title,summary:proposal.summary,status:proposal.status,baseProjectRevision:proposal.baseProjectRevision,operationCount:proposal.operations.length});
        }
        send("turn-finished",{sessionId:session.id,turnId:turn.id,status:turn.status,error:turn.error?{category:turn.error.category,code:turn.error.code,retryable:turn.error.retryable}:undefined});
        finish();
      }).catch(()=>{
        send("turn-error",{code:"agent_turn_failed",retryable:true});
        finish();
      });
    },
    cancel(){
      abortController.abort();
      request.signal.removeEventListener("abort",onRequestAbort);
      streamClosed=true;
    },
  });

  return new Response(stream,{headers:{
    "Content-Type":"text/event-stream; charset=utf-8",
    "Cache-Control":"no-store, no-transform",
    "Connection":"keep-alive",
  }});
}
