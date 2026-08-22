import {describe,expect,it} from "vitest";
import {createProject} from "@/lib/project/factory";
import {ProjectSchema} from "@/schemas/project";
import {applyProjectCommand} from "@/lib/project/commands";
import {RulesVisualPlannerAdapter} from "@/lib/visual-planner/rules";
import {projectForExportProfile,resolveExportProfile} from "@/lib/render/profile";
import {fitCanvasInside,describeCanvas} from "@/lib/canvas/aspect";
import {safeAreaProfileById,safeAreaRect} from "@/lib/canvas/safe-area";
import {evaluateEffectCompatibility} from "@/shared/effects/capabilities";

const caption=(id:string,text:string,startFrame:number)=>({id,type:"caption" as const,text,preset:"primary" as const,emphasis:"numbers" as const,keywords:[],startFrame,durationInFrames:60,enabled:true,layer:100});
const proofScene=(duration:number)=>({id:"proof",name:"Proof",semanticType:"proof" as const,startFrame:0,endFrame:duration,visualStrategy:{intensity:"high" as const,preferredEngines:["remotion" as const]}});
const projectWithProof=(width:number,height:number)=>{
  let project=createProject({id:`proof-${width}-${height}`,name:"Proof",width,height,fps:30,durationInFrames:300});
  project=applyProjectCommand(project,{type:"add-scene",scene:proofScene(300)});
  project=applyProjectCommand(project,{type:"add-clip",trackId:"captions-main",clip:caption("c1","90% complete",30)});
  return project;
};

describe("V2.1 Rev.2 literal completion behavior",()=>{
  it("persists real scenario starter guidance without forcing canvas orientation",()=>{
    const project=createProject({id:"starter",name:"Starter",scenario:"product-ad",width:2560,height:1080});
    expect(project.canvas).toMatchObject({width:2560,height:1080});
    expect(project.workflow.scenario).toBe("product-ad");
    expect(project.workflow.starterPrompt.length).toBeGreaterThan(20);
    expect(project.workflow.sceneTaxonomy).toEqual(expect.arrayContaining(["hook","solution","proof","cta"]));
    expect(project.workflow.captionHint).toContain("bold");
    expect(project.workflow.visualIntensity).toBe("high");
  });

  it("keeps legacy Schema 2.0.0 projects compatible by defaulting workflow to blank",()=>{
    const current=createProject({id:"legacy-shape",name:"Legacy Shape"});
    const raw=structuredClone(current) as Record<string,unknown>;
    delete raw.workflow;
    const parsed=ProjectSchema.parse(raw);
    expect(parsed.version).toBe("2.0.0");
    expect(parsed.workflow.scenario).toBe("blank");
  });

  it("changes deterministic placement between landscape and portrait while respecting safe area",()=>{
    const planner=new RulesVisualPlannerAdapter();
    const safe=safeAreaProfileById("tiktok");
    const context={intent:"prioritize proof",safeArea:{profileId:safe.id,...safe.insets}};
    const landscape=planner.generate(projectWithProof(1920,1080),context).suggestions[0]!.recommendation.placement!;
    const portrait=planner.generate(projectWithProof(1080,1920),context).suggestions[0]!.recommendation.placement!;
    expect(landscape.x).toBeGreaterThan(0);
    expect(portrait.x).toBe(0);
    expect(landscape.y).not.toBe(portrait.y);
    for(const placement of[landscape,portrait]){
      expect(placement.x).toBeGreaterThanOrEqual(-.5+safe.insets.left);
      expect(placement.x).toBeLessThanOrEqual(.5-safe.insets.right);
      expect(placement.y).toBeGreaterThanOrEqual(-.5+safe.insets.top);
      expect(placement.y).toBeLessThanOrEqual(.5-safe.insets.bottom);
      expect(placement.rationale).toContain("safe");
    }
  });

  it("moves a new visual away from overlapping occupied motion space",()=>{
    let project=projectWithProof(1920,1080);
    project=applyProjectCommand(project,{type:"add-clip",trackId:"motion-main",clip:{id:"occupied",type:"motion",engine:"remotion",effectId:"keyword-impact",props:{text:"Existing",accentColor:"#fff",align:"center"},startFrame:20,durationInFrames:90,enabled:true,layer:10,transform:{x:400,y:0,scale:1,opacity:1,anchor:"center",rotation:0}}});
    const plan=new RulesVisualPlannerAdapter().generate(project,{intent:"energetic",safeArea:{profileId:"generic",top:.05,right:.05,bottom:.05,left:.05}});
    const actionable=plan.suggestions.find(item=>item.recommendation.engine!=="none");
    if(actionable)expect(actionable.recommendation.placement?.x).toBeLessThan(0);
    else expect(plan.suggestions[0]?.reason).toContain("Density guard");
  });

  it("creates a non-destructive custom export clone and preserves seconds when FPS changes",()=>{
    let project=createProject({id:"export",name:"Export",width:1920,height:1080,fps:30,durationInFrames:300});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"captions-main",clip:caption("c1","Caption",60)});
    const original=structuredClone(project);
    const prepared=projectForExportProfile(project,{sizing:"custom",width:1080,height:1080,fps:60,quality:"standard",audio:"aac"});
    expect(project).toEqual(original);
    expect(prepared.profile).toMatchObject({width:1080,height:1080,fps:60,aspectMismatch:true,quality:"standard"});
    expect(prepared.project.canvas).toMatchObject({width:1080,height:1080,fps:60,durationInFrames:600});
    const clip=prepared.project.tracks.flatMap(track=>track.clips).find(item=>item.id==="c1")!;
    expect(clip.startFrame).toBe(120);
    expect(clip.durationInFrames).toBe(120);
    expect(clip.startFrame/prepared.project.canvas.fps).toBe(60/project.canvas.fps);
  });

  it("keeps Project Canvas as the export default and only warns on material aspect mismatch",()=>{
    const project=createProject({id:"profile",name:"Profile",width:1920,height:1080,fps:30});
    expect(resolveExportProfile(project,{})).toMatchObject({width:1920,height:1080,fps:30,aspectMismatch:false});
    expect(resolveExportProfile(project,{sizing:"custom",width:1280,height:720})).toMatchObject({aspectMismatch:false});
    expect(resolveExportProfile(project,{sizing:"custom",width:1080,height:1080})).toMatchObject({aspectMismatch:true});
  });

  it("covers the literal eight-canvas Rev.2 matrix through the shared contracts",()=>{
    const matrix=[[1920,1080],[1080,1920],[1080,1080],[1080,1350],[1440,1080],[2560,1080],[1600,900],[900,1600]] as const;
    for(const[width,height]of matrix){
      const canvas=describeCanvas(width,height);
      const fit=fitCanvasInside(1200,800,width,height,24);
      const safe=safeAreaRect(width,height,safeAreaProfileById("generic").insets);
      const compatibility=evaluateEffectCompatibility("keyword-impact",width,height);
      expect(canvas.width).toBe(width);expect(canvas.height).toBe(height);
      expect(fit.width).toBeLessThanOrEqual(1152);expect(fit.height).toBeLessThanOrEqual(752);
      expect(safe.width).toBeGreaterThan(0);expect(safe.height).toBeGreaterThan(0);
      expect(compatibility.status).not.toBe("unsupported");
      const plan=new RulesVisualPlannerAdapter().generate(projectWithProof(width,height),{safeArea:{profileId:"generic",top:.05,right:.05,bottom:.05,left:.05},intent:"proof first"});
      expect(plan.suggestions[0]?.recommendation.placement).toBeDefined();
    }
  });
});
