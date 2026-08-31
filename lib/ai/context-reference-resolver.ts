import {
  ContextReferenceResolutionSchema,
  type ContextReference,
  type ContextReferenceResolution,
} from "@/lib/ai/context-reference";

export interface ContextReferenceProjectSnapshot {
  id:string;
  revision:number;
  assets:ReadonlyArray<{id:string}>;
  scenes:ReadonlyArray<{id:string}>;
  tracks:ReadonlyArray<{
    id:string;
    clips:ReadonlyArray<{id:string}>;
  }>;
}

export interface ExternalContextReferenceLookupResult {
  status:"resolved"|"stale"|"missing";
  reason?:string;
}

export type ExternalContextReferenceLookup=(
  reference:ContextReference,
  project:ContextReferenceProjectSnapshot,
)=>ExternalContextReferenceLookupResult|undefined;

function resolution(
  reference:ContextReference,
  project:ContextReferenceProjectSnapshot,
  status:"resolved"|"stale"|"missing",
  reason?:string,
):ContextReferenceResolution {
  return ContextReferenceResolutionSchema.parse({
    referenceId:reference.id,
    status,
    currentProjectRevision:project.revision,
    ...(reason?{reason}:{}),
  });
}

function missing(
  reference:ContextReference,
  project:ContextReferenceProjectSnapshot,
  entity:string,
):ContextReferenceResolution {
  return resolution(
    reference,
    project,
    "missing",
    `${entity} no longer exists in the current Project.`,
  );
}

function resolveExternally(
  reference:ContextReference,
  project:ContextReferenceProjectSnapshot,
  externalLookup?:ExternalContextReferenceLookup,
):ContextReferenceResolution {
  const result=externalLookup?.(reference,project);
  if(!result){
    return resolution(
      reference,
      project,
      "missing",
      `No current repository resolver is available for ${reference.kind} context.`,
    );
  }
  if(result.status!=="resolved"&&!result.reason){
    return resolution(
      reference,
      project,
      result.status,
      `${reference.kind} context could not be resolved safely.`,
    );
  }
  return resolution(reference,project,result.status,result.reason);
}

export function resolveContextReference(input:{
  reference:ContextReference;
  project:ContextReferenceProjectSnapshot;
  externalLookup?:ExternalContextReferenceLookup;
}):ContextReferenceResolution {
  const {reference,project,externalLookup}=input;

  if(reference.projectId!==project.id){
    return resolution(
      reference,
      project,
      "missing",
      "The context reference belongs to a different Project.",
    );
  }

  if(reference.baseProjectRevision!==project.revision){
    return resolution(
      reference,
      project,
      "stale",
      `The context reference was captured at Project revision ${reference.baseProjectRevision}; current revision is ${project.revision}.`,
    );
  }

  switch(reference.kind){
    case "project":
      return resolution(reference,project,"resolved");
    case "scene":
      return project.scenes.some((scene)=>scene.id===reference.target.sceneId)
        ?resolution(reference,project,"resolved")
        :missing(reference,project,"Scene");
    case "asset":
      return project.assets.some((asset)=>asset.id===reference.target.assetId)
        ?resolution(reference,project,"resolved")
        :missing(reference,project,"Asset");
    case "clip":
      return project.tracks.some((track)=>track.clips.some((clip)=>clip.id===reference.target.clipId))
        ?resolution(reference,project,"resolved")
        :missing(reference,project,"Clip");
    case "track":
      return project.tracks.some((track)=>track.id===reference.target.trackId)
        ?resolution(reference,project,"resolved")
        :missing(reference,project,"Track");
    case "timeline-point":
    case "viewer-region":
      return resolution(reference,project,"resolved");
    case "transcript-range":
    case "qa-finding":
    case "mission":
    case "mission-step":
    case "job":
    case "export-preset":
      return resolveExternally(reference,project,externalLookup);
  }
}

export function resolveContextReferences(input:{
  references:ReadonlyArray<ContextReference>;
  project:ContextReferenceProjectSnapshot;
  externalLookup?:ExternalContextReferenceLookup;
}):ContextReferenceResolution[] {
  return input.references.map((reference)=>resolveContextReference({
    reference,
    project:input.project,
    externalLookup:input.externalLookup,
  }));
}
