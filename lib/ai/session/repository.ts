import {join} from "node:path";
import type {FileSystemAdapter} from "@/adapters/contracts";
import {
  AgentSessionSchema,
  type AgentSession,
} from "@/lib/ai/session/schema";
import {AgentSessionIdSchema} from "@/lib/ai/schema";
import {ProjectIdSchema} from "@/schemas/project";

export class AgentSessionNotFoundError extends Error{
  readonly code="AGENT_SESSION_NOT_FOUND";
  constructor(readonly projectId:string,readonly sessionId:string){
    super("Agent session was not found.");
    this.name="AgentSessionNotFoundError";
  }
}

export class AgentSessionAlreadyExistsError extends Error{
  readonly code="AGENT_SESSION_ALREADY_EXISTS";
  constructor(readonly projectId:string,readonly sessionId:string){
    super("Agent session already exists.");
    this.name="AgentSessionAlreadyExistsError";
  }
}

export class AgentSessionRevisionConflictError extends Error{
  readonly code="AGENT_SESSION_REVISION_CONFLICT";
  constructor(readonly projectId:string,readonly sessionId:string){
    super("Agent session changed while this update was being prepared.");
    this.name="AgentSessionRevisionConflictError";
  }
}

const serialize=(session:AgentSession)=>JSON.stringify(AgentSessionSchema.parse(session),null,2)+"\n";
const parse=(text:string)=>AgentSessionSchema.parse(JSON.parse(text));

export class AgentSessionRepository{
  private readonly pathChains=new Map<string,Promise<void>>();

  constructor(private readonly fs:FileSystemAdapter,readonly dataRoot:string){}

  private sessionsDir(projectId:string){
    return join(this.dataRoot,"projects",ProjectIdSchema.parse(projectId),"edit","agent","sessions");
  }

  private sessionPath(projectId:string,sessionId:string){
    return join(this.sessionsDir(projectId),`${AgentSessionIdSchema.parse(sessionId)}.json`);
  }

  private backupPath(projectId:string,sessionId:string){
    return join(this.sessionsDir(projectId),`${AgentSessionIdSchema.parse(sessionId)}.backup.json`);
  }

  private lockPath(projectId:string,sessionId:string){
    return join(this.sessionsDir(projectId),`${AgentSessionIdSchema.parse(sessionId)}.lock`);
  }

  private async withPathLock<T>(path:string,work:()=>Promise<T>):Promise<T>{
    const previous=this.pathChains.get(path)??Promise.resolve();
    let release!:()=>void;
    const current=new Promise<void>(resolve=>{release=resolve;});
    this.pathChains.set(path,current);
    await previous.catch(()=>undefined);
    try{return await work();}
    finally{
      release();
      if(this.pathChains.get(path)===current)this.pathChains.delete(path);
    }
  }

  async withSessionLock<T>(projectId:string,sessionId:string,work:()=>Promise<T>):Promise<T>{
    // Kept as a compatibility boundary for older callers. Durable read/modify/write
    // operations must use mutate(); this wrapper must never span provider/network work.
    void projectId;
    void sessionId;
    return work();
  }

  private async withAtomicWriteLock<T>(projectId:string,sessionId:string,work:()=>Promise<T>):Promise<T>{
    if(this.fs.withExclusiveLock)return this.fs.withExclusiveLock(this.lockPath(projectId,sessionId),work);
    return work();
  }

  private parseForPath(text:string,projectId:string,sessionId:string){
    const session=parse(text);
    if(session.projectId!==projectId||session.id!==sessionId)throw new Error("Agent session identity does not match its repository path.");
    return session;
  }

  private async loadUnderLock(projectId:string,sessionId:string):Promise<AgentSession|null>{
    const path=this.sessionPath(projectId,sessionId);
    const backupPath=this.backupPath(projectId,sessionId);
    if(await this.fs.exists(path)){
      try{return this.parseForPath(await this.fs.readText(path),projectId,sessionId);}
      catch(primaryError){
        if(!(await this.fs.exists(backupPath)))throw primaryError;
        try{
          const recovered=this.parseForPath(await this.fs.readText(backupPath),projectId,sessionId);
          await this.fs.ensureDir(this.sessionsDir(projectId));
          await this.fs.writeTextAtomic(path,serialize(recovered));
          return recovered;
        }catch{
          // Preserve the primary failure: the backup is recovery evidence, never a second source of opaque errors.
        }
        throw primaryError;
      }
    }
    if(!(await this.fs.exists(backupPath)))return null;
    const recovered=this.parseForPath(await this.fs.readText(backupPath),projectId,sessionId);
    await this.fs.ensureDir(this.sessionsDir(projectId));
    await this.fs.writeTextAtomic(path,serialize(recovered));
    return recovered;
  }

