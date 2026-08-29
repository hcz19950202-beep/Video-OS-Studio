import {ProductionMutationTargetSchema,productionMutationTargetKey,type ProductionMutationTarget} from "@/lib/production/autonomy/schema";
import type {ProjectCommand} from "@/lib/project/commands";
import type {Project} from "@/schemas/project";

export class ProductionMutationScopeError extends Error{
  readonly code="PRODUCTION_MUTATION_SCOPE_MISMATCH";
  constructor(){super("Actual Project mutation targets exceed the declared Production Plan target scope.");this.name="ProductionMutationScopeError";}
}

const uniqueTargets=(targets:ProductionMutationTarget[])=>{
  const byKey=new Map<string,ProductionMutationTarget>();
  for(const targetInput of targets){
    const target=ProductionMutationTargetSchema.parse(targetInput);
    byKey.set(productionMutationTargetKey(target),target);
  }
  return[...byKey.values()].sort((a,b)=>productionMutationTargetKey(a).localeCompare(productionMutationTargetKey(b)));
};

const containingTrackId=(project:Project,clipId:string)=>project.tracks.find(track=>track.clips.some(clip=>clip.id===clipId))?.id;
const appendTarget=(trackId:string):ProductionMutationTarget=>({kind:"track",id:trackId,action:"append"});

export const productionMutationTargetsForCommands=(project:Project,commands:ProjectCommand[])=>{
  const targets:ProductionMutationTarget[]=[];
  for(const command of commands){
    switch(command.type){
      case"rename-project":targets.push({kind:"project",action:"modify"});break;
      case"set-duration":case"set-canvas":targets.push({kind:"canvas",action:"modify"});break;
      case"add-asset":targets.push({kind:"asset",id:command.asset.id,action:"create"});break;
      case"add-clip":targets.push(appendTarget(command.trackId),{kind:"clip",id:command.clip.id,action:"create"});break;
      case"update-clip-timing":case"set-clip-layer":case"update-video-properties":case"update-motion-props":case"update-motion-transform":case"assign-linked-style":case"update-caption-style":case"update-broll-properties":case"update-audio-properties":targets.push({kind:"clip",id:command.clipId,action:"modify"});break;
      case"split-clip":{
        const trackId=containingTrackId(project,command.clipId);
        if(!trackId)throw new ProductionMutationScopeError();
        targets.push({kind:"clip",id:command.clipId,action:"modify"},appendTarget(trackId),{kind:"clip",id:command.newClipId,action:"create"});
        break;
      }
      case"duplicate-clip":{
        const trackId=containingTrackId(project,command.clipId);
        if(!trackId)throw new ProductionMutationScopeError();
        targets.push(appendTarget(trackId),{kind:"clip",id:command.newClipId,action:"create"});
        break;
      }
      case"set-track-state":targets.push({kind:"track",id:command.trackId,action:"modify"});break;
      case"remove-clip":targets.push({kind:"clip",id:command.clipId,action:"remove"});break;
      case"set-script-document":targets.push({kind:"script",action:"modify"});break;
      case"add-scene":targets.push({kind:"scene",id:command.scene.id,action:"create"});break;
      case"update-scene":targets.push({kind:"scene",id:command.sceneId,action:"modify"});break;
      case"remove-scene":targets.push({kind:"scene",id:command.sceneId,action:"remove"});break;
      case"add-marker":targets.push({kind:"marker",id:command.marker.id,action:"create"});break;
      case"update-marker":targets.push({kind:"marker",id:command.markerId,action:"modify"});break;
      case"remove-marker":targets.push({kind:"marker",id:command.markerId,action:"remove"});break;
      case"set-brand":targets.push({kind:"brand",action:"modify"});break;
      case"add-linked-style":targets.push({kind:"linked-style",id:command.style.id,action:"create"});break;
      case"update-linked-style":targets.push({kind:"linked-style",id:command.style.id,action:"modify"});break;
      case"remove-linked-style":targets.push({kind:"linked-style",id:command.styleId,action:"remove"});break;
      case"set-language-config":targets.push({kind:"language",action:"modify"});break;
      case"restore-project-snapshot":targets.push({kind:"project",action:"modify"});break;
    }
  }
  return uniqueTargets(targets);
};

export const assertProductionMutationTargetsDeclared=(actualInput:ProductionMutationTarget[],declaredInput:ProductionMutationTarget[])=>{
  const actual=uniqueTargets(actualInput);
  const declared=new Set(uniqueTargets(declaredInput).map(productionMutationTargetKey));
  if(actual.some(target=>!declared.has(productionMutationTargetKey(target))))throw new ProductionMutationScopeError();
  return actual;
};
