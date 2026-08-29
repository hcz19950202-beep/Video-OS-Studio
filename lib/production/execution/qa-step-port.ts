import type {ProductionQAStepPort} from "@/lib/production/execution/application-runner";
import type {ProductionStepRunnerInput} from "@/lib/production/execution/executor";
import type {StepExecutionResult} from "@/lib/production/execution/schema";
import type {ProductionQAService} from "@/lib/production/qa/service";

const unique=<T>(values:T[])=>[...new Set(values)];

type ProductionQARunner=Pick<ProductionQAService,"run">;

const finalRenderDependencyJobId=(input:ProductionStepRunnerInput)=>{
  const finalRenderStepIds=new Set(input.plan.steps
    .filter(step=>input.step.dependsOn.includes(step.id)&&step.kind==="render-final")
    .map(step=>step.id));
  const renderIds=unique(input.execution.steps
    .filter(step=>finalRenderStepIds.has(step.stepId)&&step.status==="completed")
    .flatMap(step=>step.evidence.filter(item=>item.kind==="render").map(item=>item.id)));
  return renderIds.length===1?renderIds[0]!:null;
};

export class ApplicationProductionQAStepPort implements ProductionQAStepPort{
  constructor(private readonly qa:ProductionQARunner){}

  async execute(input:ProductionStepRunnerInput):Promise<StepExecutionResult>{
    const renderJobId=finalRenderDependencyJobId(input);
    if(!renderJobId){
      return{
        status:"blocked",
        code:"PRODUCTION_QA_RENDER_EVIDENCE_INVALID",
        message:"Production QA requires exactly one completed direct render-final dependency with durable render evidence.",
      };
    }
    try{
      const report=await this.qa.run(input.mission.projectId,{
        missionId:input.mission.id,
        renderJobId,
      },{reportId:input.operationId});
      if(report.projectRevision!==input.expectedProjectRevision||report.renderSourceProjectRevision!==input.expectedProjectRevision){
        return{
          status:"blocked",
          code:"PRODUCTION_QA_REVISION_MISMATCH",
          message:"Production QA did not prove the expected current Project revision and cannot advance autonomous repair.",
        };
      }
      return{
        status:"completed",
        evidence:[{kind:"qa-report",id:report.id},{kind:"render",id:renderJobId}],
        projectRevisionAfter:report.projectRevision,
      };
    }catch{
      return{
        status:"blocked",
        code:"PRODUCTION_QA_FAILED",
        message:"The bounded Production QA evaluator could not persist verified evidence for the final render.",
      };
    }
  }
}
