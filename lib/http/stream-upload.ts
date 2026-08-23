import {createWriteStream} from "node:fs";
import {mkdir,rm} from "node:fs/promises";
import {dirname} from "node:path";
import {once} from "node:events";

export class UploadTooLargeError extends Error{
  readonly code="MEDIA_UPLOAD_TOO_LARGE";
  constructor(readonly maxBytes:number){super(`The selected file exceeds the ${Math.floor(maxBytes/(1024*1024))} MB local import limit.`);this.name="UploadTooLargeError";}
}

export class UploadAbortedError extends Error{
  readonly code="MEDIA_UPLOAD_ABORTED";
  constructor(){super("The media upload was interrupted before completion.");this.name="UploadAbortedError";}
}

export type StreamUploadInput={
  body:ReadableStream<Uint8Array>|null;
  destination:string;
  maxBytes:number;
  contentLength?:number;
  signal?:AbortSignal;
};

export const streamRequestBodyToFile=async({body,destination,maxBytes,contentLength,signal}:StreamUploadInput)=>{
  if(!body)throw new Error("No media request body was provided.");
  if(Number.isFinite(contentLength)&&Number(contentLength)>maxBytes)throw new UploadTooLargeError(maxBytes);
  await mkdir(dirname(destination),{recursive:true});
  const writer=createWriteStream(destination,{flags:"wx"});
  const reader=body.getReader();
  let total=0;
  let aborted=false;
  const onAbort=()=>{aborted=true;void reader.cancel().catch(()=>undefined);writer.destroy(new UploadAbortedError());};
  signal?.addEventListener("abort",onAbort,{once:true});
  try{
    while(true){
      if(aborted||signal?.aborted)throw new UploadAbortedError();
      const{done,value}=await reader.read();
      if(done)break;
      total+=value.byteLength;
      if(total>maxBytes)throw new UploadTooLargeError(maxBytes);
      if(!writer.write(Buffer.from(value)))await once(writer,"drain");
    }
    writer.end();
    await once(writer,"finish");
    if(total<=0)throw new Error("The selected file is empty.");
    return{sizeBytes:total};
  }catch(error){
    if(!writer.destroyed)writer.destroy();
    await rm(destination,{force:true});
    if(aborted||signal?.aborted)throw new UploadAbortedError();
    throw error;
  }finally{
    signal?.removeEventListener("abort",onAbort);
    try{reader.releaseLock();}catch{/* reader already released/cancelled */}
  }
};
