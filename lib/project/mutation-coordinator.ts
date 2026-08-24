import {createHash} from "node:crypto";
import {z} from "zod";
import type {FileSystemAdapter} from "@/adapters/contracts";
import {applyProjectCommand} from "@/lib/project/commands";
import {applyProjectCommandTransaction} from "@/lib/project/history";
import {
  ProjectCommandMutationSchema,
  ProjectReplacementMutationSchema,
  ProjectTransactionMutationSchema,
  type ProjectCommandMutation,
  type ProjectMutationResponse,
  type ProjectReplacementMutation,
  type ProjectTransactionMutation,
} from "@/lib/project/mutation-contract";
import type {ProjectRepository} from "@/lib/project/repository";
import {ProjectSchema,type Project} from "@/schemas/project";

const OperationKindSchema=z.enum(["command","transaction","replacement","script","media","video-use","hyperframes","preset","visual-plan","service"]);
type OperationKind=z.infer<typeof OperationKindSchema>;
const OperationStatusSchema=z.enum(["pending","applied","aborted"]);
const ProjectOperationRecordSchema=z.object({
  operationId:z.string().min(1),
  kind:OperationKindSchema,
  fingerprint:z.string().min(1),
  expectedRevision:z.number().int().nonnegative(),
  appliedRevision:z.number().int().nonnegative(),
  status:OperationStatusSchema,
  recordedAt:z.string().datetime(),
});
type ProjectOperationRecord=z.infer<typeof ProjectOperationRecordSchema>;
export type ProjectOperationState=Pick<ProjectOperationRecord,"operationId"|"kind"|"expectedRevision"|"appliedRevision"|"status"|"recordedAt">;

export class ProjectRevisionConflictError extends Error{
  readonly code="PROJECT_REVISION_CONFLICT";
  constructor(readonly expectedRevision:number,readonly currentRevision:number){
    super("Project changed. Reload the latest revision and retry this edit.");
    this.name="ProjectRevisionConflictError";
  }
}

export class ProjectOperationIdReuseError extends Error{
  readonly code="PROJECT_OPERATION_ID_REUSED";
  constructor(readonly operationId:string){
    super(`Operation ID ${operationId} was already used for a different mutation.`);
    this.name="ProjectOperationIdReuseError";
  }
}

export class ProjectMutationInvariantError extends Error{
  readonly code="PROJECT_MUTATION_INVARIANT";
  constructor(message:string){super(message);this.name="ProjectMutationInvariantError";}
}

const stableValue=(value:unknown):unknown=>{
  if(Array.isArray(value))return value.map(stableValue);
  if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,stableValue(item)]));
  return value;
};
const fingerprint=(value:unknown)=>createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex");

export type CoordinatedProjectMutation={
  projectId:string;
  expectedRevision:number;
  operationId:string;
  kind:OperationKind;
  payload:unknown;
  apply:(current:Project)=>Project|Promise<Project>;
};

export class ProjectMutationCoordinator{
  private readonly projectChains=new Map<string,Promise<void>>();
  constructor(private readonly fs:FileSystemAdapter,private readonly repository:ProjectRepository){}

  private operationLogPath(projectId:string){return this.repository.resolveProjectFile(projectId,"operations.jsonl");}

  private async withProjectLock<T>(projectId:string,work:()=>Promise<T>):Promise<T>{
    const previous=this.projectChains.get(projectId)??Promise.resolve();
    let release!:()=>void;
    const gate=new Promise<void>(resolve=>{release=resolve;});
    const current=previous.catch(()=>undefined).then(()=>gate);
    this.projectChains.set(projectId,current);
    await previous.catch(()=>undefined);
    try{return await work();}
    finally{
      release();
      if(this.projectChains.get(projectId)===current)this.projectChains.delete(projectId);
    }
  }

  private async readRecords(projectId:string):Promise<ProjectOperationRecord[]>{
    const path=this.operationLogPath(projectId);
    if(!(await this.fs.exists(path)))return[];
    const text=await this.fs.readText(path);
    if(!text.trim())return[];
    return text.split(/\r?\n/u).filter(Boolean).map(line=>ProjectOperationRecordSchema.parse(JSON.parse(line)));
  }

  private latestRecords(records:ProjectOperationRecord[]){
    const latest=new Map<string,ProjectOperationRecord>();
    for(const record of records)latest.set(record.operationId,record);
    return latest;
  }

  private async appendRecord(projectId:string,record:ProjectOperationRecord){
    const path=this.operationLogPath(projectId);
    const previous=await this.fs.exists(path)?await this.fs.readText(path):"";
    const line=`${JSON.stringify(ProjectOperationRecordSchema.parse(record))}\n`;
    await this.fs.writeTextAtomic(path,`${previous}${line}`);
  }

