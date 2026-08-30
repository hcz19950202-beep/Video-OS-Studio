import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {FileJobStore} from "@/lib/jobs/store";
import {JobRecordSchema} from "@/lib/jobs/schema";
import {RuntimeOwnerStore} from "@/lib/runtime/runtime-owner";
import {FileWorkflowStore} from "@/lib/workflows/store";
import {WorkflowRunSchema} from "@/lib/workflows/schema";

const roots:string[]=[];
const at="2026-08-30T00:00:00.000Z";

afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});

describe("Windows durable JSON recovery",()=>{
  it("recovers a Job and its artifacts from valid backups after primary corruption",async()=>{
    const root=await mkdtemp(join(tmpdir(),"video-os-recovery-job-"));roots.push(root);
    const store=new FileJobStore(root);
    await store.ensure();
    const job=JobRecordSchema.parse({id:"11111111-1111-4111-8111-111111111111",type:"render-final",projectId:"demo",status:"queued",stage:"queued",progress:0,attempt:1,input:{},createdAt:at,updatedAt:at});
    await store.create(job);
    await store.save({...job,status:"running",stage:"running",progress:.1,updatedAt:"2026-08-30T00:00:01.000Z"});
    await store.saveArtifacts(job.id,[{id:"output",kind:"render",label:"output",relativePath:"render/out.mp4"}]);
    await writeFile(join(root,"jobs",job.id,"job.json"),"{broken","utf8");
    await writeFile(join(root,"jobs",job.id,"artifacts.json"),"[broken","utf8");

    expect(await store.get(job.id)).toEqual(job);
    expect(await store.getArtifacts(job.id)).toEqual([]);
    expect(JSON.parse(await readFile(join(root,"jobs",job.id,"job.json"),"utf8"))).toEqual(job);
    expect(JSON.parse(await readFile(join(root,"jobs",job.id,"artifacts.json"),"utf8"))).toEqual([]);
  });

  it("recovers a Workflow run from its valid backup after primary corruption",async()=>{
    const root=await mkdtemp(join(tmpdir(),"video-os-recovery-workflow-"));roots.push(root);
    const store=new FileWorkflowStore(root);
    const run=WorkflowRunSchema.parse({id:"22222222-2222-4222-8222-222222222222",definitionId:"talking-head",definitionVersion:"1",projectId:"demo",createdAt:at,updatedAt:at,status:"pending",scenario:"talking-head",sourceAssetIds:[],canvasSnapshot:{width:1920,height:1080,fps:30},stageExecutions:[],checkpoints:[],artifacts:[],lastKnownProjectRevision:0});
    await store.create(run);
    await store.save({...run,status:"running",updatedAt:"2026-08-30T00:00:01.000Z"});
    await writeFile(join(root,"workflows",run.id,"workflow.json"),"{broken","utf8");

    expect(await store.get(run.id)).toEqual(run);
    expect(JSON.parse(await readFile(join(root,"workflows",run.id,"workflow.json"),"utf8"))).toEqual(run);
  });

  it("recovers RuntimeOwner metadata under the durable owner lock",async()=>{
    const root=await mkdtemp(join(tmpdir(),"video-os-recovery-owner-"));roots.push(root);
    const owner=new RuntimeOwnerStore(root);
    const first=await owner.claimRuntimeOwner(process.pid);
    await owner.claimRuntimeOwner(process.pid);
    await writeFile(join(root,".runtime-owner.json"),"{broken","utf8");

    const recovered=await new RuntimeOwnerStore(root).getRuntimeOwner();
    expect(recovered).toMatchObject({runtimeId:first.runtimeId,runtimeEpoch:first.runtimeEpoch,ownerPid:process.pid});
    expect(JSON.parse(await readFile(join(root,".runtime-owner.json"),"utf8"))).toMatchObject({runtimeId:first.runtimeId,runtimeEpoch:first.runtimeEpoch});
  });
});
