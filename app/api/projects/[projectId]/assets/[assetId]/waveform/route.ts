import {waveformService} from "@/lib/server/runtime";

export const runtime="nodejs";
type Context={params:Promise<{projectId:string;assetId:string}>};
export async function GET(request:Request,{params}:Context){try{const{projectId,assetId}=await params;const url=new URL(request.url);const points=Number(url.searchParams.get("points")||160);return Response.json(await waveformService.get(projectId,assetId,points));}catch(error){return Response.json({error:error instanceof Error?error.message:String(error),action:"Verify that the asset contains readable audio and retry.",retryable:true},{status:400});}}
