import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe,expect,it} from "vitest";

const source=(path:string)=>readFileSync(resolve(process.cwd(),path),"utf-8");
const turnsRoute=source("app/api/projects/[projectId]/agent/sessions/[sessionId]/turns/route.ts");
const sessionsRoute=source("app/api/projects/[projectId]/agent/sessions/route.ts");

describe("V2.5.3 Agent Skill server boundary",()=>{
  it("accepts only registered Skill refs before provider execution",()=>{
    expect(turnsRoute).toContain("skill:VideoSkillRefSchema.optional()");
    expect(turnsRoute).toContain("builtInVideoSkillRegistry.get(input.skill.id,input.skill.version)");
    expect(turnsRoute).toContain('code:"AGENT_SKILL_UNAVAILABLE"');
  });

  it("threads the validated Skill through provider binding and durable Turn input",()=>{
    expect(turnsRoute).toContain("createServerAgentSessionService(observe,provider.providerId,model,skill)");
    expect(turnsRoute).toContain("skill:input.skill");
    expect(turnsRoute).toContain("...(skill?{skill:{id:skill.id,version:skill.version}}:{})");
  });

  it("defers review-required Skill proposals before generic auto-apply can run",()=>{
    const guard='if(skill?.riskPolicy.reviewRequired&&input.executionMode==="apply-safe-edits")';
    const guardIndex=turnsRoute.indexOf(guard);
    const autoApplyIndex=turnsRoute.indexOf("attemptAgentProposalAutoApply({",guardIndex);
    expect(guardIndex).toBeGreaterThan(-1);
    expect(autoApplyIndex).toBeGreaterThan(guardIndex);
    const protectedBranch=turnsRoute.slice(guardIndex,autoApplyIndex);
    expect(protectedBranch).toContain('reason:"skill-requires-review"');
    expect(protectedBranch).not.toContain("proposal-auto-applied");
  });

  it("keeps Skill out of durable Session identity while exposing the catalog for Composer",()=>{
    expect(sessionsRoute).toContain("skills:builtInVideoSkillRegistry.list()");
    expect(sessionsRoute).not.toContain("skill:VideoSkillRefSchema");
    expect(sessionsRoute).not.toContain("providerId:model:skill");
  });
});
