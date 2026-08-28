export type WaveformCacheKeyInput={
  projectId:string;
  assetId:string;
  points:number;
  relativePath?:string;
  durationInFrames?:number;
  hasAudio?:boolean;
};

const MAX_CACHE_ENTRIES=128;
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

const remember=(key:string,peaks:number[])=>{
  peaksCache.delete(key);
  peaksCache.set(key,peaks);
  while(peaksCache.size>MAX_CACHE_ENTRIES){
    const oldest=peaksCache.keys().next().value as string|undefined;
    if(oldest===undefined)break;
    peaksCache.delete(oldest);
  }
};

export const loadCachedWaveform=(key:string,loader:()=>Promise<number[]>):Promise<number[]>=>{
  if(peaksCache.has(key)){
    const peaks=peaksCache.get(key)!;
    remember(key,peaks);
    return Promise.resolve(peaks);
  }
  const pending=inFlight.get(key);
  if(pending)return pending;
  const request=loader().then(peaks=>{
    remember(key,peaks);
    return peaks;
  }).finally(()=>{inFlight.delete(key);});
  inFlight.set(key,request);
  return request;
};

export const clearWaveformRequestCache=()=>{
  peaksCache.clear();
  inFlight.clear();
};
