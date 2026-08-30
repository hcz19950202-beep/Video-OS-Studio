import {execFile} from "node:child_process";
import {promisify} from "node:util";

const execFileAsync=promisify(execFile);
const START_TIME_TOLERANCE_MS=5_000;

export type ProcessIdentity={pid:number;startedAt?:number};

const currentStartedAt=Math.max(1,Math.floor(Date.now()-process.uptime()*1_000));

export const currentProcessIdentity=():Required<ProcessIdentity>=>({pid:process.pid,startedAt:currentStartedAt});

export const isProcessAlive=async(pid:number):Promise<boolean>=>{
  if(!Number.isInteger(pid)||pid<=0)return false;
  if(pid===process.pid)return true;
  if(process.platform==="win32"){
    try{
      const{stdout}=await execFileAsync("tasklist.exe",["/FI",`PID eq ${pid}`,"/FO","CSV","/NH"],{windowsHide:true,timeout:1_000,maxBuffer:1024*1024});
      return stdout.split(/\r?\n/u).some(line=>line.includes(`"${pid}"`));
    }catch{
      // Process liveness is a safety boundary. An unavailable probe is unknown,
      // not proof that another process has died.
      return true;
    }
  }
  try{process.kill(pid,0);return true;}
  catch(error){
    const code=(error as NodeJS.ErrnoException).code;
    return code!=="ESRCH";
  }
};

const probeProcessStartedAt=async(pid:number):Promise<number|null>=>{
  if(pid===process.pid)return currentStartedAt;
  if(process.platform==="win32"){
    try{
      const script=`(Get-Process -Id ${pid} -ErrorAction Stop).StartTime.ToUniversalTime().ToString('o')`;
      const{stdout}=await execFileAsync("powershell.exe",["-NoProfile","-NonInteractive","-Command",script],{windowsHide:true,timeout:2_000,maxBuffer:1024*1024});
      const value=Date.parse(stdout.trim());
      return Number.isFinite(value)?value:null;
    }catch{return null;}
  }
  try{
    const{stdout}=await execFileAsync("ps",["-p",String(pid),"-o","lstart="],{timeout:1_000,maxBuffer:1024*1024});
    const value=Date.parse(stdout.trim());
    return Number.isFinite(value)?value:null;
  }catch{return null;}
};

export const isProcessIdentityAlive=async(identity:ProcessIdentity):Promise<boolean>=>{
  if(!(await isProcessAlive(identity.pid)))return false;
  if(identity.startedAt===undefined)return true;
  const observedStartedAt=await probeProcessStartedAt(identity.pid);
  if(observedStartedAt===null)return true;
  return Math.abs(observedStartedAt-identity.startedAt)<=START_TIME_TOLERANCE_MS;
};
