import {readFile} from "node:fs/promises";
import {homedir} from "node:os";
import {join,parse} from "node:path";
import type {ToolExecutionOptions,TranscriptWord,VideoUseAdapter,VideoUsePrepareResult} from "@/adapters/contracts";
import {nodeToolRunner,parseToolTimeout,type ToolRunner} from "@/lib/process/tool-runner";

type ScribeWord={type?:string;text?:string;start?:number;end?:number;speaker_id?:string};
type ScribePayload={text?:string;words?:ScribeWord[]};
const DEFAULT_VIDEO_USE_TIMEOUT_MS=30*60*1000;

export const parseScribePayload=(payload:ScribePayload):{words:TranscriptWord[];text:string}=>{
  const words=(payload.words??[]).flatMap((word):TranscriptWord[]=>{
    if((word.type!=="word"&&word.type!=="audio_event")||typeof word.start!=="number"||typeof word.end!=="number"||!word.text)return [];
    return[{text:word.text,startSeconds:word.start,endSeconds:word.end,speakerId:word.speaker_id,type:word.type}];
  });
  return{words,text:payload.text?.trim()||words.map(word=>word.text).join(" ")};
};

export const buildVideoUsePrepareArgs=(transcribePath:string,inputPath:string,editDir:string)=>[transcribePath,inputPath,"--edit-dir",editDir];
export const buildVideoUsePackArgs=(packPath:string,editDir:string)=>[packPath,"--edit-dir",editDir];
export const buildVideoUseRenderArgs=(renderPath:string,edlPath:string,outputPath:string,preview:boolean)=>[renderPath,edlPath,"-o",outputPath,...(preview?["--preview"]:[])];
export const buildVideoUseTimelineArgs=(timelinePath:string,videoPath:string,startSeconds:number,endSeconds:number,outputPath?:string)=>[timelinePath,videoPath,String(startSeconds),String(endSeconds),...(outputPath?["-o",outputPath]:[])];

export class NodeVideoUseAdapter implements VideoUseAdapter{
  private readonly root:string;
  private readonly python:string;
  constructor(root=process.env.VIDEO_USE_ROOT||join(homedir(),".codex","skills","video-use"),python=process.env.VIDEO_USE_PYTHON||(process.platform==="win32"?"python":"python3"),private readonly runner:ToolRunner=nodeToolRunner){
    this.root=root;this.python=python;
  }
  private helper(name:string){return join(this.root,"helpers",name);}
  private async run(tool:string,args:string[],options:ToolExecutionOptions={}){
    try{
      return await this.runner.run({tool,command:this.python,args,cwd:this.root,timeoutMs:options.timeoutMs??parseToolTimeout(process.env.VIDEO_USE_TIMEOUT_MS,DEFAULT_VIDEO_USE_TIMEOUT_MS),signal:options.signal,onLog:options.onLog});
    }catch(error){
      throw new Error(`video-use helper failed: ${error instanceof Error?error.message:String(error)}. Verify VIDEO_USE_ROOT, Python dependencies and FFmpeg, then retry.`);
    }
  }
  async prepare({inputPath,editDir}:{inputPath:string;editDir:string},options:ToolExecutionOptions={}):Promise<VideoUsePrepareResult>{
    await this.run("video-use-transcribe",buildVideoUsePrepareArgs(this.helper("transcribe.py"),inputPath,editDir),options);
    await this.run("video-use-pack",buildVideoUsePackArgs(this.helper("pack_transcripts.py"),editDir),options);
    const transcriptPath=join(editDir,"transcripts",`${parse(inputPath).name}.json`);
    const packedTranscriptPath=join(editDir,"takes_packed.md");
    const[payloadText,packedText]=await Promise.all([readFile(transcriptPath,"utf8"),readFile(packedTranscriptPath,"utf8")]);
    return{...parseScribePayload(JSON.parse(payloadText) as ScribePayload),packedText,transcriptPath,packedTranscriptPath};
  }
  async renderEdl({edlPath,outputPath,preview}:{edlPath:string;outputPath:string;preview:boolean},options:ToolExecutionOptions={}){
    await this.run("video-use-render-edl",buildVideoUseRenderArgs(this.helper("render.py"),edlPath,outputPath,preview),options);
    return{outputPath};
  }
  async timelineView({videoPath,startSeconds,endSeconds,outputPath}:{videoPath:string;startSeconds:number;endSeconds:number;outputPath?:string},options:ToolExecutionOptions={}){
    await this.run("video-use-timeline",buildVideoUseTimelineArgs(this.helper("timeline_view.py"),videoPath,startSeconds,endSeconds,outputPath),options);
    return{artifactPath:outputPath};
  }
}
