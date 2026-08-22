import {describe,expect,it} from "vitest";
import {NodeToolRunner,ToolAbortedError,ToolTimeoutError,buildWindowsTreeKillArgs} from "@/lib/process/tool-runner";

const runner=new NodeToolRunner();

describe("H2 ToolRunner",()=>{
  it("passes argv literally without shell interpolation and streams text logs",async()=>{
    const logs:string[]=[];
    const args=["value with spaces","ampersand&value",'quote"value',"unicode-路径"];
    const script="process.stdout.write(JSON.stringify(process.argv.slice(1)));process.stderr.write('stderr-ok')";
    const result=await runner.run({tool:"argv-test",command:process.execPath,args:["-e",script,...args],timeoutMs:5000,killTree:false,onLog:event=>logs.push(`${event.stream}:${event.chunk}`)});
    expect(JSON.parse(result.stdout)).toEqual(args);
    expect(result.stderr).toContain("stderr-ok");
    expect(logs.join("|")).toContain("stderr:stderr-ok");
    expect(result.pid).toBeGreaterThan(0);
    expect(result.exitCode).toBe(0);
  });

  it("supports bounded binary stdout capture",async()=>{
    const result=await runner.run({tool:"binary-test",command:process.execPath,args:["-e","process.stdout.write(Buffer.from([0,1,2,255]))"],stdoutMode:"buffer",timeoutMs:5000,killTree:false});
    expect([...result.stdoutBytes]).toEqual([0,1,2,255]);
    expect(result.stdout).toBe("");
  });

  it("rejects timed-out tools with an explicit timeout error",async()=>{
    await expect(runner.run({tool:"timeout-test",command:process.execPath,args:["-e","setInterval(()=>{},1000)"],timeoutMs:40,killTree:false})).rejects.toBeInstanceOf(ToolTimeoutError);
  });

  it("rejects cancelled tools with an explicit abort error",async()=>{
    const controller=new AbortController();
    const pending=runner.run({tool:"abort-test",command:process.execPath,args:["-e","setInterval(()=>{},1000)"],timeoutMs:5000,killTree:false,signal:controller.signal});
    setTimeout(()=>controller.abort(),40);
    await expect(pending).rejects.toBeInstanceOf(ToolAbortedError);
  });

  it("builds Windows tree-kill argv without shell text",()=>{
    expect(buildWindowsTreeKillArgs(1234)).toEqual(["/PID","1234","/T","/F"]);
  });
});
