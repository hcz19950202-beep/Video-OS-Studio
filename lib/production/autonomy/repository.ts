import {join} from "node:path";
import type {FileSystemAdapter} from "@/adapters/contracts";
import {ProductionEditProtectionSnapshotSchema,type ProductionEditProtectionSnapshot} from "@/lib/production/autonomy/schema";
import {ProjectIdSchema} from "@/schemas/project";

const serialize=(snapshot:ProductionEditProtectionSnapshot)=>JSON.stringify(ProductionEditProtectionSnapshotSchema.parse(snapshot),null,2)+"\n";
const parse=(text:string)=>ProductionEditProtectionSnapshotSchema.parse(JSON.parse(text));

export class ProductionEditProtectionRepository{
  private readonly pathChains=new Map<string,Promise<void>>();
  constructor(private readonly fs:FileSystemAdapter,readonly dataRoot:string,private readonly now:()=>string=()=>new Date().toISOString()){}

  private directory(projectId:string){return join(this.dataRoot,"projects",ProjectIdSchema.parse(projectId),"production","autonomy");}
  private path(projectId:string){return join(this.directory(projectId),"edit-protection.json");}
  private backupPath(projectId:string){return join(this.directory(projectId),"edit-protection.backup.json");}
  private lockPath(projectId:string){return join(this.directory(projectId),"edit-protection.lock");}

  private empty(projectId:string){return ProductionEditProtectionSnapshotSchema.parse({version:1,projectId,records:[],updatedAt:this.now()});}

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

  private parseForProject(text:string,projectId:string){
    const snapshot=parse(text);
    if(snapshot.projectId!==projectId)throw new Error("Production edit-protection identity does not match its repository path.");
    return snapshot;
  }

  private async loadUnderLock(projectId:string):Promise<ProductionEditProtectionSnapshot>{
    const path=this.path(projectId);
    if(await this.fs.exists(path)){
      try{return this.parseForProject(await this.fs.readText(path),projectId);}
      catch(primaryError){
        const backup=this.backupPath(projectId);
        if(!(await this.fs.exists(backup)))throw primaryError;
        try{
          const recovered=this.parseForProject(await this.fs.readText(backup),projectId);
          await this.fs.writeTextAtomic(path,serialize(recovered));
          return recovered;
        }catch{throw primaryError;}
      }
    }
    const backup=this.backupPath(projectId);
    if(await this.fs.exists(backup)){
      const recovered=this.parseForProject(await this.fs.readText(backup),projectId);
      await this.fs.writeTextAtomic(path,serialize(recovered));
      return recovered;
    }
    return this.empty(projectId);
  }

  async load(projectIdInput:string):Promise<ProductionEditProtectionSnapshot>{
    const projectId=ProjectIdSchema.parse(projectIdInput);
    const path=this.path(projectId);
    const work=()=>this.loadUnderLock(projectId);
    return this.withPathChain(path,()=>this.fs.withExclusiveLock?this.fs.withExclusiveLock(this.lockPath(projectId),work):work());
  }

  async mutate(projectIdInput:string,mutation:(current:ProductionEditProtectionSnapshot)=>ProductionEditProtectionSnapshot|Promise<ProductionEditProtectionSnapshot>):Promise<ProductionEditProtectionSnapshot>{
    const projectId=ProjectIdSchema.parse(projectIdInput);
    const path=this.path(projectId);
    return this.withPathChain(path,()=>{
      const work=async()=>{
        const current=await this.loadUnderLock(projectId);
        const next=ProductionEditProtectionSnapshotSchema.parse(await mutation(current));
        if(next.projectId!==projectId)throw new Error("Production edit-protection mutation cannot change Project identity.");
        await this.fs.ensureDir(this.directory(projectId));
        await this.fs.writeTextAtomic(path,serialize(next),this.backupPath(projectId));
        return next;
      };
      return this.fs.withExclusiveLock?this.fs.withExclusiveLock(this.lockPath(projectId),work):work();
    });
  }
}
