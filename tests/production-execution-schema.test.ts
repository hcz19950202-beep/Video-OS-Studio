import {describe,expect,it} from "vitest";
import {
  ProductionExecutionEvidenceRefSchema,
  ProductionExecutionSafeTextSchema,
  ProductionExecutionSchema,
} from "@/lib/production/execution/schema";

describe("Production Execution schema",()=>{
  it("rejects machine paths and executable instructions from durable execution evidence",()=>{
    expect(()=>ProductionExecutionEvidenceRefSchema.parse({kind:"job",id:"C:\\temp\\render.mp4"})).toThrow();
    expect(()=>ProductionExecutionSafeTextSchema.parse("Run powershell -File repair.ps1")).toThrow();
    expect(()=>ProductionExecutionSafeTextSchema.parse("Use durable job evidence job-42.")).not.toThrow();
  });

  it("requires terminal executions to clear in-flight state",()=>{
    expect(()=>ProductionExecutionSchema.parse({
      id:"44444444-4444-4444-8444-444444444444",
      projectId:"project-1",
      missionId:"22222222-2222-4222-8222-222222222222",
      planId:"11111111-1111-4111-8111-111111111111",
      planBaseProjectRevision:5,
      expectedProjectRevision:5,
      status:"cancelled",
      activeStepId:"step-1",
      steps:[{stepId:"step-1",status:"running",operationId:"66666666-6666-4666-8666-666666666666",attempts:1,evidence:[]}],
      budget:{},
      counters:{},
      createdAt:"2026-08-29T00:00:00.000Z",
      updatedAt:"2026-08-29T00:00:01.000Z",
    })).toThrow();
  });

  it("requires durable evidence before a step can be recorded as completed",()=>{
    expect(()=>ProductionExecutionSchema.parse({
      id:"44444444-4444-4444-8444-444444444444",
      projectId:"project-1",
      missionId:"22222222-2222-4222-8222-222222222222",
      planId:"11111111-1111-4111-8111-111111111111",
      planBaseProjectRevision:5,
      expectedProjectRevision:5,
      status:"completed",
      steps:[{stepId:"step-1",status:"completed",operationId:"66666666-6666-4666-8666-666666666666",attempts:1,evidence:[],completedAt:"2026-08-29T00:00:01.000Z"}],
      budget:{},
      counters:{},
      createdAt:"2026-08-29T00:00:00.000Z",
      updatedAt:"2026-08-29T00:00:01.000Z",
    })).toThrow();
  });
});
