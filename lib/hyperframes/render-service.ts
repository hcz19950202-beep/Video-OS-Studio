import {createHash,randomUUID} from "node:crypto";
import type {FileSystemAdapter,HyperFramesAdapter} from "@/adapters/contracts";
import {applyProjectCommand} from "@/lib/project/commands";
import type {ProjectRepository} from "@/lib/project/repository";
import {parseHyperFramesEffect} from "@/shared/hyperframes/registry";
import type {MotionTransform} from "@/schemas/clip";
import type {Project} from "@/schemas/project";

export type PreparedHyperFramesAsset={
  assetId:string;
  effectId:string;
  props:Record<string,unknown>;
  asset:Project["assets"][number];
};

type HyperFramesInput={projectId:string;effectId:string;props:Record<string,unknown>;startFrame:number;durationInFrames:number;transform?:MotionTransform};

export class HyperFramesRenderService{
  constructor(private readonly fs:FileSystemAdapter,private readonly adapter:HyperFramesAdapter,private readonly repository:ProjectRepository){}

  async prepare(input:HyperFramesInput):Promise<PreparedHyperFramesAsset>{
    const project=await this.repository.load(input.projectId);
    const parsed=parseHyperFramesEffect(input.effectId,input.props);
    const cacheKey=createHash("sha256").update(JSON.stringify({effectId:parsed.effectId,props:parsed.props,width:project.canvas.width,height:project.canvas.height,fps:project.canvas.fps,durationInFrames:input.durationInFrames})).digest("hex").slice(0,16);
    const assetId=`hf-${parsed.effectId}-${cacheKey}`;
    const relativePath=`animations/${assetId}.webm`;
    const absolutePath=this.repository.resolveProjectFile(project.project.id,relativePath);
    if(!(await this.fs.exists(absolutePath)))await this.adapter.render({effectId:parsed.effectId,props:parsed.props,width:project.canvas.width,height:project.canvas.height,fps:project.canvas.fps,durationInFrames:input.durationInFrames,outputPath:absolutePath});
    return{
      assetId,
      effectId:parsed.effectId,
      props:parsed.props,
      asset:{id:assetId,kind:"overlay",relativePath,label:parsed.effectId,mimeType:"video/webm",durationInFrames:input.durationInFrames,width:project.canvas.width,height:project.canvas.height,sourceFps:project.canvas.fps,hasAudio:false},
    };
  }

  async renderAndAdd(input:HyperFramesInput):Promise<Project>{
    let project=await this.repository.load(input.projectId);
    const prepared=await this.prepare(input);
    if(!project.assets.some(asset=>asset.id===prepared.assetId))project=applyProjectCommand(project,{type:"add-asset",asset:prepared.asset});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"motion-main",clip:{id:`motion-${prepared.assetId}-${randomUUID()}`,type:"motion",engine:"hyperframes",effectId:prepared.effectId,assetId:prepared.assetId,props:prepared.props,transform:input.transform,startFrame:input.startFrame,durationInFrames:input.durationInFrames,enabled:true,layer:20}});
    await this.repository.save(project);
    return project;
  }
}
