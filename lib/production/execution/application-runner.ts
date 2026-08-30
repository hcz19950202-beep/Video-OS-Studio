import {z} from "zod";
import type {AgentProposal} from "@/lib/ai/schema";
import type {AgentSessionRepository} from "@/lib/ai/session/repository";
import type {AgentSession} from "@/lib/ai/session/schema";
import type {DurableJobRuntime} from "@/lib/jobs/runtime";
import type {JobRecord,JobType} from "@/lib/jobs/schema";
import type {ProductionMutationTarget} from "@/lib/production/autonomy/schema";
import type {
  ProductionStepRunner,
  ProductionStepRunnerInput,
} from "@/lib/production/execution/executor";
import type {ProductionExecutionEvidenceRef,StepExecutionResult} from "@/lib/production/execution/schema";
import {visualClipIdForSuggestion} from "@/lib/visual-planner/diff";
import type {VisualPlanService} from "@/lib/visual-planner/service";
import {VisualPlanSchema,type VisualPlan} from "@/lib/visual-planner/schema";
import type {WorkflowService} from "@/lib/workflows/service";

const VisualPlanPayloadSchema=z.object({
  plan:VisualPlanSchema,
  selectedIds:z.array(z.string().min(1)).min(1),
}).passthrough();

const blocked=(code:string,message:string):StepExecutionResult=>({status:"blocked",code,message});
const retryable=(code:string,message:string):StepExecutionResult=>({status:"retryable-failure",code,message});
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const unique=<T>(values:T[])=>[...new Set(values)];

const completedDependencyEvidence=(input:ProductionStepRunnerInput):ProductionExecutionEvidenceRef[]=>{
  const dependencyIds=new Set(input.step.dependsOn);
  return input.execution.steps
    .filter(step=>dependencyIds.has(step.stepId)&&step.status==="completed")
    .flatMap(step=>step.evidence);
};

export interface ProductionAgentStepPort{
  execute(input:ProductionStepRunnerInput):Promise<StepExecutionResult>;
}

export interface ProductionQAStepPort{
  execute(input:ProductionStepRunnerInput):Promise<StepExecutionResult>;
}

export interface ProductionRepairStepPort{
  execute(input:ProductionStepRunnerInput):Promise<StepExecutionResult>;
}

export interface ProductionAssetBaseUrlResolver{
  resolve(projectId:string):Promise<string>;
}

export interface ProductionApplicationRunnerOptions{
  pollIntervalMs?:number;
  waitTimeoutMs?:number;
  qa?:ProductionQAStepPort;
  repair?:ProductionRepairStepPort;
}

type ResolvedVisualPlanProposal={
  session:AgentSession;
  proposal:AgentProposal;
  plan:VisualPlan;
  selectedIds:string[];
};

export class ProductionVisualPlanProposalResolver{
  constructor(private readonly sessions:AgentSessionRepository){}

  async resolve(input:ProductionStepRunnerInput):Promise<ResolvedVisualPlanProposal>{
    const dependencyEvidence=completedDependencyEvidence(input);
    const evidenceIds=unique([
      ...input.step.evidence.filter(item=>item.kind==="visual-plan").map(item=>item.id),
      ...dependencyEvidence.filter(item=>item.kind==="proposal"||item.kind==="visual-plan").map(item=>item.id),
    ]);
    if(evidenceIds.length!==1)throw new Error("Autonomous visual edit requires exactly one persisted visual proposal reference from explicit or completed dependency evidence.");
    const proposalId=evidenceIds[0]!;
    const matches:ResolvedVisualPlanProposal[]=[];
    for(const session of await this.sessions.list(input.mission.projectId)){
      for(const proposal of session.proposals){
        if(proposal.id!==proposalId)continue;
        const operations=proposal.operations.filter(operation=>operation.kind==="visual-plan");
        if(operations.length!==1)throw new Error("Visual proposal must contain exactly one visual-plan operation.");
        const payload=VisualPlanPayloadSchema.parse(operations[0]!.payload);
        matches.push({session,proposal,plan:payload.plan,selectedIds:unique(payload.selectedIds)});
      }
    }
    if(matches.length!==1)throw new Error("Visual-plan evidence must resolve to exactly one persisted Agent proposal.");
    const resolved=matches[0]!;
    if(resolved.session.projectId!==input.mission.projectId||resolved.proposal.projectId!==input.mission.projectId||resolved.plan.projectId!==input.mission.projectId)throw new Error("Visual-plan evidence belongs to a different Project.");
    if(resolved.proposal.baseProjectRevision!==input.expectedProjectRevision)throw new Error("Visual-plan evidence is stale for the current Production execution revision.");
    const suggestionIds=new Set(resolved.plan.suggestions.map(suggestion=>suggestion.id));
    if(resolved.selectedIds.some(id=>!suggestionIds.has(id)))throw new Error("Visual-plan evidence selected an unknown suggestion.");
    return resolved;
  }
}

