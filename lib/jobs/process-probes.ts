export type ProcessLivenessProbe=(pid:number)=>Promise<boolean>;

export const probeExecutorLiveness=async(
  pids:Iterable<number|undefined>,
  probe:ProcessLivenessProbe,
  concurrency=8,
):Promise<Map<number,boolean>>=>{
  const uniquePids=[...new Set([...pids].filter((pid):pid is number=>pid!==undefined))];
  if(uniquePids.length===0)return new Map();
  const workerCount=Math.max(1,Math.min(uniquePids.length,Math.floor(concurrency)||1));
  const results=new Array<readonly[number,boolean]>(uniquePids.length);
  let nextIndex=0;
  await Promise.all(Array.from({length:workerCount},async()=>{
    for(;;){
      const index=nextIndex++;
      if(index>=uniquePids.length)return;
      const pid=uniquePids[index]!;
      results[index]=[pid,await probe(pid)] as const;
    }
  }));
  return new Map(results);
};
