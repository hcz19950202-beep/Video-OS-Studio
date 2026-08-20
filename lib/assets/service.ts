import {randomUUID} from "node:crypto";
import {join} from "node:path";
import type {FileSystemAdapter} from "@/adapters/contracts";
import {applyProjectCommand} from "@/lib/project/commands";
import type {ProjectRepository} from "@/lib/project/repository";
import type {HyperFramesRenderService} from "@/lib/hyperframes/render-service";
import {EFFECT_CATALOG_BY_ID} from "@/shared/effects/catalog";
import {parseHyperFramesEffect} from "@/shared/hyperframes/registry";
import {AssetPresetSchema,AssetRegistrySchema,type AssetPreset,type AssetRegistry} from "@/lib/assets/schema";
import type {Project} from "@/schemas/project";

export class AssetLibraryService{
  private readonly registryPath:string;
  private readonly backupPath:string;
  private readonly promotedDir:string;

  constructor(private readonly fs:FileSystemAdapter,private readonly dataRoot:string,private readonly projects:ProjectRepository,private readonly hyperFrames:HyperFramesRenderService){
    this.registryPath=join(dataRoot,"library","asset-registry.json");
    this.backupPath=join(dataRoot,"library","asset-registry.backup.json");
    this.promotedDir=join(dataRoot,"library","promoted");
  }

  async load():Promise<AssetRegistry>{
    if(!(await this.fs.exists(this.registryPath)))return{version:1,presets:[]};
    return AssetRegistrySchema.parse(JSON.parse(await this.fs.readText(this.registryPath)));
  }

  private async save(registry:AssetRegistry){
    await this.fs.writeTextAtomic(this.registryPath,JSON.stringify(AssetRegistrySchema.parse(registry),null,2),this.backupPath);
  }

  async saveFromMotionClip(projectId:string,clipId:string,name:string):Promise<AssetPreset>{
    const project=await this.projects.load(projectId);
    const clip=project.tracks.flatMap(track=>track.clips).find(item=>item.id===clipId);
    if(!clip||clip.type!=="motion")throw new Error("Select a Motion clip before saving a preset.");
    let props:Record<string,unknown>;
    if(clip.engine==="remotion"){
      const effect=EFFECT_CATALOG_BY_ID[clip.effectId];
      if(!effect)throw new Error(`Unknown Remotion effect ${clip.effectId}`);
      props=effect.schema.parse(clip.props);
    }else{
      props=parseHyperFramesEffect(clip.effectId,clip.props).props;
    }
    const now=new Date().toISOString();
    const preset=AssetPresetSchema.parse({id:`preset-${randomUUID()}`,name:name.trim(),engine:clip.engine,effectId:clip.effectId,props,transform:clip.transform,durationInFrames:clip.durationInFrames,favorite:false,status:"draft",sourceProjectId:projectId,createdAt:now,updatedAt:now});
    const registry=await this.load();
    registry.presets.push(preset);
    await this.save(registry);
    return preset;
  }

  async update(presetId:string,patch:{favorite?:boolean;status?:"draft"|"production-ready"}):Promise<AssetPreset>{
    const registry=await this.load();
    const index=registry.presets.findIndex(preset=>preset.id===presetId);
    if(index<0)throw new Error(`Preset ${presetId} not found.`);
    const next=AssetPresetSchema.parse({...registry.presets[index],...patch,updatedAt:new Date().toISOString()});
    registry.presets[index]=next;
    await this.save(registry);
    if(next.status==="production-ready")await this.fs.writeTextAtomic(join(this.promotedDir,`${next.id}.json`),JSON.stringify(next,null,2));
    return next;
  }

  async applyToProject(projectId:string,presetId:string,startFrame:number):Promise<Project>{
    const registry=await this.load();
    const preset=registry.presets.find(item=>item.id===presetId);
    if(!preset)throw new Error(`Preset ${presetId} not found.`);
    let project=await this.projects.load(projectId);
    const duration=Math.max(1,Math.min(preset.durationInFrames,project.canvas.durationInFrames-startFrame));
    if(preset.engine==="hyperframes")return this.hyperFrames.renderAndAdd({projectId,effectId:preset.effectId,props:preset.props,transform:preset.transform,startFrame,durationInFrames:duration});
    const effect=EFFECT_CATALOG_BY_ID[preset.effectId];
    if(!effect)throw new Error(`Unknown Remotion effect ${preset.effectId}`);
    const props=effect.schema.parse(preset.props);
    project=applyProjectCommand(project,{type:"add-clip",trackId:"motion-main",clip:{id:`preset-${preset.id}-${Date.now()}`,type:"motion",engine:"remotion",effectId:preset.effectId,props,transform:preset.transform,startFrame,durationInFrames:duration,enabled:true,layer:10}});
    await this.projects.save(project);
    return project;
  }
}
