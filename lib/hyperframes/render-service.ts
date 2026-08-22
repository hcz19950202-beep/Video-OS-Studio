import {createHash,randomUUID} from "node:crypto";
import type {FileSystemAdapter,HyperFramesAdapter} from "@/adapters/contracts";
import type {ProjectCommand} from "@/lib/project/commands";
import {applyProjectCommandTransaction} from "@/lib/project/history";
import {ProjectMutationCoordinator,ProjectRevisionConflictError} from "@/lib/project/mutation-coordinator";
import type {ProjectRepository} from "@/lib/project/repository";
import {parseHyperFramesEffect} from "@/shared/hyperframes/registry";
import type {MotionTransform} from "@/schemas/clip";
import type {Project} from "@/schemas/project";

export type PreparedHyperFramesAsset={assetId:string;effectId:string;props:Record<string,unknown>;asset:Project["assets"][number];};
type MutationMeta={expectedRevision:number;operationId:string};
type HyperFramesInput={projectId:string;effectId:string;props:Record<string,unknown>;startFrame:number;durationInFrames:number;transform?:MotionTransform};
const operationSuffix=(operationId:string)=>createHash("sha256").update(operationId).digest("hex").slice(0,12);

export class HyperFramesRenderService{
  private readonly mutations:ProjectMutationCoordinator;
  constructor(private readonly fs:FileSystemAdapter,private readonly adapter:HyperFramesAdapter,private readonly repository:ProjectRepository,mutations?:ProjectMutationCoordinator){this.mutations=mutations??new ProjectMutationCoordinator(fs,repository);}

  async prepare(input:HyperFramesInput,projectInput?:Project):Promise<PreparedHyperFramesAsset>{
    const project=projectInput??await this.repository.load(input.projectId);
    const parsed=parseHyperFramesEffect(input.effectId,input.props);
    const cacheKey=createHash("sha256").update(JSON.stringify({effectId:parsed.effectId,props:parsed.props,width:project.canvas.width,height:project.canvas.height,fps:project.canvas.fps,durationInFrames:input.durationInFrames})).digest("hex").slice(0,16);
    const assetId=`hf-${parsed.effectId}-${cacheKey}`;
    const relativePath=`animations/${assetId}.webm`;
    const absolutePath=this.repository.resolveProjectFile(project.project.id,relativePath);
    if(!(await this.fs.exists(absolutePath)))await this.adapter.render({effectId:parsed.effectId,props:parsed.props,width:project.canvas.width,height:project.canvas.height,fps:project.canvas.fps,durationInFrames:input.durationInFrames,outputPath:absolutePath});
    return{assetId,effectId:parsed.effectId,props:parsed.props,asset:{id:assetId,kind:"overlay",relativePath,label:parsed.effectId,mimeType:"video/webm",durationInFrames:input.durationInFrames,width:project.canvas.width,height:project.canvas.height,sourceFps:project.canvas.fps,hasAudio:false}};
  }

  async renderAndAdd(input:HyperFramesInput,meta?:MutationMeta):Promise<Project>{
    const baseline=await this.repository.load(input.projectId);
    const expectedRevision=meta?.expectedRevision??baseline.project.revision;
    if(baseline.project.revision!==expectedRevision)throw new ProjectRevisionConflictError(expectedRevision,baseline.project.revision);
    const operationId=meta?.operationId??`hyperframes-${randomUUID()}`;
    const prepared=await this.prepare(input,baseline);
    const commandsFor=(current:Project):ProjectCommand[]=>{
      const commands:ProjectCommand[]=[];
      if(!current.assets.some(asset=>asset.id===prepared.assetId))commands.push({type:"add-asset",asset:prepared.asset});
      commands.push({type:"add-clip",trackId:"motion-main",clip:{id:`motion-${prepared.assetId}-${operationSuffix(operationId)}`,type:"motion",engine:"hyperframes",effectId:prepared.effectId,assetId:prepared.assetId,props:prepared.props,transform:input.transform,startFrame:input.startFrame,durationInFrames:input.durationInFrames,enabled:true,layer:20}});
      return commands;
    };
    const committed=await this.mutations.mutate({projectId:input.projectId,expectedRevision,operationId,kind:"hyperframes",payload:{input,assetId:prepared.assetId},apply:current=>applyProjectCommandTransaction(current,{id:operationId,label:`HyperFrames · ${prepared.effectId}`,commands:commandsFor(current)})});
    return committed.project;
  }
}
