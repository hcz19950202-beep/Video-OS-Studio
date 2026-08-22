import {randomUUID} from "node:crypto";
import {ToolAbortedError,ToolRunError,ToolTimeoutError,type ToolLogEvent} from "@/lib/process/tool-runner";
import {CreateJobSchema,JobRecordSchema,isTerminalJobStatus,type CreateJobInput,type JobArtifact,type JobError,type JobRecord,type JobType} from "@/lib/jobs/schema";
import {FileJobStore,type JobLogStream} from "@/lib/jobs/store";

export type JobConcurrencyGroup="render"|"hyperframes"|"normalize"|"transcribe";
export type JobExecutorOutput=Record<string,unknown>|undefined;
export type JobExecutionContext={
  signal:AbortSignal;
  update:(stage:string,progress:number,outputPatch?:Record<string,unknown>)=>Promise<JobRecord>;
  log:(stream:JobLogStream,chunk:string)=>Promise<void>;
  onToolLog:(event:ToolLogEvent)=>void;
  addArtifact:(artifact:JobArtifact)=>Promise<void>;
};
export type JobExecutor=(job:JobRecord,context:JobExecutionContext)=>Promise<JobExecutorOutput>;

export class JobNotFoundError extends Error{readonly code="JOB_NOT_FOUND";constructor(readonly jobId:string){super(`Job ${jobId} was not found.`);this.name="JobNotFoundError";}}
export class JobStateError extends Error{readonly code="JOB_INVALID_STATE";constructor(message:string,readonly status:string){super(message);this.name="JobStateError";}}

const DEFAULT_LIMITS:Record<JobConcurrencyGroup,number>={render:1,hyperframes:1,normalize:2,transcribe:1};
export const jobConcurrencyGroup=(type:JobType):JobConcurrencyGroup=>type.startsWith("render-")?"render":type==="hyperframes-render"?"hyperframes":type==="media-normalize"?"normalize":"transcribe";

const clampProgress=(value:number)=>Math.max(0,Math.min(1,value));
const nowIso=()=>new Date().toISOString();
const normalizedError=(error:unknown):JobError=>{
  if(error instanceof ToolTimeoutError)return{code:error.code,message:error.message,retryable:true};
  if(error instanceof ToolAbortedError)return{code:error.code,message:error.message,retryable:true};
  if(error instanceof ToolRunError)return{code:error.code,message:error.message,retryable:true,details:{tool:error.tool,exitCode:error.exitCode,exitSignal:error.exitSignal}};
  return{code:"JOB_EXECUTION_FAILED",message:error instanceof Error?error.message:String(error),retryable:true};
};

export class DurableJobRuntime{
  private readonly executors=new Map<JobType,JobExecutor>();
  private readonly queues=new Map<JobConcurrencyGroup,string[]>([["render",[]],["hyperframes",[]],["normalize",[]],["transcribe",[]]]);
  private readonly queuedIds=new Set<string>();
  private readonly activeByGroup=new Map<JobConcurrencyGroup,number>([["render",0],["hyperframes",0],["normalize",0],["transcribe",0]]);
  private readonly activeControllers=new Map<string,AbortController>();
  private readonly limits:Record<JobConcurrencyGroup,number>;
  private readonly ready:Promise<void>;

  constructor(readonly store:FileJobStore,executors:Partial<Record<JobType,JobExecutor>>={},limits:Partial<Record<JobConcurrencyGroup,number>>={}){
    for(const[type,executor]of Object.entries(executors))if(executor)this.executors.set(type as JobType,executor);
    this.limits={...DEFAULT_LIMITS,...limits};
    this.ready=this.initialize();
  }

  register(type:JobType,executor:JobExecutor){this.executors.set(type,executor);}

  private async initialize(){
    await this.store.ensure();
    const jobs=await this.store.list();
    for(const job of jobs){
      if(job.status==="queued")this.enqueue(job);
      else if(job.status==="preparing"||job.status==="running"){
        const at=nowIso();
        await this.store.save({...job,status:"interrupted",stage:"interrupted",error:{code:"JOB_INTERRUPTED",message:"The Video OS process stopped while this job was active. Retry the job after verifying local engine state.",retryable:true},updatedAt:at,finishedAt:at});
      }
    }
    for(const group of this.queues.keys())this.pump(group);
  }

  async waitUntilReady(){await this.ready;}

  async create(input:CreateJobInput){
    await this.ready;
    const parsed=CreateJobSchema.parse(input);
    if(!this.executors.has(parsed.type))throw new Error(`No executor is registered for job type ${parsed.type}.`);
    const at=nowIso();
    const job=JobRecordSchema.parse({id:randomUUID(),type:parsed.type,projectId:parsed.projectId,status:"queued",stage:"queued",progress:0,attempt:1,input:parsed.input,createdAt:at,updatedAt:at});
    await this.store.create(job);
    this.enqueue(job);
    this.pump(jobConcurrencyGroup(job.type));
    return job;
  }

  async get(jobId:string){await this.ready;return this.store.get(jobId);}
  async list(){await this.ready;return this.store.list();}
  async getArtifacts(jobId:string){await this.ready;return this.store.getArtifacts(jobId);}
  async readLog(jobId:string,stream:JobLogStream){await this.ready;return this.store.readLog(jobId,stream);}

  private enqueue(job:JobRecord){
    if(this.queuedIds.has(job.id))return;
    const group=jobConcurrencyGroup(job.type);
    this.queues.get(group)?.push(job.id);
    this.queuedIds.add(job.id);
  }

