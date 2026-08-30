import {randomUUID} from "node:crypto";
import {join} from "node:path";
import type {FileSystemAdapter} from "@/adapters/contracts";
import {
  ProductionCampaignIdSchema,
  ProductionCampaignSchema,
  type ProductionCampaign,
} from "@/lib/production/campaign/schema";
import {
  ProductionCampaignAlreadyExistsError,
  ProductionCampaignNotFoundError,
  ProductionCampaignRunnerBusyError,
} from "@/lib/production/campaign/errors";
import {currentProcessIdentity,isProcessIdentityAlive} from "@/lib/process/process-identity";

export type ProductionCampaignRunnerClaim={
  version:1;
  campaignId:string;
  ownerToken:string;
  pid:number;
  processStartedAt?:number;
  claimedAt:string;
};

const serialize=(campaign:ProductionCampaign)=>JSON.stringify(ProductionCampaignSchema.parse(campaign),null,2)+"\n";
const parse=(text:string)=>ProductionCampaignSchema.parse(JSON.parse(text));
const serializeRunnerClaim=(claim:ProductionCampaignRunnerClaim)=>JSON.stringify(claim,null,2)+"\n";
const parseRunnerClaim=(text:string):ProductionCampaignRunnerClaim=>{
  const value=JSON.parse(text) as Partial<ProductionCampaignRunnerClaim>;
  if(
    value.version!==1||
    typeof value.campaignId!=="string"||
    typeof value.ownerToken!=="string"||
    value.ownerToken.length===0||
    !Number.isInteger(value.pid)||
    (value.processStartedAt!==undefined&&(!Number.isFinite(value.processStartedAt)||value.processStartedAt<=0))||
    typeof value.claimedAt!=="string"
  )throw new Error("Production Campaign runner claim is invalid.");
  return{
    version:1,
    campaignId:ProductionCampaignIdSchema.parse(value.campaignId),
    ownerToken:value.ownerToken,
    pid:value.pid!,
    ...(value.processStartedAt===undefined?{}:{processStartedAt:value.processStartedAt}),
    claimedAt:value.claimedAt,
  };
};

export class ProductionCampaignRepository{
  private readonly pathChains=new Map<string,Promise<void>>();

  constructor(private readonly fs:FileSystemAdapter,readonly dataRoot:string){}

  private campaignsDir(){return join(this.dataRoot,"production","campaigns");}
  private campaignPath(campaignId:string){return join(this.campaignsDir(),`${ProductionCampaignIdSchema.parse(campaignId)}.json`);}
  private backupPath(campaignId:string){return join(this.campaignsDir(),`${ProductionCampaignIdSchema.parse(campaignId)}.backup.json`);}
  private lockPath(campaignId:string){return join(this.campaignsDir(),`${ProductionCampaignIdSchema.parse(campaignId)}.lock`);}
  private runnerClaimPath(campaignId:string){return join(this.campaignsDir(),`${ProductionCampaignIdSchema.parse(campaignId)}.runner-claim.json`);}

