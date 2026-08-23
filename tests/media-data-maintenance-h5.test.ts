import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {MediaDataMaintenanceService} from "@/lib/media/data-maintenance";
import type {JobArtifact,JobRecord} from "@/lib/jobs/schema";
import {ProjectRevisionConflictError} from "@/lib/project/mutation-coordinator";
import {ProjectRepository} from "@/lib/project/repository";

const completedJob=(status:JobRecord["status"]="completed"):JobRecord=>({id:"00000000-0000-4000-8000-000000000001",type:"media-normalize",projectId:"cleanup",status,stage:"done",progress:1,attempt:1,input:{},createdAt:"2026-08-23T00:00:00.000Z",updatedAt:"2026-08-23T00:00:01.000Z",...(status==="completed"?{finishedAt:"2026-08-23T00:00:01.000Z"}:{})});
const makeJobs=(job:JobRecord,artifacts:JobArtifact[])=>({list:async()=>[job],getArtifacts:async()=>artifacts});

const setup=async(status:JobRecord["status"]="completed")=>{
  const fs=new InMemoryFileSystemAdapter();const repo=new ProjectRepository(fs,"/data");
  const project=await repo.create({id:"cleanup",name:"Cleanup",now:"2026-08-23T00:00:00.000Z"});
  project.assets.push({id:"keep",kind:"video",relativePath:"input/media-keep.mp4",originalRelativePath:"original/media-keep.mov"});project.project.revision=4;await repo.save(project);
  for(const relativePath of["input/media-keep.mp4","original/media-keep.mov","assets/media-orphan.bin","assets/media-job.mp4","assets/user-owned.bin"])await fs.writeBinary(repo.resolveProjectFile("cleanup",relativePath),new Uint8Array([1]));
  const artifact:JobArtifact={id:"job-output",kind:"project-file",label:"job",relativePath:"assets/media-job.mp4"};
  const service=new MediaDataMaintenanceService(fs,repo,makeJobs(completedJob(status),[artifact]));
  return{fs,repo,service};
};

describe("H5 orphan media maintenance",()=>{
  it("dry-runs only unreferenced MediaImport-owned paths while protecting Project and durable-job files",async()=>{
    const{service}=await setup();
    const report=await service.inspectImportedMediaOrphans("cleanup");
    expect(report.projectRevision).toBe(4);
    expect(report.orphanRelativePaths).toEqual(["assets/media-orphan.bin"]);
    expect(report.activeJobIds).toEqual([]);
  });

  it("removes only dry-run orphan paths after explicit idle confirmation and revision check",async()=>{
    const{fs,repo,service}=await setup();
    const result=await service.cleanupImportedMediaOrphans({projectId:"cleanup",expectedRevision:4,confirmProjectIdle:true});
    expect(result.removedRelativePaths).toEqual(["assets/media-orphan.bin"]);
    expect(await fs.exists(repo.resolveProjectFile("cleanup","assets/media-orphan.bin"))).toBe(false);
    expect(await fs.exists(repo.resolveProjectFile("cleanup","input/media-keep.mp4"))).toBe(true);
    expect(await fs.exists(repo.resolveProjectFile("cleanup","assets/media-job.mp4"))).toBe(true);
    expect(await fs.exists(repo.resolveProjectFile("cleanup","assets/user-owned.bin"))).toBe(true);
  });

  it("blocks cleanup while a durable Project job is active",async()=>{
    const{service}=await setup("running");
    await expect(service.cleanupImportedMediaOrphans({projectId:"cleanup",expectedRevision:4,confirmProjectIdle:true})).rejects.toThrow(/jobs are active/);
  });

  it("blocks stale cleanup requests",async()=>{
    const{service}=await setup();
    await expect(service.cleanupImportedMediaOrphans({projectId:"cleanup",expectedRevision:3,confirmProjectIdle:true})).rejects.toBeInstanceOf(ProjectRevisionConflictError);
  });
});
