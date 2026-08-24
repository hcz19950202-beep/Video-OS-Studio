import {randomUUID} from "node:crypto";
import {appendFile,mkdir,readFile,readdir,rename,rm,writeFile} from "node:fs/promises";
import {dirname,join} from "node:path";
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

  async get(workflowRunId:string):Promise<WorkflowRun|null>{
    const id=WorkflowRunIdSchema.parse(workflowRunId);
    const path=this.workflowPath(id);
    return this.withPathLock(path,async()=>{
      try{return parseWorkflow(await readFile(path,"utf8"));}
      catch(error){
        if((error as NodeJS.ErrnoException).code==="ENOENT")return null;
        throw error;
      }
    });
  }

  async save(run:WorkflowRun){
    const parsed=WorkflowRunSchema.parse(run);
    const existing=await this.get(parsed.id);
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
