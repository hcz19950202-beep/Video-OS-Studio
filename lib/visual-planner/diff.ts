import type {Project} from "@/schemas/project";
import {computeVisualDensity} from "@/lib/visual-planner/density";
import {VisualPlanDiffSchema,VisualPlanSchema,type VisualPlan,type VisualPlanDiff} from "@/lib/visual-planner/schema";

const clipIdFor=(suggestionId:string)=>`visual-${suggestionId}`;

export const buildVisualPlanDiff=(project:Project,planInput:VisualPlan,selectedIds:string[]):VisualPlanDiff=>{
  const plan=VisualPlanSchema.parse(planInput);
  if(plan.projectId!==project.project.id)throw new Error("Visual plan belongs to a different project.");
  const selected=new Set(selectedIds);
  const existingClipIds=new Set(project.tracks.flatMap(track=>track.clips).map(clip=>clip.id));
  const actionable=plan.suggestions.filter(suggestion=>selected.has(suggestion.id)&&suggestion.recommendation.engine!=="none"&&!existingClipIds.has(clipIdFor(suggestion.id)));
  const densityIntervals=actionable.filter(suggestion=>suggestion.recommendation.engine==="remotion"||suggestion.recommendation.engine==="hyperframes").map(suggestion=>({startFrame:suggestion.startFrame,endFrame:suggestion.endFrame}));
  return VisualPlanDiffSchema.parse({
    add:actionable.map(suggestion=>({
      suggestionId:suggestion.id,
      sceneId:suggestion.sceneId,
      engine:suggestion.recommendation.engine,
      ...(suggestion.recommendation.effectId?{effectId:suggestion.recommendation.effectId}:{}),
      startFrame:suggestion.startFrame,
      endFrame:suggestion.endFrame,
    })),
    remove:[],
    shorten:[],
    styleChanges:[],
    densityBefore:computeVisualDensity(project),
    densityAfter:computeVisualDensity(project,densityIntervals),
  });
};

export const visualClipIdForSuggestion=clipIdFor;
