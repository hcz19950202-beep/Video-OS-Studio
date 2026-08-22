import type {FfmpegAdapter,HyperFramesAdapter,MediaProbeResult,RemotionRenderAdapter,VideoNormalizationInput,VideoUseAdapter} from "@/adapters/contracts";

const unavailable=(engine:string):never=>{throw new Error(`${engine} is not connected in this environment. LOCAL VERIFICATION REQUIRED.`);};
export class MockFfmpegAdapter implements FfmpegAdapter{
  readonly normalized:Array<VideoNormalizationInput>=[];
  constructor(private readonly result:MediaProbeResult={durationSeconds:3,hasAudio:true},private readonly peaks:number[]=[.1,.4,.8,.3]){}
  async probe(){return this.result;}
  async waveformPeaks(_inputPath:string,points:number){return Array.from({length:points},(_,index)=>this.peaks[index%this.peaks.length]??0);}
  async normalizeVideo(input:VideoNormalizationInput){this.normalized.push(input);return{outputPath:input.outputPath};}
}
export class UnavailableRemotionRenderAdapter implements RemotionRenderAdapter{async render():Promise<{outputPath:string}>{return unavailable("Remotion render");}}
export class UnavailableHyperFramesAdapter implements HyperFramesAdapter{async render():Promise<{outputPath:string}>{return unavailable("HyperFrames");}}
export class UnavailableVideoUseAdapter implements VideoUseAdapter{async prepare():Promise<never>{return unavailable("video-use");}async renderEdl():Promise<never>{return unavailable("video-use");}async timelineView():Promise<never>{return unavailable("video-use");}}