export class ProductionVisualPlanTargetResolver{
  constructor(private readonly proposals:ProductionVisualPlanProposalResolver){}

  async resolve(input:ProductionStepRunnerInput):Promise<ProductionMutationTarget[]>{
    const resolved=await this.proposals.resolve(input);
    const selected=new Set(resolved.selectedIds);
    const targets:ProductionMutationTarget[]=[];
    for(const suggestion of resolved.plan.suggestions){
      if(!selected.has(suggestion.id))continue;
      const clipId=visualClipIdForSuggestion(suggestion.id);
      if(suggestion.recommendation.engine==="remotion"){
        targets.push({kind:"track",id:"motion-main",action:"append"},{kind:"clip",id:clipId,action:"create"});
        continue;
      }
      if(suggestion.recommendation.engine==="broll"){
        targets.push({kind:"track",id:"broll-main",action:"append"},{kind:"clip",id:clipId,action:"create"});
        continue;
      }
      if(suggestion.recommendation.engine==="none")continue;
      throw new Error("Autonomous visual-plan target resolution does not pre-authorize render-backed asset creation.");
    }
    return targets;
  }
}

const workflowReference=(input:ProductionStepRunnerInput)=>{
  const refs=unique(input.step.evidence.filter(item=>item.kind==="workflow").map(item=>item.id));
  if(refs.length!==1)return null;
  const separator=refs[0]!.lastIndexOf("@");
  if(separator<=0||separator===refs[0]!.length-1)return null;
  return{definitionId:refs[0]!.slice(0,separator),definitionVersion:refs[0]!.slice(separator+1)};
};

const jobFailureResult=(job:JobRecord):StepExecutionResult=>{
  const retry=job.error?.retryable!==false&&job.status!=="cancelled";
  return retry
    ?retryable("PRODUCTION_JOB_INCOMPLETE","The bounded production Job did not complete successfully and may be retried from durable state.")
    :blocked("PRODUCTION_JOB_FAILED","The bounded production Job failed with a non-retryable durable state.");
};

export class ApplicationProductionStepRunner implements ProductionStepRunner{
  private readonly pollIntervalMs:number;
  private readonly waitTimeoutMs:number;
  private readonly qa?:ProductionQAStepPort;
  private readonly repair?:ProductionRepairStepPort;

  constructor(
    private readonly agent:ProductionAgentStepPort,
    private readonly proposals:ProductionVisualPlanProposalResolver,
    private readonly visualPlans:Pick<VisualPlanService,"apply">,
    private readonly workflows:WorkflowService,
    private readonly jobs:DurableJobRuntime,
    private readonly assetBaseUrls:ProductionAssetBaseUrlResolver,
    options:ProductionApplicationRunnerOptions={},
  ){
    this.pollIntervalMs=Math.max(1,options.pollIntervalMs??250);
    this.waitTimeoutMs=Math.max(1_000,options.waitTimeoutMs??15*60_000);
    this.qa=options.qa;
    this.repair=options.repair;
  }

  private async waitForJob(jobId:string):Promise<JobRecord|null>{
    const deadline=Date.now()+this.waitTimeoutMs;
    for(;;){
      const job=await this.jobs.get(jobId);
      if(!job||["completed","failed","cancelled","interrupted"].includes(job.status))return job;
      if(Date.now()>=deadline)return job;
      await sleep(this.pollIntervalMs);
    }
  }

  private async executeVisualEdit(input:ProductionStepRunnerInput):Promise<StepExecutionResult>{
    let resolved:ResolvedVisualPlanProposal;
    try{resolved=await this.proposals.resolve(input);}
    catch{return blocked("VISUAL_PLAN_EVIDENCE_INVALID","Autonomous Project edit requires one current persisted Agent visual-plan proposal.");}
    try{
      const result=await this.visualPlans.apply(input.mission.projectId,resolved.plan,resolved.selectedIds,{expectedRevision:input.expectedProjectRevision,operationId:input.operationId});
      return{
        status:"completed",
        evidence:[
          {kind:"agent-session",id:resolved.session.id},
          {kind:"proposal",id:resolved.proposal.id},
          {kind:"visual-plan",id:resolved.proposal.id},
          {kind:"apply-operation",id:input.operationId},
        ],
        projectRevisionAfter:result.project.project.revision,
      };
    }catch{
      return blocked("VISUAL_PLAN_APPLY_FAILED","The bounded visual-plan mutation could not be applied at the expected Project revision.");
    }
  }

