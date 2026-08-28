import {join} from "node:path";
import type {FileSystemAdapter} from "@/adapters/contracts";
import {
  ProductionMissionIdSchema,
  ProductionMissionSchema,
  type ProductionMission,
} from "@/lib/production/mission/schema";
import {
  ProductionMissionAlreadyExistsError,
  ProductionMissionNotFoundError,
} from "@/lib/production/mission/errors";
import {ProjectIdSchema} from "@/schemas/project";

const serialize=(mission:ProductionMission)=>JSON.stringify(ProductionMissionSchema.parse(mission),null,2)+"\n";
const parse=(text:string)=>ProductionMissionSchema.parse(JSON.parse(text));

export class ProductionMissionRepository{
  private readonly pathChains=new Map<string,Promise<void>>();

  constructor(private readonly fs:FileSystemAdapter,readonly dataRoot:string){}

  private missionsDir(projectId:string){
    return join(this.dataRoot,"projects",ProjectIdSchema.parse(projectId),"production","missions");
  }

  private missionPath(projectId:string,missionId:string){
    return join(this.missionsDir(projectId),`${ProductionMissionIdSchema.parse(missionId)}.json`);
  }

  private backupPath(projectId:string,missionId:string){
    return join(this.missionsDir(projectId),`${ProductionMissionIdSchema.parse(missionId)}.backup.json`);
  }

  private lockPath(projectId:string,missionId:string){
    return join(this.missionsDir(projectId),`${ProductionMissionIdSchema.parse(missionId)}.lock`);
  }

  private async withMissionLock<T>(projectIdInput:string,missionIdInput:string,work:()=>Promise<T>):Promise<T>{
    const projectId=ProjectIdSchema.parse(projectIdInput);
    const missionId=ProductionMissionIdSchema.parse(missionIdInput);
    const path=this.missionPath(projectId,missionId);
    const previous=this.pathChains.get(path)??Promise.resolve();
    let release!:()=>void;
    const current=new Promise<void>(resolve=>{release=resolve;});
    this.pathChains.set(path,current);
    await previous.catch(()=>undefined);
    try{return await work();}
    finally{
      release();
      if(this.pathChains.get(path)===current)this.pathChains.delete(path);
    }
  }

  private async withAtomicWriteLock<T>(projectId:string,missionId:string,work:()=>Promise<T>):Promise<T>{
    if(this.fs.withExclusiveLock)return this.fs.withExclusiveLock(this.lockPath(projectId,missionId),work);
    return work();
  }

  private parseForPath(text:string,projectId:string,missionId:string){
    const mission=parse(text);
    if(mission.projectId!==projectId||mission.id!==missionId)throw new Error("Production Mission identity does not match its repository path.");
    return mission;
  }

  private async recoverBackup(projectId:string,missionId:string):Promise<ProductionMission|null>{
    return this.withAtomicWriteLock(projectId,missionId,async()=>{
      const path=this.missionPath(projectId,missionId);
      if(await this.fs.exists(path)){
        try{return this.parseForPath(await this.fs.readText(path),projectId,missionId);}
        catch{
          // Continue to the backup only while the primary remains invalid under the durable lock.
        }
      }

      const backupPath=this.backupPath(projectId,missionId);
      if(!(await this.fs.exists(backupPath)))return null;
      const recovered=this.parseForPath(await this.fs.readText(backupPath),projectId,missionId);
      await this.fs.ensureDir(this.missionsDir(projectId));
      await this.fs.writeTextAtomic(path,serialize(recovered));
      return recovered;
    });
  }

