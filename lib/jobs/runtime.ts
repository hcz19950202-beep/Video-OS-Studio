import {randomUUID} from "node:crypto";
import {ZodError} from "zod";
import {CreateJobSchema,JobRecordSchema,isTerminalJobStatus,type CreateJobInput,type JobArtifact,type JobError,type JobRecord,type JobType} from "@/lib/jobs/schema";
import {FileJobStore,type JobLogStream} from "@/lib/jobs/store";
import {ProjectOperationIdReuseError,ProjectRevisionConflictError} from "@/lib/project/mutation-coordinator";
import {ToolAbortedError,ToolRunError,ToolTimeoutError,type ToolLogEvent} from "@/lib/process/tool-runner";

export type JobConcurrencyGroup="render"|"hyperframes"|"normalize"|"transcribe";
export type JobExecutorOutput=Record<string,unknown>|undefined;
export type JobExecutionContext={signal:AbortSignal;update:(stage:string,progress:number,outputPatch?:Record<string,unknown>)=>Promise<JobRecord>;log:(stream:JobLogStream,chunk:string)=>Promise<void>;onToolLog:(event:ToolLogEvent)=>void;addArtifact:(artifact:JobArtifact)=>Promise<void>};
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
  if(error instanceof ProjectRevisionConflictError)return{code:error.code,message:error.message,retryable:false,details:{expectedRevision:error.expectedRevision,currentRevision:error.currentRevision}};
  if(error instanceof ProjectOperationIdReuseError)return{code:error.code,message:error.message,retryable:false,details:{operationId:error.operationId}};
  if(error instanceof ZodError)return{code:"JOB_INPUT_INVALID",message:"The durable job input is invalid.",retryable:false,details:{issues:error.issues}};
  return{code:"JOB_EXECUTION_FAILED",message:error instanceof Error?error.message:String(error),retryable:true};
};

export class DurableJobRuntime{
  private readonly executors=new Map<JobType,JobExecutor>();
  private readonly queues=new Map<JobConcurrencyGroup,string[]>([["render",[]],["hyperframes",[]],["normalize",[]],["transcribe",[]]]);
  private readonly queuedIds=new Set<string>();
  private readonly activeByGroup=new Map<JobConcurrencyGroup,number>([["render",0],["hyperframes",0],["normalize",0],["transcribe",0]]);
  private readonly activeControllers=new Map<string,AbortController>();
  private readonly stateLocks=new Map<string,Promise<void>>();
  private readonly limits:Record<JobConcurrencyGroup,number>;
  private readonly ready:Promise<void>;

  constructor(readonly store:FileJobStore,executors:Partial<Record<JobType,JobExecutor>>={},limits:Partial<Record<JobConcurrencyGroup,number>>={}){
    for(const[type,executor]of Object.entries(executors))if(executor)this.executors.set(type as JobType,executor);
    this.limits={...DEFAULT_LIMITS,...limits};
    this.ready=this.initialize();
  }

  register(type:JobType,executor:JobExecutor){this.executors.set(type,executor);}

  private async withJobLock<T>(jobId:string,fn:()=>Promise<T>):Promise<T>{
    const previous=this.stateLocks.get(jobId)??Promise.resolve();
    let release!:()=>void;
    const gate=new Promise<void>(resolve=>{release=resolve;});
    const tail=previous.then(()=>gate);
    this.stateLocks.set(jobId,tail);
    await previous;
    try{return await fn();}
    finally{release();if(this.stateLocks.get(jobId)===tail)this.stateLocks.delete(jobId);}
  }

