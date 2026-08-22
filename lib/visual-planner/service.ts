import {randomUUID} from "node:crypto";
import type {FileSystemAdapter} from "@/adapters/contracts";
import type {ProjectCommand} from "@/lib/project/commands";
import {applyProjectCommandTransaction,type ProjectCommandTransaction} from "@/lib/project/history";
import type {ProjectRepository} from "@/lib/project/repository";
import type {HyperFramesRenderService} from "@/lib/hyperframes/render-service";
import {EFFECT_CATALOG_BY_ID} from "@/shared/effects/catalog";
import {evaluateEffectCompatibility} from "@/shared/effects/capabilities";
import {buildVisualPlanDiff,visualClipIdForSuggestion} from "@/lib/visual-planner/diff";
import {VisualPlanSchema,VisualPlannerContextSchema,type VisualPlan,type VisualPlanDiff,type VisualPlannerContext,type VisualPlacement} from "@/lib/visual-planner/schema";
import type {VisualPlannerAdapter} from "@/lib/visual-planner/rules";
import type {Project} from "@/schemas/project";

export type VisualPlanApplyResult={project:Project;diff:VisualPlanDiff;transactionId:string|null;appliedIds:string[]};
const placementTransform=(project:Project,placement?:VisualPlacement)=>placement?{x:Math.round(placement.x*project.canvas.width),y:Math.round(placement.y*project.canvas.height),scale:placement.scale,opacity:1,anchor:placement.anchor,rotation:0}:undefined;
const workflowIntensityDirective=(project:Project)=>project.workflow.visualIntensity==="high"?"dynamic high energy":project.workflow.visualIntensity==="low"?"minimal restrained":"";

export class VisualPlanService{
  constructor(private readonly fs:FileSystemAdapter,private readonly repository:ProjectRepository,private readonly planner:VisualPlannerAdapter,private readonly hyperFrames:HyperFramesRenderService){}

  async generate(projectId:string,contextInput?:VisualPlannerContext):Promise<VisualPlan>{
    const project=await this.repository.load(projectId);
    const parsed=VisualPlannerContextSchema.parse(contextInput??{});
    const explicitIntent=parsed.intent.trim();
    const starterIntent=[project.workflow.starterPrompt,workflowIntensityDirective(project)].filter(Boolean).join(" ").trim();
    const context=VisualPlannerContextSchema.parse({...parsed,intent:explicitIntent||starterIntent});
    const plan=VisualPlanSchema.parse(this.planner.generate(project,context));
    await this.fs.writeTextAtomic(this.repository.resolveProjectFile(projectId,"edit/ai-director-plan.json"),JSON.stringify(plan,null,2));
    return plan;
  }

  async preview(projectId:string,planInput:VisualPlan,selectedIds:string[]):Promise<VisualPlanDiff>{
    const project=await this.repository.load(projectId);
    return buildVisualPlanDiff(project,VisualPlanSchema.parse(planInput),selectedIds);
  }

  async apply(projectId:string,planInput:VisualPlan,selectedIds:string[]):Promise<VisualPlanApplyResult>{
    const plan=VisualPlanSchema.parse(planInput);
    if(plan.projectId!==projectId)throw new Error("Visual plan belongs to a different project.");
    const project=await this.repository.load(projectId);
    const diff=buildVisualPlanDiff(project,plan,selectedIds);
    const addIds=new Set(diff.add.map(change=>change.suggestionId));
    const suggestions=plan.suggestions.filter(suggestion=>addIds.has(suggestion.id));
    const commands:ProjectCommand[]=[];
    const plannedAssets=new Set(project.assets.map(asset=>asset.id));

    for(const suggestion of suggestions){
      const recommendation=suggestion.recommendation;
      const durationInFrames=suggestion.endFrame-suggestion.startFrame;
      const clipId=visualClipIdForSuggestion(suggestion.id);
      const transform=placementTransform(project,recommendation.placement);

      if(recommendation.engine==="remotion"){
        if(!recommendation.effectId)throw new Error(`Suggestion ${suggestion.id} is missing a Remotion effectId.`);
        const effect=EFFECT_CATALOG_BY_ID[recommendation.effectId];
        if(!effect)throw new Error(`Unknown Remotion effect ${recommendation.effectId}`);
        const compatibility=evaluateEffectCompatibility(recommendation.effectId,project.canvas.width,project.canvas.height);
        if(compatibility.status==="unsupported")throw new Error(compatibility.message);
        const props=effect.schema.parse({...effect.defaults,...(recommendation.props??{})});
        commands.push({type:"add-clip",trackId:"motion-main",clip:{id:clipId,type:"motion",engine:"remotion",effectId:recommendation.effectId,props,startFrame:suggestion.startFrame,durationInFrames,enabled:true,layer:10,...(transform?{transform}:{})}});
        continue;
      }

      if(recommendation.engine==="hyperframes"){
        if(!recommendation.effectId)throw new Error(`Suggestion ${suggestion.id} is missing a HyperFrames effectId.`);
        const prepared=await this.hyperFrames.prepare({projectId,effectId:recommendation.effectId,props:recommendation.props??{},startFrame:suggestion.startFrame,durationInFrames});
        if(!plannedAssets.has(prepared.assetId)){commands.push({type:"add-asset",asset:prepared.asset});plannedAssets.add(prepared.assetId);}
        commands.push({type:"add-clip",trackId:"motion-main",clip:{id:clipId,type:"motion",engine:"hyperframes",effectId:prepared.effectId,assetId:prepared.assetId,props:prepared.props,startFrame:suggestion.startFrame,durationInFrames,enabled:true,layer:20,...(transform?{transform}:{})}});
        continue;
      }

      if(recommendation.engine==="broll"){
        const props=recommendation.props??{};
        const assetId=typeof props.assetId==="string"?props.assetId:"";
        const asset=project.assets.find(item=>item.id===assetId);
        if(!asset||asset.kind!=="video")throw new Error(`B-roll suggestion ${suggestion.id} needs a valid video assetId before Apply.`);
        commands.push({type:"add-clip",trackId:"broll-main",clip:{id:clipId,type:"broll",assetId,startFrame:suggestion.startFrame,durationInFrames,sourceStartFrame:0,enabled:true,layer:5,fit:"cover",muted:true,...(transform?{transform}:{})}});
      }
    }

    if(commands.length===0)return{project,diff,transactionId:null,appliedIds:[]};
    const transaction:ProjectCommandTransaction={id:`ai-director-${randomUUID()}`,label:`AI Director · Apply ${suggestions.length} suggestions`,commands};
    const next=applyProjectCommandTransaction(project,transaction);
    await this.repository.save(next);
    return{project:next,diff,transactionId:transaction.id,appliedIds:suggestions.map(suggestion=>suggestion.id)};
  }
}