  private async executeWorkflow(input:ProductionStepRunnerInput):Promise<StepExecutionResult>{
    const reference=workflowReference(input);
    if(!reference)return blocked("WORKFLOW_EVIDENCE_INVALID","Workflow step requires one definition evidence reference formatted as definition-id@version.");
    const sourceAssetIds=unique(input.step.evidence.filter(item=>item.kind==="asset").map(item=>item.id));
    try{
      let run=await this.workflows.create({
        workflowId:input.operationId,
        projectId:input.mission.projectId,
        definitionId:reference.definitionId,
        definitionVersion:reference.definitionVersion,
        sourceAssetIds,
        expectedProjectRevision:input.expectedProjectRevision,
        assetBaseUrl:await this.assetBaseUrls.resolve(input.mission.projectId),
      });
      if(run.status==="pending")await this.workflows.start(run.id);
      await this.workflows.runner.waitForIdle(run.id);
      const settled=await this.workflows.get(run.id);
      if(!settled)return blocked("WORKFLOW_EVIDENCE_MISSING","Durable Workflow disappeared before completion evidence could be recorded.");
      run=settled;
      if(run.status==="waiting_review")return blocked("WORKFLOW_REVIEW_REQUIRED","Workflow reached its own durable human-review checkpoint and cannot be auto-approved by the Mission runner.");
      if(run.status!=="completed"){
        return run.error?.retryable===false||run.status==="cancelled"
          ?blocked("WORKFLOW_EXECUTION_FAILED","The durable Workflow failed with a non-retryable state.")
          :retryable("WORKFLOW_EXECUTION_INCOMPLETE","The durable Workflow did not complete and may be retried from persisted state.");
      }
      const project=await this.workflows.projects.load(input.mission.projectId);
      const jobIds=unique(run.stageExecutions.flatMap(stage=>stage.jobIds)).slice(0,24);
      return{
        status:"completed",
        evidence:[{kind:"workflow",id:run.id},...jobIds.map(id=>({kind:"job" as const,id}))],
        projectRevisionAfter:project.project.revision,
      };
    }catch{
      return blocked("WORKFLOW_EXECUTION_FAILED","The bounded Workflow could not be created or resumed from durable evidence.");
    }
  }

  private async executeRender(input:ProductionStepRunnerInput,type:Extract<JobType,"render-final"|"render-overlay">):Promise<StepExecutionResult>{
    try{
      const job=await this.jobs.create({
        jobId:input.operationId,
        type,
        projectId:input.mission.projectId,
        input:{assetBaseUrl:await this.assetBaseUrls.resolve(input.mission.projectId)},
      });
      const settled=await this.waitForJob(job.id);
      if(!settled)return blocked("PRODUCTION_JOB_MISSING","Durable render Job disappeared before completion evidence could be recorded.");
      if(settled.status!=="completed")return jobFailureResult(settled);
      const sourceRevision=settled.output?.sourceProjectRevision;
      if(typeof sourceRevision!=="number"||sourceRevision!==input.expectedProjectRevision)return blocked("RENDER_SOURCE_REVISION_MISMATCH","Render Job did not prove it encoded the expected Project revision.");
      return{
        status:"completed",
        evidence:[{kind:"job",id:settled.id},{kind:"render",id:settled.id}],
        projectRevisionAfter:input.expectedProjectRevision,
      };
    }catch{
      return blocked("PRODUCTION_RENDER_FAILED","The bounded render Job could not be created or resumed from durable evidence.");
    }
  }

  async execute(input:ProductionStepRunnerInput):Promise<StepExecutionResult>{
    switch(input.step.kind){
      case"analyze-script":
      case"plan-visuals":
      case"prepare-assets":
        return this.agent.execute(input);
      case"edit-project":
        return this.executeVisualEdit(input);
      case"run-workflow":
        return this.executeWorkflow(input);
      case"render-preview":
        return this.executeRender(input,"render-overlay");
      case"render-final":
        return this.executeRender(input,"render-final");
      case"qa":
        return this.qa?.execute(input)??blocked("PRODUCTION_QA_HANDLER_UNAVAILABLE","No bounded Production QA handler is configured for this runner.");
      case"repair":
        return this.repair?.execute(input)??blocked("PRODUCTION_REPAIR_HANDLER_UNAVAILABLE","No bounded Production repair handler is configured for this runner.");
      case"human-review":{
        const checkpoint=input.execution.steps.find(step=>step.stepId===input.step.id)?.checkpoint;
        if(checkpoint?.status!=="approved")return blocked("HUMAN_REVIEW_EVIDENCE_REQUIRED","Human-review step cannot complete without an approved durable checkpoint.");
        return{status:"completed",evidence:[{kind:"review",id:checkpoint.id}]};
      }
    }
  }
}
