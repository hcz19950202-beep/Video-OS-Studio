import {join} from "node:path";
import type {FileSystemAdapter} from "@/adapters/contracts";
import {stableCreativeAssetSerialize} from "@/lib/creative-assets/fingerprints";
import {creativeAssetStorageKey,normalizeCreativeAssetLogicalId} from "@/lib/creative-assets/ids";
import {
  CreativeAssetArtifactSchema,
  CreativeAssetIndexSchema,
  CreativeAssetManifestSchema,
  CreativeAssetSchema,
  CreativeAssetVersionSchema,
  type CreativeAsset,
  type CreativeAssetArtifact,
  type CreativeAssetIndex,
  type CreativeAssetManifest,
  type CreativeAssetVersion,
} from "@/lib/creative-assets/schema";
import {
  assertCreativeAssetVersionMutable,
  assertCreativeAssetVersionTransition,
} from "@/lib/creative-assets/service-contracts";

export type CreativeAssetRepositoryErrorCode=
  | "asset_already_exists"
  | "asset_not_found"
  | "version_already_exists"
  | "version_not_found"
  | "invalid_child_version"
  | "invalid_repository_state"
  | "fingerprint_conflict";

export class CreativeAssetRepositoryError extends Error{
  constructor(readonly code:CreativeAssetRepositoryErrorCode,message:string){
    super(message);
    this.name="CreativeAssetRepositoryError";
  }
}

export type CreativeAssetListOptions={includeArchived?:boolean};
export type CreativeAssetRepositoryRecoveryReport={
  assetCount:number;
  recoveredAssetIds:string[];
  invalidStorageKeys:string[];
  removedTempFiles:number;
};

export type CreativeAssetRepositoryPaths={
  root:string;
  assetsDir:string;
  assetDir:string;
  manifest:string;
  manifestBackup:string;
  manifestLock:string;
  index:string;
  indexBackup:string;
  indexLock:string;
};

type ManifestReadResult={manifest:CreativeAssetManifest|null;recovered:boolean};
type ManifestScanResult={
  manifests:CreativeAssetManifest[];
  recoveredAssetIds:string[];
  invalidStorageKeys:string[];
};

const serializeManifest=(manifest:CreativeAssetManifest)=>
  JSON.stringify(CreativeAssetManifestSchema.parse(manifest),null,2)+"\n";
const parseManifest=(text:string)=>CreativeAssetManifestSchema.parse(JSON.parse(text));
const serializeIndex=(index:CreativeAssetIndex)=>JSON.stringify(CreativeAssetIndexSchema.parse(index),null,2)+"\n";
const parseIndex=(text:string)=>CreativeAssetIndexSchema.parse(JSON.parse(text));
const isStorageKey=(value:string)=>/^[a-f0-9]{64}$/.test(value);

export const creativeAssetRepositoryPaths=(dataRoot:string,creativeAssetId:string):CreativeAssetRepositoryPaths=>{
  const assetId=normalizeCreativeAssetLogicalId(creativeAssetId);
  const key=creativeAssetStorageKey(assetId);
  const root=join(dataRoot,"creative-assets","repository");
  const assetsDir=join(root,"assets");
  const assetDir=join(assetsDir,key);
  return{
    root,
    assetsDir,
    assetDir,
    manifest:join(assetDir,"manifest.json"),
    manifestBackup:join(assetDir,"manifest.backup.json"),
    manifestLock:join(assetDir,"manifest.lock"),
    index:join(root,"index.json"),
    indexBackup:join(root,"index.backup.json"),
    indexLock:join(root,"index.lock"),
  };
};

export class CreativeAssetRepository{
  private readonly pathChains=new Map<string,Promise<void>>();

  constructor(
    private readonly fs:FileSystemAdapter,
    readonly dataRoot:string,
    private readonly now:()=>string=()=>new Date().toISOString(),
  ){}

