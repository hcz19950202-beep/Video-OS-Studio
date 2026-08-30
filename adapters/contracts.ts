import type {Project} from "@/schemas/project";
import type {ToolLogEvent} from "@/lib/process/tool-runner";

export type ToolExecutionOptions={signal?:AbortSignal;timeoutMs?:number;onLog?:(event:ToolLogEvent)=>void};
export type MediaProbeResult={durationSeconds:number;width?:number;height?:number;fps?:number;hasAudio:boolean};
export type VideoNormalizationInput={inputPath:string;outputPath:string};
export type AudioNormalizationInput={inputPath:string;outputPath:string};
export interface FileSystemAdapter{exists(path:string):Promise<boolean>;readText(path:string):Promise<string>;readBinary(path:string):Promise<Uint8Array>;ensureDir(path:string):Promise<void>;listDirectories(path:string):Promise<string[]>;listFiles(path:string):Promise<string[]>;writeBinary(path:string,content:Uint8Array):Promise<void>;moveFile(sourcePath:string,targetPath:string):Promise<void>;removeFile(path:string):Promise<void>;appendText(path:string,content:string):Promise<void>;writeTextAtomic(path:string,content:string,backupPath?:string):Promise<void>;withExclusiveLock?<T>(lockPath:string,work:()=>Promise<T>):Promise<T>;}
export interface FfmpegAdapter{probe(inputPath:string,options?:ToolExecutionOptions):Promise<MediaProbeResult>;waveformPeaks(inputPath:string,points:number,options?:ToolExecutionOptions):Promise<number[]>;normalizeVideo(input:VideoNormalizationInput,options?:ToolExecutionOptions):Promise<{outputPath:string}>;normalizeAudio(input:AudioNormalizationInput,options?:ToolExecutionOptions):Promise<{outputPath:string}>;}
export type RemotionVideoBackend="offthread-video"|"html5-video";
export type RemotionRenderResult={outputPath:string;backend?:RemotionVideoBackend;fallbackUsed?:boolean;fallbackReason?:string};
export interface RemotionRenderAdapter{render(input:{project:Project;outputPath:string;mode:"final"|"overlay";assetBaseUrl:string;quality?:"draft"|"standard"|"high";includeAudio?:boolean},options?:ToolExecutionOptions):Promise<RemotionRenderResult>;}
export interface HyperFramesAdapter{render(input:{effectId:string;props:Record<string,unknown>;width:number;height:number;fps:number;durationInFrames:number;outputPath:string},options?:ToolExecutionOptions):Promise<{outputPath:string}>;}

export type TranscriptWord={text:string;startSeconds:number;endSeconds:number;speakerId?:string;type?:"word"|"audio_event"};
export type VideoUsePrepareResult={words:TranscriptWord[];text:string;packedText:string;transcriptPath:string;packedTranscriptPath:string};
export interface VideoUseAdapter{prepare(input:{inputPath:string;editDir:string},options?:ToolExecutionOptions):Promise<VideoUsePrepareResult>;renderEdl(input:{edlPath:string;outputPath:string;preview:boolean},options?:ToolExecutionOptions):Promise<{outputPath:string}>;timelineView(input:{videoPath:string;startSeconds:number;endSeconds:number;outputPath?:string},options?:ToolExecutionOptions):Promise<{artifactPath?:string}>;}
