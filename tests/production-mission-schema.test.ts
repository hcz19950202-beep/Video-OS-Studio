import {describe,expect,it} from "vitest";
import {
  ProductionMissionIdSchema,
  ProductionMissionSchema,
} from "@/lib/production/mission/schema";

const missionFixture=()=>({
  id:"11111111-1111-4111-8111-111111111111",
  projectId:"project-1",
  title:"Facebook builder ad",
  brief:"Turn the current talking-head source into a direct B2B ad.",
  target:{platform:"facebook" as const,format:"product-ad" as const,targetDurationSeconds:45,language:"en-AU"},
  autonomyPolicy:{mode:"guided" as const,finalReviewRequired:true},
  baseProjectRevision:7,
  status:"draft" as const,
  agentSessionIds:["22222222-2222-4222-8222-222222222222"],
  workflowRunIds:["33333333-3333-4333-8333-333333333333"],
  jobIds:["44444444-4444-4444-8444-444444444444"],
  createdAt:"2026-08-28T12:00:00.000Z",
  updatedAt:"2026-08-28T12:00:01.000Z",
});

describe("ProductionMissionSchema",()=>{
  it("accepts a bounded Mission that references existing runtime IDs without copying runtime state",()=>{
    const mission=ProductionMissionSchema.parse(missionFixture());
    expect(mission.projectId).toBe("project-1");
    expect(mission.workflowRunIds).toEqual(["33333333-3333-4333-8333-333333333333"]);
    expect(mission.jobIds).toEqual(["44444444-4444-4444-8444-444444444444"]);
    expect(mission).not.toHaveProperty("project");
    expect(mission).not.toHaveProperty("workflow");
    expect(mission).not.toHaveProperty("jobs");
  });

  it("uses a Windows-safe UUID for the filename-backed Mission ID",()=>{
    expect(ProductionMissionIdSchema.safeParse("11111111-1111-4111-8111-111111111111").success).toBe(true);
    expect(ProductionMissionIdSchema.safeParse("mission:unsafe").success).toBe(false);
    expect(ProductionMissionIdSchema.safeParse("../mission").success).toBe(false);
  });

  it("rejects duplicate relation references",()=>{
    const fixture=missionFixture();
    fixture.workflowRunIds.push(fixture.workflowRunIds[0]);
    const result=ProductionMissionSchema.safeParse(fixture);
    expect(result.success).toBe(false);
    if(!result.success)expect(result.error.issues.some(issue=>issue.message.includes("Duplicate workflow run id"))).toBe(true);
  });

  it("rejects unknown fields and invalid target bounds",()=>{
    const fixture={...missionFixture(),unexpected:"raw-computer-access",target:{targetDurationSeconds:0}};
    expect(ProductionMissionSchema.safeParse(fixture).success).toBe(false);
  });

  it("rejects timestamps that move backwards",()=>{
    const fixture={...missionFixture(),updatedAt:"2026-08-28T11:59:59.000Z"};
    expect(ProductionMissionSchema.safeParse(fixture).success).toBe(false);
  });
});
