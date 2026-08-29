import type {Project} from "@/schemas/project";
import type {ProductionExecution} from "@/lib/production/execution/schema";
import {ProductionExecutionRepository} from "@/lib/production/execution/repository";
import {ProductionMissionProjectUnavailableError} from "@/lib/production/mission/errors";
import {ProductionMissionRepository} from "@/lib/production/mission/repository";
import type {ProductionMission} from "@/lib/production/mission/schema";
import {ProductionPlanRepository} from "@/lib/production/plan/repository";
import type {ProductionPlan} from "@/lib/production/plan/schema";
import {QAReportRepository} from "@/lib/production/qa/repository";
import type {QAReport} from "@/lib/production/qa/schema";
import {ProductionWorkspaceTruthInconsistentError} from "@/lib/production/workspace/errors";
import {ProductionWorkspaceSnapshotSchema,type ProductionWorkspaceActivityState,type ProductionWorkspaceEvidenceRef,type ProductionWorkspaceFinalReadiness,type ProductionWorkspaceQAState,type ProductionWorkspaceSnapshot} from "@/lib/production/workspace/schema";
import {ProjectIdSchema} from "@/schemas/project";

export interface ProductionWorkspaceProjectReader{
  load(projectId:string):Promise<Project>;
}

const dedupe=<T>(values:T[],key:(value:T)=>string,max:number)=>{
  const result:T[]=[];const seen=new Set<string>();
  for(const value of values){const id=key(value);if(seen.has(id))continue;seen.add(id);result.push(value);if(result.length>=max)break;}
  return result;
};

const stepById=(plan:ProductionPlan|null,id:string|undefined)=>id===undefined?undefined:plan?.steps.find(step=>step.id===id);
const executionStepById=(execution:ProductionExecution|null,id:string|undefined)=>id===undefined?undefined:execution?.steps.find(step=>step.stepId===id);

const deriveActivityState=(mission:ProductionMission,execution:ProductionExecution|null):ProductionWorkspaceActivityState=>{
  if(mission.status==="cancelled")return"cancelled";
  if(mission.status==="completed")return"completed";
  if(mission.status==="failed")return"failed";
  const active=executionStepById(execution,execution?.activeStepId);
  if(active?.status==="retrying")return"retrying";
  if(active?.status==="waiting-review"||execution?.status==="waiting-review"||mission.status==="waiting-review")return"waiting-review";
  if(active?.status==="blocked"||execution?.status==="blocked"||mission.status==="blocked")return"blocked";
  if(execution?.status==="cancelled")return"cancelled";
  if(execution?.status==="failed")return"failed";
  if(execution?.status==="completed")return"completed";
  if(execution?.status==="running"||mission.status==="running")return"running";
  if(mission.status==="planning")return"planning";
  if(mission.status==="ready")return"ready";
  return"draft";
};

const deriveQAState=(report:QAReport|null):ProductionWorkspaceQAState=>report?.status??"not-run";
const planIsStale=(plan:ProductionPlan|null,execution:ProductionExecution|null,currentRevision:number)=>Boolean(plan&&!execution&&plan.baseProjectRevision!==currentRevision);
const executionIsStale=(plan:ProductionPlan|null,execution:ProductionExecution|null,currentRevision:number)=>Boolean(execution&&(
  execution.expectedProjectRevision!==currentRevision||
  !plan||execution.planId!==plan.id||execution.planBaseProjectRevision!==plan.baseProjectRevision
));

const finalReadiness=(input:{plan:ProductionPlan|null;execution:ProductionExecution|null;latestQA:QAReport|null;currentRevision:number}):ProductionWorkspaceFinalReadiness=>{
  const{plan,execution,latestQA,currentRevision}=input;
  if(planIsStale(plan,execution,currentRevision)||executionIsStale(plan,execution,currentRevision))return"stale";
  if(latestQA&&latestQA.projectRevision!==currentRevision)return"stale";
  const renderStep=plan?.steps.find(step=>step.kind==="render-final");
  if(!renderStep)return"not-planned";
  if(!execution)return"planned";
  const state=execution.steps.find(step=>step.stepId===renderStep.id);
  if(!state)return"planned";
  if(state.status==="waiting-review")return"review-required";
  if(state.status==="blocked"||state.status==="failed")return"blocked";
  if(state.status!=="completed")return"pending";
  const hasRenderEvidence=state.evidence.some(item=>item.kind==="render"||item.kind==="job");
  if(!hasRenderEvidence)return"pending";
  const finalRenderJobId=[...state.evidence].reverse().find(item=>item.kind==="job")?.id;
  if(!latestQA||!finalRenderJobId||latestQA.renderJobId!==finalRenderJobId)return"rendered-awaiting-qa";
  if(latestQA.status==="pass")return"qa-passed";
  if(latestQA.status==="repair-recommended")return"qa-repair-recommended";
  return"qa-failed";
};

const normalizeEvidence=(plan:ProductionPlan|null,execution:ProductionExecution|null):ProductionWorkspaceEvidenceRef[]=>{
  const planEvidence=(plan?.steps.flatMap(step=>step.evidence)??[]).map(item=>({kind:item.kind,id:item.id,source:"plan" as const}));
  const executionEvidence=(execution?.steps.flatMap(step=>step.evidence)??[]).map(item=>({kind:item.kind,id:item.id,source:"execution" as const}));
  return dedupe([...planEvidence,...executionEvidence],item=>`${item.kind}:${item.id}:${item.source}`,512);
};

