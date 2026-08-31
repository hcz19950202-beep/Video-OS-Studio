import {createServer,type IncomingMessage,type Server,type ServerResponse} from "node:http";
import {z} from "zod";
import type {SharedToolRegistry} from "@/lib/ai/tools/shared-registry";
import {
  LOCAL_MCP_PROTOCOL_VERSION,
  type LocalMcpCredentialPrincipal,
  LocalMcpBridgeController,
} from "@/lib/mcp/bridge-controller";

export const LOCAL_MCP_HOST="127.0.0.1" as const;
export const LOCAL_MCP_PATH="/api/mcp" as const;
export const LOCAL_MCP_MAX_REQUEST_BYTES=256*1024;
export const LOCAL_MCP_MAX_CONCURRENCY=4;
export const LOCAL_MCP_RATE_LIMIT_PER_MINUTE=120;

const JsonRpcIdSchema=z.union([z.string(),z.number()]);
const JsonRpcRequestSchema=z.object({
  jsonrpc:z.literal("2.0"),
  id:JsonRpcIdSchema,
  method:z.string().min(1).max(128),
  params:z.record(z.string(),z.unknown()).default({}),
}).strict();

type JsonRpcId=z.infer<typeof JsonRpcIdSchema>;
type JsonRpcRequest=z.infer<typeof JsonRpcRequestSchema>;

type ClientInfo={name?:string;version?:string};

const SERVER_INFO={name:"video-os-studio",version:"2.4.2"} as const;
const SERVER_META={"io.modelcontextprotocol/serverInfo":SERVER_INFO} as const;
const FORBIDDEN_C4_ARGUMENT_KEYS=new Set([
  "projectId",
  "baseProjectRevision",
  "expectedRevision",
  "operationId",
  "approved",
  "apply",
  "mutation",
  "patch",
  "changes",
]);

const json=(res:ServerResponse,status:number,payload:unknown)=>{
  const body=JSON.stringify(payload);
  res.statusCode=status;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","no-store");
  res.setHeader("Content-Length",Buffer.byteLength(body));
  res.end(body);
};

const rpcError=(id:JsonRpcId|null,code:number,message:string,data?:Record<string,unknown>)=>({
  jsonrpc:"2.0" as const,
  id,
  error:{code,message,...(data?{data}: {})},
});

const rpcResult=(id:JsonRpcId,result:Record<string,unknown>)=>({
  jsonrpc:"2.0" as const,
  id,
  result:{...result,_meta:{...(result._meta&&typeof result._meta==="object"?result._meta:{}),...SERVER_META}},
});

const isLoopbackHostHeader=(value:string|undefined)=>{
  if(!value)return false;
  const host=value.toLowerCase().split(":")[0];
  return host===LOCAL_MCP_HOST||host==="localhost";
};

const isAllowedOrigin=(value:string|undefined)=>{
  if(!value)return true;
  try{
    const origin=new URL(value);
    return (origin.protocol==="http:"||origin.protocol==="https:")&&
      (origin.hostname===LOCAL_MCP_HOST||origin.hostname==="localhost");
  }catch{
    return false;
  }
};

