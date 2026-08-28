import {describe,expect,it} from "vitest";
import {replaceFileAtomically} from "@/lib/fs/atomic-replace";

const errno=(code:string)=>Object.assign(new Error(code),{code});

describe("H5 Windows atomic replace retry",()=>{
  it.each(["EPERM","EACCES","EBUSY"])("retries transient Windows %s failures",async code=>{
    let attempts=0;
    const delays:number[]=[];

    await replaceFileAtomically("source.tmp","target.json",{
      platform:"win32",
      initialDelayMs:5,
      maxDelayMs:20,
      sleep:async ms=>{delays.push(ms);},
      renameFile:async()=>{
        attempts+=1;
        if(attempts<3)throw errno(code);
      },
    });

    expect(attempts).toBe(3);
    expect(delays).toEqual([5,10]);
  });

  it("does not retry the same errno outside Windows",async()=>{
    let attempts=0;
    await expect(replaceFileAtomically("source.tmp","target.json",{
      platform:"linux",
      sleep:async()=>{},
      renameFile:async()=>{attempts+=1;throw errno("EPERM");},
    })).rejects.toMatchObject({code:"EPERM"});
    expect(attempts).toBe(1);
  });

  it("fails closed immediately for non-transient errors",async()=>{
    let attempts=0;
    await expect(replaceFileAtomically("source.tmp","target.json",{
      platform:"win32",
      sleep:async()=>{},
      renameFile:async()=>{attempts+=1;throw errno("ENOENT");},
    })).rejects.toMatchObject({code:"ENOENT"});
    expect(attempts).toBe(1);
  });

  it("stops after the configured retry budget",async()=>{
    let attempts=0;
    const delays:number[]=[];
    await expect(replaceFileAtomically("source.tmp","target.json",{
      platform:"win32",
      maxAttempts:3,
      initialDelayMs:5,
      maxDelayMs:20,
      sleep:async ms=>{delays.push(ms);},
      renameFile:async()=>{attempts+=1;throw errno("EPERM");},
    })).rejects.toMatchObject({code:"EPERM"});
    expect(attempts).toBe(3);
    expect(delays).toEqual([5,10]);
  });
});
