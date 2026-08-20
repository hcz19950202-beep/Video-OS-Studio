import type {FfmpegAdapter,HyperFramesAdapter,MediaProbeResult,RemotionRenderAdapter,VideoUseAdapter} from "@/adapters/contracts";

const unavailable=(engine:string):never=>{throw new Error(`${engine} is not connected in this environment. LOCAL VERIFICATION REQUIRED.`);};

export class MockFfmpegAdapter implements FfmpegAdapter{
  constructor(private readonly result:MediaProbeResult={durationSeconds:3,hasAudio:true}){}
  async probe(){return this.result;}
}
export class UnavailableRemotionRenderAdapter implements RemotionRenderAdapter{async render():Promise<{outputPath:string}>{return unavailable("Remotion render");}}
export class UnavailableHyperFramesAdapter implements HyperFramesAdapter{async render():Promise<{outputPath:string}>{return unavailable("HyperFrames");}}
export class UnavailableVideoUseAdapter implements VideoUseAdapter{
  async prepare():Promise<never>{return unavailable("video-use");}
  async renderEdl():Promise<never>{return unavailable("video-use");}
  async timelineView():Promise<never>{return unavailable("video-use");}
}
