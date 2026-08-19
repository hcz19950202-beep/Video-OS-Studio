import {assetLibraryService} from "@/lib/server/runtime";
export const runtime="nodejs";
export async function GET(){try{return Response.json(await assetLibraryService.load());}catch(error){return Response.json({error:error instanceof Error?error.message:String(error),retryable:true},{status:500});}}
