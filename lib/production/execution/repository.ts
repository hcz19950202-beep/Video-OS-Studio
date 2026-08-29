import {join} from "node:path";
import type {FileSystemAdapter} from "@/adapters/contracts";
import {ProductionMissionIdSchema} from "@/lib/production/mission/schema";
import {ProductionExecutionAlreadyExistsError,ProductionExecutionNotFoundError} from "@/lib/production/execution/errors";
import {ProductionExecutionIdSchema,ProductionExecutionSchema,type ProductionExecution} from "@/lib/production/execution/schema";
import {ProjectIdSchema} from "@/schemas/project";

const serialize=(execution:ProductionExecution)=>JSON.stringify(ProductionExecutionSchema.parse(execution),null,2)+"\n";
const parse=(text:string)=>ProductionExecutionSchema.parse(JSON.parse(text));

export class ProductionExecutionRepository{
  private readonly pathChains=new Map<string,Promise<void>>();

  constructor(private readonly fs:FileSystemAdapter,readonly dataRoot:string){}

  private executionsDir(projectId:string){return join(this.dataRoot,"projects",ProjectIdSchema.parse(projectId),"production","executions");}
  private executionPath(projectId:string,executionId:string){return join(this.executionsDir(projectId),`${ProductionExecutionIdSchema.parse(executionId)}.json`);}
  private backupPath(projectId:string,executionId:string){return join(this.executionsDir(projectId),`${ProductionExecutionIdSchema.parse(executionId)}.backup.json`);}
  private lockPath(projectId:string,executionId:string){return join(this.executionsDir(projectId),`${ProductionExecutionIdSchema.parse(executionId)}.lock`);}
  private missionLockPath(projectId:string,missionId:string){return join(this.executionsDir(projectId),`mission-${ProductionMissionIdSchema.parse(missionId)}.lock`);}

  private async withPathChain<T>(key:string,work:()=>Promise<T>):Promise<T>{
    const previous=this.pathChains.get(key)??Promise.resolve();
    let release!:()=>void;
    const current=new Promise<void>(resolve=>{release=resolve;});
    this.pathChains.set(key,current);
    await previous.catch(()=>undefined);
    try{return await work();}
    finally{
      release();
      if(this.pathChains.get(key)===current)this.pathChains.delete(key);
    }
  }

  async withMissionLock<T>(projectIdInput:string,missionIdInput:string,work:()=>Promise<T>):Promise<T>{
    const projectId=ProjectIdSchema.parse(projectIdInput);
    const missionId=ProductionMissionIdSchema.parse(missionIdInput);
    const lockPath=this.missionLockPath(projectId,missionId);
    return this.withPathChain(lockPath,()=>this.fs.withExclusiveLock?this.fs.withExclusiveLock(lockPath,work):work());
  }

  private parseForPath(text:string,projectId:string,executionId:string){
    const execution=parse(text);
    if(execution.projectId!==projectId||execution.id!==executionId)throw new Error("Production Execution identity does not match its repository path.");
    return execution;
  }

  private async loadForMutationUnderLock(projectId:string,executionId:string):Promise<ProductionExecution>{
    const path=this.executionPath(projectId,executionId);
    if(await this.fs.exists(path)){
      try{return this.parseForPath(await this.fs.readText(path),projectId,executionId);}
      catch(primaryError){
        const backupPath=this.backupPath(projectId,executionId);
        if(!(await this.fs.exists(backupPath)))throw primaryError;
        try{
          const recovered=this.parseForPath(await this.fs.readText(backupPath),projectId,executionId);
          await this.fs.writeTextAtomic(path,serialize(recovered));
          return recovered;
        }catch{throw primaryError;}
      }
    }
    const backupPath=this.backupPath(projectId,executionId);
    if(!(await this.fs.exists(backupPath)))throw new ProductionExecutionNotFoundError(projectId,executionId);
    const recovered=this.parseForPath(await this.fs.readText(backupPath),projectId,executionId);
    await this.fs.writeTextAtomic(path,serialize(recovered));
    return recovered;
  }