  private root(){return join(this.dataRoot,"creative-assets","repository");}
  private assetsDir(){return join(this.root(),"assets");}
  private indexPath(){return join(this.root(),"index.json");}
  private indexBackupPath(){return join(this.root(),"index.backup.json");}
  private indexLockPath(){return join(this.root(),"index.lock");}
  private assetDirFromKey(key:string){return join(this.assetsDir(),key);}
  private manifestPathFromKey(key:string){return join(this.assetDirFromKey(key),"manifest.json");}
  private manifestBackupPathFromKey(key:string){return join(this.assetDirFromKey(key),"manifest.backup.json");}
  private manifestLockPathFromKey(key:string){return join(this.assetDirFromKey(key),"manifest.lock");}

  private async withPathChain<T>(path:string,work:()=>Promise<T>):Promise<T>{
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

  private async withDurableLock<T>(lockPath:string,work:()=>Promise<T>):Promise<T>{
    if(this.fs.withExclusiveLock)return this.fs.withExclusiveLock(lockPath,work);
    return work();
  }

  private async withAssetGuard<T>(assetIdInput:string,work:(assetId:string,key:string)=>Promise<T>):Promise<T>{
    const assetId=normalizeCreativeAssetLogicalId(assetIdInput);
    const key=creativeAssetStorageKey(assetId);
    const manifestPath=this.manifestPathFromKey(key);
    return this.withPathChain(manifestPath,()=>
      this.withDurableLock(this.manifestLockPathFromKey(key),()=>work(assetId,key)),
    );
  }

  private validateManifestStorage(manifest:CreativeAssetManifest,key:string,expectedAssetId?:string){
    if(creativeAssetStorageKey(manifest.asset.id)!==key){
      throw new CreativeAssetRepositoryError(
        "invalid_repository_state",
        "Creative Asset identity does not match its repository storage key.",
      );
    }
    if(expectedAssetId&&manifest.asset.id!==expectedAssetId){
      throw new CreativeAssetRepositoryError(
        "invalid_repository_state",
        "Creative Asset identity does not match the requested repository path.",
      );
    }
    return manifest;
  }

  private parseManifestForKey(text:string,key:string,expectedAssetId?:string){
    return this.validateManifestStorage(parseManifest(text),key,expectedAssetId);
  }

  private async readManifestUnderLock(key:string,expectedAssetId?:string):Promise<ManifestReadResult>{
    const primary=this.manifestPathFromKey(key);
    const backup=this.manifestBackupPathFromKey(key);
    let primaryError:unknown;
    if(await this.fs.exists(primary)){
      try{return{manifest:this.parseManifestForKey(await this.fs.readText(primary),key,expectedAssetId),recovered:false};}
      catch(error){primaryError=error;}
    }
    if(await this.fs.exists(backup)){
      try{
        const recovered=this.parseManifestForKey(await this.fs.readText(backup),key,expectedAssetId);
        await this.fs.ensureDir(this.assetDirFromKey(key));
        await this.fs.writeTextAtomic(primary,serializeManifest(recovered));
        return{manifest:recovered,recovered:true};
      }catch(backupError){
        if(primaryError)throw primaryError;
        throw backupError;
      }
    }
    if(primaryError)throw primaryError;
    return{manifest:null,recovered:false};
  }

  private async writeManifestUnderLock(key:string,manifestInput:CreativeAssetManifest){
    const manifest=this.validateManifestStorage(CreativeAssetManifestSchema.parse(manifestInput),key);
    const primary=this.manifestPathFromKey(key);
    const backup=this.manifestBackupPathFromKey(key);
    await this.fs.ensureDir(this.assetDirFromKey(key));
    await this.fs.writeTextAtomic(primary,serializeManifest(manifest),backup);
    return manifest;
  }

  private async scanManifests():Promise<ManifestScanResult>{
    const keys=(await this.fs.listDirectories(this.assetsDir())).filter(isStorageKey).sort();
    const manifests:CreativeAssetManifest[]=[];
    const recoveredAssetIds:string[]=[];
    const invalidStorageKeys:string[]=[];
    for(const key of keys){
      try{
        const result=await this.withPathChain(this.manifestPathFromKey(key),()=>
          this.withDurableLock(this.manifestLockPathFromKey(key),()=>this.readManifestUnderLock(key)),
        );
        if(!result.manifest)continue;
        manifests.push(result.manifest);
        if(result.recovered)recoveredAssetIds.push(result.manifest.asset.id);
      }catch{
        invalidStorageKeys.push(key);
      }
    }
    manifests.sort((a,b)=>b.asset.updatedAt.localeCompare(a.asset.updatedAt)||a.asset.id.localeCompare(b.asset.id));
    return{manifests,recoveredAssetIds,invalidStorageKeys};
  }

  private indexFromManifests(manifests:CreativeAssetManifest[]):CreativeAssetIndex{
    return CreativeAssetIndexSchema.parse({
      schemaVersion:1,
      entries:manifests.map(({asset})=>({
        assetId:asset.id,
        name:asset.name,
        kind:asset.kind,
        engine:asset.engine,
        editable:asset.editable,
        tags:asset.tags,
        lifecycle:asset.lifecycle,
        latestVersionId:asset.latestVersionId,
        recommendedVersionId:asset.recommendedVersionId,
        updatedAt:asset.updatedAt,
      })),
    });
  }

  private async writeIndex(index:CreativeAssetIndex){
    await this.fs.ensureDir(this.root());
    const primary=this.indexPath();
    const backup=this.indexBackupPath();
    let preserveBackup=false;
    if(await this.fs.exists(primary)){
      try{
        parseIndex(await this.fs.readText(primary));
      }catch{
        preserveBackup=true;
      }
    }
    await this.fs.writeTextAtomic(primary,serializeIndex(index),preserveBackup?undefined:backup);
    return index;
  }

  async rebuildIndex():Promise<CreativeAssetIndex>{
    return this.withPathChain(this.indexPath(),()=>
      this.withDurableLock(this.indexLockPath(),async()=>{
        const scan=await this.scanManifests();
        return this.writeIndex(this.indexFromManifests(scan.manifests));
      }),
    );
  }

  private async refreshIndexAfterMutation(){
    await this.rebuildIndex();
  }

  async createAsset(assetInput:CreativeAsset,versionsInput:CreativeAssetVersion[]=[]):Promise<CreativeAsset>{
    const asset=CreativeAssetSchema.parse(assetInput);
    const versions=versionsInput.map(version=>CreativeAssetVersionSchema.parse(version));
    const manifest=CreativeAssetManifestSchema.parse({schemaVersion:1,asset,versions});
    const created=await this.withAssetGuard(asset.id,async(_assetId,key)=>{
      const current=await this.readManifestUnderLock(key,asset.id);
      if(current.manifest){
        throw new CreativeAssetRepositoryError("asset_already_exists",`Creative Asset ${asset.id} already exists.`);
      }
      await this.writeManifestUnderLock(key,manifest);
      return manifest.asset;
    });
    await this.refreshIndexAfterMutation();
    return created;
  }

  async getManifest(assetIdInput:string):Promise<CreativeAssetManifest|null>{
    return this.withAssetGuard(assetIdInput,async(assetId,key)=>
      (await this.readManifestUnderLock(key,assetId)).manifest,
    );
  }

  async requireManifest(assetId:string):Promise<CreativeAssetManifest>{
    const manifest=await this.getManifest(assetId);
    if(!manifest)throw new CreativeAssetRepositoryError("asset_not_found",`Creative Asset ${assetId} was not found.`);
    return manifest;
  }

  async getAsset(assetId:string):Promise<CreativeAsset|null>{
    return (await this.getManifest(assetId))?.asset??null;
  }

  async requireAsset(assetId:string):Promise<CreativeAsset>{
    const asset=await this.getAsset(assetId);
    if(!asset)throw new CreativeAssetRepositoryError("asset_not_found",`Creative Asset ${assetId} was not found.`);
    return asset;
  }

  async getVersion(assetId:string,versionIdInput:string):Promise<CreativeAssetVersion|null>{
    const versionId=normalizeCreativeAssetLogicalId(versionIdInput);
    const manifest=await this.getManifest(assetId);
    return manifest?.versions.find(version=>version.id===versionId)??null;
  }

  async requireVersion(assetId:string,versionId:string):Promise<CreativeAssetVersion>{
    const version=await this.getVersion(assetId,versionId);
    if(!version){
      throw new CreativeAssetRepositoryError(
        "version_not_found",
        `Creative Asset Version ${assetId}/${versionId} was not found.`,
      );
    }
    return version;
  }

  async listAssets(options:CreativeAssetListOptions={}):Promise<CreativeAsset[]>{
    const scan=await this.scanManifests();
    return scan.manifests
      .map(manifest=>manifest.asset)
      .filter(asset=>options.includeArchived||asset.lifecycle!=="archived");
  }

  async searchAssets(queryInput:string,options:CreativeAssetListOptions={}):Promise<CreativeAsset[]>{
    const query=queryInput.normalize("NFKC").trim().toLocaleLowerCase();
    const scan=await this.scanManifests();
    return scan.manifests
      .map(manifest=>manifest.asset)
      .filter(asset=>options.includeArchived||asset.lifecycle!=="archived")
      .filter(asset=>{
        if(!query)return true;
        return[
          asset.id,
          asset.name,
          asset.kind,
          asset.engine,
          ...asset.tags,
          asset.searchText??"",
        ].join("\n").toLocaleLowerCase().includes(query);
      });
  }

  private async mutateExisting<T>(
    assetIdInput:string,
    mutate:(manifest:CreativeAssetManifest,assetId:string)=>{manifest:CreativeAssetManifest;result:T},
  ):Promise<T>{
    const outcome=await this.withAssetGuard(assetIdInput,async(assetId,key)=>{
      const current=await this.readManifestUnderLock(key,assetId);
      if(!current.manifest){
        throw new CreativeAssetRepositoryError("asset_not_found",`Creative Asset ${assetId} was not found.`);
      }
      const next=mutate(current.manifest,assetId);
      const manifest=CreativeAssetManifestSchema.parse(next.manifest);
      await this.writeManifestUnderLock(key,manifest);
      return next.result;
    });
    await this.refreshIndexAfterMutation();
    return outcome;
  }

  async createDraftChildVersion(assetId:string,versionInput:CreativeAssetVersion):Promise<CreativeAssetVersion>{
    const supplied=CreativeAssetVersionSchema.parse(versionInput);
    if(supplied.state!=="DRAFT"||supplied.lineage.origin!=="cloned"||!supplied.lineage.parentVersionId){
      throw new CreativeAssetRepositoryError(
        "invalid_child_version",
        "Draft child versions must be DRAFT clones with a parentVersionId.",
      );
    }
    return this.mutateExisting(assetId,(manifest,normalizedAssetId)=>{
      if(supplied.creativeAssetId!==normalizedAssetId){
        throw new CreativeAssetRepositoryError(
          "invalid_child_version",
          "Draft child version identity must match its owning Creative Asset.",
        );
      }
      if(manifest.versions.some(version=>version.id===supplied.id)){
        throw new CreativeAssetRepositoryError(
          "version_already_exists",
          `Creative Asset Version ${supplied.id} already exists.`,
        );
      }
      const parent=manifest.versions.find(version=>version.id===supplied.lineage.parentVersionId);
      if(!parent){
        throw new CreativeAssetRepositoryError(
          "invalid_child_version",
          `Parent Creative Asset Version ${supplied.lineage.parentVersionId} was not found.`,
        );
      }
      const expectedRoot=parent.lineage.rootVersionId??parent.id;
      if(supplied.lineage.rootVersionId&&supplied.lineage.rootVersionId!==expectedRoot){
        throw new CreativeAssetRepositoryError(
          "invalid_child_version",
          `Draft child rootVersionId must remain ${expectedRoot}.`,
        );
      }
      const version=CreativeAssetVersionSchema.parse({
        ...supplied,
        lineage:{...supplied.lineage,rootVersionId:expectedRoot},
      });
      const nextAsset=CreativeAssetSchema.parse({
        ...manifest.asset,
        latestVersionId:version.id,
        updatedAt:this.now(),
      });
      return{
        manifest:{...manifest,asset:nextAsset,versions:[...manifest.versions,version]},
        result:version,
      };
    });
  }

  async updateMutableVersion(assetId:string,nextVersionInput:CreativeAssetVersion):Promise<CreativeAssetVersion>{
    const supplied=CreativeAssetVersionSchema.parse(nextVersionInput);
    if(supplied.state==="READY"||supplied.state==="ARCHIVED"){
      throw new CreativeAssetRepositoryError(
        "invalid_repository_state",
        "READY and ARCHIVED transitions must use the dedicated repository operations.",
      );
    }
    return this.mutateExisting(assetId,(manifest,normalizedAssetId)=>{
      const index=manifest.versions.findIndex(version=>version.id===supplied.id);
      if(index<0){
        throw new CreativeAssetRepositoryError(
          "version_not_found",
          `Creative Asset Version ${normalizedAssetId}/${supplied.id} was not found.`,
        );
      }
      const current=manifest.versions[index]!;
      assertCreativeAssetVersionMutable(current);
      const next=assertCreativeAssetVersionTransition(current,supplied);
      const versions=[...manifest.versions];
      versions[index]=next;
      const nextAsset=CreativeAssetSchema.parse({...manifest.asset,updatedAt:this.now()});
      return{manifest:{...manifest,asset:nextAsset,versions},result:next};
    });
  }

  async attachArtifactMetadata(
    assetId:string,
    versionIdInput:string,
    artifactInput:CreativeAssetArtifact,
  ):Promise<CreativeAssetVersion>{
    const versionId=normalizeCreativeAssetLogicalId(versionIdInput);
    const artifact=CreativeAssetArtifactSchema.parse(artifactInput);
    return this.mutateExisting(assetId,(manifest,normalizedAssetId)=>{
      const versionIndex=manifest.versions.findIndex(version=>version.id===versionId);
      if(versionIndex<0){
        throw new CreativeAssetRepositoryError(
          "version_not_found",
          `Creative Asset Version ${normalizedAssetId}/${versionId} was not found.`,
        );
      }
      const current=manifest.versions[versionIndex]!;
      assertCreativeAssetVersionMutable(current);
      if(artifact.creativeAssetId!==normalizedAssetId||artifact.versionId!==versionId){
        throw new CreativeAssetRepositoryError(
          "invalid_repository_state",
          "Artifact identity must match the Creative Asset Version being updated.",
        );
      }
      const artifactIndex=current.artifacts.findIndex(item=>item.id===artifact.id);
      if(artifactIndex>=0&&stableCreativeAssetSerialize(current.artifacts[artifactIndex])===stableCreativeAssetSerialize(artifact)){
        return{manifest,result:current};
      }
      const artifacts=[...current.artifacts];
      if(artifactIndex>=0)artifacts[artifactIndex]=artifact;
      else artifacts.push(artifact);
      const next=assertCreativeAssetVersionTransition(
        current,
        CreativeAssetVersionSchema.parse({...current,artifacts}),
      );
      const versions=[...manifest.versions];
      versions[versionIndex]=next;
      return{
        manifest:{...manifest,asset:{...manifest.asset,updatedAt:this.now()},versions},
        result:next,
      };
    });
  }

  async acceptVersion(
    assetId:string,
    versionIdInput:string,
    expectedFingerprint:string,
  ):Promise<CreativeAssetVersion>{
    const versionId=normalizeCreativeAssetLogicalId(versionIdInput);
    return this.mutateExisting(assetId,(manifest,normalizedAssetId)=>{
      const versionIndex=manifest.versions.findIndex(version=>version.id===versionId);
      if(versionIndex<0){
        throw new CreativeAssetRepositoryError(
          "version_not_found",
          `Creative Asset Version ${normalizedAssetId}/${versionId} was not found.`,
        );
      }
      const current=manifest.versions[versionIndex]!;
      if(current.state==="READY"){
        if(current.versionFingerprint!==expectedFingerprint){
          throw new CreativeAssetRepositoryError(
            "fingerprint_conflict",
            `Creative Asset Version ${versionId} is already accepted with a different fingerprint.`,
          );
        }
        return{manifest,result:current};
      }
      assertCreativeAssetVersionMutable(current);
      if(current.state==="DRAFT"||current.state==="FAILED"||current.state==="CANCELLED"){
        throw new CreativeAssetRepositoryError(
          "invalid_repository_state",
          `Creative Asset Version ${versionId} cannot be accepted from ${current.state}.`,
        );
      }
      if(current.versionFingerprint&&current.versionFingerprint!==expectedFingerprint){
        throw new CreativeAssetRepositoryError(
          "fingerprint_conflict",
          `Creative Asset Version ${versionId} fingerprint no longer matches the expected value.`,
        );
      }
      if(!current.artifacts.some(artifact=>artifact.role==="final"&&artifact.state==="ready")){
        throw new CreativeAssetRepositoryError(
          "invalid_repository_state",
          `Creative Asset Version ${versionId} cannot be accepted without a ready final artifact.`,
        );
      }
      const next=CreativeAssetVersionSchema.parse({
        ...current,
        state:"READY",
        versionFingerprint:expectedFingerprint,
        acceptedAt:this.now(),
        failureCode:undefined,
      });
      assertCreativeAssetVersionTransition(current,next);
      const versions=[...manifest.versions];
      versions[versionIndex]=next;
      const asset=CreativeAssetSchema.parse({
        ...manifest.asset,
        latestVersionId:versionId,
        recommendedVersionId:manifest.asset.recommendedVersionId??versionId,
        updatedAt:this.now(),
      });
      return{manifest:{...manifest,asset,versions},result:next};
    });
  }

  async archiveAsset(assetId:string):Promise<CreativeAsset>{
    return this.mutateExisting(assetId,(manifest)=>{
      if(manifest.asset.lifecycle==="archived")return{manifest,result:manifest.asset};
      const archivedAt=this.now();
      const asset=CreativeAssetSchema.parse({
        ...manifest.asset,
        lifecycle:"archived",
        archivedAt,
        updatedAt:archivedAt,
      });
      return{manifest:{...manifest,asset},result:asset};
    });
  }

  async archiveVersion(assetId:string,versionIdInput:string):Promise<CreativeAssetVersion>{
    const versionId=normalizeCreativeAssetLogicalId(versionIdInput);
    return this.mutateExisting(assetId,(manifest,normalizedAssetId)=>{
      const versionIndex=manifest.versions.findIndex(version=>version.id===versionId);
      if(versionIndex<0){
        throw new CreativeAssetRepositoryError(
          "version_not_found",
          `Creative Asset Version ${normalizedAssetId}/${versionId} was not found.`,
        );
      }
      const current=manifest.versions[versionIndex]!;
      if(current.state==="ARCHIVED")return{manifest,result:current};
      assertCreativeAssetVersionMutable(current);
      const next=CreativeAssetVersionSchema.parse({
        ...current,
        state:"ARCHIVED",
        acceptedAt:undefined,
        failureCode:undefined,
      });
      const versions=[...manifest.versions];
      versions[versionIndex]=next;
      const asset=CreativeAssetSchema.parse({...manifest.asset,updatedAt:this.now()});
      return{manifest:{...manifest,asset,versions},result:next};
    });
  }

  private async cleanupTempResidue():Promise<number>{
    let removed=0;
    const rootFiles=await this.fs.listFiles(this.root());
    for(const name of rootFiles){
      if(!/^index\.json\..+\.tmp$/.test(name))continue;
      await this.fs.removeFile(join(this.root(),name));
      removed+=1;
    }
    for(const key of(await this.fs.listDirectories(this.assetsDir())).filter(isStorageKey)){
      for(const name of await this.fs.listFiles(this.assetDirFromKey(key))){
        if(!/^manifest\.json\..+\.tmp$/.test(name))continue;
        await this.fs.removeFile(join(this.assetDirFromKey(key),name));
        removed+=1;
      }
    }
    return removed;
  }

  async recoverRepository():Promise<CreativeAssetRepositoryRecoveryReport>{
    const removedTempFiles=await this.cleanupTempResidue();
    const scan=await this.scanManifests();
    await this.withPathChain(this.indexPath(),()=>
      this.withDurableLock(this.indexLockPath(),()=>this.writeIndex(this.indexFromManifests(scan.manifests))),
    );
    return{
      assetCount:scan.manifests.length,
      recoveredAssetIds:scan.recoveredAssetIds,
      invalidStorageKeys:scan.invalidStorageKeys,
      removedTempFiles,
    };
  }
}
