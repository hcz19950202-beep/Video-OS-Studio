export type ProcessLivenessProbe=(pid:number)=>Promise<boolean>;

export const probeExecutorLiveness=async(
  pids:Iterable<number|undefined>,
  probe:ProcessLivenessProbe,
):Promise<Map<number,boolean>>=>{
  const uniquePids=[...new Set([...pids].filter((pid):pid is number=>pid!==undefined))];
  const results=await Promise.all(uniquePids.map(async pid=>[pid,await probe(pid)] as const));
  return new Map(results);
};