const linkIds=(mission:ProductionMission,evidence:ProductionWorkspaceEvidenceRef[])=>({
  agentSessionIds:dedupe([...mission.agentSessionIds,...evidence.filter(item=>item.kind==="agent-session").map(item=>item.id)],value=>value,256),
  workflowRunIds:dedupe([...mission.workflowRunIds,...evidence.filter(item=>item.kind==="workflow").map(item=>item.id)],value=>value,256),
  jobIds:dedupe([...mission.jobIds,...evidence.filter(item=>item.kind==="job").map(item=>item.id)],value=>value,256),
});

const qaSummary=(report:QAReport|null)=>{
  const counts={pass:0,fail:0,notEvaluated:0};
  for(const finding of report?.findings??[]){
    if(finding.status==="pass")counts.pass+=1;
    else if(finding.status==="fail")counts.fail+=1;
    else counts.notEvaluated+=1;
  }
  return{state:deriveQAState(report),...(report?{status:report.status}:{}),...counts};
};

const progress=(plan:ProductionPlan|null,execution:ProductionExecution|null)=>{
  const totalSteps=plan?.steps.length??execution?.steps.length??0;
  const completedSteps=execution?.steps.filter(step=>step.status==="completed"||step.status==="skipped").length??0;
  return{totalSteps,completedSteps,percent:totalSteps===0?0:Math.round(completedSteps/totalSteps*1000)/10,...(execution?.activeStepId?{activeStepId:execution.activeStepId}:{})};
};

const activity=(mission:ProductionMission,plan:ProductionPlan|null,execution:ProductionExecution|null)=>{
  const activeExecution=executionStepById(execution,execution?.activeStepId);
  const activePlan=stepById(plan,execution?.activeStepId??mission.activeStepId);
  return{
    state:deriveActivityState(mission,execution),
    ...(activePlan?{stepId:activePlan.id,title:activePlan.title,kind:activePlan.kind,owner:activePlan.owner,risk:activePlan.risk}:activeExecution?{stepId:activeExecution.stepId}:{}),
    ...(activeExecution?{stepStatus:activeExecution.status}:{}),
  };
};

const checkpoints=(plan:ProductionPlan|null,execution:ProductionExecution|null)=>{
  if(!execution)return[];
  return execution.steps.flatMap(step=>{
    if(!step.checkpoint)return[];
    const planned=stepById(plan,step.stepId);
    return[{stepId:step.stepId,title:planned?.title??step.stepId,risk:planned?.risk??"high" as const,checkpoint:step.checkpoint}];
  });
};

export class ProductionWorkspaceService{
  constructor(
    private readonly projects:ProductionWorkspaceProjectReader,
    private readonly missions:ProductionMissionRepository,
    private readonly plans:ProductionPlanRepository,
    private readonly executions:ProductionExecutionRepository,
    private readonly qaReports:QAReportRepository,
  ){}

  private async requireProject(projectIdInput:string){
    const projectId=ProjectIdSchema.parse(projectIdInput);
    try{return await this.projects.load(projectId);}
    catch(error){throw new ProductionMissionProjectUnavailableError(projectId,{cause:error});}
  }

  private async latestLinkedQA(projectId:string,mission:ProductionMission):Promise<QAReport|null>{
    const reportId=mission.qaReportIds.at(-1);
    if(!reportId)return null;
    const report=await this.qaReports.require(projectId,reportId);
    if(report.missionId!==mission.id)throw new ProductionWorkspaceTruthInconsistentError();
    return report;
  }

  async listMissions(projectId:string){
    await this.requireProject(projectId);
    return this.missions.list(projectId);
  }

  async snapshot(projectId:string,missionId:string):Promise<ProductionWorkspaceSnapshot>{
    const project=await this.requireProject(projectId);
    const mission=await this.missions.require(projectId,missionId);
    const plan=mission.planId?await this.plans.require(projectId,mission.planId):null;
    if(plan&&plan.missionId!==mission.id)throw new ProductionWorkspaceTruthInconsistentError();
    const execution=mission.executionId?await this.executions.require(projectId,mission.executionId):null;
    if(execution&&(execution.missionId!==mission.id||!plan||execution.planId!==plan.id))throw new ProductionWorkspaceTruthInconsistentError();
    const latestQA=await this.latestLinkedQA(projectId,mission);
    const evidence=normalizeEvidence(plan,execution);
    const skillsUsed=dedupe(evidence.filter(item=>item.kind==="skill").map(item=>item.id),value=>value,128);
    const currentRevision=project.project.revision;
    return ProductionWorkspaceSnapshotSchema.parse({
      project:{id:project.project.id,name:project.project.name,currentRevision},
      mission,
      plan,
      execution,
      latestQA,
      activity:activity(mission,plan,execution),
      progress:progress(plan,execution),
      qa:qaSummary(latestQA),
      reviewCheckpoints:checkpoints(plan,execution),
      evidence,
      skillsUsed,
      links:linkIds(mission,evidence),
      stale:{
        plan:planIsStale(plan,execution,currentRevision),
        execution:executionIsStale(plan,execution,currentRevision),
        qa:Boolean(latestQA&&latestQA.projectRevision!==currentRevision),
      },
      finalRenderReadiness:finalReadiness({plan,execution,latestQA,currentRevision}),
    });
  }
}
