import {createHash,randomUUID} from "node:crypto";
import type {FileSystemAdapter,FfmpegAdapter} from "@/adapters/contracts";
import type {ProjectCommand} from "@/lib/project/commands";
import {applyProjectCommandTransaction} from "@/lib/project/history";
import {ProjectMutationCoordinator,ProjectRevisionConflictError} from "@/lib/project/mutation-coordinator";
import type {ProjectRepository} from "@/lib/project/repository";
import type {Asset} from "@/schemas/asset";
import type {Project} from "@/schemas/project";
import {captionsToFrames,parseSubtitleText} from "@/lib/captions/parser";
import {planMediaImport,type MediaImportKind,type MediaImportStrategy} from "@/lib/media/import-policy";

const SAFE_FILE_NAME=/[^A-Za-z0-9._-]+/g;
const sanitizeFileName=(name:string)=>{const n=name.replaceAll("\\","/").split("/").pop()||"asset";return n.replace(SAFE_FILE_NAME,"-").replace(/^-+|-+$/g,"")||"asset";};
const withoutExtension=(name:string)=>name.replace(/\.[^.]+$/,"")||"media";
const operationAssetId=(operationId:string)=>`media-${createHash("sha256").update(operationId).digest("hex").slice(0,20)}`;

type ImportMediaCommon={projectId:string;fileName:string;mimeType?:string;expectedRevision?:number;operationId?:string};
type BufferedImportMediaInput=ImportMediaCommon&{bytes:Uint8Array};
type StagedImportMediaInput=ImportMediaCommon&{sourcePath:string;sizeBytes:number};
export type ImportMediaInput=BufferedImportMediaInput|StagedImportMediaInput;
export type MediaImportReport={kind:MediaImportKind;strategy:MediaImportStrategy;normalized:boolean;assetId:string;originalRelativePath?:string;workingRelativePath:string;workingFileName:string;};
export type MediaImportResult={project:Project;import:MediaImportReport;alreadyApplied?:boolean};

const isBufferedInput=(input:ImportMediaInput):input is BufferedImportMediaInput=>"bytes" in input;
const inputSizeBytes=(input:ImportMediaInput)=>isBufferedInput(input)?input.bytes.byteLength:input.sizeBytes;

export class MediaImportService{
  private readonly mutations:ProjectMutationCoordinator;
  private readonly operationChains=new Map<string,Promise<void>>();
  constructor(private readonly fs:FileSystemAdapter,private readonly ffmpeg:FfmpegAdapter,private readonly repository:ProjectRepository,private readonly idFactory:()=>string=randomUUID,mutations?:ProjectMutationCoordinator){this.mutations=mutations??new ProjectMutationCoordinator(fs,repository);}
  async importFile(input:ImportMediaInput):Promise<Project>{return(await this.importWithReport(input)).project;}

  private async withMediaOperationLock<T>(projectId:string,operationId:string,work:()=>Promise<T>):Promise<T>{
    const key=`${projectId}\0${operationId}`;
    const local=async()=>{
      const previous=this.operationChains.get(key)??Promise.resolve();
      let release!:()=>void;
      const gate=new Promise<void>(resolve=>{release=resolve;});
      const current=previous.catch(()=>undefined).then(()=>gate);
      this.operationChains.set(key,current);
      await previous.catch(()=>undefined);
      try{return await work();}
      finally{
        release();
        if(this.operationChains.get(key)===current)this.operationChains.delete(key);
      }
    };
    const operationKey=createHash("sha256").update(operationId).digest("hex");
    const lockPath=this.repository.resolveProjectFile(projectId,`edit/media-operations/${operationKey}.lock`);
    return this.fs.withExclusiveLock?this.fs.withExclusiveLock(lockPath,local):local();
  }

