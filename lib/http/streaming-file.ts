import {createReadStream} from "node:fs";
import {stat} from "node:fs/promises";
import {extname} from "node:path";
import {Readable} from "node:stream";
import {parseSingleByteRange,RangeNotSatisfiableError} from "@/lib/http/byte-range";

const MIME_BY_EXTENSION:Record<string,string>={
  ".mp4":"video/mp4",
  ".mov":"video/quicktime",
  ".webm":"video/webm",
  ".m4v":"video/x-m4v",
  ".mp3":"audio/mpeg",
  ".m4a":"audio/mp4",
  ".aac":"audio/aac",
  ".wav":"audio/wav",
  ".flac":"audio/flac",
  ".png":"image/png",
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".webp":"image/webp",
  ".gif":"image/gif",
  ".avif":"image/avif",
  ".srt":"application/x-subrip",
  ".vtt":"text/vtt; charset=utf-8",
  ".json":"application/json; charset=utf-8",
};

export const canonicalMediaMime=(path:string,fallback="application/octet-stream")=>MIME_BY_EXTENSION[extname(path).toLowerCase()]??fallback;

export type StreamingFileResponseOptions={
  mimeType?:string;
  contentDisposition?:string;
  cacheControl?:string;
};

const baseHeaders=(size:number,mimeType:string,options:StreamingFileResponseOptions)=>({
  "Content-Type":mimeType,
  "Content-Length":String(size),
  "Accept-Ranges":"bytes",
  "Cache-Control":options.cacheControl??"no-store",
  "X-Content-Type-Options":"nosniff",
  ...(options.contentDisposition?{"Content-Disposition":options.contentDisposition}:{}),
});

export const createStreamingFileResponse=async(request:Request,path:string,options:StreamingFileResponseOptions={})=>{
  const info=await stat(path);
  if(!info.isFile())throw new Error("Requested path is not a file.");
  const size=info.size;
  const mimeType=options.mimeType??canonicalMediaMime(path);
  let range=null;
  try{range=parseSingleByteRange(request.headers.get("range"),size);}
  catch(error){
    if(error instanceof RangeNotSatisfiableError){
      return new Response(null,{status:416,headers:{
        "Accept-Ranges":"bytes",
        "Content-Range":`bytes */${size}`,
        "Content-Length":"0",
        "X-Content-Type-Options":"nosniff",
        "Cache-Control":options.cacheControl??"no-store",
      }});
    }
    throw error;
  }

  const start=range?.start??0;
  const end=range?.end??Math.max(0,size-1);
  const selectedSize=range?end-start+1:size;
  const headers={
    ...baseHeaders(selectedSize,mimeType,options),
    ...(range?{"Content-Range":`bytes ${start}-${end}/${size}`}:{})
  };
  const statusCode=range?206:200;
  if(request.method==="HEAD"||size===0)return new Response(null,{status:statusCode,headers});
  const nodeStream=createReadStream(path,{start,end});
  const body=Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
  return new Response(body,{status:statusCode,headers});
};
