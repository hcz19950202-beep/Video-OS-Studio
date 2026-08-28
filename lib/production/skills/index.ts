import {BUILTIN_VIDEO_SKILLS} from "@/lib/production/skills/builtin";
import {VideoSkillRegistry} from "@/lib/production/skills/registry";

export const builtInVideoSkillRegistry=new VideoSkillRegistry(BUILTIN_VIDEO_SKILLS);

export * from "@/lib/production/skills/builtin";
export * from "@/lib/production/skills/registry";
export * from "@/lib/production/skills/schema";
