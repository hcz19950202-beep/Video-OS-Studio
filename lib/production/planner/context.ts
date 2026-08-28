import {z} from "zod";
import {MissionAutonomyPolicySchema,ProductionMissionFormatSchema,ProductionMissionIdSchema,ProductionMissionPlatformSchema,type ProductionMission} from "@/lib/production/mission/schema";
import {ProjectIdSchema,type Project} from "@/schemas/project";
import {ScenarioIdSchema} from "@/schemas/workflow";
import {SceneSemanticTypeSchema} from "@/schemas/scene";

const LogicalContextIdSchema=z.string().trim().min(1).max(128).refine(value=>!/[\\/]/.test(value)&&!value.includes(".."),"Planner context IDs must be logical identifiers, not paths");
const optionalText=(max:number)=>z.string().trim().max(max).optional();

export const ProductionPlannerContextSchema=z.object({
  mission:z.object({
    id:ProductionMissionIdSchema,
    title:z.string().trim().min(1).max(200),
    brief:z.string().trim().min(1).max(10_000),
    platform:ProductionMissionPlatformSchema.optional(),
    format:ProductionMissionFormatSchema.optional(),
    targetDurationSeconds:z.number().finite().positive().optional(),
    language:z.string().trim().min(1).max(64).optional(),
    autonomyPolicy:MissionAutonomyPolicySchema,
    previousPlanId:z.string().uuid().optional(),
  }).strict(),
  project:z.object({
    id:ProjectIdSchema,
    name:z.string().trim().min(1).max(200),
    revision:z.number().int().nonnegative(),
    canvas:z.object({width:z.number().int().positive(),height:z.number().int().positive(),fps:z.number().int().positive(),durationInFrames:z.number().int().positive()}).strict(),
    scenario:ScenarioIdSchema,
    visualIntensity:z.enum(["low","medium","high"]),
  }).strict(),
  script:z.object({
    segmentCount:z.number().int().nonnegative(),
    activeSegmentCount:z.number().int().nonnegative(),
    wordCount:z.number().int().nonnegative(),
    textPreview:z.string().max(2000),
  }).strict(),
  scenes:z.array(z.object({
    id:LogicalContextIdSchema,
    name:z.string().trim().min(1).max(200),
    semanticType:SceneSemanticTypeSchema,
    startFrame:z.number().int().nonnegative(),
    endFrame:z.number().int().positive(),
    summary:optionalText(500),
  }).strict()).max(128),
  assets:z.array(z.object({
    id:LogicalContextIdSchema,
    kind:z.enum(["video","audio","image","overlay","subtitle"]),
    label:optionalText(200),
    durationInFrames:z.number().int().positive().optional(),
    width:z.number().int().positive().optional(),
    height:z.number().int().positive().optional(),
    hasAudio:z.boolean().optional(),
  }).strict()).max(256),
}).strict();
export type ProductionPlannerContext=z.infer<typeof ProductionPlannerContextSchema>;

const safeLogicalId=(value:string,fallback:string)=>LogicalContextIdSchema.safeParse(value).success?value:fallback;
const clip=(value:string|undefined,max:number)=>value?.trim().slice(0,max)||undefined;

export const buildProductionPlannerContext=(mission:ProductionMission,project:Project):ProductionPlannerContext=>{
  const activeSegments=project.script.segments.filter(segment=>segment.status==="active");
  const words=activeSegments.flatMap(segment=>segment.words);
  const textPreview=words.map(word=>word.text).join(" ").trim().slice(0,2000);
  return ProductionPlannerContextSchema.parse({
    mission:{
      id:mission.id,
      title:mission.title,
      brief:mission.brief,
      platform:mission.target.platform,
      format:mission.target.format,
      targetDurationSeconds:mission.target.targetDurationSeconds,
      language:mission.target.language,
      autonomyPolicy:mission.autonomyPolicy,
      previousPlanId:mission.planId,
    },
    project:{id:project.project.id,name:project.project.name.slice(0,200),revision:project.project.revision,canvas:project.canvas,scenario:project.workflow.scenario,visualIntensity:project.workflow.visualIntensity},
    script:{segmentCount:project.script.segments.length,activeSegmentCount:activeSegments.length,wordCount:words.length,textPreview},
    scenes:project.scenes.slice(0,128).map((scene,index)=>({id:safeLogicalId(scene.id,`scene-${index}`),name:scene.name.slice(0,200),semanticType:scene.semanticType,startFrame:scene.startFrame,endFrame:scene.endFrame,summary:clip(scene.summary,500)})),
    assets:project.assets.slice(0,256).map((asset,index)=>({id:safeLogicalId(asset.id,`asset-${index}`),kind:asset.kind,label:clip(asset.label,200),durationInFrames:asset.durationInFrames,width:asset.width,height:asset.height,hasAudio:asset.hasAudio})),
  });
};
