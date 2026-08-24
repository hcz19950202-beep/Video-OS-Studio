import {CreateWorkflowRequestSchema,workflowErrorResponse} from "@/lib/workflows/http";
import {workflowService} from "@/lib/server/runtime";

export const runtime="nodejs";

export async function GET(request:Request){
  try{
    const url=new URL(request.url);
    const projectId=url.searchParams.get("projectId");
    let workflows=await workflowService.list();
    if(projectId)workflows=workflows.filter(workflow=>workflow.projectId===projectId);
    workflows=[...workflows].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
    return Response.json({workflows});
  }catch(error){return workflowErrorResponse(error);}
}

export async function POST(request:Request){
  try{
    const body=CreateWorkflowRequestSchema.parse(await request.json());
    const origin=new URL(request.url).origin;
    const workflow=await workflowService.create({
      projectId:body.projectId,
      definitionId:`video-production-${body.scenario}`,
      definitionVersion:"2",
      sourceAssetIds:body.sourceAssetIds,
      expectedProjectRevision:body.expectedProjectRevision,
      assetBaseUrl:origin,
    });
    return Response.json({workflow},{status:201});
  }catch(error){return workflowErrorResponse(error);}
}
