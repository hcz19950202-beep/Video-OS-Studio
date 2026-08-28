import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {QAReportRepository} from "@/lib/production/qa/repository";
import {QAReportSchema} from "@/lib/production/qa/schema";

const baseReport={
  id:"33333333-3333-4333-8333-333333333333",
  projectId:"project-1",
  missionId:"11111111-1111-4111-8111-111111111111",
  renderJobId:"22222222-2222-4222-8222-222222222222",
  projectRevision:7,
  renderSourceProjectRevision:7,
  status:"pass" as const,
  expectations:{hookTerms:[],ctaTerms:[],evidenceTerms:[],hookWindowSeconds:5},
  technicalEvidence:{renderArtifactId:"render-output",durationSeconds:45,width:1080,height:1920,fps:30,hasAudio:true},
  findings:[{id:"technical-output-exists",category:"technical" as const,status:"pass" as const,severity:"info" as const,message:"Trusted output exists.",evidence:[]}],
  createdAt:"2026-08-28T12:00:00.000Z",
};

describe("V2.4 B4 QA report contract and repository",()=>{
  it("rejects machine paths from persisted/model-visible evidence",()=>{
    expect(()=>QAReportSchema.parse({...baseReport,findings:[{...baseReport.findings[0],evidence:[{source:"ffprobe",summary:"Failed at C:\\Users\\secret\\final.mp4"}]}]})).toThrow("machine paths");
  });

  it("rejects duplicate finding IDs",()=>{
    expect(()=>QAReportSchema.parse({...baseReport,findings:[baseReport.findings[0],baseReport.findings[0]]})).toThrow("Duplicate QA finding id");
  });

  it("persists immutable reports and returns deterministic latest history",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new QAReportRepository(fs,"/data");
    const first=QAReportSchema.parse(baseReport);
    const second=QAReportSchema.parse({...baseReport,id:"55555555-5555-4555-8555-555555555555",createdAt:"2026-08-28T12:01:00.000Z"});
    await repository.create(first);
    await repository.create(second);
    await expect(repository.create(first)).rejects.toThrow("already exists");
    expect((await repository.list("project-1")).map(item=>item.id)).toEqual([second.id,first.id]);
    expect((await repository.latest("project-1"))?.id).toBe(second.id);
  });
});
