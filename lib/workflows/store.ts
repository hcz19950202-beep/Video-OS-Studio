import {randomUUID} from "node:crypto";
import {appendFile,mkdir,open,readFile,readdir,rename,rm,writeFile} from "node:fs/promises";
import {dirname,join} from "node:path";
import {WorkflowActivitySchema,type WorkflowActivity} from "@/lib/workflows/activity";
import {WorkflowRunIdSchema,WorkflowRunSchema,type WorkflowRun} from "@/lib/workflows/schema";

const parseWorkflow=(text:string)=>WorkflowRunSchema.parse(JSON.parse(text));
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const lockContention=(code:string|undefined)=>code==="EEXIST"||code==="EPERM"||code==="EACCES";

export class WorkflowNotFoundError extends Error{
  readonly code="WORKFLOW_NOT_FOUND";
  constructor(readonly workflowRunId:string){
    super(`Workflow ${workflowRunId} was not found.`);
    this.name="WorkflowNotFoundError";
  }
}

export class FileWorkflowStore{
  readonly workflowsRoot:string;
  private readonly pathChains=new Map<string,Promise<void>>();

  constructor(dataRoot:string){this.workflowsRoot=join(dataRoot,"workflows");}

  private runDir(workflowRunId:string){return join(this.workflowsRoot,WorkflowRunIdSchema.parse(workflowRunId));}
  private workflowPath(workflowRunId:string){return join(this.runDir(workflowRunId),"workflow.json");}
  private activityPath(workflowRunId:string){return join(this.runDir(workflowRunId),"activity.jsonl");}
  private stageResultsDir(workflowRunId:string){return join(this.runDir(workflowRunId),"stage-results");}

  private async withPathLock<T>(path:string,fn:()=>Promise<T>):Promise<T>{
    const previous=this.pathChains.get(path)??Promise.resolve();
    let release!:()=>void;
    const current=new Promise<void>(resolve=>{release=resolve;});
    this.pathChains.set(path,current);
    await previous.catch(()=>undefined);
    try{return await fn();}
    finally{
      release();
      if(this.pathChains.get(path)===current)this.pathChains.delete(path);
    }
  }

  private async atomicWrite(path:string,content:string){
    await this.withPathLock(path,async()=>{
      const temp=`${path}.${randomUUID()}.tmp`;
      try{
        await mkdir(dirname(path),{recursive:true});
        await writeFile(temp,content,"utf8");
        await rename(temp,path);
      }finally{await rm(temp,{force:true});}
    });
  }

  async ensure(){await mkdir(this.workflowsRoot,{recursive:true});}

