import {access,mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {FileWorkflowStore} from "@/lib/workflows/store";

const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});
const makeRoot=async()=>{const root=await mkdtemp(join(tmpdir(),"video-os-w5-runtime-owner-"));roots.push(root);return root;};

describe("V2.2 W5 durable Workflow runtime ownership",()=>{
  it("shares one runtime start time across stores owned by the same app runtime",async()=>{
    const root=await makeRoot();
    const storeA=new FileWorkflowStore(root);const storeB=new FileWorkflowStore(root);await storeA.ensure();
    const seededStartedAt=1_700_000_000_000;const ownerPid=4242;
    await writeFile(join(storeA.workflowsRoot,".runtime-owner.json"),JSON.stringify({ownerPid,pid:111,runtimeStartedAt:seededStartedAt,updatedAt:new Date().toISOString()})+"\n","utf8");
    expect(await storeA.claimRuntimeOwner(ownerPid)).toBe(seededStartedAt);
    expect(await storeB.claimRuntimeOwner(ownerPid)).toBe(seededStartedAt);
    const persisted=JSON.parse(await readFile(join(storeA.workflowsRoot,".runtime-owner.json"),"utf8")) as {ownerPid:number;runtimeStartedAt:number};
    expect(persisted).toMatchObject({ownerPid,runtimeStartedAt:seededStartedAt});
  });

  it("starts a new runtime epoch when the durable owner pid changes",async()=>{
    const root=await makeRoot();const store=new FileWorkflowStore(root);await store.ensure();
    const oldStartedAt=1_600_000_000_000;
    await writeFile(join(store.workflowsRoot,".runtime-owner.json"),JSON.stringify({ownerPid:5151,pid:222,runtimeStartedAt:oldStartedAt,updatedAt:new Date().toISOString()})+"\n","utf8");
    const startedAt=await store.claimRuntimeOwner(6161);
    expect(startedAt).not.toBe(oldStartedAt);expect(startedAt).toBeGreaterThan(1_700_000_000_000);
    const persisted=JSON.parse(await readFile(join(store.workflowsRoot,".runtime-owner.json"),"utf8")) as {ownerPid:number;runtimeStartedAt:number};
    expect(persisted.ownerPid).toBe(6161);expect(persisted.runtimeStartedAt).toBe(startedAt);
  });

  it("serializes concurrent runtime-owner claims and leaves no owner lock",async()=>{
    const root=await makeRoot();const ownerPid=7171;
    const starts=await Promise.all(Array.from({length:16},()=>new FileWorkflowStore(root).claimRuntimeOwner(ownerPid)));
    expect(new Set(starts).size).toBe(1);
    const store=new FileWorkflowStore(root);const ownerPath=join(store.workflowsRoot,".runtime-owner.json");
    const persisted=JSON.parse(await readFile(ownerPath,"utf8")) as {ownerPid:number;runtimeStartedAt:number};
    expect(persisted.ownerPid).toBe(ownerPid);expect(persisted.runtimeStartedAt).toBe(starts[0]);
    await expect(access(join(store.workflowsRoot,".runtime-owner.lock"))).rejects.toMatchObject({code:"ENOENT"});
  });
});
