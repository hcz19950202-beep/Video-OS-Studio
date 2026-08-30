import {mkdir,rm,writeFile} from "node:fs/promises";
import {dirname,join} from "node:path";
import type {RemotionRenderAdapter,RemotionVideoBackend,ToolExecutionOptions} from "@/adapters/contracts";
import {exportQualityCrf} from "@/lib/render/profile";
import {nodeToolRunner,parseToolTimeout,ToolRunError,type ToolRunner} from "@/lib/process/tool-runner";
import {resolveProjectNodeBin} from "@/lib/process/project-bin";

export const REMOTION_RUNTIME_VERSION="4.0.513";
const DEFAULT_REMOTION_TIMEOUT_MS=30*60*1000;
const OFFTHREAD_FRAME_GAP_SIGNATURE="No frame found at position";
const OFFTHREAD_FALLBACK_REASON="offthread-frame-extraction";

export const isRemotionOffthreadFrameExtractionError=(error:unknown)=>{
  if(!(error instanceof ToolRunError)||error.code!=="TOOL_RUN_FAILED")return false;
  const details=`${error.stdoutTail}\n${error.stderrTail}`;
  return details.includes(OFFTHREAD_FRAME_GAP_SIGNATURE);
};

export const buildRemotionRenderArgs=(input:Parameters<RemotionRenderAdapter["render"]>[0],entryPoint:string,propsPath:string)=>{const{project,outputPath,mode,quality="high",includeAudio=true}=input;const args=["render",entryPoint,"VideoOSMaster",outputPath,"--props",propsPath,"--width",String(project.canvas.width),"--height",String(project.canvas.height),"--fps",String(project.canvas.fps),"--duration",String(project.canvas.durationInFrames),"--overwrite","--concurrency",process.env.REMOTION_RENDER_CONCURRENCY||"2"];if(mode==="overlay")args.push("--image-format=png","--pixel-format=yuva420p","--codec=vp9","--muted");else{args.push("--codec=h264",`--crf=${exportQualityCrf(quality)}`);if(!includeAudio)args.push("--muted");}return args;};

export class NodeRemotionCliAdapter implements RemotionRenderAdapter{
  constructor(private readonly entryPoint=join(process.cwd(),"remotion","index.ts"),private readonly runner:ToolRunner=nodeToolRunner){}
  async render(input:Parameters<RemotionRenderAdapter["render"]>[0],options:ToolExecutionOptions={}){
    const{project,outputPath,mode,assetBaseUrl}=input;await mkdir(dirname(outputPath),{recursive:true});const propsPath=`${outputPath}.props.json`;const assetUrls=Object.fromEntries(project.assets.map(asset=>[asset.id,`${assetBaseUrl}/api/projects/${encodeURIComponent(project.project.id)}/assets/${encodeURIComponent(asset.id)}`]));
    const writeProps=(ordinaryVideoBackend:RemotionVideoBackend)=>writeFile(propsPath,JSON.stringify({project,assetUrls,renderMode:mode,ordinaryVideoBackend}),"utf8");
    let backend:RemotionVideoBackend="offthread-video";
    let fallbackUsed=false;
    let fallbackReason:string|undefined;
    try{
      const cli=await resolveProjectNodeBin("@remotion/cli","remotion",REMOTION_RUNTIME_VERSION);const renderArgs=buildRemotionRenderArgs(input,this.entryPoint,propsPath);const run=()=>this.runner.run({tool:"remotion-render",command:cli.command,args:[...cli.argsPrefix,...renderArgs],timeoutMs:options.timeoutMs??parseToolTimeout(process.env.REMOTION_RENDER_TIMEOUT_MS,DEFAULT_REMOTION_TIMEOUT_MS),signal:options.signal,onLog:options.onLog});
      await writeProps(backend);
      try{await run();}
      catch(error){
        if(!isRemotionOffthreadFrameExtractionError(error))throw error;
        await rm(outputPath,{force:true});
        backend="html5-video";
        fallbackUsed=true;
        fallbackReason=OFFTHREAD_FALLBACK_REASON;
        await writeProps(backend);
        options.onLog?.({tool:"remotion-render",stream:"stderr",chunk:`REMOTION_VIDEO_BACKEND_FALLBACK=${backend} reason=${fallbackReason}\n`});
        await run();
      }
      return{outputPath,backend,fallbackUsed,...(fallbackReason?{fallbackReason}:{})};
    }finally{
      await rm(propsPath,{force:true});
    }
  }
}