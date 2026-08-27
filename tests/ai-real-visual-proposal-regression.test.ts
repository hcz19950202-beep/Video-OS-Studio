import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import type {HyperFramesAdapter} from "@/adapters/contracts";
import {buildAgentContextSnapshot} from "@/lib/ai/context";
import {createA1AgentToolRegistry} from "@/lib/ai/tools";
import {HyperFramesRenderService} from "@/lib/hyperframes/render-service";
import {applyProjectCommand} from "@/lib/project/commands";
import {ProjectRepository} from "@/lib/project/repository";
import {RulesVisualPlannerAdapter} from "@/lib/visual-planner/rules";
import {VisualPlanService} from "@/lib/visual-planner/service";

const now="2026-08-27T00:00:00.000Z";
const sessionId="00000000-0000-4000-8000-000000000101";
const proposalId="00000000-0000-4000-8000-000000000102";

describe("A4 real Rules Director proposal regression",()=>{
  it("wraps a 10-second proof Project Rules plan in a valid Agent proposal",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new ProjectRepository(fs,"/data");
    let project=await repository.create({id:"a4-local-live-proof-regression",name:"A4 Local Live Proof Regression",durationInFrames:300});
    project=applyProjectCommand(project,{type:"add-scene",scene:{id:"scene-a4-proof",name:"Proof",semanticType:"proof",startFrame:0,endFrame:300,visualStrategy:{intensity:"high",preferredEngines:["remotion"]}}},{now});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"captions-main",clip:{id:"caption-a4-proof",type:"caption",text:"90% complete in 15 days — send us your project",preset:"primary",emphasis:"numbers",keywords:[],startFrame:30,durationInFrames:60,enabled:true,layer:100}},{now});
    await repository.save(project);

    const hyperAdapter:HyperFramesAdapter={render:async input=>{await fs.writeBinary(input.outputPath,new Uint8Array([1]));return{outputPath:input.outputPath};}};
    const visualPlans=new VisualPlanService(fs,repository,new RulesVisualPlannerAdapter(),new HyperFramesRenderService(fs,hyperAdapter,repository));
    const loaded=await repository.load(project.project.id);
    const context=buildAgentContextSnapshot(loaded);
    const registry=createA1AgentToolRegistry({visualPlans});

    const result=await registry.execute({id:"call_real_visual_plan",toolId:"propose_visual_plan",arguments:{intent:"Emphasize the numeric proof and CTA"}},{sessionId,context,now:()=>now,makeId:()=>proposalId});

    expect(result.status).toBe("success");
    expect(result.error).toBeUndefined();
    const proposal=result.output?.proposal as {id?:string;baseProjectRevision?:number;operations?:Array<{kind?:string;payload?:{plan?:{suggestions?:Array<{semanticType?:string;recommendation?:{engine?:string;effectId?:string}}>};selectedIds?:string[]}}>}|undefined;
    expect(proposal?.id).toBe(proposalId);
    expect(proposal?.baseProjectRevision).toBe(loaded.project.revision);
    expect(proposal?.operations?.[0]?.kind).toBe("visual-plan");
    expect(proposal?.operations?.[0]?.payload?.selectedIds).toHaveLength(1);
    expect(proposal?.operations?.[0]?.payload?.plan?.suggestions?.[0]).toMatchObject({semanticType:"percentage",recommendation:{engine:"remotion",effectId:"metric-focus"}});
    expect((await repository.load(project.project.id)).project.revision).toBe(loaded.project.revision);
    expect(await fs.exists(repository.resolveProjectFile(project.project.id,"edit/ai-director-plan.json"))).toBe(true);
  });
});