  private async loadForMutationUnderAtomicLock(projectId:string,missionId:string):Promise<ProductionMission>{
    const path=this.missionPath(projectId,missionId);
    if(await this.fs.exists(path)){
      try{return this.parseForPath(await this.fs.readText(path),projectId,missionId);}
      catch(primaryError){
        const backupPath=this.backupPath(projectId,missionId);
        if(!(await this.fs.exists(backupPath)))throw primaryError;
        try{
          const recovered=this.parseForPath(await this.fs.readText(backupPath),projectId,missionId);
          await this.fs.ensureDir(this.missionsDir(projectId));
          await this.fs.writeTextAtomic(path,serialize(recovered));
          return recovered;
        }catch{
          throw primaryError;
        }
      }
    }

    const backupPath=this.backupPath(projectId,missionId);
    if(!(await this.fs.exists(backupPath)))throw new ProductionMissionNotFoundError(projectId,missionId);
    const recovered=this.parseForPath(await this.fs.readText(backupPath),projectId,missionId);
    await this.fs.ensureDir(this.missionsDir(projectId));
    await this.fs.writeTextAtomic(path,serialize(recovered));
    return recovered;
  }

  async create(missionInput:ProductionMission):Promise<ProductionMission>{
    const mission=ProductionMissionSchema.parse(missionInput);
    const path=this.missionPath(mission.projectId,mission.id);
    return this.withMissionLock(mission.projectId,mission.id,()=>this.withAtomicWriteLock(mission.projectId,mission.id,async()=>{
      if(await this.fs.exists(path))throw new ProductionMissionAlreadyExistsError(mission.projectId,mission.id);
      await this.fs.ensureDir(this.missionsDir(mission.projectId));
      await this.fs.writeTextAtomic(path,serialize(mission));
      return mission;
    }));
  }

  async load(projectIdInput:string,missionIdInput:string):Promise<ProductionMission|null>{
    const projectId=ProjectIdSchema.parse(projectIdInput);
    const missionId=ProductionMissionIdSchema.parse(missionIdInput);
    const path=this.missionPath(projectId,missionId);
    if(!(await this.fs.exists(path)))return this.recoverBackup(projectId,missionId);
    try{return this.parseForPath(await this.fs.readText(path),projectId,missionId);}
    catch(primaryError){
      try{
        const recovered=await this.recoverBackup(projectId,missionId);
        if(recovered)return recovered;
      }catch{
        // Preserve the primary failure if durable recovery cannot produce valid Mission truth.
      }
      throw primaryError;
    }
  }

  async require(projectId:string,missionId:string):Promise<ProductionMission>{
    const mission=await this.load(projectId,missionId);
    if(!mission)throw new ProductionMissionNotFoundError(projectId,missionId);
    return mission;
  }

  async mutate(
    projectIdInput:string,
    missionIdInput:string,
    mutation:(current:ProductionMission)=>ProductionMission|Promise<ProductionMission>,
  ):Promise<ProductionMission>{
    const projectId=ProjectIdSchema.parse(projectIdInput);
    const missionId=ProductionMissionIdSchema.parse(missionIdInput);
    return this.withMissionLock(projectId,missionId,()=>this.withAtomicWriteLock(projectId,missionId,async()=>{
      const current=await this.loadForMutationUnderAtomicLock(projectId,missionId);
      const next=ProductionMissionSchema.parse(await mutation(current));
      if(next.projectId!==projectId||next.id!==missionId)throw new Error("Production Mission mutation cannot change repository identity.");
      await this.fs.writeTextAtomic(
        this.missionPath(projectId,missionId),
        serialize(next),
        this.backupPath(projectId,missionId),
      );
      return next;
    }));
  }

  async list(projectIdInput:string):Promise<ProductionMission[]>{
    const projectId=ProjectIdSchema.parse(projectIdInput);
    const files=await this.fs.listFiles(this.missionsDir(projectId));
    const ids=[...new Set(files.flatMap(name=>{
      if(name.endsWith(".backup.json"))return[name.slice(0,-12)];
      if(name.endsWith(".json"))return[name.slice(0,-5)];
      return[];
    }))];
    const parsedIds=ids.flatMap(id=>ProductionMissionIdSchema.safeParse(id).success?[id]:[]);
    const missions=await Promise.all(parsedIds.map(id=>this.load(projectId,id)));
    return missions.filter((mission):mission is ProductionMission=>mission!==null).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  }
}
