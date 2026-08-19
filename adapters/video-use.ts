import {execFile} from "node:child_process";
import {readFile} from "node:fs/promises";
import {homedir} from "node:os";
import {join,parse} from "node:path";
import {promisify} from "node:util";
import type {TranscriptWord,VideoUseAdapter,VideoUsePrepareResult} from "@/adapters/contracts";

const execFileAsync=promisify(execFile);
type ScribeWord={type?:string;text?:string;start?:number;end?:number;speaker_id?:string};
type ScribePayload={text?:string;words?:ScribeWord[]};

export const parseScribePayload=(payload:ScribePayload):{words:TranscriptWord[];text:string}=>{
  const words=(payload.words??[]).flatMap((word):TranscriptWord[]=>{
    if((word.type!=="word"&&word.type!=="audio_event")||typeof word.start!=="number"||typeof word.end!=="number"||!word.text)return [];
    return [{text:word.text,startSeconds:word.start,endSeconds:word.end,speakerId:word.speaker_id,type:word.type}];
  });
  return {words,text:payload.text?.trim()||words.map((word)=>word.text).join(" ")};
};

export class NodeVideoUseAdapter implements VideoUseAdapter{
  private readonly root:string;
  private readonly python:string;
  constructor(root=process.env.VIDEO_USE_ROOT||join(homedir(),".codex","skills","video-use"),python=process.env.VIDEO_USE_PYTHON||(process.platform==="win32"?"python":"python3")){
    this.root=root;this.python=python;
  }
  private helper(name:string){return join(this.root,"helpers",name);}
  private async run(args:string[]){
    try{return await execFileAsync(this.python,args,{cwd:this.root,windowsHide:true,maxBuffer:20*1024*1024,env:process.env});}
    catch(error){throw new Error(`video-use helper failed: ${error instanceof Error?error.message:String(error)}. Verify VIDEO_USE_ROOT, Python dependencies and ffmpeg, then retry.`);}
  }
  async prepare({inputPath,editDir}:{inputPath:string;editDir:string}):Promise<VideoUsePrepareResult>{
    await this.run([this.helper("transcribe.py"),inputPath,"--edit-dir",editDir]);
    await this.run([this.helper("pack_transcripts.py"),"--edit-dir",editDir]);
    const transcriptPath=join(editDir,"transcripts",`${parse(inputPath).name}.json`);
    const packedTranscriptPath=join(editDir,"takes_packed.md");
    const[payloadText,packedText]=await Promise.all([readFile(transcriptPath,"utf8"),readFile(packedTranscriptPath,"utf8")]);
    return {...parseScribePayload(JSON.parse(payloadText) as ScribePayload),packedText,transcriptPath,packedTranscriptPath};
  }
  async renderEdl({edlPath,outputPath,preview}:{edlPath:string;outputPath:string;preview:boolean}){
    await this.run([this.helper("render.py"),edlPath,"-o",outputPath,...(preview?["--preview"]:[])]);
    return {outputPath};
  }
  async timelineView({videoPath,startSeconds,endSeconds,outputPath}:{videoPath:string;startSeconds:number;endSeconds:number;outputPath?:string}){
    const args=[this.helper("timeline_view.py"),videoPath,String(startSeconds),String(endSeconds)];
    if(outputPath)args.push("-o",outputPath);
    await this.run(args);
    return {artifactPath:outputPath};
  }
}
