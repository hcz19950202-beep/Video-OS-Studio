import {describe,expect,it} from "vitest";
import {probeExecutorLiveness} from "@/lib/jobs/process-probes";

const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

describe("executor liveness probing",()=>{
  it("deduplicates PIDs and respects the configured concurrency bound",async()=>{
    let active=0;
    let maxActive=0;
    const calls:number[]=[];
    const result=await probeExecutorLiveness([11,12,13,11,14,15,undefined],async pid=>{
      calls.push(pid);
      active+=1;
      maxActive=Math.max(maxActive,active);
      await sleep(10);
      active-=1;
      return pid%2===1;
    },2);
    expect(new Set(calls)).toEqual(new Set([11,12,13,14,15]));
    expect(calls).toHaveLength(5);
    expect(maxActive).toBeLessThanOrEqual(2);
    expect(result.get(11)).toBe(true);
    expect(result.get(12)).toBe(false);
  });
});