  async create(input:ProductionExecution):Promise<ProductionExecution>{
    const execution=ProductionExecutionSchema.parse(input);
    const path=this.executionPath(execution.projectId,execution.id);
    return this.withPathChain(path,()=>{
      const work=async()=>{
        if(await this.fs.exists(path))throw new ProductionExecutionAlreadyExistsError(execution.projectId,execution.id);
        await this.fs.ensureDir(this.executionsDir(execution.projectId));
        await this.fs.writeTextAtomic(path,serialize(execution));
        return execution;
      };
      return this.fs.withExclusiveLock?this.fs.withExclusiveLock(this.lockPath(execution.projectId,execution.id),work):work();
    });
  }

  async load(projectIdInput:string,executionIdInput:string):Promise<ProductionExecution|null>{
    const projectId=ProjectIdSchema.parse(projectIdInput);
    const executionId=ProductionExecutionIdSchema.parse(executionIdInput);
    const path=this.executionPath(projectId,executionId);
    if(!(await this.fs.exists(path))){
      const backupPath=this.backupPath(projectId,executionId);
      if(!(await this.fs.exists(backupPath)))return null;
    }
    const lockPath=this.lockPath(projectId,executionId);
    const work=()=>this.loadForMutationUnderLock(projectId,executionId);
    return this.withPathChain(path,()=>this.fs.withExclusiveLock?this.fs.withExclusiveLock(lockPath,work):work());
  }

  async require(projectId:string,executionId:string):Promise<ProductionExecution>{
    const execution=await this.load(projectId,executionId);
    if(!execution)throw new ProductionExecutionNotFoundError(projectId,executionId);
    return execution;
  }

  async mutate(projectIdInput:string,executionIdInput:string,mutation:(current:ProductionExecution)=>ProductionExecution|Promise<ProductionExecution>):Promise<ProductionExecution>{
    const projectId=ProjectIdSchema.parse(projectIdInput);
    const executionId=ProductionExecutionIdSchema.parse(executionIdInput);
    const path=this.executionPath(projectId,executionId);
    return this.withPathChain(path,()=>{
      const work=async()=>{
        const current=await this.loadForMutationUnderLock(projectId,executionId);
        const next=ProductionExecutionSchema.parse(await mutation(current));
        if(next.projectId!==projectId||next.id!==executionId)throw new Error("Production Execution mutation cannot change repository identity.");
        await this.fs.writeTextAtomic(path,serialize(next),this.backupPath(projectId,executionId));
        return next;
      };
      return this.fs.withExclusiveLock?this.fs.withExclusiveLock(this.lockPath(projectId,executionId),work):work();
    });
  }

  async list(projectIdInput:string,missionIdInput?:string):Promise<ProductionExecution[]>{
    const projectId=ProjectIdSchema.parse(projectIdInput);
    const missionId=missionIdInput===undefined?undefined:ProductionMissionIdSchema.parse(missionIdInput);
    const files=await this.fs.listFiles(this.executionsDir(projectId));
    const candidateIds=files.flatMap(name=>{
      if(name.endsWith(".backup.json"))return[name.slice(0,-12)];
      if(name.endsWith(".json"))return[name.slice(0,-5)];
      return[];
    });
    const ids=[...new Set<string>(candidateIds)].filter(id=>ProductionExecutionIdSchema.safeParse(id).success);
    const executions=(await Promise.all(ids.map(id=>this.load(projectId,id)))).filter((item):item is ProductionExecution=>item!==null);
    return executions.filter(item=>missionId===undefined||item.missionId===missionId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  }

  async latestForMission(projectId:string,missionId:string):Promise<ProductionExecution|null>{
    return(await this.list(projectId,missionId))[0]??null;
  }
}
