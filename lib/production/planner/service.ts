import {randomUUID} from "node:crypto";
import {ProductionMissionRepository} from "@/lib/production/mission/repository";
import {ProductionPlanRepository} from "@/lib/production/plan/repository";
import {ProductionPlanDraftSchema,ProductionPlanIdSchema,ProductionPlanSchema,type ProductionPlan,type ProductionPlanDraft} from "@/lib/production/plan/schema";
import {ProductionMissionPlanConflictError,ProductionMissionPlanningStateError,ProductionPlanRevisionConflictError} from "@/lib/production/plan/errors";
import {buildProductionPlannerContext,type ProductionPlannerContext} from "@/lib/production/planner/context";
import type {Project} from "@/schemas/project";

export interface ProductionPlannerAdapter{
  generate(context:ProductionPlannerContext):ProductionPlanDraft|Promise<ProductionPlanDraft>;
}

export interface ProductionPlannerProjectReader{
  load(projectId:string):Promise<Project>;
}

export interface ProductionPlannerServiceOptions{
  now?:()=>string;
  createId?:()=>string;
}

const canPlanStatus=(status:string)=>status==="draft"||status==="planning"||status==="ready"||status==="blocked"||status==="failed";

export class ProductionPlannerService{
  private readonly now:()=>string;
  private readonly createId:()=>string;

  constructor(
    private readonly missions:ProductionMissionRepository,
    private readonly plans:ProductionPlanRepository,
    private readonly projects:ProductionPlannerProjectReader,
    private readonly planner:ProductionPlannerAdapter,
    options:ProductionPlannerServiceOptions={},
  ){
    this.now=options.now??(()=>new Date().toISOString());
    this.createId=options.createId??randomUUID;
  }

  async generate(projectId:string,missionId:string,expectedRevision?:number):Promise<ProductionPlan>{
    const mission=await this.missions.require(projectId,missionId);
    if(!canPlanStatus(mission.status))throw new ProductionMissionPlanningStateError(mission.status);

    const baseline=await this.projects.load(projectId);
    const planningRevision=baseline.project.revision;
    if(expectedRevision!==undefined&&planningRevision!==expectedRevision)throw new ProductionPlanRevisionConflictError(expectedRevision,planningRevision);

    const context=buildProductionPlannerContext(mission,baseline);
    const draft=ProductionPlanDraftSchema.parse(await this.planner.generate(context));

    const latestProject=await this.projects.load(projectId);
    if(latestProject.project.revision!==planningRevision)throw new ProductionPlanRevisionConflictError(planningRevision,latestProject.project.revision);

    const generatedAt=this.now();
    const plan=ProductionPlanSchema.parse({
      id:ProductionPlanIdSchema.parse(this.createId()),
      projectId,
      missionId:mission.id,
      version:1,
      baseProjectRevision:planningRevision,
      supersedesPlanId:mission.planId,
      summary:draft.summary,
      steps:draft.steps,
      generatedAt,
    });
    await this.plans.create(plan);

    await this.missions.mutate(projectId,mission.id,current=>{
      if(current.updatedAt!==mission.updatedAt||current.planId!==mission.planId||!canPlanStatus(current.status))throw new ProductionMissionPlanConflictError();
      return {...current,planId:plan.id,status:"ready",updatedAt:this.now()};
    });
    return plan;
  }

  async inspectFreshness(projectId:string,planId:string):Promise<{plan:ProductionPlan;currentProjectRevision:number;stale:boolean}>{
    const plan=await this.plans.require(projectId,planId);
    const project=await this.projects.load(projectId);
    return{plan,currentProjectRevision:project.project.revision,stale:project.project.revision!==plan.baseProjectRevision};
  }

  async requireFresh(projectId:string,planId:string):Promise<ProductionPlan>{
    const freshness=await this.inspectFreshness(projectId,planId);
    if(freshness.stale)throw new ProductionPlanRevisionConflictError(freshness.plan.baseProjectRevision,freshness.currentProjectRevision);
    return freshness.plan;
  }
}
