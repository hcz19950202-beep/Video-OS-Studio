import {ProductionPlanDraftSchema,type ProductionPlanDraft} from "@/lib/production/plan/schema";
import type {ProductionPlannerContext} from "@/lib/production/planner/context";
import type {ProductionPlannerAdapter} from "@/lib/production/planner/service";

export class MockProductionPlanner implements ProductionPlannerAdapter{
  generate(context:ProductionPlannerContext):ProductionPlanDraft{
    const projectEvidence=[{kind:"mission" as const,id:context.mission.id},{kind:"project" as const,id:context.project.id}];
    const steps:ProductionPlanDraft["steps"]=[
      {
        id:"analyze-script",
        kind:"analyze-script",
        title:"Analyze the current narrative",
        objective:context.script.wordCount>0?"Identify the strongest narrative beats, proof points, and CTA requirements from the bounded script context.":"Confirm the current project structure and Mission requirements before proposing edits.",
        dependsOn:[],risk:"low",owner:"agent",reviewRequired:false,requiresProjectRevision:true,evidence:projectEvidence,
      },
      {
        id:"plan-visuals",
        kind:"plan-visuals",
        title:"Plan visual treatment",
        objective:"Propose bounded visual treatment that supports the Mission brief and current Project structure.",
        dependsOn:["analyze-script"],risk:"low",owner:"agent",reviewRequired:false,requiresProjectRevision:true,evidence:projectEvidence,
      },
      {
        id:"edit-project",
        kind:"edit-project",
        title:"Prepare revision-safe Project edits",
        objective:"Prepare the minimum validated Project changes needed to satisfy the approved production plan.",
        dependsOn:["plan-visuals"],risk:"high",owner:"agent",reviewRequired:true,requiresProjectRevision:true,evidence:projectEvidence,
      },
    ];
    let finalDependency="edit-project";
    if(context.mission.autonomyPolicy.finalReviewRequired){
      steps.push({
        id:"human-review",
        kind:"human-review",
        title:"Review the production result",
        objective:"Require an explicit human checkpoint before the final publishable render.",
        dependsOn:["edit-project"],risk:"high",owner:"human-review",reviewRequired:true,requiresProjectRevision:true,evidence:projectEvidence,
      });
      finalDependency="human-review";
    }
    steps.push({
      id:"render-final",
      kind:"render-final",
      title:"Render the final video",
      objective:"Create the final encoded output from the accepted Project state using the existing render Job boundary.",
      dependsOn:[finalDependency],risk:"medium",owner:"job",reviewRequired:false,requiresProjectRevision:true,evidence:projectEvidence,
    });
    return ProductionPlanDraftSchema.parse({summary:`Production plan for ${context.mission.title}`,steps});
  }
}
