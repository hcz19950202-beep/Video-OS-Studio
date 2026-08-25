import {access,mkdtemp,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {FileWorkflowStore} from "@/lib/workflows/store";

const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});
const makeRoot=async()=>{const root=await mkdtemp(join(tmpdir(),"video-os-w5-runtime-owner-"));roots.push(root);return root;};

describe("V2.2 W5 durable Workflow runtime ownership",()=>{
  it("shares one runtime start time across stores owned by the same app runtime",async()=>{
    const root=await makeRoot();const storeA=new FileWorkflowStore(root);const storeB=new FileWorkflowStore(root);const ownerPid=process.pid;
    const first=await storeA.runtimeOwner.claimRuntimeOwner(ownerPid);const second=await storeB.runtimeOwner.claimRuntimeOwner(ownerPid);
    expect(second).toMatchObject({runtimeId:first.runtimeId,runtimeEpoch:first.runtimeEpoch,runtimeStartedAt:first.runtimeStartedAt,ownerPid});
    expect(second.isNewRuntime).toBe(false);
    const persisted=JSON.parse(await readFile(join(root,".runtime-owner.json"),"utf8")) as {ownerPid:number;runtimeId:string;runtimeEpoch:number};
    expect(persisted).toMatchObject({ownerPid,runtimeId:first.runtimeId,runtimeEpoch:first.runtimeEpoch});
  });

  it("starts a new runtime epoch when the durable owner pid changes",async()=>{
    const root=await makeRoot();const store=new FileWorkflowStore(root);
    const oldOwner=await store.runtimeOwner.claimRuntimeOwner(2_147_483_646);const newOwner=await store.runtimeOwner.claimRuntimeOwner(2_147_483_647);
    expect(newOwner.runtimeId).not.toBe(oldOwner.runtimeId);expect(newOwner.runtimeEpoch).toBeGreaterThan(oldOwner.runtimeEpoch);
    expect(await store.runtimeOwner.isCurrentRuntime(newOwner.runtimeId)).toBe(true);
    expect(await store.runtimeOwner.isPreviousRuntime(oldOwner.runtimeId)).toBe(true);
    const persisted=JSON.parse(await readFile(join(root,".runtime-owner.json"),"utf8")) as {ownerPid:number;runtimeId:string;previousRuntimeId:string};
    expect(persisted).toMatchObject({ownerPid:2_147_483_647,runtimeId:newOwner.runtimeId,previousRuntimeId:oldOwner.runtimeId});
  });

  it("serializes concurrent runtime-owner claims and leaves no owner lock",async()=>{
    const root=await makeRoot();const ownerPid=process.pid;
    const claims=await Promise.all(Array.from({length:16},()=>new FileWorkflowStore(root).runtimeOwner.claimRuntimeOwner(ownerPid)));
    expect(new Set(claims.map(claim=>claim.runtimeId)).size).toBe(1);
    expect(new Set(claims.map(claim=>claim.runtimeEpoch)).size).toBe(1);
    const store=new FileWorkflowStore(root);const ownerPath=join(root,".runtime-owner.json");
    const persisted=JSON.parse(await readFile(ownerPath,"utf8")) as {ownerPid:number;runtimeEpoch:number};
    expect(persisted).toMatchObject({ownerPid,runtimeEpoch:claims[0].runtimeEpoch});
    await expect(access(join(root,".runtime-owner.lock"))).rejects.toMatchObject({code:"ENOENT"});
    expect(store.runtimeOwner.runtimeOwnerPath).toBe(ownerPath);
  });
});
