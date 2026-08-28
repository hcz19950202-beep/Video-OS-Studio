import {createHash} from "node:crypto";
import {join} from "node:path";
import type {FileSystemAdapter} from "@/adapters/contracts";
import {AssetIntelligenceAssetIdSchema,AssetIntelligenceRecordSchema,type AssetIntelligenceRecord} from "@/lib/assets/intelligence/schema";
import {AssetIntelligenceNotFoundError} from "@/lib/assets/intelligence/errors";
import {ProjectIdSchema} from "@/schemas/project";

const serialize=(record:AssetIntelligenceRecord)=>JSON.stringify(AssetIntelligenceRecordSchema.parse(record),null,2)+"\n";
const parse=(text:string)=>AssetIntelligenceRecordSchema.parse(JSON.parse(text));
const storageKey=(assetId:string)=>createHash("sha256").update(AssetIntelligenceAssetIdSchema.parse(assetId)).digest("hex");

export class AssetIntelligenceRepository{
  private readonly pathChains=new Map<string,Promise<void>>();

  constructor(private readonly fs:FileSystemAdapter,readonly dataRoot:string){}

  private recordsDir(projectId:string){return join(this.dataRoot,"projects",ProjectIdSchema.parse(projectId),"production","asset-intelligence");}
  private recordPath(projectId:string,assetId:string){return join(this.recordsDir(projectId),`${storageKey(assetId)}.json`);}
  private backupPath(projectId:string,assetId:string){return join(this.recordsDir(projectId),`${storageKey(assetId)}.backup.json`);}
  private lockPath(projectId:string,assetId:string){return join(this.recordsDir(projectId),`${storageKey(assetId)}.lock`);}

  private parseForPath(text:string,projectId:string,assetId:string){
    const record=parse(text);
    if(record.projectId!==projectId||record.assetId!==assetId)throw new Error("Asset Intelligence identity does not match its repository path.");
    return record;
  }

  private validateStorageKey(record:AssetIntelligenceRecord,projectId:string,key:string){
    if(record.projectId!==projectId)throw new Error("Asset Intelligence project identity does not match its repository path.");
    if(storageKey(record.assetId)!==key)throw new Error("Asset Intelligence asset identity does not match its repository key.");
    return record;
  }

  private async withPathChain<T>(projectId:string,assetId:string,work:()=>Promise<T>):Promise<T>{
    const path=this.recordPath(projectId,assetId);
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

  private async withDurableLock<T>(projectId:string,assetId:string,work:()=>Promise<T>):Promise<T>{
    if(this.fs.withExclusiveLock)return this.fs.withExclusiveLock(this.lockPath(projectId,assetId),work);
    return work();
  }

  private async recoverBackup(projectId:string,assetId:string):Promise<AssetIntelligenceRecord|null>{
    return this.withDurableLock(projectId,assetId,async()=>{
      const primary=this.recordPath(projectId,assetId);
      if(await this.fs.exists(primary)){
        try{return this.parseForPath(await this.fs.readText(primary),projectId,assetId);}
        catch{
          // Primary remains invalid under the durable lock; fall through to backup recovery.
        }
      }
      const backup=this.backupPath(projectId,assetId);
      if(!(await this.fs.exists(backup)))return null;
      const recovered=this.parseForPath(await this.fs.readText(backup),projectId,assetId);
      await this.fs.ensureDir(this.recordsDir(projectId));
      await this.fs.writeTextAtomic(primary,serialize(recovered));
      return recovered;
    });
  }

  async upsert(recordInput:AssetIntelligenceRecord):Promise<AssetIntelligenceRecord>{
    const record=AssetIntelligenceRecordSchema.parse(recordInput);
    return this.withPathChain(record.projectId,record.assetId,()=>this.withDurableLock(record.projectId,record.assetId,async()=>{
      await this.fs.ensureDir(this.recordsDir(record.projectId));
      await this.fs.writeTextAtomic(
        this.recordPath(record.projectId,record.assetId),
        serialize(record),
        this.backupPath(record.projectId,record.assetId),
      );
      return record;
    }));
  }

  async load(projectIdInput:string,assetIdInput:string):Promise<AssetIntelligenceRecord|null>{
    const projectId=ProjectIdSchema.parse(projectIdInput);
    const assetId=AssetIntelligenceAssetIdSchema.parse(assetIdInput);
    const primary=this.recordPath(projectId,assetId);
    if(!(await this.fs.exists(primary)))return this.recoverBackup(projectId,assetId);
    try{return this.parseForPath(await this.fs.readText(primary),projectId,assetId);}
    catch(primaryError){
      try{
        const recovered=await this.recoverBackup(projectId,assetId);
        if(recovered)return recovered;
      }catch{
        // Preserve the primary parse/identity error when recovery is not valid.
      }
      throw primaryError;
    }
  }

  async require(projectId:string,assetId:string):Promise<AssetIntelligenceRecord>{
    const record=await this.load(projectId,assetId);
    if(!record)throw new AssetIntelligenceNotFoundError(projectId,assetId);
    return record;
  }

  async list(projectIdInput:string):Promise<AssetIntelligenceRecord[]>{
    const projectId=ProjectIdSchema.parse(projectIdInput);
    const dir=this.recordsDir(projectId);
    const files=await this.fs.listFiles(dir);
    const keys=[...new Set(files.flatMap(name=>{
      const primary=/^([a-f0-9]{64})\.json$/.exec(name);
      if(primary)return[primary[1]];
      const backup=/^([a-f0-9]{64})\.backup\.json$/.exec(name);
      return backup?[backup[1]]:[];
    }))];
    const records:AssetIntelligenceRecord[]=[];
    for(const key of keys){
      const primaryPath=join(dir,`${key}.json`);
      try{
        if(await this.fs.exists(primaryPath)){
          records.push(this.validateStorageKey(parse(await this.fs.readText(primaryPath)),projectId,key));
          continue;
        }
      }catch{
        // Try the matching backup below.
      }
      const backupPath=join(dir,`${key}.backup.json`);
      try{
        if(!(await this.fs.exists(backupPath)))continue;
        const backup=this.validateStorageKey(parse(await this.fs.readText(backupPath)),projectId,key);
        const recovered=await this.load(projectId,backup.assetId);
        if(recovered)records.push(recovered);
      }catch{
        // Invalid derived records are omitted from list() rather than poisoning unrelated retrieval.
      }
    }
    return records.sort((a,b)=>b.generatedAt.localeCompare(a.generatedAt)||a.assetId.localeCompare(b.assetId));
  }
}