  async claimRuntimeOwner(ownerPid=process.ppid){
    await this.ensure();
    const ownerPath=join(this.workflowsRoot,".runtime-owner.json");const lockPath=join(this.workflowsRoot,".runtime-owner.lock");let handle:Awaited<ReturnType<typeof open>>|undefined;
    for(;;){
      try{handle=await open(lockPath,"wx");break;}
      catch(error){
        const code=(error as NodeJS.ErrnoException).code;if(!lockContention(code))throw error;
        try{const existing=await open(lockPath,"r");try{if(Date.now()-(await existing.stat()).mtimeMs>30_000)await rm(lockPath,{force:true});}finally{await existing.close();}}
        catch(lockError){const lockCode=(lockError as NodeJS.ErrnoException).code;if(lockCode!=="ENOENT"&&!lockContention(lockCode))throw lockError;}
        await sleep(5);
      }
    }
    try{
      let previous:{ownerPid?:unknown;runtimeStartedAt?:unknown}|undefined;
      try{previous=JSON.parse(await readFile(ownerPath,"utf8")) as {ownerPid?:unknown;runtimeStartedAt?:unknown};}catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}
      const sameOwner=previous?.ownerPid===ownerPid&&typeof previous.runtimeStartedAt==="number";
      const runtimeStartedAt=sameOwner?previous!.runtimeStartedAt as number:Date.now()-process.uptime()*1000;
      await writeFile(ownerPath,JSON.stringify({ownerPid,pid:process.pid,runtimeStartedAt,updatedAt:new Date().toISOString()},null,2)+"\n","utf8");
      return runtimeStartedAt;
    }finally{await handle.close();await rm(lockPath,{force:true});}
  }

  async withRunLock<T>(workflowRunId:string,fn:()=>Promise<T>):Promise<T>{
    const id=WorkflowRunIdSchema.parse(workflowRunId);
    const lockPath=join(this.runDir(id),".workflow-run.lock");
    let handle:Awaited<ReturnType<typeof open>>|undefined;
    for(;;){
      try{handle=await open(lockPath,"wx");break;}
      catch(error){
        const code=(error as NodeJS.ErrnoException).code;
        if(!lockContention(code))throw error;
        try{
          const lockHandle=await open(lockPath,"r");
          try{if(Date.now()-(await lockHandle.stat()).mtimeMs>30_000)await rm(lockPath,{force:true});}
          finally{await lockHandle.close();}
        }catch(lockError){
          const lockCode=(lockError as NodeJS.ErrnoException).code;
          if(lockCode!=="ENOENT"&&!lockContention(lockCode))throw lockError;
        }
        await sleep(5);
      }
    }
    try{return await fn();}
    finally{await handle.close();await rm(lockPath,{force:true});}
  }

  async create(run:WorkflowRun){
    const parsed=WorkflowRunSchema.parse(run);
    await this.ensure();
    await mkdir(this.runDir(parsed.id),{recursive:false});
    await mkdir(this.stageResultsDir(parsed.id),{recursive:false});
    await Promise.all([
      this.atomicWrite(this.workflowPath(parsed.id),JSON.stringify(parsed,null,2)+"\n"),
      this.withPathLock(this.activityPath(parsed.id),()=>writeFile(this.activityPath(parsed.id),"","utf8")),
    ]);
    return parsed;
  }

  async get(workflowRunId:string,options:{skipRunLock?:boolean}={}):Promise<WorkflowRun|null>{
    const id=WorkflowRunIdSchema.parse(workflowRunId);
    const path=this.workflowPath(id);
    const read=()=>this.withPathLock(path,async()=>{
      try{return parseWorkflow(await readFile(path,"utf8"));}
      catch(error){
        if((error as NodeJS.ErrnoException).code==="ENOENT")return null;
        throw error;
      }
    });
    if(options.skipRunLock)return read();
    try{return await this.withRunLock(id,read);}
    catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return null;throw error;}
  }

  async save(run:WorkflowRun){
    const parsed=WorkflowRunSchema.parse(run);
    const existing=await this.get(parsed.id,{skipRunLock:true});
    if(!existing)throw new WorkflowNotFoundError(parsed.id);
    await this.atomicWrite(this.workflowPath(parsed.id),JSON.stringify(parsed,null,2)+"\n");
    return parsed;
  }

  async list():Promise<WorkflowRun[]>{
    await this.ensure();
    const entries=await readdir(this.workflowsRoot,{withFileTypes:true});
    const runs=await Promise.all(entries.filter(entry=>entry.isDirectory()).map(entry=>this.get(entry.name)));
    return runs.filter((run):run is WorkflowRun=>run!==null).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
  }

  async appendActivity(activity:WorkflowActivity){
    const parsed=WorkflowActivitySchema.parse(activity);
    if(!(await this.get(parsed.workflowId)))throw new WorkflowNotFoundError(parsed.workflowId);
    const path=this.activityPath(parsed.workflowId);
    await this.withPathLock(path,()=>appendFile(path,JSON.stringify(parsed)+"\n","utf8"));
    return parsed;
  }

  async readActivity(workflowRunId:string):Promise<WorkflowActivity[]>{
    const id=WorkflowRunIdSchema.parse(workflowRunId);
    if(!(await this.get(id)))throw new WorkflowNotFoundError(id);
    const path=this.activityPath(id);
    return this.withPathLock(path,async()=>{
      const text=await readFile(path,"utf8");
      return text.split("\n").filter(Boolean).map(line=>WorkflowActivitySchema.parse(JSON.parse(line)));
    });
  }
}
