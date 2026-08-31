import {NextResponse,type NextRequest} from "next/server";
import {z} from "zod";
import {AgentSelectionSnapshotSchema} from "@/lib/ai/context";
import {
  clearLocalMcpOpenProject,
  getLocalMcpBridgeSnapshot,
  getLocalMcpReadToolCatalog,
  issueLocalMcpCredential,
  revokeLocalMcpCredential,
  rotateLocalMcpCredential,
  startLocalMcpBridge,
  stopLocalMcpBridge,
  syncLocalMcpOpenProject,
} from "@/lib/server/mcp-runtime";
import {ProjectIdSchema} from "@/schemas/project";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const ClientSchema=z.object({
  clientType:z.string().trim().min(1).max(120),
  clientLabel:z.string().trim().min(1).max(120),
}).strict();

const ActionSchema=z.discriminatedUnion("action",[
  z.object({action:z.literal("start")}).strict(),
  z.object({action:z.literal("stop")}).strict(),
  z.object({action:z.literal("issue-credential"),...ClientSchema.shape}).strict(),
  z.object({action:z.literal("rotate-credential"),...ClientSchema.shape}).strict(),
  z.object({action:z.literal("revoke-credential"),credentialId:z.string().uuid()}).strict(),
  z.object({
    action:z.literal("sync-context"),
    projectId:ProjectIdSchema,
    selection:AgentSelectionSnapshotSchema.partial().optional(),
  }).strict(),
  z.object({action:z.literal("clear-context"),projectId:ProjectIdSchema.optional()}).strict(),
]);

const isLoopbackRequest=(request:NextRequest)=>{
  const host=(request.headers.get("host")??"").toLowerCase().split(":")[0];
  if(host!=="127.0.0.1"&&host!=="localhost")return false;
  const origin=request.headers.get("origin");
  if(!origin)return true;
  try{
    const parsed=new URL(origin);
    return parsed.hostname==="127.0.0.1"||parsed.hostname==="localhost";
  }catch{
    return false;
  }
};

const response=(body:unknown,status=200)=>NextResponse.json(body,{
  status,
  headers:{"Cache-Control":"no-store"},
});
const bridgePayload=(bridge=getLocalMcpBridgeSnapshot())=>({
  bridge,
  tools:getLocalMcpReadToolCatalog(),
});

export async function GET(request:NextRequest){
  if(!isLoopbackRequest(request))return response({error:"loopback_required"},403);
  return response(bridgePayload());
}

export async function POST(request:NextRequest){
  if(!isLoopbackRequest(request))return response({error:"loopback_required"},403);
  let body:unknown;
  try{body=await request.json();}
  catch{return response({error:"invalid_json"},400);}
  const parsed=ActionSchema.safeParse(body);
  if(!parsed.success)return response({error:"invalid_request"},400);

  try{
    const action=parsed.data;
    if(action.action==="start"){
      await startLocalMcpBridge();
      return response(bridgePayload());
    }
    if(action.action==="stop"){
      await stopLocalMcpBridge();
      return response(bridgePayload());
    }
    if(action.action==="issue-credential"){
      const credential=issueLocalMcpCredential(action);
      return response({...bridgePayload(),credential});
    }
    if(action.action==="rotate-credential"){
      const credential=rotateLocalMcpCredential(action);
      return response({...bridgePayload(),credential});
    }
    if(action.action==="revoke-credential"){
      const revoked=revokeLocalMcpCredential(action.credentialId);
      return response({...bridgePayload(),revoked});
    }
    if(action.action==="sync-context"){
      const bridge=await syncLocalMcpOpenProject(action.projectId,action.selection);
      return response(bridgePayload(bridge));
    }
    const bridge=clearLocalMcpOpenProject(action.projectId);
    return response(bridgePayload(bridge));
  }catch(error){
    console.error("[video-os][mcp-admin] bridge action failed",{
      action:parsed.data.action,
      errorType:error instanceof Error?error.name:typeof error,
    });
    return response({error:"bridge_action_failed"},500);
  }
}