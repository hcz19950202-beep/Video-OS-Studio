import {z} from "zod";
import {ProductionMissionProjectUnavailableError} from "@/lib/production/mission/errors";
import {CreateProductionMissionInputSchema} from "@/lib/production/mission/schema";
import {productionMissionService,productionWorkspaceService} from "@/lib/server/runtime";

export const runtime="nodejs";
type Context={params:Promise<{projectId:string}>};
const CreateMissionBodySchema=CreateProductionMissionInputSchema.omit({projectId:true});

const safeError=(error:unknown)=>{
  if(error instanceof z.ZodError)return{status:400,body:{error:"invalid_mission_request",message:"The Mission request did not match the accepted bounded contract.",retryable:false}};
  if(error instanceof ProductionMissionProjectUnavailableError)return{status:404,body:{error:"project_unavailable",message:"The Project is unavailable for Production Missions.",retryable:false}};
  return{status:500,body:{error:"mission_request_failed",message:"The Mission request failed without exposing internal runtime details.",retryable:true}};
};

export async function GET(_request:Request,{params}:Context){
  try{
    const{projectId}=await params;
    return Response.json({missions:await productionWorkspaceService.listMissions(projectId)});
  }catch(error){const response=safeError(error);return Response.json(response.body,{status:response.status});}
}

export async function POST(request:Request,{params}:Context){
  try{
    const{projectId}=await params;
    const body=CreateMissionBodySchema.parse(await request.json());
    const mission=await productionMissionService.create({...body,projectId});
    return Response.json({mission},{status:201});
  }catch(error){const response=safeError(error);return Response.json(response.body,{status:response.status});}
}