const readBoundedBody=async(req:IncomingMessage,maxBytes:number):Promise<string>=>{
  const declared=Number(req.headers["content-length"]??0);
  if(Number.isFinite(declared)&&declared>maxBytes)throw Object.assign(new Error("request_too_large"),{code:"request_too_large"});
  const chunks:Buffer[]=[];
  let bytes=0;
  for await(const chunk of req){
    const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
    bytes+=buffer.length;
    if(bytes>maxBytes)throw Object.assign(new Error("request_too_large"),{code:"request_too_large"});
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
};

const clientInfoFrom=(request:JsonRpcRequest):ClientInfo|undefined=>{
  const meta=request.params._meta;
  if(!meta||typeof meta!=="object"||Array.isArray(meta))return undefined;
  const value=(meta as Record<string,unknown>)["io.modelcontextprotocol/clientInfo"];
  if(!value||typeof value!=="object"||Array.isArray(value))return undefined;
  const record=value as Record<string,unknown>;
  return {
    ...(typeof record.name==="string"?{name:record.name}:{}),
    ...(typeof record.version==="string"?{version:record.version}:{}),
  };
};

const requestProtocolVersion=(request:JsonRpcRequest)=>{
  const meta=request.params._meta;
  if(!meta||typeof meta!=="object"||Array.isArray(meta))return undefined;
  const value=(meta as Record<string,unknown>)["io.modelcontextprotocol/protocolVersion"];
  return typeof value==="string"?value:undefined;
};

const toolArguments=(request:JsonRpcRequest):Record<string,unknown>|null=>{
  const value=request.params.arguments;
  if(value===undefined)return {};
  return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:null;
};

const hasForbiddenC4AuthorityArguments=(args:Record<string,unknown>)=>
  Object.keys(args).some(key=>FORBIDDEN_C4_ARGUMENT_KEYS.has(key));

type RateWindow={startedAt:number;count:number};

export class LocalMcpHttpServer{
  private server:Server|null=null;
  private activeRequests=0;
  private readonly rateWindows=new Map<string,RateWindow>();

  constructor(
    private readonly controller:LocalMcpBridgeController,
    private readonly tools:SharedToolRegistry,
  ){}

  async start(input:{host?:string;port?:number}={}):Promise<{address:string;port:number}>{
    if(input.host&&input.host!==LOCAL_MCP_HOST){
      throw new Error("Local MCP bridge may bind only to 127.0.0.1.");
    }
    if(this.server){
      const address=this.server.address();
      if(address&&typeof address==="object")return {address:`http://${LOCAL_MCP_HOST}:${address.port}${LOCAL_MCP_PATH}`,port:address.port};
      throw new Error("Local MCP bridge is already running without a TCP address.");
    }

    this.controller.markStarting();
    const server=createServer((req,res)=>void this.handle(req,res));
    server.on("clientError",(_error,socket)=>socket.destroy());
    try{
      await new Promise<void>((resolve,reject)=>{
        const onError=(error:Error)=>{server.off("listening",onListening);reject(error);};
        const onListening=()=>{server.off("error",onError);resolve();};
        server.once("error",onError);
        server.once("listening",onListening);
        server.listen(input.port??0,LOCAL_MCP_HOST);
      });
      this.server=server;
      const address=server.address();
      if(!address||typeof address!=="object")throw new Error("Local MCP bridge did not acquire a TCP address.");
      const url=`http://${LOCAL_MCP_HOST}:${address.port}${LOCAL_MCP_PATH}`;
      this.controller.markReady(url);
      return {address:url,port:address.port};
    }catch(error){
      this.controller.markError();
      server.close();
      throw error;
    }
  }

  async stop():Promise<void>{
    const server=this.server;
    this.server=null;
    if(server){
      await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
    }
    this.controller.markStopped();
  }

  isRunning(){return this.server!==null;}

  private rateAllowed(principal:LocalMcpCredentialPrincipal){
    const now=Date.now();
    const current=this.rateWindows.get(principal.credentialId);
    if(!current||now-current.startedAt>=60_000){
      this.rateWindows.set(principal.credentialId,{startedAt:now,count:1});
      return true;
    }
    current.count+=1;
    return current.count<=LOCAL_MCP_RATE_LIMIT_PER_MINUTE;
  }

  private async handle(req:IncomingMessage,res:ServerResponse){
    if(req.url!==LOCAL_MCP_PATH){
      json(res,404,rpcError(null,-32601,"MCP endpoint not found."));
      return;
    }
    if(req.method!=="POST"){
      res.setHeader("Allow","POST");
      json(res,405,rpcError(null,-32600,"Only POST is supported by the Video OS modern MCP endpoint."));
      return;
    }
    if(!isLoopbackHostHeader(req.headers.host)||!isAllowedOrigin(req.headers.origin)){
      json(res,403,rpcError(null,-32001,"Loopback host/origin validation failed."));
      return;
    }
    const principal=this.controller.authenticateBearer(req.headers.authorization);
    if(!principal){
      res.setHeader("WWW-Authenticate","Bearer realm=\"Video OS Local MCP\"");
      json(res,401,rpcError(null,-32001,"Authentication required."));
      return;
    }
    if(!this.rateAllowed(principal)){
      json(res,429,rpcError(null,-32029,"Local MCP request rate limit exceeded."));
      return;
    }
    if(this.activeRequests>=LOCAL_MCP_MAX_CONCURRENCY){
      json(res,429,rpcError(null,-32029,"Local MCP concurrency limit exceeded."));
      return;
    }
    if(!String(req.headers["content-type"]??"").toLowerCase().startsWith("application/json")){
      json(res,415,rpcError(null,-32600,"Content-Type must be application/json."));
      return;
    }

    this.activeRequests+=1;
    const abort=new AbortController();
    req.once("aborted",()=>abort.abort());
    res.once("close",()=>{if(!res.writableEnded)abort.abort();});
    try{
      let raw:string;
      try{raw=await readBoundedBody(req,LOCAL_MCP_MAX_REQUEST_BYTES);}
      catch(error){
        if(error&&typeof error==="object"&&"code" in error&&(error as {code?:unknown}).code==="request_too_large"){
          json(res,413,rpcError(null,-32600,"MCP request exceeds the bounded request size."));
          return;
        }
        throw error;
      }

      let parsedJson:unknown;
      try{parsedJson=JSON.parse(raw);}
      catch{
        json(res,400,rpcError(null,-32700,"Invalid JSON."));
        return;
      }
      const parsed=JsonRpcRequestSchema.safeParse(parsedJson);
      if(!parsed.success){
        json(res,400,rpcError(null,-32600,"Invalid JSON-RPC request."));
        return;
      }
      const request=parsed.data;
      const headerVersion=String(req.headers["mcp-protocol-version"]??"");
      const bodyVersion=requestProtocolVersion(request);
      if(headerVersion!==LOCAL_MCP_PROTOCOL_VERSION||bodyVersion!==LOCAL_MCP_PROTOCOL_VERSION){
        json(res,400,rpcError(request.id,-32602,"Unsupported or missing MCP protocol version.",{
          supported:[LOCAL_MCP_PROTOCOL_VERSION],
        }));
        return;
      }
      const methodHeader=String(req.headers["mcp-method"]??"");
      if(methodHeader!==request.method){
        json(res,400,rpcError(request.id,-32020,"Mcp-Method header does not match the JSON-RPC method."));
        return;
      }

      const clientInfo=clientInfoFrom(request);
      if(request.method==="server/discover"){
        this.controller.observeAuthenticatedRequest({
          principal,clientInfo,kind:"discover",summary:"External MCP client discovered the Video OS read bridge.",
        });
        json(res,200,rpcResult(request.id,{
          resultType:"complete",
          supportedVersions:[LOCAL_MCP_PROTOCOL_VERSION],
          capabilities:{tools:{}},
          instructions:"Video OS Local MCP C4 exposes authenticated read-only application tools for the currently open Project. It grants no shell, filesystem, network, or mutation authority.",
          ttlMs:30_000,
          cacheScope:"private",
        }));
        return;
      }

      if(request.method==="tools/list"){
        this.controller.observeAuthenticatedRequest({
          principal,clientInfo,kind:"tool-list",summary:"External MCP client listed the read-only shared tool catalog.",
        });
        const tools=this.tools.listContracts()
          .filter(contract=>contract.riskClass==="R0")
          .map(contract=>({
            name:contract.toolId,
            description:contract.description,
            inputSchema:contract.inputJsonSchema,
            outputSchema:contract.outputJsonSchema,
            annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},
            _meta:{
              "video-os/toolContractVersion":contract.version,
              "video-os/riskClass":contract.riskClass,
              "video-os/requiredScopes":contract.requiredScopes,
            },
          }));
        json(res,200,rpcResult(request.id,{
          resultType:"complete",
          tools,
          ttlMs:30_000,
          cacheScope:"private",
        }));
        return;
      }

      if(request.method!=="tools/call"){
        json(res,404,rpcError(request.id,-32601,"Method not found."));
        return;
      }

      const toolId=typeof request.params.name==="string"?request.params.name:"";
      const nameHeader=String(req.headers["mcp-name"]??"");
      if(!toolId||nameHeader!==toolId){
        json(res,400,rpcError(request.id,-32020,"Mcp-Name header must match params.name for tools/call."));
        return;
      }
      const contract=this.tools.getContract(toolId);
      if(!contract||contract.riskClass!=="R0"){
        json(res,400,rpcError(request.id,-32602,"Unknown or non-readable MCP tool."));
        return;
      }
      const args=toolArguments(request);
      if(!args||hasForbiddenC4AuthorityArguments(args)){
        json(res,400,rpcError(request.id,-32602,"Tool arguments contain invalid or forbidden authority fields."));
        return;
      }
      const executionContext=await this.controller.createExecutionContext({
        principal,
        requestId:String(request.id),
        signal:abort.signal,
      });
      if(!executionContext){
        this.controller.observeAuthenticatedRequest({
          principal,clientInfo,kind:"error",toolId,outcome:"denied",
          summary:"Read request denied because no current open Project is bound to the local bridge.",
        });
        json(res,409,rpcError(request.id,-32004,"No active Video OS Project is available for this credential."));
        return;
      }

      const result=await this.tools.execute(toolId,args,executionContext);
      if(result.status==="cancelled"){
        this.controller.observeAuthenticatedRequest({
          principal,clientInfo,kind:"tool-call",toolId,outcome:"cancelled",summary:"Shared read tool request cancelled.",
        });
        if(!res.writableEnded)json(res,200,rpcResult(request.id,{
          resultType:"complete",
          content:[{type:"text",text:"Tool request cancelled."}],
          structuredContent:{cancelled:true},
          isError:true,
        }));
        return;
      }
      if(result.status==="error"){
        this.controller.observeAuthenticatedRequest({
          principal,clientInfo,kind:"tool-call",toolId,outcome:"error",summary:`Shared read tool failed safely with code ${result.error.code}.`,
        });
        json(res,200,rpcResult(request.id,{
          resultType:"complete",
          content:[{type:"text",text:result.error.message}],
          structuredContent:{error:{code:result.error.code,retryable:result.error.retryable}},
          isError:true,
        }));
        return;
      }

      this.controller.observeAuthenticatedRequest({
        principal,clientInfo,kind:"tool-call",toolId,summary:"Shared read tool completed successfully.",
      });
      json(res,200,rpcResult(request.id,{
        resultType:"complete",
        content:[{type:"text",text:JSON.stringify(result.output)}],
        structuredContent:result.output,
        isError:false,
      }));
    }catch(error){
      console.error("[video-os][mcp] request failed",{
        errorType:error instanceof Error?error.name:typeof error,
      });
      if(!res.writableEnded)json(res,500,rpcError(null,-32603,"Internal MCP error without runtime details."));
    }finally{
      this.activeRequests-=1;
    }
  }
}
