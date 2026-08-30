import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {NodeFileSystemAdapter} from "@/adapters/filesystem";
import {AgentSessionRepository,AgentSessionRevisionConflictError} from "@/lib/ai/session/repository";
import {AgentSessionSchema} from "@/lib/ai/session/schema";

const PROJECT_ID="agent-cross-process";
const SESSION_ID="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const roots:string[]=[];
const session=()=>AgentSessionSchema.parse({
  id:SESSION_ID,
  projectId:PROJECT_ID,
  providerId:"test-provider",
  status:"active",
  createdAt:"2026-08-30T00:00:00.000Z",
  updatedAt:"2026-08-30T00:00:00.000Z",
  messages:[],
  turns:[],
  proposals:[],
  approvedOperations:[],
});

afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});

describe("Agent Session durable cross-process RMW",()=>{
  it("rejects a stale full save and preserves both writers through mutate",async()=>{
    const root=await mkdtemp(join(tmpdir(),"video-os-agent-rmw-"));roots.push(root);
    const first=new AgentSessionRepository(new NodeFileSystemAdapter(),root);
    const second=new AgentSessionRepository(new NodeFileSystemAdapter(),root);
    await first.create(session());
    const loadedByA=await first.require(PROJECT_ID,SESSION_ID);
    const loadedByB=await second.require(PROJECT_ID,SESSION_ID);

    await first.save(AgentSessionSchema.parse({...loadedByA,messages:[{id:"message-a",role:"user",content:"A",createdAt:"2026-08-30T00:00:01.000Z"}],updatedAt:"2026-08-30T00:00:01.000Z"}));
    await expect(second.save(AgentSessionSchema.parse({...loadedByB,messages:[{id:"message-b",role:"user",content:"B",createdAt:"2026-08-30T00:00:02.000Z"}]}))).rejects.toBeInstanceOf(AgentSessionRevisionConflictError);

    await second.mutate(PROJECT_ID,SESSION_ID,current=>AgentSessionSchema.parse({...current,messages:[...current.messages,{id:"message-b",role:"user",content:"B",createdAt:"2026-08-30T00:00:02.000Z"}],updatedAt:"2026-08-30T00:00:02.000Z"}));
    const final=await first.require(PROJECT_ID,SESSION_ID);
    expect(final.messages.map(message=>message.id)).toEqual(["message-a","message-b"]);
  });
});
