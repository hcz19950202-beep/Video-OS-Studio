import {access,mkdtemp,readdir,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {FileJobStore} from "@/lib/jobs/store";
import {RuntimeOwnerStore} from "@/lib/runtime/runtime-owner";
import {FileWorkflowStore} from "@/lib/workflows/store";

const roots:string[]=[];
const makeRoot=async()=>{const root=await mkdtemp(join(tmpdir(),"video-os-runtime-owner-"));roots.push(root);return root;};
const ownerFile=(root:string)=>join(root,".runtime-owner.json");
const lockFile=(root:string)=>join(root,".runtime-owner.lock");
const tempFiles=async(root:string)=>((await readdir(root)).filter(name=>name.startsWith(".runtime-owner.json.")&&name.endsWith(".tmp")));

afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});

describe("shared V2.2 W5 runtime owner",()=>{
  it("gives simultaneous Workflow and Job startup claims one runtime identity",async()=>{
    const root=await makeRoot();const workflowOwner=new RuntimeOwnerStore(root);const jobOwner=new RuntimeOwnerStore(root);
    const[workflowClaim,jobClaim]=await Promise.all([workflowOwner.claimRuntimeOwner(3101),jobOwner.claimRuntimeOwner(3101)]);
    expect(workflowClaim.runtimeId).toBe(jobClaim.runtimeId);
    expect(workflowClaim.runtimeEpoch).toBe(jobClaim.runtimeEpoch);
    expect([workflowClaim.isNewRuntime,jobClaim.isNewRuntime].filter(Boolean)).toHaveLength(1);
    expect(await workflowOwner.getRuntimeEpoch()).toBe(workflowClaim.runtimeEpoch);
  });

  it("serializes 32 concurrent claims into one runtime epoch",async()=>{
    const root=await makeRoot();const ownerPid=3201;
    const claims=await Promise.all(Array.from({length:32},()=>new RuntimeOwnerStore(root).claimRuntimeOwner(ownerPid)));
    expect(new Set(claims.map(claim=>claim.runtimeId)).size).toBe(1);
    expect(new Set(claims.map(claim=>claim.runtimeEpoch)).size).toBe(1);
    expect(claims.filter(claim=>claim.isNewRuntime)).toHaveLength(1);
    expect(JSON.parse(await readFile(ownerFile(root),"utf8"))).toMatchObject({runtimeId:claims[0].runtimeId,runtimeEpoch:claims[0].runtimeEpoch,ownerPid});
    await expect(access(lockFile(root))).rejects.toMatchObject({code:"ENOENT"});
    expect(await tempFiles(root)).toEqual([]);
  });

  it("identifies the previous runtime after an owner-pid restart",async()=>{
    const root=await makeRoot();const owner=new RuntimeOwnerStore(root);
    const oldRuntime=await owner.claimRuntimeOwner(3301);const newRuntime=await owner.claimRuntimeOwner(3302);
    expect(newRuntime.runtimeId).not.toBe(oldRuntime.runtimeId);
    expect(newRuntime.runtimeEpoch).toBeGreaterThan(oldRuntime.runtimeEpoch);
    expect(await owner.isCurrentRuntime(newRuntime.runtimeId)).toBe(true);
    expect(await owner.isCurrentRuntime(oldRuntime.runtimeId)).toBe(false);
    expect(await owner.isPreviousRuntime(oldRuntime.runtimeId)).toBe(true);
    expect(await owner.isPreviousRuntime(newRuntime.runtimeId)).toBe(false);
  });

  it("keeps one runtime epoch across a live Next worker parent handoff",async()=>{
    const root=await makeRoot();const owner=new RuntimeOwnerStore(root);
    const appRuntime=await owner.claimRuntimeOwner(process.pid);const lateWorker=await owner.claimRuntimeOwner(999999);
    expect(lateWorker.isNewRuntime).toBe(false);
    expect(lateWorker.runtimeId).toBe(appRuntime.runtimeId);
    expect(lateWorker.runtimeEpoch).toBe(appRuntime.runtimeEpoch);
    const restarted=await owner.claimRuntimeOwner(999998);
    expect(restarted.isNewRuntime).toBe(true);
    expect(restarted.runtimeId).not.toBe(appRuntime.runtimeId);
  });

  it("repairs an interrupted owner write and removes orphaned temp files on restart",async()=>{
    const root=await makeRoot();const owner=new RuntimeOwnerStore(root);const oldRuntime=await owner.claimRuntimeOwner(3401);
    await writeFile(ownerFile(root),"{\"runtimeId\":\"partial\"","utf8");
    await writeFile(join(root,".runtime-owner.json.interrupted.tmp"),"{\"runtimeId\":\"partial\"","utf8");
    const restarted=await new RuntimeOwnerStore(root).claimRuntimeOwner(3402);
    expect(restarted.runtimeId).not.toBe(oldRuntime.runtimeId);
    expect(JSON.parse(await readFile(ownerFile(root),"utf8"))).toMatchObject({runtimeId:restarted.runtimeId,ownerPid:3402});
    expect(await tempFiles(root)).toEqual([]);
    await expect(access(lockFile(root))).rejects.toMatchObject({code:"ENOENT"});
  });

  it("uses one identity for Workflow recovery and Job recovery",async()=>{
    const root=await makeRoot();const workflowStore=new FileWorkflowStore(root);const jobStore=new FileJobStore(root);
    const[workflowClaim,jobClaim]=await Promise.all([workflowStore.runtimeOwner.claimRuntimeOwner(3501),jobStore.runtimeOwner.claimRuntimeOwner(3501)]);
    expect(workflowClaim.runtimeId).toBe(jobClaim.runtimeId);
    expect(await workflowStore.runtimeOwner.getRuntimeOwner()).toMatchObject({runtimeId:workflowClaim.runtimeId,ownerPid:3501});
    expect(await jobStore.runtimeOwner.getRuntimeOwner()).toMatchObject({runtimeId:workflowClaim.runtimeId,ownerPid:3501});
    await expect(access(join(root,"workflows",".runtime-owner.json"))).rejects.toMatchObject({code:"ENOENT"});
    await expect(access(join(root,"jobs",".runtime-owner.json"))).rejects.toMatchObject({code:"ENOENT"});
  });
});
