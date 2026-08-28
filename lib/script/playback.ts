export type ScriptWordRange={id:string;startFrame:number;endFrame:number};

export const findActiveScriptWordId=(ranges:ScriptWordRange[],sourceFrame:number|null):string|null=>{
  if(sourceFrame===null||!ranges.length)return null;
  let low=0;
  let high=ranges.length-1;
  let candidate=-1;
  while(low<=high){
    const mid=(low+high)>>1;
    if(ranges[mid]!.startFrame<=sourceFrame){candidate=mid;low=mid+1;}else high=mid-1;
  }
  if(candidate<0)return null;
  const range=ranges[candidate]!;
  return sourceFrame<range.endFrame?range.id:null;
};
