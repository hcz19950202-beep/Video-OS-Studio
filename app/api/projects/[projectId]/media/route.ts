import {ExpectedProjectRevisionSchema,ProjectOperationIdSchema} from "@/lib/project/mutation-contract";
import {projectMutationErrorResponse} from "@/lib/server/project-mutation-http";
import {mediaImportService} from "@/lib/server/runtime";

export const runtime="nodejs";
const MAX_UPLOAD_BYTES=2*1024*1024*1024;
type Context={params:Promise<{projectId:string}>};

export async function POST(request:Request,{params}:Context){
  try{
    const{projectId}=await params;
    const formData=await request.formData();
    const upload=formData.get("file");
    if(!(upload instanceof File))throw new Error("No media file was provided.");
    if(upload.size<=0)throw new Error("The selected file is empty.");
    if(upload.size>MAX_UPLOAD_BYTES)throw new Error("The selected file exceeds the 2 GB local import limit.");
    const expectedRevision=ExpectedProjectRevisionSchema.parse(Number(formData.get("expectedRevision")));
    const operationId=ProjectOperationIdSchema.parse(formData.get("operationId"));
    const result=await mediaImportService.importWithReport({projectId,fileName:upload.name,mimeType:upload.type||undefined,bytes:new Uint8Array(await upload.arrayBuffer()),expectedRevision,operationId});
    return Response.json(result);
  }catch(error){
    return projectMutationErrorResponse(error,"Reload the latest Project and use a supported video/audio/image/subtitle file. Non-working video containers are normalized automatically when local FFmpeg is available.");
  }
}
