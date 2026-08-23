import {randomUUID} from "node:crypto";
import {rm} from "node:fs/promises";
import {ExpectedProjectRevisionSchema,ProjectOperationIdSchema} from "@/lib/project/mutation-contract";
import {projectMutationErrorResponse} from "@/lib/server/project-mutation-http";
import {mediaImportService,projectRepository} from "@/lib/server/runtime";
import {streamRequestBodyToFile,UploadAbortedError,UploadTooLargeError} from "@/lib/http/stream-upload";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const MAX_UPLOAD_BYTES=2*1024*1024*1024;
type Context={params:Promise<{projectId:string}>};

const uploadError=(error:UploadTooLargeError|UploadAbortedError)=>Response.json({
  code:error.code,
  message:error.message,
  retryable:error instanceof UploadAbortedError,
  action:error instanceof UploadTooLargeError?"Choose a file no larger than the 2 GB local import limit.":"Retry the upload from the current Project revision.",
},{status:error instanceof UploadTooLargeError?413:400});

export async function POST(request:Request,{params}:Context){
  const{projectId}=await params;
  const url=new URL(request.url);
  let tempPath:string|undefined;
  try{
    const fileName=url.searchParams.get("fileName")?.trim();
    if(!fileName)throw new Error("No media file name was provided.");
    const expectedRevision=ExpectedProjectRevisionSchema.parse(Number(url.searchParams.get("expectedRevision")));
    const operationId=ProjectOperationIdSchema.parse(url.searchParams.get("operationId"));
    const contentLengthHeader=request.headers.get("content-length");
    const contentLength=contentLengthHeader===null?undefined:Number(contentLengthHeader);
    if(contentLength!==undefined&&(!Number.isSafeInteger(contentLength)||contentLength<0))throw new Error("Invalid Content-Length for media upload.");
    const mimeType=request.headers.get("content-type")?.split(";",1)[0]?.trim()||undefined;
    tempPath=projectRepository.resolveProjectFile(projectId,`.uploads/${randomUUID()}.part`);
    const staged=await streamRequestBodyToFile({body:request.body,destination:tempPath,maxBytes:MAX_UPLOAD_BYTES,contentLength,signal:request.signal});
    const result=await mediaImportService.importWithReport({projectId,fileName,mimeType,sourcePath:tempPath,sizeBytes:staged.sizeBytes,expectedRevision,operationId});
    return Response.json(result);
  }catch(error){
    if(error instanceof UploadTooLargeError||error instanceof UploadAbortedError)return uploadError(error);
    return projectMutationErrorResponse(error,"Reload the latest Project and use a supported video/audio/image/subtitle file. Non-working video containers are normalized automatically when local FFmpeg is available.");
  }finally{
    if(tempPath)await rm(tempPath,{force:true}).catch(()=>undefined);
  }
}
