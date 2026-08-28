import {rename} from "node:fs/promises";

const WINDOWS_RETRYABLE_RENAME_CODES=new Set(["EPERM","EACCES","EBUSY"]);
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

export type AtomicReplaceRetryOptions={
  platform?:NodeJS.Platform;
  maxAttempts?:number;
  initialDelayMs?:number;
  maxDelayMs?:number;
  sleep?:typeof sleep;
  renameFile?:typeof rename;
};

export async function replaceFileAtomically(sourcePath:string,targetPath:string,options:AtomicReplaceRetryOptions={}):Promise<void>{
  const platform=options.platform??process.platform;
  const maxAttempts=Math.max(1,Math.floor(options.maxAttempts??10));
  const initialDelayMs=Math.max(0,options.initialDelayMs??10);
  const maxDelayMs=Math.max(initialDelayMs,options.maxDelayMs??100);
  const wait=options.sleep??sleep;
  const renameFile=options.renameFile??rename;

  for(let attempt=1;attempt<=maxAttempts;attempt+=1){
    try{
      await renameFile(sourcePath,targetPath);
      return;
    }catch(error){
      const code=(error as NodeJS.ErrnoException).code;
      const retryable=platform==="win32"&&code!==undefined&&WINDOWS_RETRYABLE_RENAME_CODES.has(code);
      if(!retryable||attempt===maxAttempts)throw error;
      const delay=Math.min(maxDelayMs,initialDelayMs*2**(attempt-1));
      await wait(delay);
    }
  }
}
