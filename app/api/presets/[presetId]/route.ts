import {z} from "zod";
import {assetLibraryService} from "@/lib/server/runtime";
export const runtime="nodejs";
type Context={params:Promise<{presetId:string}>};
const PatchSchema=z.object({favorite:z.boolean().optional(),status:z.enum(["draft","production-ready"]).optional()}).refine((value)=>value.favorite!==undefined||value.status!==undefined,"At least one preset field is required");
export async function PATCH(request:Request,{params}:Context){try{const{presetId}=await params;const patch=PatchSchema.parse(await request.json());return Response.json({preset:await assetLibraryService.update(presetId,patch)});}catch(error){return Response.json({error:error instanceof Error?error.message:String(error),retryable:true},{status:400});}}
