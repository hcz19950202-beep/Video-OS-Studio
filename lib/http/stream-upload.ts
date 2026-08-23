import {createWriteStream} from "node:fs";
import {mkdir,rm} from "node:fs/promises";
import {dirname} from "node:path";
import {Readable,Transform} from "node:stream";
import {pipeline} from "node:stream/promises";

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
  let total=0;
  const limiter=new Transform({
    transform(chunk:Buffer,_encoding,callback){
      total+=chunk.byteLength;
      if(total>maxBytes){callback(new UploadTooLargeError(maxBytes));return;}
      callback(null,chunk);
    },
  });
  const source=Readable.fromWeb(body as Parameters<typeof Readable.fromWeb>[0]);
  const writer=createWriteStream(destination,{flags:"wx"});
  try{
    await pipeline(source,limiter,writer,{signal});
    if(total<=0)throw new Error("The selected file is empty.");
    return{sizeBytes:total};
  }catch(error){
    await rm(destination,{force:true});
    if(signal?.aborted||(error instanceof Error&&error.name==="AbortError"))throw new UploadAbortedError();
    throw error;
  }
};
