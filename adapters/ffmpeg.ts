import type {AudioNormalizationInput,FfmpegAdapter,MediaProbeResult,ToolExecutionOptions,VideoNormalizationInput} from "@/adapters/contracts";
import {nodeToolRunner,parseToolTimeout,type ToolRunner} from "@/lib/process/tool-runner";

type FfprobeStream={codec_type?:string;width?:number;height?:number;avg_frame_rate?:string;r_frame_rate?:string};
type FfprobePayload={streams?:FfprobeStream[];format?:{duration?:string|number}};
const DEFAULT_FFMPEG_TIMEOUT_MS=20*60*1000;
const DEFAULT_FFPROBE_TIMEOUT_MS=2*60*1000;

const parseFraction=(value?:string):number|undefined=>{if(!value||value==="0/0")return undefined;const[numeratorText,denominatorText]=value.split("/");const numerator=Number(numeratorText);const denominator=denominatorText===undefined?1:Number(denominatorText);if(!Number.isFinite(numerator)||!Number.isFinite(denominator)||denominator===0)return undefined;const result=numerator/denominator;return Number.isFinite(result)&&result>0?result:undefined;};
export const parseFfprobeJson=(payload:FfprobePayload):MediaProbeResult=>{const streams=payload.streams??[];const video=streams.find(stream=>stream.codec_type==="video");const durationSeconds=Number(payload.format?.duration??0);if(!Number.isFinite(durationSeconds)||durationSeconds<=0)throw new Error("ffprobe did not return a valid positive media duration");return{durationSeconds,width:video?.width,height:video?.height,fps:parseFraction(video?.avg_frame_rate)??parseFraction(video?.r_frame_rate),hasAudio:streams.some(stream=>stream.codec_type==="audio")};};

const rawWaveformToPeaks=(bytes:Uint8Array,points:number,height:number)=>{if(bytes.length<points*height)throw new Error(`ffmpeg waveform returned ${bytes.length} bytes, expected at least ${points*height}`);const center=(height-1)/2;const half=Math.max(1,center);const peaks:number[]=[];for(let x=0;x<points;x++){let distance=0;for(let y=0;y<height;y++){const value=bytes[y*points+x]??0;if(value>16)distance=Math.max(distance,Math.abs(y-center));}peaks.push(Math.max(.02,Math.min(1,distance/half)));}return peaks;};

export const buildFfprobeArgs=(inputPath:string)=>["-v","error","-print_format","json","-show_streams","-show_format",inputPath];
export const buildWaveformArgs=(inputPath:string,width:number,height:number)=>["-v","error","-i",inputPath,"-filter_complex",`aformat=channel_layouts=mono,showwavespic=s=${width}x${height}:colors=white`,"-frames:v","1","-f","rawvideo","-pix_fmt","gray","pipe:1"];
export const buildNormalizeVideoArgs=(inputPath:string,outputPath:string)=>["-y","-v","error","-i",inputPath,"-map","0:v:0","-map","0:a?","-c:v","libx264","-pix_fmt","yuv420p","-preset","medium","-crf","18","-c:a","aac","-b:a","192k","-movflags","+faststart",outputPath];
export const buildNormalizeAudioArgs=(inputPath:string,outputPath:string)=>["-y","-v","error","-i",inputPath,"-vn","-c:a","aac","-b:a","192k","-movflags","+faststart",outputPath];

export class NodeFfmpegAdapter implements FfmpegAdapter{
  constructor(private readonly ffprobePath=process.env.FFPROBE_PATH||"ffprobe",private readonly ffmpegPath=process.env.FFMPEG_PATH||"ffmpeg",private readonly runner:ToolRunner=nodeToolRunner){}
  private ffmpegOptions(options:ToolExecutionOptions={}){return{timeoutMs:options.timeoutMs??parseToolTimeout(process.env.FFMPEG_TIMEOUT_MS,DEFAULT_FFMPEG_TIMEOUT_MS),signal:options.signal,onLog:options.onLog};}
  async probe(inputPath:string,options:ToolExecutionOptions={}):Promise<MediaProbeResult>{
    const result=await this.runner.run({tool:"ffprobe",command:this.ffprobePath,args:buildFfprobeArgs(inputPath),timeoutMs:options.timeoutMs??parseToolTimeout(process.env.FFPROBE_TIMEOUT_MS,DEFAULT_FFPROBE_TIMEOUT_MS),signal:options.signal,onLog:options.onLog});
    return parseFfprobeJson(JSON.parse(result.stdout) as FfprobePayload);
  }
  async waveformPeaks(inputPath:string,points:number,options:ToolExecutionOptions={}):Promise<number[]>{
    const width=Math.max(32,Math.min(1024,Math.round(points)));const height=64;
    const result=await this.runner.run({tool:"ffmpeg-waveform",command:this.ffmpegPath,args:buildWaveformArgs(inputPath,width,height),stdoutMode:"buffer",maxCaptureBytes:Math.max(2*1024*1024,width*height*2),...this.ffmpegOptions(options)});
    return rawWaveformToPeaks(result.stdoutBytes,width,height);
  }
  async normalizeVideo({inputPath,outputPath}:VideoNormalizationInput,options:ToolExecutionOptions={}):Promise<{outputPath:string}>{
    await this.runner.run({tool:"ffmpeg-normalize-video",command:this.ffmpegPath,args:buildNormalizeVideoArgs(inputPath,outputPath),stdoutMode:"discard",...this.ffmpegOptions(options)});
    return{outputPath};
  }
  async normalizeAudio({inputPath,outputPath}:AudioNormalizationInput,options:ToolExecutionOptions={}):Promise<{outputPath:string}>{
    await this.runner.run({tool:"ffmpeg-normalize-audio",command:this.ffmpegPath,args:buildNormalizeAudioArgs(inputPath,outputPath),stdoutMode:"discard",...this.ffmpegOptions(options)});
    return{outputPath};
  }
}
