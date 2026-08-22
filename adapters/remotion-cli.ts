import {mkdir,writeFile} from "node:fs/promises";
import {dirname,join} from "node:path";
import type {RemotionRenderAdapter,ToolExecutionOptions} from "@/adapters/contracts";
import {exportQualityCrf} from "@/lib/render/profile";
import {nodeToolRunner,parseToolTimeout,type ToolRunner} from "@/lib/process/tool-runner";
import {resolveProjectNodeBin} from "@/lib/process/project-bin";

export const REMOTION_RUNTIME_VERSION="4.0.513";
const DEFAULT_REMOTION_TIMEOUT_MS=30*60*1000;
export const buildRemotionRenderArgs=(input:Parameters<RemotionRenderAdapter["render"]>[0],entryPoint:string,propsPath:string)=>{const{project,outputPath,mode,quality="high",includeAudio=true}=input;const args=["render",entryPoint,"VideoOSMaster",outputPath,"--props",propsPath,"--width",String(project.canvas.width),"--height",String(project.canvas.height),"--fps",String(project.canvas.fps),"--duration",String(project.canvas.durationInFrames),"--overwrite","--concurrency",process.env.REMOTION_RENDER_CONCURRENCY||"2"];if(mode==="overlay")args.push("--image-format=png","--pixel-format=yuva420p","--codec=vp9","--muted");else{args.push("--codec=h264",`--crf=${exportQualityCrf(quality)}`);if(!includeAudio)args.push("--muted");}return args;};

export class NodeRemotionCliAdapter implements RemotionRenderAdapter{
  constructor(private readonly entryPoint=join(process.cwd(),"remotion","index.ts"),private readonly runner:ToolRunner=nodeToolRunner){}
  async render(input:Parameters<RemotionRenderAdapter["render"]>[0],options:ToolExecutionOptions={}){
    const{project,outputPath,mode,assetBaseUrl}=input;await mkdir(dirname(outputPath),{recursive:true});const propsPath=`${outputPath}.props.json`;const assetUrls=Object.fromEntries(project.assets.map(asset=>[asset.id,`${assetBaseUrl}/api/projects/${encodeURIComponent(project.project.id)}/assets/${encodeURIComponent(asset.id)}`]));await writeFile(propsPath,JSON.stringify({project,assetUrls,renderMode:mode}),"utf8");
    const cli=await resolveProjectNodeBin("@remotion/cli","remotion",REMOTION_RUNTIME_VERSION);const renderArgs=buildRemotionRenderArgs(input,this.entryPoint,propsPath);
    await this.runner.run({tool:"remotion-render",command:cli.command,args:[...cli.argsPrefix,...renderArgs],timeoutMs:options.timeoutMs??parseToolTimeout(process.env.REMOTION_RENDER_TIMEOUT_MS,DEFAULT_REMOTION_TIMEOUT_MS),signal:options.signal,onLog:options.onLog});
    return{outputPath};
  }
}
