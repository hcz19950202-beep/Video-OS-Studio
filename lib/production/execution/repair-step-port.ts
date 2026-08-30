import {productionMutationTargetsForCommands} from "@/lib/production/autonomy/commands";
import type {ProductionMutationTarget} from "@/lib/production/autonomy/schema";
import type {ProductionRepairStepPort} from "@/lib/production/execution/application-runner";
import type {ProductionStepRunnerInput} from "@/lib/production/execution/executor";
import type {StepExecutionResult} from "@/lib/production/execution/schema";
import type {ProjectCommand} from "@/lib/project/commands";
import type {ProjectMutationCoordinator} from "@/lib/project/mutation-coordinator";
import {prepareQARepairApplication} from "@/lib/production/qa/repair";
import type {ProductionQAService} from "@/lib/production/qa/service";
import type {QAReport} from "@/lib/production/qa/schema";
import type {Project} from "@/schemas/project";

const unique=<T>(values:T[])=>[...new Set(values)];

type ProductionQAReportReader=Pick<ProductionQAService,"load">;
type ProductionRepairMutationWriter=Pick<ProjectMutationCoordinator,"applyTransaction">;
export interface ProductionRepairProjectReader{load(projectId:string):Promise<Project>;}

type ResolvedQARepair={report:QAReport};
type BoundedTimingRepairMutation={durationInFrames:number;commands:ProjectCommand[];targets:ProductionMutationTarget[]};

export class ProductionQARepairResolver{
  constructor(private readonly qa:ProductionQAReportReader){}

  async resolve(input:ProductionStepRunnerInput):Promise<ResolvedQARepair>{
    const dependencyIds=new Set(input.step.dependsOn);
    const dependencyEvidence=input.execution.steps
      .filter(step=>dependencyIds.has(step.stepId)&&step.status==="completed")
      .flatMap(step=>step.evidence);
    const reportIds=unique([
      ...input.step.evidence.filter(item=>item.kind==="qa-report").map(item=>item.id),
      ...dependencyEvidence.filter(item=>item.kind==="qa-report").map(item=>item.id),
    ]);
    if(reportIds.length!==1)throw new Error("Repair requires exactly one persisted QA report reference.");
    const report=await this.qa.load(input.mission.projectId,reportIds[0]!);
    if(!report)throw new Error("Referenced QA report was not found.");
    if(report.projectId!==input.mission.projectId||report.missionId!==input.mission.id)throw new Error("QA report belongs to a different Production Mission.");
    if(report.projectRevision!==input.expectedProjectRevision)throw new Error("QA repair evidence is stale for the expected Project revision.");
    return{report};
  }
}

const approvedCheckpoint=(input:ProductionStepRunnerInput)=>input.execution.steps.find(step=>step.stepId===input.step.id)?.checkpoint?.status==="approved";

const buildDurationRepairCommands=(project:Project,durationInFrames:number):ProjectCommand[]=>{
  const commands:ProjectCommand[]=[];
  if(durationInFrames<project.canvas.durationInFrames){
    for(const track of project.tracks){
      for(const clip of track.clips){
        if(clip.startFrame>=durationInFrames){
          commands.push({type:"remove-clip",clipId:clip.id});
          continue;
        }
        const endFrame=clip.startFrame+clip.durationInFrames;
        if(endFrame>durationInFrames)commands.push({type:"update-clip-timing",clipId:clip.id,durationInFrames:durationInFrames-clip.startFrame});
      }
    }
    for(const scene of project.scenes){
      if(scene.startFrame>=durationInFrames){
        commands.push({type:"remove-scene",sceneId:scene.id});
        continue;
      }
      if(scene.endFrame>durationInFrames)commands.push({type:"update-scene",sceneId:scene.id,patch:{endFrame:durationInFrames}});
    }
    for(const marker of project.markers)if(marker.frame>=durationInFrames)commands.push({type:"remove-marker",markerId:marker.id});
  }
  commands.push({type:"set-duration",durationInFrames});
  return commands;
};

const boundedTimingRepairMutation=(project:Project,targetDurationSeconds:number):BoundedTimingRepairMutation=>{
  const durationInFrames=Math.max(1,Math.round(targetDurationSeconds*project.canvas.fps));
  const commands=buildDurationRepairCommands(project,durationInFrames);
  return{durationInFrames,commands,targets:productionMutationTargetsForCommands(project,commands)};
};

const assertBoundedTimingProposal=(report:QAReport,expectedRevision:number)=>{
  const proposal=report.repairProposal;
  if(!proposal||proposal.baseProjectRevision!==expectedRevision)throw new Error("QA report does not contain a current structured repair proposal.");
  if(proposal.actions.length===0||!proposal.actions.every(action=>action.kind==="adjust-scene-timing"))throw new Error("QA repair proposal contains actions outside the bounded automatic repair surface.");
  return proposal;
};

