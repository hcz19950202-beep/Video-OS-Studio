import {spawn,type ChildProcess} from "node:child_process";

export type ToolLogStream="stdout"|"stderr";
export type ToolStdoutMode="text"|"buffer"|"discard";

export type ToolLogEvent={
  tool:string;
  stream:ToolLogStream;
  chunk:string;
};

export type ToolRunInput={
  tool:string;
  command:string;
  args:string[];
  cwd?:string;
  env?:NodeJS.ProcessEnv;
  timeoutMs?:number;
  signal?:AbortSignal;
  stdoutMode?:ToolStdoutMode;
  stderrMode?:Exclude<ToolStdoutMode,"buffer">;
  maxCaptureBytes?:number;
  onLog?:(event:ToolLogEvent)=>void;
  killTree?:boolean;
};

export type ToolRunResult={
  tool:string;
  command:string;
  args:string[];
  pid:number;
  exitCode:number;
  exitSignal:NodeJS.Signals|null;
  stdout:string;
  stdoutBytes:Uint8Array;
  stderr:string;
  durationMs:number;
};

export class ToolRunError extends Error{
  readonly code="TOOL_RUN_FAILED";
  constructor(
    message:string,
    readonly tool:string,
    readonly command:string,
    readonly args:string[],
    readonly pid:number|null,
    readonly exitCode:number|null,
    readonly exitSignal:NodeJS.Signals|null,
    readonly stdoutTail:string,
    readonly stderrTail:string,
  ){
    super(message);
    this.name="ToolRunError";
  }
}

export class ToolTimeoutError extends ToolRunError{
  readonly code="TOOL_TIMEOUT" as const;
  constructor(tool:string,command:string,args:string[],pid:number|null,readonly timeoutMs:number,stdoutTail:string,stderrTail:string){
    super(`${tool} exceeded its ${timeoutMs} ms timeout.`,tool,command,args,pid,null,null,stdoutTail,stderrTail);
    this.name="ToolTimeoutError";
  }
}

export class ToolAbortedError extends ToolRunError{
  readonly code="TOOL_ABORTED" as const;
  constructor(tool:string,command:string,args:string[],pid:number|null,stdoutTail:string,stderrTail:string){
    super(`${tool} was cancelled.`,tool,command,args,pid,null,null,stdoutTail,stderrTail);
    this.name="ToolAbortedError";
  }
}

const DEFAULT_MAX_CAPTURE_BYTES=2*1024*1024;
const DEFAULT_TIMEOUT_MS=15*60*1000;
const KILL_GRACE_MS=1200;

const appendTail=(current:Buffer,chunk:Buffer,maxBytes:number)=>{
  if(maxBytes<=0)return Buffer.alloc(0);
  if(chunk.length>=maxBytes)return chunk.subarray(chunk.length-maxBytes);
  if(current.length+chunk.length<=maxBytes)return Buffer.concat([current,chunk]);
  const keep=Math.max(0,maxBytes-chunk.length);
  return Buffer.concat([current.subarray(Math.max(0,current.length-keep)),chunk]);
};

const decode=(value:Buffer)=>value.toString("utf8");
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

export const buildWindowsTreeKillArgs=(pid:number)=>["/PID",String(pid),"/T","/F"];

const killWindowsTree=async(pid:number)=>{
  await new Promise<void>(resolve=>{
    const killer=spawn("taskkill",buildWindowsTreeKillArgs(pid),{windowsHide:true,shell:false,stdio:"ignore"});
    killer.once("error",()=>resolve());
    killer.once("close",()=>resolve());
  });
};

const killUnixTree=async(child:ChildProcess,pid:number,detached:boolean)=>{
  const send=(signal:NodeJS.Signals)=>{
    try{
      if(detached)process.kill(-pid,signal);
      else child.kill(signal);
    }catch{
      try{child.kill(signal);}catch{/* already exited */}
    }
  };
  send("SIGTERM");
  await wait(KILL_GRACE_MS);
  if(child.exitCode===null&&child.signalCode===null)send("SIGKILL");
};

export const terminateToolProcessTree=async(child:ChildProcess,platform:NodeJS.Platform=process.platform,detached=false)=>{
  const pid=child.pid;
  if(!pid)return;
  if(platform==="win32")await killWindowsTree(pid);
  else await killUnixTree(child,pid,detached);
};

export interface ToolRunner{
  run(input:ToolRunInput):Promise<ToolRunResult>;
}