  private async withCampaignLock<T>(campaignIdInput:string,work:()=>Promise<T>):Promise<T>{
    const campaignId=ProductionCampaignIdSchema.parse(campaignIdInput);
    const path=this.campaignPath(campaignId);
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

  private async withAtomicWriteLock<T>(campaignId:string,work:()=>Promise<T>):Promise<T>{
    if(this.fs.withExclusiveLock)return this.fs.withExclusiveLock(this.lockPath(campaignId),work);
    return work();
  }

  private parseForPath(text:string,campaignId:string){
    const campaign=parse(text);
    if(campaign.id!==campaignId)throw new Error("Production Campaign identity does not match its repository path.");
    return campaign;
  }

  private async recoverBackup(campaignId:string):Promise<ProductionCampaign|null>{
    return this.withAtomicWriteLock(campaignId,async()=>{
      const path=this.campaignPath(campaignId);
      if(await this.fs.exists(path)){
        try{return this.parseForPath(await this.fs.readText(path),campaignId);}
        catch{
          // Continue to backup recovery while holding the durable Campaign lock.
        }
      }
      const backupPath=this.backupPath(campaignId);
      if(!(await this.fs.exists(backupPath)))return null;
      const recovered=this.parseForPath(await this.fs.readText(backupPath),campaignId);
      await this.fs.ensureDir(this.campaignsDir());
      await this.fs.writeTextAtomic(path,serialize(recovered));
      return recovered;
    });
  }

  private async loadForMutationUnderAtomicLock(campaignId:string):Promise<ProductionCampaign>{
    const path=this.campaignPath(campaignId);
    if(await this.fs.exists(path)){
      try{return this.parseForPath(await this.fs.readText(path),campaignId);}
      catch(primaryError){
        const backupPath=this.backupPath(campaignId);
        if(!(await this.fs.exists(backupPath)))throw primaryError;
        try{
          const recovered=this.parseForPath(await this.fs.readText(backupPath),campaignId);
          await this.fs.writeTextAtomic(path,serialize(recovered));
          return recovered;
        }catch{
          throw primaryError;
        }
      }
    }
    const backupPath=this.backupPath(campaignId);
    if(!(await this.fs.exists(backupPath)))throw new ProductionCampaignNotFoundError(campaignId);
    const recovered=this.parseForPath(await this.fs.readText(backupPath),campaignId);
    await this.fs.writeTextAtomic(path,serialize(recovered));
    return recovered;
  }

  async create(campaignInput:ProductionCampaign):Promise<ProductionCampaign>{
    const campaign=ProductionCampaignSchema.parse(campaignInput);
    const path=this.campaignPath(campaign.id);
    return this.withCampaignLock(campaign.id,()=>this.withAtomicWriteLock(campaign.id,async()=>{
      if(await this.fs.exists(path))throw new ProductionCampaignAlreadyExistsError(campaign.id);
      await this.fs.ensureDir(this.campaignsDir());
      await this.fs.writeTextAtomic(path,serialize(campaign));
      return campaign;
    }));
  }

  async load(campaignIdInput:string):Promise<ProductionCampaign|null>{
    const campaignId=ProductionCampaignIdSchema.parse(campaignIdInput);
    const path=this.campaignPath(campaignId);
    if(!(await this.fs.exists(path)))return this.recoverBackup(campaignId);
    try{return this.parseForPath(await this.fs.readText(path),campaignId);}
    catch(primaryError){
      try{
        const recovered=await this.recoverBackup(campaignId);
        if(recovered)return recovered;
      }catch{
        // Preserve the primary failure when durable recovery cannot restore Campaign truth.
      }
      throw primaryError;
    }
  }

  async require(campaignId:string):Promise<ProductionCampaign>{
    const campaign=await this.load(campaignId);
    if(!campaign)throw new ProductionCampaignNotFoundError(campaignId);
    return campaign;
  }

  async mutate(campaignIdInput:string,mutation:(current:ProductionCampaign)=>ProductionCampaign|Promise<ProductionCampaign>):Promise<ProductionCampaign>{
    const campaignId=ProductionCampaignIdSchema.parse(campaignIdInput);
    return this.withCampaignLock(campaignId,()=>this.withAtomicWriteLock(campaignId,async()=>{
      const current=await this.loadForMutationUnderAtomicLock(campaignId);
      const candidate=await mutation(current);
      if(candidate===current)return current;
      const next=ProductionCampaignSchema.parse(candidate);
      if(next.id!==campaignId)throw new Error("Production Campaign mutation cannot change repository identity.");
      await this.fs.writeTextAtomic(this.campaignPath(campaignId),serialize(next),this.backupPath(campaignId));
      return next;
    }));
  }

  async claimRunner(campaignIdInput:string):Promise<ProductionCampaignRunnerClaim>{
    const campaignId=ProductionCampaignIdSchema.parse(campaignIdInput);
    return this.withCampaignLock(campaignId,()=>this.withAtomicWriteLock(campaignId,async()=>{
      await this.loadForMutationUnderAtomicLock(campaignId);
      const path=this.runnerClaimPath(campaignId);
      if(await this.fs.exists(path)){
        const current=parseRunnerClaim(await this.fs.readText(path));
        if(current.campaignId!==campaignId)throw new Error("Production Campaign runner claim identity does not match its repository path.");
        if(await isProcessIdentityAlive({pid:current.pid,startedAt:current.processStartedAt}))throw new ProductionCampaignRunnerBusyError(campaignId);
      }
      const identity=currentProcessIdentity();
      const claim:ProductionCampaignRunnerClaim={
        version:1,
        campaignId,
        ownerToken:randomUUID(),
        pid:identity.pid,
        processStartedAt:identity.startedAt,
        claimedAt:new Date().toISOString(),
      };
      await this.fs.ensureDir(this.campaignsDir());
      await this.fs.writeTextAtomic(path,serializeRunnerClaim(claim));
      return claim;
    }));
  }

  async releaseRunnerClaim(campaignIdInput:string,ownerToken:string):Promise<boolean>{
    const campaignId=ProductionCampaignIdSchema.parse(campaignIdInput);
    if(ownerToken.length===0)return false;
    return this.withCampaignLock(campaignId,()=>this.withAtomicWriteLock(campaignId,async()=>{
      const path=this.runnerClaimPath(campaignId);
      if(!(await this.fs.exists(path)))return false;
      const current=parseRunnerClaim(await this.fs.readText(path));
      if(current.campaignId!==campaignId||current.ownerToken!==ownerToken)return false;
      await this.fs.removeFile(path);
      return true;
    }));
  }

  async list():Promise<ProductionCampaign[]>{
    const files=await this.fs.listFiles(this.campaignsDir());
    const ids=[...new Set(files.flatMap(name=>{
      if(name.endsWith(".backup.json"))return[name.slice(0,-12)];
      if(name.endsWith(".runner-claim.json"))return[];
      if(name.endsWith(".json"))return[name.slice(0,-5)];
      return[];
    }))];
    const validIds=ids.filter(id=>ProductionCampaignIdSchema.safeParse(id).success);
    const campaigns=await Promise.all(validIds.map(id=>this.load(id)));
    return campaigns.filter((campaign):campaign is ProductionCampaign=>campaign!==null).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  }
}
