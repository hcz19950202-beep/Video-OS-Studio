import type {AgentSelectionSnapshot} from "@/lib/ai/context";
import {LocalMcpBridgeController} from "@/lib/mcp/bridge-controller";
import {LocalMcpHttpServer} from "@/lib/mcp/local-http-server";
import {
  agentContextService,
  sharedAgentReadToolRegistry,
} from "@/lib/server/agent-runtime";
import {getGlobalRuntime} from "@/lib/server/global-runtime";
import {dataRoot} from "@/lib/server/runtime";

const bridgeController=getGlobalRuntime(
  `${dataRoot}:local-mcp-bridge-controller`,
  ()=>new LocalMcpBridgeController(agentContextService),
);
const bridgeServer=getGlobalRuntime(
  `${dataRoot}:local-mcp-http-server`,
  ()=>new LocalMcpHttpServer(bridgeController,sharedAgentReadToolRegistry),
);

export const getLocalMcpBridgeSnapshot=()=>bridgeController.getSnapshot();

export const getLocalMcpReadToolCatalog=()=>sharedAgentReadToolRegistry.listContracts()
  .filter(contract=>contract.riskClass==="R0")
  .map(contract=>({
    id:contract.toolId,
    version:contract.version,
    description:contract.description,
    riskClass:contract.riskClass,
    requiredScopes:[...contract.requiredScopes],
  }));

export const startLocalMcpBridge=()=>bridgeServer.start();
export const stopLocalMcpBridge=()=>bridgeServer.stop();

export const issueLocalMcpCredential=(input:{clientType:string;clientLabel:string})=>
  bridgeController.issueCredential(input);
export const rotateLocalMcpCredential=(input:{clientType:string;clientLabel:string})=>
  bridgeController.rotateCredential(input);
export const revokeLocalMcpCredential=(credentialId:string)=>
  bridgeController.revokeCredential(credentialId);

export const syncLocalMcpOpenProject=async(
  projectId:string,
  selection?:Partial<AgentSelectionSnapshot>,
)=>{
  await agentContextService.build(projectId,selection);
  bridgeController.setActiveProject(projectId,selection);
  return bridgeController.getSnapshot();
};

export const clearLocalMcpOpenProject=(projectId?:string)=>{
  bridgeController.clearActiveProject(projectId);
  return bridgeController.getSnapshot();
};