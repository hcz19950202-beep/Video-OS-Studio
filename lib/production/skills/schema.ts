import {z} from "zod";
import {ProjectIdSchema} from "@/schemas/project";

const UnsafeSkillTextPattern=/(?:[A-Za-z]:[\\/]|\/home\/|\/tmp\/|\\Users\\|\.\.\/|\.\.\\|powershell\s+(?:-|\/)|cmd\.exe\s+(?:-|\/)|bash\s+-c|rm\s+-rf|taskkill\s+(?:-|\/)|child_process|spawn\s*\(|exec\s*\(|<script|javascript:)/i;
export const VideoSkillTextSchema=z.string().trim().min(1).max(2_000).superRefine((value,ctx)=>{
  if(UnsafeSkillTextPattern.test(value))ctx.addIssue({code:"custom",message:"Video Skill text must be declarative and must not contain executable commands, machine paths, or script payloads."});
});

export const VideoSkillIdSchema=z.string().min(1).max(96).regex(/^[a-z][a-z0-9-]*$/,"Video Skill IDs must use lowercase kebab-case");
export const VideoSkillVersionSchema=z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/,"Video Skill versions must use strict major.minor.patch semver");
export const VideoSkillEvidenceIdSchema=z.string().max(128).regex(/^[a-z][a-z0-9-]*@(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/,"Skill evidence must use skill-id@major.minor.patch");

export const VideoSkillContextKeySchema=z.enum(["script","scene","assets","asset-intelligence","brand","canvas","selection","linked-styles"]);
export type VideoSkillContextKey=z.infer<typeof VideoSkillContextKeySchema>;

export const VideoSkillServiceIdSchema=z.enum(["visual-plan-service","asset-intelligence-service","project-mutation-service","workflow-service"]);
export const VideoSkillComponentIdSchema=z.enum(["visual-plan-suggestion","motion-clip","caption-clip","broll-clip","brand-style"]);
export const VideoSkillRiskSchema=z.enum(["low","medium","high"]);
export const VideoSkillFallbackModeSchema=z.enum(["skip","degrade","manual-review"]);
export const VideoSkillApplicationModeSchema=z.enum(["reuse","modify","create"]);
export type VideoSkillApplicationMode=z.infer<typeof VideoSkillApplicationModeSchema>;

const uniqueArray=<T extends z.ZodTypeAny>(schema:T,label:string,min:number,max:number)=>z.array(schema).min(min).max(max).default([]).superRefine((values,ctx)=>{
  const seen=new Set<string>();
  for(const[index,value]of values.entries()){
    const id=String(value);
    if(seen.has(id))ctx.addIssue({code:"custom",path:[index],message:`Duplicate ${label}: ${id}`});
    seen.add(id);
  }
});

export const VideoSkillRecipeStepSchema=z.object({
  id:z.string().min(1).max(64).regex(/^[a-z][a-z0-9-]*$/),
  objective:VideoSkillTextSchema,
  service:VideoSkillServiceIdSchema,
  component:VideoSkillComponentIdSchema.optional(),
}).strict();

export const VideoSkillSchema=z.object({
  id:VideoSkillIdSchema,
  version:VideoSkillVersionSchema,
  title:VideoSkillTextSchema,
  intendedUse:VideoSkillTextSchema,
  discoveryTerms:uniqueArray(z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9][A-Za-z0-9 _-]*$/),"discovery term",0,32),
  preconditions:z.array(VideoSkillTextSchema).max(16).default([]),
  requiredContext:uniqueArray(VideoSkillContextKeySchema,"required context key",0,8),
  recipe:z.object({steps:z.array(VideoSkillRecipeStepSchema).min(1).max(16)}).strict(),
  allowedServices:uniqueArray(VideoSkillServiceIdSchema,"allowed service",1,8),
  allowedComponents:uniqueArray(VideoSkillComponentIdSchema,"allowed component",0,8),
  qaChecks:z.array(VideoSkillTextSchema).min(1).max(16),
  riskPolicy:z.object({risk:VideoSkillRiskSchema,reviewRequired:z.boolean()}).strict(),
  fallback:z.object({mode:VideoSkillFallbackModeSchema,message:VideoSkillTextSchema}).strict(),
}).strict().superRefine((skill,ctx)=>{
  const allowedServices=new Set(skill.allowedServices);
  const allowedComponents=new Set(skill.allowedComponents);
  for(const[index,step]of skill.recipe.steps.entries()){
    if(!allowedServices.has(step.service))ctx.addIssue({code:"custom",path:["recipe","steps",index,"service"],message:`Recipe step service ${step.service} is not allow-listed by this Skill.`});
    if(step.component&&!allowedComponents.has(step.component))ctx.addIssue({code:"custom",path:["recipe","steps",index,"component"],message:`Recipe step component ${step.component} is not allow-listed by this Skill.`});
  }
  if(skill.riskPolicy.risk==="high"&&!skill.riskPolicy.reviewRequired)ctx.addIssue({code:"custom",path:["riskPolicy","reviewRequired"],message:"High-risk Video Skills require review."});
});
export type VideoSkill=z.infer<typeof VideoSkillSchema>;

export const VideoSkillRefSchema=z.object({id:VideoSkillIdSchema,version:VideoSkillVersionSchema}).strict();
export type VideoSkillRef=z.infer<typeof VideoSkillRefSchema>;
export const videoSkillEvidenceId=(skill:VideoSkillRef)=>VideoSkillEvidenceIdSchema.parse(`${skill.id}@${skill.version}`);

export const VideoSkillSearchQuerySchema=z.object({query:z.string().trim().max(500).optional(),maxResults:z.number().int().min(1).max(20).default(6)}).strict();
export type VideoSkillSearchQuery=z.infer<typeof VideoSkillSearchQuerySchema>;

export const VideoSkillSearchResultSchema=z.object({
  skill:VideoSkillRefSchema,
  title:VideoSkillTextSchema,
  intendedUse:VideoSkillTextSchema,
  requiredContext:z.array(VideoSkillContextKeySchema).max(8),
  missingContext:z.array(VideoSkillContextKeySchema).max(8),
  risk:VideoSkillRiskSchema,
  score:z.number().finite().min(0).max(1),
}).strict();
export type VideoSkillSearchResult=z.infer<typeof VideoSkillSearchResultSchema>;

export const VideoSkillSelectionIntentSchema=VideoSkillTextSchema;
export const VideoSkillSelectionRequestSchema=z.object({
  projectId:ProjectIdSchema,
  baseProjectRevision:z.number().int().nonnegative(),
  skill:VideoSkillRefSchema,
  mode:VideoSkillApplicationModeSchema,
  intent:VideoSkillSelectionIntentSchema,
  requiredContext:z.array(VideoSkillContextKeySchema).max(8),
  rationale:z.array(VideoSkillTextSchema).min(1).max(8),
}).strict();
export type VideoSkillSelectionRequest=z.infer<typeof VideoSkillSelectionRequestSchema>;