  private removeQueued(jobId:string){
    this.queuedIds.delete(jobId);
    for(const[group,queue]of this.queues)this.queues.set(group,queue.filter(id=>id!==jobId));
  }

  private pump(group:JobConcurrencyGroup){
    const queue=this.queues.get(group);if(!queue)return;
    while((this.activeByGroup.get(group)??0)<this.limits[group]&&queue.length){
      const jobId=queue.shift();if(!jobId)break;
      this.queuedIds.delete(jobId);
      this.activeByGroup.set(group,(this.activeByGroup.get(group)??0)+1);
      void this.execute(jobId,group);
    }
  }

  private async patch(jobId:string,patch:Partial<JobRecord>){
    const current=await this.store.get(jobId);if(!current)throw new JobNotFoundError(jobId);
    const next=JobRecordSchema.parse({...current,...patch,updatedAt:nowIso()});
    return this.store.save(next);
  }

  private async execute(jobId:string,group:JobConcurrencyGroup){
    const controller=new AbortController();
    this.activeControllers.set(jobId,controller);
    let artifacts:JobArtifact[]=[];
    try{
      const queued=await this.store.get(jobId);
      if(!queued||queued.status!=="queued")return;
      const executor=this.executors.get(queued.type);
      if(!executor)throw new Error(`No executor is registered for job type ${queued.type}.`);
      const startedAt=nowIso();
      let current=await this.patch(jobId,{status:"preparing",stage:"preparing",progress:.02,startedAt,finishedAt:undefined,error:undefined,cancellationRequestedAt:undefined});
      current=await this.patch(jobId,{status:"running",stage:"running",progress:Math.max(current.progress,.05)});
      artifacts=await this.store.getArtifacts(jobId);
      const context:JobExecutionContext={
        signal:controller.signal,
        update:async(stage,progress,outputPatch)=>{
          const latest=await this.store.get(jobId);if(!latest)throw new JobNotFoundError(jobId);
          return this.patch(jobId,{stage,progress:clampProgress(progress),output:outputPatch?{...(latest.output??{}),...outputPatch}:latest.output});
        },
        log:(stream,chunk)=>this.store.appendLog(jobId,stream,chunk),
        onToolLog:event=>{void this.store.appendLog(jobId,event.stream,event.chunk);},
        addArtifact:async artifact=>{artifacts=[...artifacts.filter(item=>item.id!==artifact.id),artifact];await this.store.saveArtifacts(jobId,artifacts);},
      };
      const output=await executor(current,context);
      const finishedAt=nowIso();
      const latest=await this.store.get(jobId);if(!latest)throw new JobNotFoundError(jobId);
      await this.store.save(JobRecordSchema.parse({...latest,status:"completed",stage:"completed",progress:1,output:{...(latest.output??{}),...(output??{})},error:undefined,cancellationRequestedAt:undefined,finishedAt,updatedAt:finishedAt}));
    }catch(error){
      const latest=await this.store.get(jobId);
      if(latest){
        const finishedAt=nowIso();
        const cancelled=controller.signal.aborted||latest.cancellationRequestedAt!==undefined||error instanceof ToolAbortedError;
        await this.store.save(JobRecordSchema.parse({...latest,status:cancelled?"cancelled":"failed",stage:cancelled?"cancelled":"failed",error:normalizedError(error),progress:cancelled?latest.progress:Math.min(latest.progress,.99),finishedAt,updatedAt:finishedAt}));
      }
    }finally{
      this.activeControllers.delete(jobId);
      this.activeByGroup.set(group,Math.max(0,(this.activeByGroup.get(group)??1)-1));
      this.pump(group);
    }
  }

  async cancel(jobId:string){
    await this.ready;
    const job=await this.store.get(jobId);if(!job)throw new JobNotFoundError(jobId);
    if(isTerminalJobStatus(job.status))return job;
    const requestedAt=nowIso();
    if(job.status==="queued"){
      this.removeQueued(jobId);
      return this.store.save(JobRecordSchema.parse({...job,status:"cancelled",stage:"cancelled",error:{code:"JOB_CANCELLED",message:"The job was cancelled before execution.",retryable:true},cancellationRequestedAt:requestedAt,finishedAt:requestedAt,updatedAt:requestedAt}));
    }
    const next=await this.patch(jobId,{cancellationRequestedAt:requestedAt,stage:"cancelling"});
    this.activeControllers.get(jobId)?.abort();
    return next;
  }

  async retry(jobId:string){
    await this.ready;
    const job=await this.store.get(jobId);if(!job)throw new JobNotFoundError(jobId);
    if(!["failed","cancelled","interrupted"].includes(job.status))throw new JobStateError(`Job ${jobId} cannot be retried from status ${job.status}.`,job.status);
    const at=nowIso();
    const{error:_error,output:_output,finishedAt:_finishedAt,startedAt:_startedAt,cancellationRequestedAt:_cancel,...base}=job;
    const retried=JobRecordSchema.parse({...base,status:"queued",stage:"queued",progress:0,attempt:job.attempt+1,updatedAt:at});
    await this.store.save(retried);
    await this.store.appendLog(jobId,"stdout",`\n[video-os] retry attempt ${retried.attempt}\n`);
    this.enqueue(retried);
    this.pump(jobConcurrencyGroup(retried.type));
    return retried;
  }
}
