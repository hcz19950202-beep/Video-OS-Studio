import {describe,expect,it} from "vitest";
import {ProductionPlanEvidenceRefSchema} from "@/lib/production/plan/schema";
import {BUILTIN_VIDEO_SKILLS} from "@/lib/production/skills/builtin";
import {VideoSkillContextError,VideoSkillRegistry} from "@/lib/production/skills/registry";
import {VideoSkillSchema,VideoSkillVersionSchema,videoSkillEvidenceId} from "@/lib/production/skills/schema";

describe("V2.4 B3 Video Skills",()=>{
  it("loads the six allow-listed built-in Skills with unique exact versions",()=>{
    const registry=new VideoSkillRegistry(BUILTIN_VIDEO_SKILLS);
    expect(registry.list()).toHaveLength(6);
    expect(new Set(registry.list().map(skill=>videoSkillEvidenceId(skill))).size).toBe(6);
    expect(registry.list().map(skill=>skill.id)).toEqual([
      "b2b-proof-card",
      "caption-emphasis",
      "clean-broll-insert",
      "numeric-evidence-emphasis",
      "problem-proof-cta-ad",
      "talking-head-hook",
    ]);
  });

  it("rejects invalid semantic versions and executable/path-like Skill text",()=>{
    expect(VideoSkillVersionSchema.safeParse("1.0").success).toBe(false);
    const unsafe=structuredClone(BUILTIN_VIDEO_SKILLS[0]);
    unsafe.intendedUse="Run powershell -File E:\\Video-OS-Studio\\private.ps1";
    expect(VideoSkillSchema.safeParse(unsafe).success).toBe(false);
  });

  it("requires explicit preconditions/context/service/component contract fields",()=>{
    const incomplete=structuredClone(BUILTIN_VIDEO_SKILLS[0]) as unknown as Record<string,unknown>;
    delete incomplete.allowedServices;
    expect(VideoSkillSchema.safeParse(incomplete).success).toBe(false);

    const unlisted=structuredClone(BUILTIN_VIDEO_SKILLS[1]);
    unlisted.allowedServices=["visual-plan-service"];
    expect(VideoSkillSchema.safeParse(unlisted).success).toBe(false);
  });

  it("rejects duplicate exact Skill versions",()=>{
    expect(()=>new VideoSkillRegistry([BUILTIN_VIDEO_SKILLS[0],BUILTIN_VIDEO_SKILLS[0]])).toThrow(/Duplicate Video Skill version/);
  });

  it("discovers relevant Skills deterministically",()=>{
    const registry=new VideoSkillRegistry(BUILTIN_VIDEO_SKILLS);
    const results=registry.search({query:"b2b proof evidence",maxResults:3},["script","assets","brand"]);
    expect(results[0]).toMatchObject({skill:{id:"b2b-proof-card",version:"1.0.0"},missingContext:[]});
    expect(results[0].score).toBeGreaterThan(0);
  });

  it("enforces required context before producing an application request",()=>{
    const registry=new VideoSkillRegistry(BUILTIN_VIDEO_SKILLS);const skill=registry.get("b2b-proof-card","1.0.0");
    expect(skill).toBeDefined();
    expect(()=>registry.buildSelectionRequest({projectId:"project-1",baseProjectRevision:7,skill:skill!,intent:"Show approved construction proof.",availableContext:["script","brand"]})).toThrow(VideoSkillContextError);
    expect(registry.buildSelectionRequest({projectId:"project-1",baseProjectRevision:7,skill:skill!,intent:"Show approved construction proof.",availableContext:["script","assets","brand"]})).toMatchObject({projectId:"project-1",baseProjectRevision:7,skill:{id:"b2b-proof-card",version:"1.0.0"},mode:"create"});
  });

  it("resolves REUSE before MODIFY before CREATE",()=>{
    const registry=new VideoSkillRegistry(BUILTIN_VIDEO_SKILLS);const ref={id:"caption-emphasis",version:"1.0.0"};
    expect(registry.chooseApplicationMode(ref,{reusableSkillRefs:["caption-emphasis@1.0.0"],modifiableSkillIds:["caption-emphasis"]})).toBe("reuse");
    expect(registry.chooseApplicationMode(ref,{modifiableSkillIds:["caption-emphasis"]})).toBe("modify");
    expect(registry.chooseApplicationMode(ref)).toBe("create");
  });

  it("records Skill evidence only as exact skill-id@semver logical references",()=>{
    expect(ProductionPlanEvidenceRefSchema.parse({kind:"skill",id:"caption-emphasis@1.0.0"})).toEqual({kind:"skill",id:"caption-emphasis@1.0.0"});
    expect(ProductionPlanEvidenceRefSchema.safeParse({kind:"skill",id:"caption-emphasis"}).success).toBe(false);
    expect(ProductionPlanEvidenceRefSchema.safeParse({kind:"skill",id:"E:\\skills\\caption.json"}).success).toBe(false);
  });
});