  async create(sessionInput:AgentSession):Promise<AgentSession>{
    const session=AgentSessionSchema.parse(sessionInput);
    const path=this.sessionPath(session.projectId,session.id);
    return this.withSessionLock(session.projectId,session.id,()=>this.withAtomicWriteLock(session.projectId,session.id,async()=>{
      if(await this.loadUnderLock(session.projectId,session.id))throw new AgentSessionAlreadyExistsError(session.projectId,session.id);
      await this.fs.ensureDir(this.sessionsDir(session.projectId));
      await this.fs.writeTextAtomic(path,serialize(session));
      return session;
    }));
  }

  async load(projectIdInput:string,sessionIdInput:string):Promise<AgentSession|null>{
    const projectId=ProjectIdSchema.parse(projectIdInput);
    const sessionId=AgentSessionIdSchema.parse(sessionIdInput);
    const path=this.sessionPath(projectId,sessionId);
    return this.withPathLock(path,()=>this.withAtomicWriteLock(projectId,sessionId,()=>this.loadUnderLock(projectId,sessionId)));
  }

  async require(projectId:string,sessionId:string):Promise<AgentSession>{
    const session=await this.load(projectId,sessionId);
    if(!session)throw new AgentSessionNotFoundError(projectId,sessionId);
    return session;
  }

  async save(sessionInput:AgentSession):Promise<AgentSession>{
    const session=AgentSessionSchema.parse(sessionInput);
    const path=this.sessionPath(session.projectId,session.id);
    return this.withPathLock(path,()=>this.withAtomicWriteLock(session.projectId,session.id,async()=>{
      const current=await this.loadUnderLock(session.projectId,session.id);
      if(!current)throw new AgentSessionNotFoundError(session.projectId,session.id);
      if(Date.parse(session.updatedAt)<Date.parse(current.updatedAt))throw new AgentSessionRevisionConflictError(session.projectId,session.id);
      await this.fs.writeTextAtomic(path,serialize(session),this.backupPath(session.projectId,session.id));
      return session;
    }));
  }

  async mutate(projectIdInput:string,sessionIdInput:string,mutation:(current:AgentSession)=>AgentSession|Promise<AgentSession>):Promise<AgentSession>{
    const projectId=ProjectIdSchema.parse(projectIdInput);
    const sessionId=AgentSessionIdSchema.parse(sessionIdInput);
    const path=this.sessionPath(projectId,sessionId);
    return this.withPathLock(path,()=>this.withAtomicWriteLock(projectId,sessionId,async()=>{
      const current=await this.loadUnderLock(projectId,sessionId);
      if(!current)throw new AgentSessionNotFoundError(projectId,sessionId);
      const next=AgentSessionSchema.parse(await mutation(current));
      if(next.projectId!==projectId||next.id!==sessionId)throw new Error("Agent session mutation cannot change repository identity.");
      await this.fs.writeTextAtomic(path,serialize(next),this.backupPath(projectId,sessionId));
      return next;
    }));
  }

  async mutateSession(projectId:string,sessionId:string,mutation:(current:AgentSession)=>AgentSession|Promise<AgentSession>):Promise<AgentSession>{
    return this.mutate(projectId,sessionId,mutation);
  }

  async list(projectIdInput:string):Promise<AgentSession[]>{
    const projectId=ProjectIdSchema.parse(projectIdInput);
    const dir=this.sessionsDir(projectId);
    const files=await this.fs.listFiles(dir);
    const ids=[...new Set(files.flatMap(name=>{
      if(name.endsWith(".backup.json"))return[name.slice(0,-12)];
      if(name.endsWith(".json"))return[name.slice(0,-5)];
      return[];
    }))];
    const sessions=await Promise.all(ids.map(id=>this.load(projectId,id)));
    return sessions.filter((session):session is AgentSession=>session!==null).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  }
}