  private async reconcilePending(projectId:string,current:Project,records:ProjectOperationRecord[]){
    const latest=this.latestRecords(records);
    for(const record of latest.values()){
      if(record.status!=="pending")continue;
      const status:ProjectOperationRecord["status"]=current.project.revision>=record.appliedRevision?"applied":"aborted";
      await this.appendRecord(projectId,{...record,status,recordedAt:new Date().toISOString()});
    }
  }

  async getOperation(projectId:string,operationId:string):Promise<ProjectOperationState|null>{
    return this.withProjectLock(projectId,async()=>{
      const current=await this.repository.load(projectId);
      let records=await this.readRecords(projectId);
      await this.reconcilePending(projectId,current,records);
      records=await this.readRecords(projectId);
      const record=this.latestRecords(records).get(operationId);
      if(!record)return null;
      const{fingerprint:_,...state}=record;
      return state;
    });
  }

  async mutate(input:CoordinatedProjectMutation):Promise<ProjectMutationResponse>{
    return this.withProjectLock(input.projectId,async()=>{
      let current=await this.repository.load(input.projectId);
      let records=await this.readRecords(input.projectId);
      await this.reconcilePending(input.projectId,current,records);
      records=await this.readRecords(input.projectId);
      const latest=this.latestRecords(records);
      const existing=latest.get(input.operationId);
      const inputFingerprint=fingerprint(input.payload);

      if(existing&&(existing.kind!==input.kind||existing.fingerprint!==inputFingerprint))throw new ProjectOperationIdReuseError(input.operationId);
      if(existing?.status==="applied"){
        current=await this.repository.load(input.projectId);
        return{project:current,operationId:input.operationId,appliedRevision:existing.appliedRevision,alreadyApplied:true};
      }

      if(current.project.revision!==input.expectedRevision)throw new ProjectRevisionConflictError(input.expectedRevision,current.project.revision);

      const next=ProjectSchema.parse(await input.apply(structuredClone(current)));
      if(next.project.id!==current.project.id)throw new ProjectMutationInvariantError("A coordinated mutation cannot change the Project ID.");
      if(next.project.revision!==current.project.revision+1)throw new ProjectMutationInvariantError(`A coordinated mutation must advance revision exactly once (${current.project.revision} → ${current.project.revision+1}).`);

      const pending:ProjectOperationRecord={operationId:input.operationId,kind:input.kind,fingerprint:inputFingerprint,expectedRevision:input.expectedRevision,appliedRevision:next.project.revision,status:"pending",recordedAt:new Date().toISOString()};
      await this.appendRecord(input.projectId,pending);
      try{await this.repository.save(next);}
      catch(error){
        await this.appendRecord(input.projectId,{...pending,status:"aborted",recordedAt:new Date().toISOString()});
        throw error;
      }
      await this.appendRecord(input.projectId,{...pending,status:"applied",recordedAt:new Date().toISOString()});
      return{project:next,operationId:input.operationId,appliedRevision:next.project.revision,alreadyApplied:false};
    });
  }

  async applyCommand(projectId:string,input:ProjectCommandMutation):Promise<ProjectMutationResponse>{
    const parsed=ProjectCommandMutationSchema.parse(input);
    return this.mutate({projectId,expectedRevision:parsed.expectedRevision,operationId:parsed.commandId,kind:"command",payload:parsed.command,apply:current=>applyProjectCommand(current,parsed.command)});
  }

  async applyTransaction(projectId:string,input:ProjectTransactionMutation):Promise<ProjectMutationResponse>{
    const parsed=ProjectTransactionMutationSchema.parse(input);
    const transaction={id:parsed.transactionId,...parsed.transaction};
    return this.mutate({projectId,expectedRevision:parsed.expectedRevision,operationId:parsed.transactionId,kind:"transaction",payload:transaction,apply:current=>applyProjectCommandTransaction(current,transaction)});
  }

  async replaceProject(projectId:string,input:ProjectReplacementMutation):Promise<ProjectMutationResponse>{
    const parsed=ProjectReplacementMutationSchema.parse(input);
    if(parsed.project.project.id!==projectId)throw new ProjectMutationInvariantError("Project ID in the replacement payload does not match the route.");
    return this.mutate({projectId,expectedRevision:parsed.expectedRevision,operationId:parsed.operationId,kind:"replacement",payload:{reason:parsed.reason,project:parsed.project},apply:current=>applyProjectCommand(current,{type:"restore-project-snapshot",snapshot:parsed.project})});
  }
}
