import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import type {FfmpegAdapter} from "@/adapters/contracts";
import {MediaImportService} from "@/lib/media/import-service";
import {ProjectRepository} from "@/lib/project/repository";

const ffmpeg:FfmpegAdapter={
  probe:async()=>({durationSeconds:1,width:320,height:180,fps:30,hasAudio:false}),
  waveformPeaks:async(_path,points)=>Array(points).fill(0),
  normalizeVideo:async input=>({outputPath:input.outputPath}),
  normalizeAudio:async input=>({outputPath:input.outputPath}),
};

describe("V2.4 final audit media idempotency",()=>{
  it("never overwrites already-applied media bytes when an operationId is retried",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new ProjectRepository(fs,"/data");
    await repository.create({id:"media-idempotency-audit",name:"Media idempotency audit",now:"2026-08-31T00:00:00.000Z"});
    const service=new MediaImportService(fs,ffmpeg,repository,()=>"unused");
    const operationId="media-idempotency-operation";
    const firstBytes=new Uint8Array([1,2,3,4]);
    const replacementBytes=new Uint8Array([9,8,7,6]);

    const first=await service.importWithReport({
      projectId:"media-idempotency-audit",
      fileName:"reference.png",
      mimeType:"image/png",
      bytes:firstBytes,
      expectedRevision:0,
      operationId,
    });
    const absolutePath=repository.resolveProjectFile(first.project.project.id,first.import.workingRelativePath);
    expect(await fs.readBinary(absolutePath)).toEqual(firstBytes);

    const retry=await service.importWithReport({
      projectId:"media-idempotency-audit",
      fileName:"reference.png",
      mimeType:"image/png",
      bytes:replacementBytes,
      expectedRevision:1,
      operationId,
    });

    expect(retry.alreadyApplied).toBe(true);
    expect(retry.project.project.revision).toBe(1);
    expect(await fs.readBinary(absolutePath)).toEqual(firstBytes);
  });
});
