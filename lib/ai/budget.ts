import {z} from "zod";

export const AgentTurnBudgetSchema=z.object({
  maxProviderRoundTrips:z.number().int().positive().max(64).default(8),
  maxToolCalls:z.number().int().nonnegative().max(256).default(24),
  maxWallClockMs:z.number().int().positive().max(10*60_000).default(60_000),
  maxContextCharacters:z.number().int().positive().max(100_000).default(90_000),
  maxOutputTokens:z.number().int().positive().max(64_000).default(8_192),
}).strict();
export type AgentTurnBudget=z.infer<typeof AgentTurnBudgetSchema>;
export type AgentTurnBudgetInput=Partial<AgentTurnBudget>;

export type AgentBudgetCode="provider_round_trips"|"tool_calls"|"wall_clock"|"context_size";

export class AgentBudgetExceededError extends Error{
  readonly category="budget" as const;
  readonly retryable=true;
  constructor(readonly code:AgentBudgetCode,message:string){
    super(message);
    this.name="AgentBudgetExceededError";
  }
}

export class AgentTurnBudgetTracker{
  readonly budget:AgentTurnBudget;
  readonly startedAtMs:number;
  providerRoundTrips=0;
  toolCalls=0;

  constructor(input:AgentTurnBudgetInput={},private readonly nowMs:()=>number=()=>Date.now()){
    this.budget=AgentTurnBudgetSchema.parse(input);
    this.startedAtMs=this.nowMs();
  }

  assertContextSize(serializedContext:string){
    if(serializedContext.length>this.budget.maxContextCharacters){
      throw new AgentBudgetExceededError("context_size","Agent context exceeded the configured turn budget.");
    }
  }

  assertTime(){
    if(this.elapsedMs()>=this.budget.maxWallClockMs){
      throw new AgentBudgetExceededError("wall_clock","Agent turn exceeded the configured wall-clock budget.");
    }
  }

  beginProviderRoundTrip(){
    this.assertTime();
    if(this.providerRoundTrips>=this.budget.maxProviderRoundTrips){
      throw new AgentBudgetExceededError("provider_round_trips","Agent turn exceeded the configured provider round-trip budget.");
    }
    this.providerRoundTrips+=1;
  }

  consumeToolCalls(count=1){
    this.assertTime();
    if(!Number.isInteger(count)||count<0)throw new Error("Tool-call budget consumption must be a non-negative integer.");
    if(this.toolCalls+count>this.budget.maxToolCalls){
      throw new AgentBudgetExceededError("tool_calls","Agent turn exceeded the configured tool-call budget.");
    }
    this.toolCalls+=count;
  }

  elapsedMs(){return Math.max(0,this.nowMs()-this.startedAtMs);}
  remainingMs(){return Math.max(0,this.budget.maxWallClockMs-this.elapsedMs());}
}