export class ProductionQARepairTargetResolver{
  constructor(
    private readonly repairs:ProductionQARepairResolver,
    private readonly projects:ProductionRepairProjectReader,
  ){}

  async resolve(input:ProductionStepRunnerInput):Promise<ProductionMutationTarget[]>{
    const{report}=await this.repairs.resolve(input);
    if(report.status==="pass")return[];
    assertBoundedTimingProposal(report,input.expectedProjectRevision);
    const targetDurationSeconds=input.mission.target.targetDurationSeconds;
    if(targetDurationSeconds===undefined)throw new Error("Automatic timing repair requires an explicit Mission target duration.");
    const project=await this.projects.load(input.mission.projectId);
    if(project.project.revision!==input.expectedProjectRevision)throw new Error("Project revision changed before timing repair target resolution.");
    return boundedTimingRepairMutation(project,targetDurationSeconds).targets;
  }
}

export class ApplicationProductionRepairStepPort implements ProductionRepairStepPort{
  constructor(
    private readonly repairs:ProductionQARepairResolver,
    private readonly projects:ProductionRepairProjectReader,
    private readonly mutations:ProductionRepairMutationWriter,
  ){}

  async execute(input:ProductionStepRunnerInput):Promise<StepExecutionResult>{
    let report:QAReport;
    try{({report}=await this.repairs.resolve(input));}
    catch{
      return{
        status:"blocked",
        code:"PRODUCTION_REPAIR_EVIDENCE_INVALID",
        message:"Production repair requires one current persisted QA report from completed dependency evidence.",
      };
    }

    if(report.status==="pass"){
      return{
        status:"completed",
        evidence:[{kind:"qa-report",id:report.id}],
        projectRevisionAfter:input.expectedProjectRevision,
      };
    }
    if(input.remainingUsageBudget.repairLoops<1){
      return{
        status:"blocked",
        code:"PRODUCTION_REPAIR_BUDGET_EXHAUSTED",
        message:"Production execution has no remaining bounded repair-loop budget.",
      };
    }
    let proposal;
    try{proposal=assertBoundedTimingProposal(report,input.expectedProjectRevision);}
    catch{
      return{
        status:"blocked",
        code:report.repairProposal?"PRODUCTION_REPAIR_ACTION_UNSUPPORTED":"PRODUCTION_REPAIR_PROPOSAL_MISSING",
        message:report.repairProposal?"This QA repair proposal requires an action outside the bounded automatic timing-repair surface.":"QA reported a failure but did not persist a structured repair proposal.",
      };
    }

    let application;
    try{application=prepareQARepairApplication({proposal,currentProjectRevision:input.expectedProjectRevision,approved:approvedCheckpoint(input)});}
    catch{
      return{
        status:"blocked",
        code:proposal.requiresReview?"PRODUCTION_REPAIR_REVIEW_REQUIRED":"PRODUCTION_REPAIR_PROPOSAL_INVALID",
        message:proposal.requiresReview?"The QA repair proposal requires an approved durable checkpoint before mutation.":"The QA repair proposal cannot be applied at the expected Project revision.",
      };
    }
    if(!application.actions.every(action=>action.kind==="adjust-scene-timing")){
      return{
        status:"blocked",
        code:"PRODUCTION_REPAIR_ACTION_UNSUPPORTED",
        message:"This QA repair proposal requires an action outside the bounded automatic timing-repair surface.",
      };
    }

    const targetDurationSeconds=input.mission.target.targetDurationSeconds;
    if(targetDurationSeconds===undefined){
      return{
        status:"blocked",
        code:"PRODUCTION_REPAIR_TARGET_UNAVAILABLE",
        message:"Automatic timing repair requires an explicit Mission target duration.",
      };
    }
    try{
      const project=await this.projects.load(input.mission.projectId);
      if(project.project.revision!==input.expectedProjectRevision)throw new Error("Project revision changed before timing repair application.");
      const mutation=boundedTimingRepairMutation(project,targetDurationSeconds);
      const result=await this.mutations.applyTransaction(input.mission.projectId,{
        expectedRevision:input.expectedProjectRevision,
        transactionId:input.operationId,
        transaction:{
          label:"Production QA · bounded timing repair",
          commands:mutation.commands,
        },
      });
      return{
        status:"completed",
        evidence:[{kind:"qa-report",id:report.id},{kind:"apply-operation",id:input.operationId}],
        projectRevisionAfter:result.project.project.revision,
        usage:{agentTurns:0,providerCalls:0,repairLoops:1},
      };
    }catch{
      return{
        status:"blocked",
        code:"PRODUCTION_REPAIR_APPLY_FAILED",
        message:"The bounded revision-safe QA timing repair could not be applied through the Project mutation coordinator.",
      };
    }
  }
}