export class NodeToolRunner implements ToolRunner{
  async run(input:ToolRunInput):Promise<ToolRunResult>{
    if(!input.tool.trim())throw new Error("ToolRunner requires a logical tool name.");
    if(!input.command.trim())throw new Error(`ToolRunner ${input.tool} requires an executable command.`);
    if(input.signal?.aborted)throw new ToolAbortedError(input.tool,input.command,input.args,null,"","");

    const stdoutMode=input.stdoutMode??"text";
    const stderrMode=input.stderrMode??"text";
    const maxCaptureBytes=input.maxCaptureBytes??DEFAULT_MAX_CAPTURE_BYTES;
    const timeoutMs=input.timeoutMs??DEFAULT_TIMEOUT_MS;
    const killTree=input.killTree!==false;
    const detached=killTree&&process.platform!=="win32";
    const startedAt=Date.now();

    return new Promise<ToolRunResult>((resolve,reject)=>{
      let stdout=Buffer.alloc(0);
      let stderr=Buffer.alloc(0);
      let settled=false;
      let terminationReason:"timeout"|"abort"|null=null;
      let terminating:Promise<void>|null=null;

      const child=spawn(input.command,input.args,{
        cwd:input.cwd,
        env:{...process.env,...input.env},
        windowsHide:true,
        shell:false,
        detached,
        stdio:["ignore",stdoutMode==="discard"?"ignore":"pipe",stderrMode==="discard"?"ignore":"pipe"],
      });

      const pid=child.pid??null;
      const cleanup=()=>{
        if(timer)clearTimeout(timer);
        input.signal?.removeEventListener("abort",onAbort);
      };
      const finishReject=(error:unknown)=>{
        if(settled)return;
        settled=true;
        cleanup();
        reject(error);
      };
      const requestTerminate=(reason:"timeout"|"abort")=>{
        if(terminationReason)return;
        terminationReason=reason;
        terminating=killTree?terminateToolProcessTree(child,process.platform,detached):Promise.resolve().then(()=>{try{child.kill("SIGTERM");}catch{/* already exited */}});
      };
      const onAbort=()=>requestTerminate("abort");
      input.signal?.addEventListener("abort",onAbort,{once:true});
      const timer=timeoutMs>0?setTimeout(()=>requestTerminate("timeout"),timeoutMs):null;

      child.stdout?.on("data",chunk=>{
        const bytes=Buffer.from(chunk);
        stdout=appendTail(stdout,bytes,maxCaptureBytes);
        if(input.onLog&&stdoutMode==="text")input.onLog({tool:input.tool,stream:"stdout",chunk:decode(bytes)});
      });
      child.stderr?.on("data",chunk=>{
        const bytes=Buffer.from(chunk);
        stderr=appendTail(stderr,bytes,maxCaptureBytes);
        if(input.onLog&&stderrMode==="text")input.onLog({tool:input.tool,stream:"stderr",chunk:decode(bytes)});
      });

      child.once("error",error=>{
        finishReject(new ToolRunError(`${input.tool} failed to start: ${error.message}`,input.tool,input.command,input.args,pid,null,null,decode(stdout),decode(stderr)));
      });

      child.once("close",async(code,signal)=>{
        if(settled)return;
        if(terminating)await terminating.catch(()=>undefined);
        settled=true;
        cleanup();
        const stdoutText=stdoutMode==="text"?decode(stdout):"";
        const stderrText=stderrMode==="text"?decode(stderr):"";
        if(terminationReason==="timeout"){
          reject(new ToolTimeoutError(input.tool,input.command,input.args,pid,timeoutMs,stdoutText,stderrText));
          return;
        }
        if(terminationReason==="abort"){
          reject(new ToolAbortedError(input.tool,input.command,input.args,pid,stdoutText,stderrText));
          return;
        }
        if(code!==0){
          reject(new ToolRunError(`${input.tool} exited with code ${code??"null"}${signal?` (${signal})`:""}.`,input.tool,input.command,input.args,pid,code,signal,stdoutText,stderrText));
          return;
        }
        if(pid===null){
          reject(new ToolRunError(`${input.tool} started without a process ID.`,input.tool,input.command,input.args,null,code,signal,stdoutText,stderrText));
          return;
        }
        resolve({
          tool:input.tool,
          command:input.command,
          args:[...input.args],
          pid,
          exitCode:code,
          exitSignal:signal,
          stdout:stdoutText,
          stdoutBytes:new Uint8Array(stdout),
          stderr:stderrText,
          durationMs:Date.now()-startedAt,
        });
      });
    });
  }
}

export const nodeToolRunner=new NodeToolRunner();

export const parseToolTimeout=(value:string|undefined,fallback:number)=>{
  const parsed=Number(value);
  return Number.isFinite(parsed)&&parsed>0?Math.round(parsed):fallback;
};
