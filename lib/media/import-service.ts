import {randomUUID} from "node:crypto";
import type {FileSystemAdapter,FfmpegAdapter} from "@/adapters/contracts";
import {applyProjectCommand} from "@/lib/project/commands";
import type {ProjectRepository} from "@/lib/project/repository";
import type {Asset} from "@/schemas/asset";
import type {Project} from "@/schemas/project";
import {captionsToFrames,parseSubtitleText} from "@/lib/captions/parser";
import {planMediaImport,type MediaImportKind,type MediaImportStrategy} from "@/lib/media/import-policy";

const SAFE_FILE_NAME=/[^A-Za-z0-9._-]+/g;
const sanitizeFileName=(name:string)=>{const n=name.replaceAll("\\","/").split("/").pop()||"asset";return n.replace(SAFE_FILE_NAME,"-").replace(/^-+|-+$/g,"")||"asset";};
const withoutExtension=(name:string)=>name.replace(/\.[^.]+$/,"")||"media";

export type ImportMediaInput={projectId:string;fileName:string;mimeType?:string;bytes:Uint8Array};
export type MediaImportReport={kind:MediaImportKind;strategy:MediaImportStrategy;normalized:boolean;assetId:string;originalRelativePath?:string;workingRelativePath:string;workingFileName:string;};
export type MediaImportResult={project:Project;import:MediaImportReport};

export class MediaImportService{
  constructor(private readonly fs:FileSystemAdapter,private readonly ffmpeg:FfmpegAdapter,private readonly repository:ProjectRepository,private readonly idFactory:()=>string=randomUUID){}

  async importFile(input:ImportMediaInput):Promise<Project>{return(await this.importWithReport(input)).project;}

  async importWithReport(input:ImportMediaInput):Promise<MediaImportResult>{
    let project=await this.repository.load(input.projectId);
    const plan=planMediaImport(input.fileName,input.mimeType);
    const assetId=`media-${this.idFactory()}`;
    const safeName=sanitizeFileName(input.fileName);
    let relativePath:string;
    let originalRelativePath:string|undefined;
    let workingFileName=safeName;

    if(plan.kind==="subtitle"){
      relativePath=`captions/${assetId}-${safeName}`;
      await this.fs.writeBinary(this.repository.resolveProjectFile(project.project.id,relativePath),input.bytes);
    }else if(plan.kind==="video"&&plan.strategy==="normalize-video"){
      originalRelativePath=`original/${assetId}-${safeName}`;
      const sourcePath=this.repository.resolveProjectFile(project.project.id,originalRelativePath);
      await this.fs.writeBinary(sourcePath,input.bytes);
      workingFileName=`${withoutExtension(safeName)}-working.mp4`;
      relativePath=`input/${assetId}-${workingFileName}`;
      const workingPath=this.repository.resolveProjectFile(project.project.id,relativePath);
      await this.fs.ensureDir(this.repository.resolveProjectFile(project.project.id,"input"));
      await this.ffmpeg.normalizeVideo({inputPath:sourcePath,outputPath:workingPath});
    }else{
      const folder=plan.kind==="video"?"input":"assets";
      relativePath=`${folder}/${assetId}-${safeName}`;
      await this.fs.writeBinary(this.repository.resolveProjectFile(project.project.id,relativePath),input.bytes);
    }

    const absolutePath=this.repository.resolveProjectFile(project.project.id,relativePath);
    let asset:Asset={id:assetId,kind:plan.kind,relativePath,originalRelativePath,label:safeName,originalName:input.fileName,mimeType:plan.kind==="video"&&plan.strategy==="normalize-video"?"video/mp4":plan.mimeType,originalMimeType:input.mimeType||plan.mimeType,sizeBytes:input.bytes.byteLength};

    if(plan.kind==="video"){
      let probe;
      try{probe=await this.ffmpeg.probe(absolutePath);}catch(error){throw new Error(`Unable to read imported video metadata with ffprobe: ${error instanceof Error?error.message:String(error)}. Verify FFmpeg/ffprobe and retry.`);}
      const durationInFrames=Math.max(1,Math.round(probe.durationSeconds*project.canvas.fps));
      asset={...asset,durationInFrames,width:probe.width,height:probe.height,sourceFps:probe.fps,hasAudio:probe.hasAudio};
      for(const clip of project.tracks.find(track=>track.id==="video-main")?.clips??[])project=applyProjectCommand(project,{type:"remove-clip",clipId:clip.id});
      project=applyProjectCommand(project,{type:"set-duration",durationInFrames});
      project=applyProjectCommand(project,{type:"add-asset",asset});
      project=applyProjectCommand(project,{type:"add-clip",trackId:"video-main",clip:{id:`clip-${assetId}`,type:"video",assetId,startFrame:0,durationInFrames,sourceStartFrame:0,volume:1,enabled:true,layer:0}});
    }else if(plan.kind==="subtitle"){
      const parsed=parseSubtitleText(new TextDecoder().decode(input.bytes));
      if(parsed.length===0)throw new Error("No valid subtitle cues were found. Verify SRT/VTT timestamps and retry.");
      for(const clip of project.tracks.find(track=>track.id==="captions-main")?.clips??[])project=applyProjectCommand(project,{type:"remove-clip",clipId:clip.id});
      project=applyProjectCommand(project,{type:"add-asset",asset});
      for(const caption of captionsToFrames(parsed,project.canvas.fps))project=applyProjectCommand(project,{type:"add-clip",trackId:"captions-main",clip:{...caption,id:`${assetId}-${caption.id}`}});
    }else if(plan.kind==="audio"){
      try{const probe=await this.ffmpeg.probe(absolutePath);asset={...asset,durationInFrames:Math.max(1,Math.round(probe.durationSeconds*project.canvas.fps)),hasAudio:true};}catch{/* Asset remains importable if a specific audio codec cannot be probed in cloud/mock environments. */}
      project=applyProjectCommand(project,{type:"add-asset",asset});
    }else{
      project=applyProjectCommand(project,{type:"add-asset",asset});
    }

    await this.repository.save(project);
    return{project,import:{kind:plan.kind,strategy:plan.strategy,normalized:plan.strategy==="normalize-video",assetId,originalRelativePath,workingRelativePath:relativePath,workingFileName}};
  }
}
