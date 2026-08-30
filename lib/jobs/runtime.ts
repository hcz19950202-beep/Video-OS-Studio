import {randomUUID} from "node:crypto";
import {isDeepStrictEqual} from "node:util";
import {ZodError} from "zod";
import {CreateJobSchema,JobRecordSchema,isTerminalJobStatus,type CreateJobInput,type JobArtifact,type JobError,type JobRecord,type JobType} from "@/lib/jobs/schema";
import {probeExecutorLiveness} from "@/lib/jobs/process-probes";
import {FileJobStore,type JobLogStream} from "@/lib/jobs/store";
import {ProjectOperationIdReuseError,ProjectRevisionConflictError} from "@/lib/project/mutation-coordinator";
import {RenderReferencedMediaUnavailableError} from "@/lib/render/errors";
import {ToolAbortedError,ToolRunError,ToolTimeoutError,type ToolLogEvent} from "@/lib/process/tool-runner";

export type JobConcurrencyGroup="render"|"hyperframes"|"normalize"|"transcribe";
export type JobExecutorOutput=Record<string,unknown>|undefined;
export type JobExecutionContext={signal:AbortSignal;update:(stage:string,progress:number,outputPatch?:Record<string,unknown>)=>Promise<JobRecord>;log:(stream:JobLogStream,chunk:string)=>Promise<void>;onToolLog:(event:ToolLogEvent)=>void;addArtifact:(artifact:JobArtifact)=>Promise<void>};
export type JobExecutor=(job:JobRecord,context:JobExecutionContext)=>Promise<JobExecutorOutput>;

export class JobNotFoundError extends Error{readonly code="JOB_NOT_FOUND";constructor(readonly jobId:string){super(`Job ${jobId} was not found.`);this.name="JobNotFoundError";}}
export class JobStateError extends Error{readonly code="JOB_INVALID_STATE";constructor(message:string,readonly status:string){super(message);this.name="JobStateError";}}
export class JobIdempotencyConflictError extends Error{readonly code="JOB_IDEMPOTENCY_CONFLICT";constructor(readonly jobId:string){super(`Job ${jobId} already exists with different immutable create input.`);this.name="JobIdempotencyConflictError";}}

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
  if(error instanceof RenderReferencedMediaUnavailableError)return{code:error.code,message:error.message,retryable:false,details:{assetIds:error.assetIds}};
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
  private runtimeExecutorPid=process.pid;
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
    if(runtimeClaim&&runtimeClaim.ownerPid>0)this.runtimeExecutorPid=runtimeClaim.ownerPid;
    const jobs=await this.store.list();
    const activeJobs=runtimeClaim?jobs.filter(job=>job.status==="preparing"||job.status==="running"):[];
    const executorLiveness=runtimeClaim?await probeExecutorLiveness(activeJobs.map(job=>job.executorPid),pid=>this.store.runtimeOwner.isProcessAlive(pid)):new Map<number,boolean>();
    for(const job of jobs){
      if(job.status==="queued")this.enqueue(job);
      else if(runtimeClaim&&(job.status==="preparing"||job.status==="running")){
        const startedAt=Date.parse(job.startedAt??job.updatedAt??job.createdAt);
        const priorRuntime=runtimeClaim.isNewRuntime||!Number.isFinite(startedAt)||startedAt<runtimeClaim.runtimeStartedAt;
        const executorExited=job.executorPid===undefined||executorLiveness.get(job.executorPid)!==true;
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
    const createNew=async(jobId:string)=>{
      if(!this.executors.has(parsed.type))throw new Error(`No executor is registered for job type ${parsed.type}.`);
      const at=nowIso();
      const job=JobRecordSchema.parse({id:jobId,type:parsed.type,projectId:parsed.projectId,status:"queued",stage:"queued",progress:0,attempt:1,input:parsed.input,createdAt:at,updatedAt:at});
      await this.store.create(job);
      this.enqueue(job);
      this.pump(jobConcurrencyGroup(job.type));
      return job;
    };
    if(!parsed.jobId)return createNew(randomUUID());
    return this.withJobLock(parsed.jobId,async()=>{
      const existing=await this.store.get(parsed.jobId!);
      if(existing){
        if(existing.type!==parsed.type||existing.projectId!==parsed.projectId||!isDeepStrictEqual(existing.input,parsed.input))throw new JobIdempotencyConflictError(parsed.jobId!);
        return existing;
      }
      return createNew(parsed.jobId!);
    });
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
        return this.store.save(JobRecordSchema.parse({...queued,status:"preparing",stage:"preparing",progress:.02,startedAt,executorPid:this.runtimeExecutorPid,error:undefined,cancellationRequestedAt:undefined,finishedAt:undefined,updatedAt:startedAt}));
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
        const cancelled=latest.cancellationRequestedAt!==undefined||controller.signal.aborted;
        const finishedAt=nowIso();
        await this.store.save(JobRecordSchema.parse({...latest,status:cancelled?"cancelled":"failed",stage:cancelled?"cancelled":"failed",progress:latest.progress,error:cancelled?{code:"JOB_CANCELLED",message:"The job was cancelled.",retryable:true}:normalizedError(error),finishedAt,updatedAt:finishedAt}));
      });
    }finally{
      this.activeControllers.delete(jobId);
      this.activeByGroup.set(group,Math.max(0,(this.activeByGroup.get(group)??1)-1));
      this.pump(group);
    }
  }

  async retry(jobId:string){
    await this.ready;
    const next=await this.withJobLock(jobId,async()=>{
      const existing=await this.store.get(jobId);if(!existing)throw new JobNotFoundError(jobId);
      if(existing.status!=="failed"&&existing.status!=="cancelled"&&existing.status!=="interrupted")throw new JobStateError(`Job ${jobId} cannot retry from status ${existing.status}.`,existing.status);
      const at=nowIso();
      const retry=JobRecordSchema.parse({...existing,status:"queued",stage:"queued",progress:0,attempt:existing.attempt+1,output:undefined,error:undefined,cancellationRequestedAt:undefined,startedAt:undefined,finishedAt:undefined,executorPid:undefined,updatedAt:at});
      await this.store.save(retry);this.enqueue(retry);return retry;
    });
    this.pump(jobConcurrencyGroup(next.type));
    return next;
  }

  async cancel(jobId:string){
    await this.ready;
    const requestedAt=nowIso();
    const next=await this.withJobLock(jobId,async()=>{
      const existing=await this.store.get(jobId);if(!existing)throw new JobNotFoundError(jobId);
      if(isTerminalJobStatus(existing.status))return existing;
      if(existing.status==="queued"){
        this.removeQueued(jobId);
        return this.store.save(JobRecordSchema.parse({...existing,status:"cancelled",stage:"cancelled",error:{code:"JOB_CANCELLED",message:"The job was cancelled.",retryable:true},cancellationRequestedAt:requestedAt,finishedAt:requestedAt,updatedAt:requestedAt}));
      }
      const updated=JobRecordSchema.parse({...existing,cancellationRequestedAt:existing.cancellationRequestedAt??requestedAt,stage:"cancelling",updatedAt:requestedAt});
      await this.store.save(updated);this.activeControllers.get(jobId)?.abort();return updated;
    });
    return next;
  }
}