  private async initialize(){
    await this.store.ensure();
    const runtimeClaim=process.env.NEXT_PHASE==="phase-production-build"?null:await this.store.runtimeOwner.claimRuntimeOwner();
    const jobs=await this.store.list();
    for(const job of jobs){
      if(job.status==="queued")this.enqueue(job);
      else if(runtimeClaim&&(job.status==="preparing"||job.status==="running")){
        const startedAt=Date.parse(job.startedAt??job.updatedAt??job.createdAt);
        const priorRuntime=runtimeClaim.isNewRuntime||!Number.isFinite(startedAt)||startedAt<runtimeClaim.runtimeStartedAt;
        const executorExited=job.executorPid===undefined||!(await this.store.runtimeOwner.isProcessAlive(job.executorPid));
        if(!priorRuntime&&!executorExited)continue;
        const at=nowIso();
        await this.store.save(JobRecordSchema.parse({...job,status:"interrupted",stage:"interrupted",error:{code:"JOB_INTERRUPTED",message:"The Video OS process stopped while this job was active. Retry after verifying local engine state.",retryable:true},updatedAt:at,finishedAt:at}));
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

  private enqueue(job:JobRecord){if(this.queuedIds.has(job.id))return;const group=jobConcurrencyGroup(job.type);this.queues.get(group)?.push(job.id);this.queuedIds.add(job.id);}
  private removeQueued(jobId:string){this.queuedIds.delete(jobId);for(const[group,queue]of this.queues)this.queues.set(group,queue.filter(id=>id!==jobId));}
  private pump(group:JobConcurrencyGroup){
    const queue=this.queues.get(group);if(!queue)return;
    while((this.activeByGroup.get(group)??0)<this.limits[group]&&queue.length){
      const jobId=queue.shift();if(!jobId)break;
      this.queuedIds.delete(jobId);
      this.activeByGroup.set(group,(this.activeByGroup.get(group)??0)+1);
      void this.execute(jobId,group);
    }
  }

  private async enterRunning(jobId:string,controller:AbortController){
    return this.withJobLock(jobId,async()=>{
      const latest=await this.store.get(jobId);if(!latest)throw new JobNotFoundError(jobId);
      if(latest.cancellationRequestedAt||controller.signal.aborted)throw new ToolAbortedError(latest.type,"job-runtime",[],null,"","");
      if(latest.status!=="preparing")throw new JobStateError(`Job ${jobId} cannot enter running from status ${latest.status}.`,latest.status);
      return this.store.save(JobRecordSchema.parse({...latest,status:"running",stage:"running",progress:Math.max(latest.progress,.05),updatedAt:nowIso()}));
    });
  }

  private async execute(jobId:string,group:JobConcurrencyGroup){
    const controller=new AbortController();
    this.activeControllers.set(jobId,controller);
    let artifacts:JobArtifact[]=[];
    let logTail:Promise<void>=Promise.resolve();
    let logFailure:unknown;
    const queueLog=(stream:JobLogStream,chunk:string)=>{
      const write=logTail.then(()=>this.store.appendLog(jobId,stream,chunk));
      logTail=write.catch(error=>{logFailure??=error;});
      return write;
    };
    try{
      const current=await this.withJobLock(jobId,async()=>{
        const queued=await this.store.get(jobId);
        if(!queued||queued.status!=="queued")return null;
        const startedAt=nowIso();
        return this.store.save(JobRecordSchema.parse({...queued,status:"preparing",stage:"preparing",progress:.02,startedAt,executorPid:process.pid,error:undefined,cancellationRequestedAt:undefined,finishedAt:undefined,updatedAt:startedAt}));
      });
      if(!current)return;
      const executor=this.executors.get(current.type);
      if(!executor)throw new Error(`No executor is registered for job type ${current.type}.`);
      const running=await this.enterRunning(jobId,controller);
      artifacts=await this.store.getArtifacts(jobId);
      const context:JobExecutionContext={
        signal:controller.signal,
        update:async(stage,progress,outputPatch)=>this.withJobLock(jobId,async()=>{
          const latest=await this.store.get(jobId);if(!latest)throw new JobNotFoundError(jobId);
          if(latest.status!=="running"&&latest.status!=="preparing")return latest;
          if(latest.cancellationRequestedAt||controller.signal.aborted)return latest;
          return this.store.save(JobRecordSchema.parse({...latest,stage,progress:clampProgress(progress),output:outputPatch?{...(latest.output??{}),...outputPatch}:latest.output,updatedAt:nowIso()}));
        }),
        log:queueLog,
        onToolLog:event=>{void queueLog(event.stream,event.chunk).catch(()=>undefined);},
        addArtifact:async artifact=>{artifacts=[...artifacts.filter(item=>item.id!==artifact.id),artifact];await this.store.saveArtifacts(jobId,artifacts);},
      };
      const output=await executor(running,context);
      await logTail;
      if(logFailure)throw logFailure;
      await this.withJobLock(jobId,async()=>{
        const latest=await this.store.get(jobId);if(!latest)throw new JobNotFoundError(jobId);
        if(latest.cancellationRequestedAt||controller.signal.aborted)throw new ToolAbortedError(latest.type,"job-runtime",[],null,"","");
        const finishedAt=nowIso();
        await this.store.save(JobRecordSchema.parse({...latest,status:"completed",stage:"completed",progress:1,output:{...(latest.output??{}),...(output??{})},error:undefined,cancellationRequestedAt:undefined,finishedAt,updatedAt:finishedAt}));
      });
    }catch(error){
      await logTail;
      await this.withJobLock(jobId,async()=>{
        const latest=await this.store.get(jobId);if(!latest)return;
        if(isTerminalJobStatus(latest.status))return;
        const finishedAt=nowIso();
        const cancelled=controller.signal.aborted||latest.cancellationRequestedAt!==undefined||error instanceof ToolAbortedError;
        await this.store.save(JobRecordSchema.parse({...latest,status:cancelled?"cancelled":"failed",stage:cancelled?"cancelled":"failed",error:normalizedError(error),progress:cancelled?latest.progress:Math.min(latest.progress,.99),finishedAt,updatedAt:finishedAt}));
      });
    }finally{
      this.activeControllers.delete(jobId);
      this.activeByGroup.set(group,Math.max(0,(this.activeByGroup.get(group)??1)-1));
      this.pump(group);
    }
  }

  async cancel(jobId:string){
    await this.ready;
    const result=await this.withJobLock(jobId,async()=>{
      const job=await this.store.get(jobId);if(!job)throw new JobNotFoundError(jobId);
      if(isTerminalJobStatus(job.status))return job;
      const requestedAt=nowIso();
      if(job.status==="queued"){
        this.removeQueued(jobId);
        return this.store.save(JobRecordSchema.parse({...job,status:"cancelled",stage:"cancelled",error:{code:"JOB_CANCELLED",message:"The job was cancelled before execution.",retryable:true},cancellationRequestedAt:requestedAt,finishedAt:requestedAt,updatedAt:requestedAt}));
      }
      return this.store.save(JobRecordSchema.parse({...job,cancellationRequestedAt:requestedAt,stage:"cancelling",updatedAt:requestedAt}));
    });
    if(!isTerminalJobStatus(result.status))this.activeControllers.get(jobId)?.abort();
    return result;
  }

  async retry(jobId:string){
    await this.ready;
    const retried=await this.withJobLock(jobId,async()=>{
      const job=await this.store.get(jobId);if(!job)throw new JobNotFoundError(jobId);
      if(!["failed","cancelled","interrupted"].includes(job.status))throw new JobStateError(`Job ${jobId} cannot be retried from status ${job.status}.`,job.status);
      if(job.error?.retryable===false)throw new JobStateError(`Job ${jobId} failed with a non-retryable error (${job.error.code}). Create a new job with corrected input/state.`,job.status);
      const at=nowIso();
      await this.store.saveArtifacts(jobId,[]);
      return this.store.save(JobRecordSchema.parse({...job,status:"queued",stage:"queued",progress:0,attempt:job.attempt+1,error:undefined,output:undefined,executorPid:undefined,finishedAt:undefined,startedAt:undefined,cancellationRequestedAt:undefined,updatedAt:at}));
    });
    await this.store.appendLog(jobId,"stdout",`\n[video-os] retry attempt ${retried.attempt}\n`);
    this.enqueue(retried);
    this.pump(jobConcurrencyGroup(retried.type));
    return retried;
  }
}
