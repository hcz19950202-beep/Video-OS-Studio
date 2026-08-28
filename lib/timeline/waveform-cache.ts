export type WaveformCacheKeyInput={
  projectId:string;
  assetId:string;
  points:number;
  relativePath?:string;
  durationInFrames?:number;
  hasAudio?:boolean;
};

const peaksCache=new Map<string,number[]>();
const inFlight=new Map<string,Promise<number[]>>();

export const createWaveformCacheKey=(input:WaveformCacheKeyInput)=>JSON.stringify([
  input.projectId,
  input.assetId,
  input.points,
  input.relativePath??"",
  input.durationInFrames??null,
  input.hasAudio??null,
]);

export const loadCachedWaveform=(key:string,loader:()=>Promise<number[]>):Promise<number[]>=>{
  if(peaksCache.has(key))return Promise.resolve(peaksCache.get(key)!);
  const pending=inFlight.get(key);
  if(pending)return pending;
  const request=loader().then(peaks=>{
    peaksCache.set(key,peaks);
    return peaks;
  }).finally(()=>{inFlight.delete(key);});
  inFlight.set(key,request);
  return request;
};

export const clearWaveformRequestCache=()=>{
  peaksCache.clear();
  inFlight.clear();
};
