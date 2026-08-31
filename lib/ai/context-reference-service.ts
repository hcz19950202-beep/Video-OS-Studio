import {z} from "zod";
import {
  ContextReferenceListSchema,
  ContextReferenceResolutionSchema,
  type ContextReference,
  type ContextReferenceResolution,
} from "@/lib/ai/context-reference";
import type {Project} from "@/schemas/project";

export type ContextReferenceProjectLoader={load:(projectId:string)=>Promise<Project>};
export type ContextReferenceQAReportLoader={load:(projectId:string,reportId:string)=>Promise<{findings:ReadonlyArray<{id:string}>}|null>};
export type ContextReferenceMissionLoader={load:(projectId:string,missionId:string)=>Promise<{planId?:string}|null>};
export type ContextReferencePlanLoader={load:(projectId:string,planId:string)=>Promise<{steps:ReadonlyArray<{id:string}>}|null>};

export type ContextReferenceServiceDependencies={
  projects:ContextReferenceProjectLoader;
  qaReports?:ContextReferenceQAReportLoader;
  missions?:ContextReferenceMissionLoader;
  plans?:ContextReferencePlanLoader;
};

const BoundedResolvedContextReferenceSchema=z.object({
  referenceId:z.string().min(1).max(160),
  kind:z.string().min(1).max(64),
  target:z.record(z.string(),z.union([z.string(),z.number()])),
  baseProjectRevision:z.number().int().nonnegative(),
  currentProjectRevision:z.number().int().nonnegative(),
  status:z.literal("resolved"),
}).strict();
export const BoundedResolvedContextReferenceListSchema=z.array(BoundedResolvedContextReferenceSchema).max(32);
export type BoundedResolvedContextReference=z.infer<typeof BoundedResolvedContextReferenceSchema>;

export class ContextReferenceValidationError extends Error{
  readonly code="context_reference_unresolved";
  constructor(readonly resolutions:ContextReferenceResolution[]){
    const first=resolutions.find(item=>item.status!=="resolved");
    super(first?.reason??"One or more context references could not be resolved safely.");
    this.name="ContextReferenceValidationError";
  }
}

const resolution=(reference:ContextReference,currentProjectRevision:number,status:"resolved"|"stale"|"missing",reason?:string):ContextReferenceResolution=>ContextReferenceResolutionSchema.parse({
  referenceId:reference.id,
  currentProjectRevision,
  status,
  ...(reason?{reason}:{}),
});

const missing=(reference:ContextReference,currentProjectRevision:number,entity:string)=>resolution(reference,currentProjectRevision,"missing",`${entity} no longer exists in the current Project context.`);
const stale=(reference:ContextReference,currentProjectRevision:number)=>resolution(reference,currentProjectRevision,"stale",`This context was captured at Project revision ${reference.baseProjectRevision}; current revision is ${currentProjectRevision}.`);

const projectClips=(project:Project)=>project.tracks.flatMap(track=>track.clips);
const projectWords=(project:Project)=>project.script.segments.flatMap(segment=>segment.words);

export class ContextReferenceService{
  constructor(private readonly dependencies:ContextReferenceServiceDependencies){}

  async resolve(projectId:string,referencesInput:ReadonlyArray<ContextReference>):Promise<{resolutions:ContextReferenceResolution[];bounded:BoundedResolvedContextReference[]}>{
    const references=ContextReferenceListSchema.parse(referencesInput);
    if(references.length===0)return{resolutions:[],bounded:[]};
    const project=await this.dependencies.projects.load(projectId);
    const resolutions:ContextReferenceResolution[]=[];

    for(const reference of references){
      resolutions.push(await this.resolveOne(project,reference));
    }
    const unresolved=resolutions.filter(item=>item.status!=="resolved");
    if(unresolved.length)throw new ContextReferenceValidationError(resolutions);

    const bounded=BoundedResolvedContextReferenceListSchema.parse(references.map(reference=>({
      referenceId:reference.id,
      kind:reference.kind,
      target:reference.target,
      baseProjectRevision:reference.baseProjectRevision,
      currentProjectRevision:project.project.revision,
      status:"resolved" as const,
    })));
    return{resolutions,bounded};
  }

  private async resolveOne(project:Project,reference:ContextReference):Promise<ContextReferenceResolution>{
    const currentRevision=project.project.revision;
    if(reference.projectId!==project.project.id)return resolution(reference,currentRevision,"missing","The context reference belongs to a different Project.");
    if(reference.baseProjectRevision!==currentRevision)return stale(reference,currentRevision);

    switch(reference.kind){
      case "project":return resolution(reference,currentRevision,"resolved");
      case "scene":return project.scenes.some(scene=>scene.id===reference.target.sceneId)?resolution(reference,currentRevision,"resolved"):missing(reference,currentRevision,"Scene");
      case "clip":return projectClips(project).some(clip=>clip.id===reference.target.clipId)?resolution(reference,currentRevision,"resolved"):missing(reference,currentRevision,"Clip");
      case "asset":return project.assets.some(asset=>asset.id===reference.target.assetId)?resolution(reference,currentRevision,"resolved"):missing(reference,currentRevision,"Asset");
      case "track":return project.tracks.some(track=>track.id===reference.target.trackId)?resolution(reference,currentRevision,"resolved"):missing(reference,currentRevision,"Track");
      case "transcript-range":{
        const words=projectWords(project);
        const start=words.findIndex(word=>word.id===reference.target.startWordId);
        const end=words.findIndex(word=>word.id===reference.target.endWordId);
        return start>=0&&end>=0?resolution(reference,currentRevision,"resolved"):missing(reference,currentRevision,"Transcript range");
      }
      case "timeline-point":return reference.target.frame<project.canvas.durationInFrames?resolution(reference,currentRevision,"resolved"):missing(reference,currentRevision,"Timeline point");
      case "viewer-region":return reference.target.frame<project.canvas.durationInFrames?resolution(reference,currentRevision,"resolved"):missing(reference,currentRevision,"Viewer region");
      case "qa-finding":{
        if(!this.dependencies.qaReports)return resolution(reference,currentRevision,"missing","QA context resolution is unavailable.");
        const report=await this.dependencies.qaReports.load(project.project.id,reference.target.reportId);
        return report?.findings.some(finding=>finding.id===reference.target.findingId)?resolution(reference,currentRevision,"resolved"):missing(reference,currentRevision,"QA finding");
      }
      case "mission-step":{
        if(!this.dependencies.missions||!this.dependencies.plans)return resolution(reference,currentRevision,"missing","Mission step context resolution is unavailable.");
        const mission=await this.dependencies.missions.load(project.project.id,reference.target.missionId);
        if(!mission?.planId)return missing(reference,currentRevision,"Mission step");
        const plan=await this.dependencies.plans.load(project.project.id,mission.planId);
        return plan?.steps.some(step=>step.id===reference.target.stepId)?resolution(reference,currentRevision,"resolved"):missing(reference,currentRevision,"Mission step");
      }
      case "mission":{
        if(!this.dependencies.missions)return resolution(reference,currentRevision,"missing","Mission context resolution is unavailable.");
        return await this.dependencies.missions.load(project.project.id,reference.target.missionId)?resolution(reference,currentRevision,"resolved"):missing(reference,currentRevision,"Mission");
      }
      case "job":return resolution(reference,currentRevision,"missing","Job context is not attachable until a Job repository resolver is registered.");
      case "export-preset":return resolution(reference,currentRevision,"missing","Export preset context is not attachable until an export preset resolver is registered.");
    }
  }
}