  async importWithReport(input:ImportMediaInput):Promise<MediaImportResult>{
    const operationId=input.operationId??`media-import-${this.idFactory()}`;
    const plan=planMediaImport(input.fileName,input.mimeType);
    const assetId=input.operationId?operationAssetId(operationId):`media-${this.idFactory()}`;
    const safeName=sanitizeFileName(input.fileName);
    const sizeBytes=inputSizeBytes(input);
    if(!Number.isSafeInteger(sizeBytes)||sizeBytes<=0)throw new Error("The selected file is empty or has an invalid size.");
    const mutationPayload={fileName:input.fileName,mimeType:input.mimeType,sizeBytes,assetId,plan};

    const extension=plan.strategy==="normalize-video"?"mp4":plan.strategy==="normalize-audio"?"m4a":undefined;
    const folder=plan.kind==="video"?"input":"assets";
    const workingFileName=extension?`${withoutExtension(safeName)}-working.${extension}`:safeName;
    const originalRelativePath=extension?`original/${assetId}-${safeName}`:undefined;
    const relativePath=plan.kind==="subtitle"?`captions/${assetId}-${safeName}`:`${folder}/${assetId}-${workingFileName}`;
    const report:MediaImportReport={kind:plan.kind,strategy:plan.strategy,normalized:extension!==undefined,assetId,originalRelativePath,workingRelativePath:relativePath,workingFileName};

    return this.withMediaOperationLock(input.projectId,operationId,async()=>{
      const prior=await this.mutations.getOperationForMutation(input.projectId,operationId,"media",mutationPayload);
      if(prior?.status==="applied")return{project:await this.repository.load(input.projectId),alreadyApplied:true,import:report};

      const baseline=await this.repository.load(input.projectId);
      const expectedRevision=input.expectedRevision??baseline.project.revision;
      if(baseline.project.revision!==expectedRevision)throw new ProjectRevisionConflictError(expectedRevision,baseline.project.revision);
      const cleanupCandidates:string[]=[];

      try{
        let stagedConsumed=false;
        const place=async(targetPath:string)=>{
          if(isBufferedInput(input)){await this.fs.writeBinary(targetPath,input.bytes);return;}
          if(stagedConsumed)throw new Error("The staged upload was already consumed.");
          await this.fs.moveFile(input.sourcePath,targetPath);
          stagedConsumed=true;
        };

        if(plan.kind==="subtitle"){
          cleanupCandidates.push(relativePath);
          await place(this.repository.resolveProjectFile(baseline.project.id,relativePath));
        }else if(extension){
          cleanupCandidates.push(originalRelativePath!);
          const sourcePath=this.repository.resolveProjectFile(baseline.project.id,originalRelativePath!);
          await place(sourcePath);
          cleanupCandidates.push(relativePath);
          const workingPath=this.repository.resolveProjectFile(baseline.project.id,relativePath);
          await this.fs.ensureDir(this.repository.resolveProjectFile(baseline.project.id,folder));
          if(plan.strategy==="normalize-video")await this.ffmpeg.normalizeVideo({inputPath:sourcePath,outputPath:workingPath});
          else await this.ffmpeg.normalizeAudio({inputPath:sourcePath,outputPath:workingPath});
        }else{
          cleanupCandidates.push(relativePath);
          await place(this.repository.resolveProjectFile(baseline.project.id,relativePath));
        }

        const absolutePath=this.repository.resolveProjectFile(baseline.project.id,relativePath);
        const normalizedMime=plan.strategy==="normalize-video"?"video/mp4":plan.strategy==="normalize-audio"?"audio/mp4":plan.mimeType;
        let asset:Asset={id:assetId,kind:plan.kind,relativePath,originalRelativePath,label:safeName,originalName:input.fileName,mimeType:normalizedMime,originalMimeType:input.mimeType||plan.mimeType,sizeBytes};

        if(plan.kind==="video"){
          let probe;
          try{probe=await this.ffmpeg.probe(absolutePath);}catch(error){throw new Error(`Unable to read imported video metadata with ffprobe: ${error instanceof Error?error.message:String(error)}. Verify FFmpeg/ffprobe and retry.`);}
          asset={...asset,durationInFrames:Math.max(1,Math.round(probe.durationSeconds*baseline.canvas.fps)),width:probe.width,height:probe.height,sourceFps:probe.fps,hasAudio:probe.hasAudio};
        }else if(plan.kind==="audio"){
          try{const probe=await this.ffmpeg.probe(absolutePath);asset={...asset,durationInFrames:Math.max(1,Math.round(probe.durationSeconds*baseline.canvas.fps)),hasAudio:true};}catch{/* Asset remains importable if a specific audio codec cannot be probed in cloud/mock environments. */}
        }

        const commandsFor=async(current:Project):Promise<ProjectCommand[]>=>{
          const commands:ProjectCommand[]=[];
          if(plan.kind==="video"){
            const durationInFrames=asset.durationInFrames??current.canvas.durationInFrames;
            for(const clip of current.tracks.find(track=>track.id==="video-main")?.clips??[])commands.push({type:"remove-clip",clipId:clip.id});
            commands.push({type:"set-duration",durationInFrames},{type:"add-asset",asset},{type:"add-clip",trackId:"video-main",clip:{id:`clip-${assetId}`,type:"video",assetId,startFrame:0,durationInFrames,sourceStartFrame:0,volume:1,enabled:true,layer:0}});
          }else if(plan.kind==="subtitle"){
            const parsed=parseSubtitleText(await this.fs.readText(absolutePath));
            if(parsed.length===0)throw new Error("No valid subtitle cues were found. Verify SRT/VTT timestamps and retry.");
            for(const clip of current.tracks.find(track=>track.id==="captions-main")?.clips??[])commands.push({type:"remove-clip",clipId:clip.id});
            commands.push({type:"add-asset",asset});
            for(const caption of captionsToFrames(parsed,current.canvas.fps))commands.push({type:"add-clip",trackId:"captions-main",clip:{...caption,id:`${assetId}-${caption.id}`}});
          }else commands.push({type:"add-asset",asset});
          return commands;
        };

        const committed=await this.mutations.mutate({
          projectId:input.projectId,expectedRevision,operationId,kind:"media",
          payload:mutationPayload,
          apply:async current=>applyProjectCommandTransaction(current,{id:operationId,label:`Import ${safeName}`,commands:await commandsFor(current)}),
        });
        return{project:committed.project,alreadyApplied:committed.alreadyApplied,import:report};
      }catch(error){
        // Only this operation's deterministic candidate paths are eligible. The
        // operation lock prevents a same-operation retry from racing cleanup.
        if(cleanupCandidates.length)await this.repository.cleanupUnreferencedProjectFiles(input.projectId,cleanupCandidates).catch(()=>undefined);
        throw error;
      }
    });
  }
}
