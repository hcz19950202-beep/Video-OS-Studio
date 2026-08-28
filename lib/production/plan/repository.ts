import {join} from "node:path";
import type {FileSystemAdapter} from "@/adapters/contracts";
import {ProductionMissionIdSchema} from "@/lib/production/mission/schema";
import {ProductionPlanAlreadyExistsError,ProductionPlanNotFoundError} from "@/lib/production/plan/errors";
import {ProductionPlanIdSchema,ProductionPlanSchema,type ProductionPlan} from "@/lib/production/plan/schema";
import {ProjectIdSchema} from "@/schemas/project";

const serialize=(plan:ProductionPlan)=>JSON.stringify(ProductionPlanSchema.parse(plan),null,2)+"\n";
const parse=(text:string)=>ProductionPlanSchema.parse(JSON.parse(text));

export class ProductionPlanRepository{
  constructor(private readonly fs:FileSystemAdapter,readonly dataRoot:string){}

  private plansDir(projectId:string){return join(this.dataRoot,"projects",ProjectIdSchema.parse(projectId),"production","plans");}
  private planPath(projectId:string,planId:string){return join(this.plansDir(projectId),`${ProductionPlanIdSchema.parse(planId)}.json`);}
  private lockPath(projectId:string,planId:string){return join(this.plansDir(projectId),`${ProductionPlanIdSchema.parse(planId)}.lock`);}
  private parseForPath(text:string,projectId:string,planId:string){
    const plan=parse(text);
    if(plan.projectId!==projectId||plan.id!==planId)throw new Error("Production Plan identity does not match its repository path.");
    return plan;
  }

  async create(planInput:ProductionPlan):Promise<ProductionPlan>{
    const plan=ProductionPlanSchema.parse(planInput);
    const path=this.planPath(plan.projectId,plan.id);
    const work=async()=>{
      if(await this.fs.exists(path))throw new ProductionPlanAlreadyExistsError(plan.projectId,plan.id);
      await this.fs.ensureDir(this.plansDir(plan.projectId));
      await this.fs.writeTextAtomic(path,serialize(plan));
      return plan;
    };
    return this.fs.withExclusiveLock?this.fs.withExclusiveLock(this.lockPath(plan.projectId,plan.id),work):work();
  }

  async load(projectIdInput:string,planIdInput:string):Promise<ProductionPlan|null>{
    const projectId=ProjectIdSchema.parse(projectIdInput);
    const planId=ProductionPlanIdSchema.parse(planIdInput);
    const path=this.planPath(projectId,planId);
    if(!(await this.fs.exists(path)))return null;
    return this.parseForPath(await this.fs.readText(path),projectId,planId);
  }

  async require(projectId:string,planId:string):Promise<ProductionPlan>{
    const plan=await this.load(projectId,planId);
    if(!plan)throw new ProductionPlanNotFoundError(projectId,planId);
    return plan;
  }

  async list(projectIdInput:string,missionIdInput?:string):Promise<ProductionPlan[]>{
    const projectId=ProjectIdSchema.parse(projectIdInput);
    const missionId=missionIdInput===undefined?undefined:ProductionMissionIdSchema.parse(missionIdInput);
    const files=await this.fs.listFiles(this.plansDir(projectId));
    const ids=files.filter(name=>name.endsWith(".json")).map(name=>name.slice(0,-5)).filter(id=>ProductionPlanIdSchema.safeParse(id).success);
    const plans=(await Promise.all(ids.map(id=>this.load(projectId,id)))).filter((plan):plan is ProductionPlan=>plan!==null);
    return plans.filter(plan=>missionId===undefined||plan.missionId===missionId).sort((a,b)=>b.generatedAt.localeCompare(a.generatedAt));
  }
}
