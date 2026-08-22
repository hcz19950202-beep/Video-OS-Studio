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
    const result=await mediaImportService.importWithReport({projectId,fileName:upload.name,mimeType:upload.type||undefined,bytes:new Uint8Array(await upload.arrayBuffer())});
    return Response.json(result);
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:String(error),action:"Use a supported video/audio/image/subtitle file. Video containers that are not working-MP4 are normalized automatically when local FFmpeg is available.",retryable:true},{status:400});
  }
}
