import {describe,expect,it,vi} from "vitest";
import {ContextReferenceSchema,type ContextReference} from "@/lib/ai/context-reference";
import {resolveContextReference,type ContextReferenceProjectSnapshot} from "@/lib/ai/context-reference-resolver";

const createdAt="2026-08-31T00:00:00.000Z";
const base={
  projectId:"project-c3",
  baseProjectRevision:7,
  label:"Visible label only",
  createdAt,
} as const;

const project:ContextReferenceProjectSnapshot={
  id:"project-c3",
  revision:7,
  assets:[{id:"asset-1"}],
  scenes:[{
    id:"scene-1",
    tracks:[{
      id:"track-1",
      clips:[{id:"clip-1"}],
    }],
  }],
};

function reference(input:Omit<ContextReference,"projectId"|"baseProjectRevision"|"label"|"createdAt">&Partial<Pick<ContextReference,"projectId"|"baseProjectRevision"|"label"|"createdAt">>):ContextReference {
  return ContextReferenceSchema.parse({...base,...input});
}

describe("V2.5 C3 ContextReference targets",()=>{
  it("adds Track, Mission, Job, and ExportPreset without removing C0 targets",()=>{
    const cases=[
      reference({id:"ctx-project",kind:"project",target:{}}),
      reference({id:"ctx-scene",kind:"scene",target:{sceneId:"scene-1"}}),
      reference({id:"ctx-clip",kind:"clip",target:{clipId:"clip-1"}}),
      reference({id:"ctx-asset",kind:"asset",target:{assetId:"asset-1"}}),
      reference({id:"ctx-track",kind:"track",target:{trackId:"track-1"}}),
      reference({id:"ctx-transcript",kind:"transcript-range",target:{startWordId:"word-1",endWordId:"word-2"}}),
      reference({id:"ctx-qa",kind:"qa-finding",target:{reportId:"report-1",findingId:"finding-1"}}),
      reference({id:"ctx-mission",kind:"mission",target:{missionId:"mission-1"}}),
      reference({id:"ctx-step",kind:"mission-step",target:{missionId:"mission-1",stepId:"step-1"}}),
      reference({id:"ctx-job",kind:"job",target:{jobId:"job-1"}}),
      reference({id:"ctx-preset",kind:"export-preset",target:{presetId:"preset-1"}}),
      reference({id:"ctx-time",kind:"timeline-point",target:{frame:24}}),
      reference({id:"ctx-region",kind:"viewer-region",target:{frame:24,x:0.1,y:0.1,width:0.5,height:0.5}}),
    ];
    expect(cases.map((item)=>item.kind)).toContain("track");
    expect(cases.map((item)=>item.kind)).toContain("mission");
    expect(cases.map((item)=>item.kind)).toContain("job");
    expect(cases.map((item)=>item.kind)).toContain("export-preset");
  });

  it("keeps ContextReference strict and carries no authorization grant",()=>{
    expect(()=>ContextReferenceSchema.parse({
      ...base,
      id:"ctx-auth",
      kind:"scene",
      target:{sceneId:"scene-1"},
      authorization:"project:write",
    })).toThrow();
  });
});

describe("V2.5 C3 fail-closed resolver",()=>{
  it("resolves Project-owned targets by stable ID",()=>{
    const refs=[
      reference({id:"r-project",kind:"project",target:{}}),
      reference({id:"r-scene",kind:"scene",target:{sceneId:"scene-1"}}),
      reference({id:"r-asset",kind:"asset",target:{assetId:"asset-1"}}),
      reference({id:"r-clip",kind:"clip",target:{clipId:"clip-1"}}),
      reference({id:"r-track",kind:"track",target:{trackId:"track-1"}}),
    ];
    for(const item of refs){
      expect(resolveContextReference({reference:item,project}).status).toBe("resolved");
    }
  });

  it("never retargets a missing stable ID from its display label",()=>{
    const result=resolveContextReference({
      reference:reference({id:"r-missing",kind:"scene",target:{sceneId:"scene-deleted"},label:"scene-1"}),
      project,
    });
    expect(result.status).toBe("missing");
    expect(result.reason).toContain("Scene");
  });

  it("marks a still-existing target stale when Project revision changed",()=>{
    const result=resolveContextReference({
      reference:reference({id:"r-stale",kind:"clip",target:{clipId:"clip-1"},baseProjectRevision:6}),
      project,
    });
    expect(result.status).toBe("stale");
    expect(result.currentProjectRevision).toBe(7);
    expect(result.reason).toContain("revision 6");
  });

  it("fails closed when repository-owned context has no resolver",()=>{
    const result=resolveContextReference({
      reference:reference({id:"r-mission",kind:"mission",target:{missionId:"mission-1"}}),
      project,
    });
    expect(result.status).toBe("missing");
    expect(result.reason).toContain("No current repository resolver");
  });

  it("lets repository accessors report exact resolution without returning a replacement reference",()=>{
    const lookup=vi.fn(()=>({status:"resolved" as const}));
    const item=reference({id:"r-qa",kind:"qa-finding",target:{reportId:"report-1",findingId:"finding-1"}});
    const result=resolveContextReference({reference:item,project,externalLookup:lookup});
    expect(result.status).toBe("resolved");
    expect(result.referenceId).toBe(item.id);
    expect(lookup).toHaveBeenCalledWith(item,project);
  });

  it("checks revision before any external lookup",()=>{
    const lookup=vi.fn(()=>({status:"resolved" as const}));
    const result=resolveContextReference({
      reference:reference({id:"r-old-job",kind:"job",target:{jobId:"job-1"},baseProjectRevision:5}),
      project,
      externalLookup:lookup,
    });
    expect(result.status).toBe("stale");
    expect(lookup).not.toHaveBeenCalled();
  });

  it("rejects references captured for another Project",()=>{
    const result=resolveContextReference({
      reference:reference({id:"r-other",kind:"asset",target:{assetId:"asset-1"},projectId:"project-other"}),
      project,
    });
    expect(result.status).toBe("missing");
    expect(result.reason).toContain("different Project");
  });
});
