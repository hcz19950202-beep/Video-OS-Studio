import {randomUUID} from "node:crypto";
import type {Project} from "@/schemas/project";
import {
  CreateProductionMissionInputSchema,
  ProductionMissionIdSchema,
  ProductionMissionQAReportIdSchema,
  ProductionMissionSchema,
  UpdateProductionMissionDetailsInputSchema,
  isTerminalProductionMissionStatus,
  type CreateProductionMissionInput,
  type ProductionMission,
  type UpdateProductionMissionDetailsInput,
} from "@/lib/production/mission/schema";
import {ProductionMissionRepository} from "@/lib/production/mission/repository";
import {
  ProductionMissionProjectUnavailableError,
  ProductionMissionTerminalStateError,
} from "@/lib/production/mission/errors";
import {ProjectIdSchema} from "@/schemas/project";

export interface ProductionMissionProjectReader{
  load(projectId:string):Promise<Project>;
}

export interface ProductionMissionServiceOptions{
  now?:()=>string;
  createId?:()=>string;
}

export class ProductionMissionService{
  private readonly now:()=>string;
  private readonly createId:()=>string;

  constructor(
    readonly repository:ProductionMissionRepository,
    private readonly projects:ProductionMissionProjectReader,
    options:ProductionMissionServiceOptions={},
  ){
    this.now=options.now??(()=>new Date().toISOString());
    this.createId=options.createId??randomUUID;
  }

  private async requireProject(projectIdInput:string):Promise<Project>{
    const projectId=ProjectIdSchema.parse(projectIdInput);
    try{return await this.projects.load(projectId);}
    catch{throw new ProductionMissionProjectUnavailableError(projectId);}
  }

  async create(input:CreateProductionMissionInput):Promise<ProductionMission>{
    const parsed=CreateProductionMissionInputSchema.parse(input);
    const project=await this.requireProject(parsed.projectId);
    const timestamp=this.now();
    const mission=ProductionMissionSchema.parse({
      id:ProductionMissionIdSchema.parse(this.createId()),
      projectId:parsed.projectId,
      title:parsed.title,
      brief:parsed.brief,
      target:parsed.target??{},
      autonomyPolicy:parsed.autonomyPolicy,
      baseProjectRevision:project.project.revision,
      status:"draft",
      qaReportIds:[],
      agentSessionIds:[],
      workflowRunIds:[],
      jobIds:[],
      createdAt:timestamp,
      updatedAt:timestamp,
    });
    return this.repository.create(mission);
  }

  async load(projectId:string,missionId:string):Promise<ProductionMission|null>{
    await this.requireProject(projectId);
    return this.repository.load(projectId,missionId);
  }

  async require(projectId:string,missionId:string):Promise<ProductionMission>{
    await this.requireProject(projectId);
    return this.repository.require(projectId,missionId);
  }

  async list(projectId:string):Promise<ProductionMission[]>{
    await this.requireProject(projectId);
    return this.repository.list(projectId);
  }

  async updateDetails(projectIdInput:string,missionIdInput:string,input:UpdateProductionMissionDetailsInput):Promise<ProductionMission>{
    const projectId=ProjectIdSchema.parse(projectIdInput);
    const missionId=ProductionMissionIdSchema.parse(missionIdInput);
    const update=UpdateProductionMissionDetailsInputSchema.parse(input);
    await this.requireProject(projectId);
    return this.repository.mutate(projectId,missionId,current=>{
      if(isTerminalProductionMissionStatus(current.status))throw new ProductionMissionTerminalStateError(current.id,current.status);
      return ProductionMissionSchema.parse({
        ...current,
        ...update,
        updatedAt:this.now(),
      });
    });
  }

  async linkQAReport(projectIdInput:string,missionIdInput:string,reportIdInput:string):Promise<ProductionMission>{
    const projectId=ProjectIdSchema.parse(projectIdInput);
    const missionId=ProductionMissionIdSchema.parse(missionIdInput);
    const reportId=ProductionMissionQAReportIdSchema.parse(reportIdInput);
    await this.requireProject(projectId);
    return this.repository.mutate(projectId,missionId,current=>{
      if(current.qaReportIds.includes(reportId))return current;
      return ProductionMissionSchema.parse({...current,qaReportIds:[...current.qaReportIds,reportId],updatedAt:this.now()});
    });
  }

  async cancel(projectIdInput:string,missionIdInput:string):Promise<ProductionMission>{
    const projectId=ProjectIdSchema.parse(projectIdInput);
    const missionId=ProductionMissionIdSchema.parse(missionIdInput);
    await this.requireProject(projectId);
    return this.repository.mutate(projectId,missionId,current=>{
      if(current.status==="cancelled")return current;
      if(current.status==="completed")throw new ProductionMissionTerminalStateError(current.id,current.status);
      return ProductionMissionSchema.parse({
        ...current,
        status:"cancelled",
        updatedAt:this.now(),
      });
    });
  }
}
