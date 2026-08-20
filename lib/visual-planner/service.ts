import type {FileSystemAdapter} from "@/adapters/contracts";
import {applyProjectCommand} from "@/lib/project/commands";
import type {ProjectRepository} from "@/lib/project/repository";
import type {HyperFramesRenderService} from "@/lib/hyperframes/render-service";
import {EFFECT_CATALOG_BY_ID} from "@/shared/effects/catalog";
import {VisualPlanSchema,type VisualPlan} from "@/lib/visual-planner/schema";
import type {VisualPlannerAdapter} from "@/lib/visual-planner/rules";
import type {Project} from "@/schemas/project";

export class VisualPlanService{
  constructor(private readonly fs:FileSystemAdapter,private readonly repository:ProjectRepository,private readonly planner:VisualPlannerAdapter,private readonly hyperFrames:HyperFramesRenderService){}

  async generate(projectId:string):Promise<VisualPlan>{
    const project=await this.repository.load(projectId);
    const plan=VisualPlanSchema.parse(this.planner.generate(project));
    await this.fs.writeTextAtomic(this.repository.resolveProjectFile(projectId,"edit/animation-slots.json"),JSON.stringify(plan,null,2));
    return plan;
  }

  async apply(projectId:string,planInput:VisualPlan,selectedIds:string[]):Promise<Project>{
    const plan=VisualPlanSchema.parse(planInput);
    if(plan.projectId!==projectId)throw new Error("Visual plan belongs to a different project.");
    const selected=new Set(selectedIds);
    let project=await this.repository.load(projectId);

    for(const slot of plan.slots.filter((item)=>selected.has(item.id)&&item.engine==="remotion")){
      const clipId=`visual-${slot.id}`;
      if(project.tracks.some((track)=>track.clips.some((clip)=>clip.id===clipId)))continue;
      const effect=EFFECT_CATALOG_BY_ID[slot.effectId];
      if(!effect)throw new Error(`Unknown Remotion effect ${slot.effectId}`);
      const props=effect.schema.parse(slot.props);
      project=applyProjectCommand(project,{type:"add-clip",trackId:"motion-main",clip:{id:clipId,type:"motion",engine:"remotion",effectId:slot.effectId,props,startFrame:slot.startFrame,durationInFrames:slot.durationInFrames,enabled:true,layer:10}});
    }
    await this.repository.save(project);

    for(const slot of plan.slots.filter((item)=>selected.has(item.id)&&item.engine==="hyperframes")){
      project=await this.repository.load(projectId);
      const alreadyExists=project.tracks.some((track)=>track.clips.some((clip)=>clip.type==="motion"&&clip.engine==="hyperframes"&&clip.effectId===slot.effectId&&clip.startFrame===slot.startFrame&&clip.durationInFrames===slot.durationInFrames));
      if(alreadyExists)continue;
      project=await this.hyperFrames.renderAndAdd({projectId,effectId:slot.effectId,props:slot.props,startFrame:slot.startFrame,durationInFrames:slot.durationInFrames});
    }
    return this.repository.load(projectId);
  }
}
