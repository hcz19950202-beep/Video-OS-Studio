import {describe,expect,it} from "vitest";
import {ProductionPlanSchema} from "@/lib/production/plan/schema";

const basePlan=()=>({
  id:"11111111-1111-4111-8111-111111111111",
  projectId:"project-1",
  missionId:"22222222-2222-4222-8222-222222222222",
  version:1 as const,
  baseProjectRevision:4,
  summary:"Create a bounded production plan.",
  steps:[
    {id:"plan-visuals",kind:"plan-visuals" as const,title:"Plan visuals",objective:"Plan a useful visual treatment.",dependsOn:[],risk:"low" as const,owner:"agent" as const,reviewRequired:false,requiresProjectRevision:true,evidence:[]},
    {id:"edit-project",kind:"edit-project" as const,title:"Edit Project",objective:"Prepare validated Project changes.",dependsOn:["plan-visuals"],risk:"high" as const,owner:"agent" as const,reviewRequired:true,requiresProjectRevision:true,evidence:[]},
  ],
  generatedAt:"2026-08-28T12:00:00.000Z",
});

describe("ProductionPlanSchema",()=>{
  it("accepts an acyclic allow-listed plan",()=>{
    expect(ProductionPlanSchema.parse(basePlan()).steps.map(step=>step.id)).toEqual(["plan-visuals","edit-project"]);
  });

  it("rejects unknown step kinds and arbitrary executable fields",()=>{
    const source=basePlan();
    const unknown={...source,steps:[{...source.steps[0],kind:"shell"},source.steps[1]]};
    expect(()=>ProductionPlanSchema.parse(unknown)).toThrow();

    const command={...source,steps:[{...source.steps[0],command:"powershell -Command Remove-Item"},source.steps[1]]};
    expect(()=>ProductionPlanSchema.parse(command)).toThrow();
  });

  it("rejects executable/path-like text in normalized plan intent",()=>{
    const source=basePlan();
    const plan={...source,steps:[{...source.steps[0],objective:"Run powershell -Command Get-Item C:\\Users\\secret\\project.json"},source.steps[1]]};
    expect(()=>ProductionPlanSchema.parse(plan)).toThrow("executable commands or machine paths");
  });

  it("allows ordinary production topics that mention tool names without executable instructions",()=>{
    const source=basePlan();
    const plan={...source,summary:"Create an educational video explaining PowerShell fundamentals."};
    expect(()=>ProductionPlanSchema.parse(plan)).not.toThrow();
  });

  it("rejects missing dependencies, self dependencies and cycles",()=>{
    const missing=basePlan();
    missing.steps[1].dependsOn=["does-not-exist"];
    expect(()=>ProductionPlanSchema.parse(missing)).toThrow("Unknown plan step dependency");

    const self=basePlan();
    self.steps[0].dependsOn=["plan-visuals"];
    expect(()=>ProductionPlanSchema.parse(self)).toThrow("cannot depend on itself");

    const cycle=basePlan();
    cycle.steps[0].dependsOn=["edit-project"];
    expect(()=>ProductionPlanSchema.parse(cycle)).toThrow("acyclic");
  });

  it("requires review for high-risk and human-review steps",()=>{
    const highRisk=basePlan();
    highRisk.steps[1].reviewRequired=false;
    expect(()=>ProductionPlanSchema.parse(highRisk)).toThrow("High-risk");

    const source=basePlan();
    const wrongOwner={...source,steps:[...source.steps,{id:"review",kind:"human-review",title:"Review",objective:"Review the result.",dependsOn:["edit-project"],risk:"high",owner:"agent",reviewRequired:true,requiresProjectRevision:true,evidence:[]}]};
    expect(()=>ProductionPlanSchema.parse(wrongOwner)).toThrow("cannot be owned by agent");
  });
});
