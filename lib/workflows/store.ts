import {randomUUID} from "node:crypto";
import {access,appendFile,copyFile,mkdir,readFile,readdir,rm,writeFile} from "node:fs/promises";
import {dirname,join} from "node:path";
import {replaceFileAtomically} from "@/lib/fs/atomic-replace";
import {withWindowsTransientRetry} from "@/lib/fs/atomic-replace";
import {withExclusiveFileLock} from "@/lib/fs/exclusive-lock";
import {RuntimeOwnerStore} from "@/lib/runtime/runtime-owner";
import {WorkflowActivitySchema,type WorkflowActivity} from "@/lib/workflows/activity";
import {WorkflowRunIdSchema,WorkflowRunSchema,type WorkflowRun} from "@/lib/workflows/schema";

const parseWorkflow=(text:string)=>WorkflowRunSchema.parse(JSON.parse(text));

export class WorkflowNotFoundError extends Error{
  readonly code="WORKFLOW_NOT_FOUND";
  constructor(readonly workflowRunId:string){
    super(`Workflow ${workflowRunId} was not found.`);
    this.name="WorkflowNotFoundError";
  }
}

export class FileWorkflowStore{
  readonly workflowsRoot:string;
  readonly runtimeOwner:RuntimeOwnerStore;
  private readonly pathChains=new Map<string,Promise<void>>();

  constructor(dataRoot:string,runtimeOwner=new RuntimeOwnerStore(dataRoot)){
    this.workflowsRoot=join(dataRoot,"workflows");
    this.runtimeOwner=runtimeOwner;
  }

  private runDir(workflowRunId:string){return join(this.workflowsRoot,WorkflowRunIdSchema.parse(workflowRunId));}
  private workflowPath(workflowRunId:string){return join(this.runDir(workflowRunId),"workflow.json");}
  private backupPath(workflowRunId:string){return join(this.runDir(workflowRunId),"workflow.backup.json");}
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

  private async atomicWriteUnlocked(path:string,content:string,backupPath?:string){
    await mkdir(dirname(path),{recursive:true});
    if(backupPath){
      try{
        await access(path);
        await mkdir(dirname(backupPath),{recursive:true});
        await withWindowsTransientRetry(()=>copyFile(path,backupPath));
      }catch(error){
        if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;
      }
    }
    const temp=`${path}.${randomUUID()}.tmp`;
    try{
      await writeFile(temp,content,"utf8");
      await replaceFileAtomically(temp,path);
    }finally{await rm(temp,{force:true});}
  }

  private async atomicWrite(path:string,content:string,backupPath?:string){
    await this.withPathLock(path,()=>this.atomicWriteUnlocked(path,content,backupPath));
  }

  private async exists(path:string){
    try{await access(path);return true;}
    catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return false;throw error;}
  }

  private async loadUnderPathLock(workflowRunId:string):Promise<WorkflowRun|null>{
    const path=this.workflowPath(workflowRunId);
    const backupPath=this.backupPath(workflowRunId);
    try{
      await access(path);
      try{return parseWorkflow(await readFile(path,"utf8"));}
      catch(primaryError){
        if(!(await this.exists(backupPath)))throw primaryError;
        try{
          const recovered=parseWorkflow(await readFile(backupPath,"utf8"));
          await this.atomicWriteUnlocked(path,JSON.stringify(recovered,null,2)+"\n");
          return recovered;
        }catch{throw primaryError;}
      }
    }catch(error){
      if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;
    }
    if(!(await this.exists(backupPath)))return null;
    const recovered=parseWorkflow(await readFile(backupPath,"utf8"));
    await this.atomicWriteUnlocked(path,JSON.stringify(recovered,null,2)+"\n");
    return recovered;
  }

  async ensure(){await mkdir(this.workflowsRoot,{recursive:true});}

  async withRunLock<T>(workflowRunId:string,fn:()=>Promise<T>):Promise<T>{
    const id=WorkflowRunIdSchema.parse(workflowRunId);
    return withExclusiveFileLock(join(this.runDir(id),".workflow-run.lock"),fn);
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
    const backupPath=this.backupPath(id);
    if(!(await this.exists(path))&&!(await this.exists(backupPath)))return null;
    const read=()=>this.withPathLock(path,()=>this.loadUnderPathLock(id));
    if(options.skipRunLock)return read();
    try{return await this.withRunLock(id,read);}
    catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return null;throw error;}
  }

  async save(run:WorkflowRun){
    const parsed=WorkflowRunSchema.parse(run);
    const path=this.workflowPath(parsed.id);
    await this.withPathLock(path,async()=>{
      const existing=await this.loadUnderPathLock(parsed.id);
      if(!existing)throw new WorkflowNotFoundError(parsed.id);
      await this.atomicWriteUnlocked(path,JSON.stringify(parsed,null,2)+"\n",this.backupPath(parsed.id));
    });
    return parsed;
  }

  async list():Promise<WorkflowRun[]>{
    await this.ensure();
    const entries=await readdir(this.workflowsRoot,{withFileTypes:true});
    const runs=await Promise.all(entries.filter(entry=>entry.isDirectory()).map(async entry=>{try{return await this.get(entry.name);}catch{return null;}}));
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
