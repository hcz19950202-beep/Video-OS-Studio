import {randomUUID} from "node:crypto";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {NodeFileSystemAdapter} from "@/adapters/filesystem";
import {JobRecordSchema,type CreateJobInput,type JobArtifact,type JobRecord} from "@/lib/jobs/schema";
import {ProjectMutationCoordinator} from "@/lib/project/mutation-coordinator";
import {ProjectRepository} from "@/lib/project/repository";
import {W2_CAPABILITY_WORKFLOW_DEFINITIONS,registerW2CapabilityWorkflowDefinitions} from "@/lib/workflows/production-definitions";
import {registerProductionWorkflowStages,type ProductionWorkflowJobRuntime,type ProductionWorkflowVisualPlan} from "@/lib/workflows/production-stages";
import {WorkflowDefinitionRegistry,WorkflowStageRegistry} from "@/lib/workflows/registry";
import {WorkflowRunner} from "@/lib/workflows/runner";
import {WorkflowService} from "@/lib/workflows/service";
import {FileWorkflowStore} from "@/lib/workflows/store";
import type {VisualPlanApplyResult} from "@/lib/visual-planner/service";
import type {VisualPlan,VisualPlanDiff} from "@/lib/visual-planner/schema";

const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});
const makeRoot=async()=>{const root=await mkdtemp(join(tmpdir(),"video-os-w2-"));roots.push(root);return root;};
const at="2026-08-24T00:00:00.000Z";

const transcriptScript={
  baseSourceRanges:[{startFrame:0,endFrame:360}],
  segments:[
    {id:"seg-process",status:"active" as const,semanticTags:[],words:[{id:"w1",text:"第一步",startFrame:0,endFrame:30,confidence:.99},{id:"w2",text:"流程",startFrame:30,endFrame:60,confidence:.99}]},
    {id:"seg-number",status:"active" as const,semanticTags:[],words:[{id:"w3",text:"30天",startFrame:210,endFrame:240,confidence:.99},{id:"w4",text:"交付",startFrame:240,endFrame:270,confidence:.99}]},
  ],
};

class FakeProductionJobs implements ProductionWorkflowJobRuntime{
  readonly records=new Map<string,JobRecord>();
  readonly artifacts=new Map<string,JobArtifact[]>();
  readonly createdTypes:string[]=[];
  readonly createdInputs:CreateJobInput[]=[];
  constructor(private readonly mutations:ProjectMutationCoordinator){}

  async create(input:CreateJobInput){
    const id=randomUUID();this.createdTypes.push(input.type);this.createdInputs.push(input);let output:Record<string,unknown>={};let artifacts:JobArtifact[]=[];
    if(input.type==="video-use-transcribe"){
      const expectedRevision=Number(input.input.expectedRevision);const operationId=String(input.input.operationId);
      const committed=await this.mutations.applyTransaction(input.projectId!,{expectedRevision,transactionId:operationId,transaction:{label:"Fake video-use transcript",commands:[{type:"set-script-document",script:transcriptScript}]}});
      output={projectRevision:committed.appliedRevision,transcriptRelativePath:"edit/transcripts/fake.json",packedTranscriptRelativePath:"edit/takes_packed.md"};artifacts=[{id:"transcript",kind:"transcript",label:"Transcript",relativePath:"edit/transcripts/fake.json",mimeType:"application/json"}];
    }else if(input.type==="hyperframes-render"){
      const expectedRevision=Number(input.input.expectedRevision);const operationId=String(input.input.operationId);const effectId=String(input.input.effectId);const startFrame=Number(input.input.startFrame);const durationInFrames=Number(input.input.durationInFrames);const assetId=`hf-${effectId}-${startFrame}-fake`;
      const committed=await this.mutations.applyTransaction(input.projectId!,{expectedRevision,transactionId:operationId,transaction:{label:"Fake HyperFrames render",commands:[{type:"add-asset",asset:{id:assetId,kind:"overlay",relativePath:`animations/${assetId}.webm`,label:effectId,mimeType:"video/webm",durationInFrames,width:1920,height:1080,sourceFps:30,hasAudio:false}},{type:"add-clip",trackId:"motion-main",clip:{id:`motion-${assetId}`,type:"motion",engine:"hyperframes",effectId,assetId,props:input.input.props as Record<string,unknown>,startFrame,durationInFrames,enabled:true,layer:20}}]}});
      output={projectRevision:committed.appliedRevision,assetId,outputRelativePath:`animations/${assetId}.webm`};artifacts=[{id:"overlay",kind:"overlay",label:"HyperFrames overlay",relativePath:`animations/${assetId}.webm`,mimeType:"video/webm"}];
    }else if(input.type==="render-final"){
      output={outputRelativePath:"render/final-fake.mp4",mode:"final"};artifacts=[{id:"final",kind:"render",label:"Final render",relativePath:"render/final-fake.mp4",mimeType:"video/mp4"}];
    }
    const record=JobRecordSchema.parse({id,type:input.type,projectId:input.projectId,status:"completed",stage:"completed",progress:1,attempt:1,input:input.input,output,createdAt:at,updatedAt:at,startedAt:at,finishedAt:at});this.records.set(id,record);this.artifacts.set(id,artifacts);return record;
  }
  async get(jobId:string){return this.records.get(jobId)??null;}
  async getArtifacts(jobId:string){return this.artifacts.get(jobId)??[];}
  async cancel(jobId:string){const job=this.records.get(jobId);if(!job)throw new Error("missing fake job");return job;}
  async retry(jobId:string){const job=this.records.get(jobId);if(!job)throw new Error("missing fake job");return job;}
}

const fakeVisualPlan=(fs:NodeFileSystemAdapter,repository:ProjectRepository,mutations:ProjectMutationCoordinator):ProductionWorkflowVisualPlan=>{
  const build=async(projectId:string):Promise<VisualPlan>=>{
    const project=await repository.load(projectId);const sceneId=project.scenes[0]?.id??"scene-01";const plan:VisualPlan={version:2,projectId,generatedAt:at,source:"rules",context:{intent:"workflow test"},suggestions:[
      {id:"suggest-hf-process",sceneId,startFrame:0,endFrame:90,spokenText:"第一步流程",semanticType:"process",recommendation:{engine:"hyperframes",effectId:"process-flow",props:{title:"HOW IT WORKS",steps:["INPUT","PROCESS"],accentColor:"#FFC400"}},reason:"process",confidence:.9,alternatives:[]},
      {id:"suggest-hf-route",sceneId,startFrame:105,endFrame:195,spokenText:"运输路线",semanticType:"map",recommendation:{engine:"hyperframes",effectId:"map-route",props:{title:"ROUTE"}},reason:"route",confidence:.88,alternatives:[]},
      {id:"suggest-remotion",sceneId,startFrame:210,endFrame:270,spokenText:"30天交付",semanticType:"number",recommendation:{engine:"remotion",effectId:"big-number",props:{label:"KEY NUMBER",value:"30",suffix:"DAYS",accentColor:"#FFC400",fontSize:180,animationStyle:"scale"}},reason:"number",confidence:.9,alternatives:[]},
    ],densityBefore:{motionCards:0,cardsPerMinute:0,peakConcurrency:0,averageGapFrames:null,minimumGapFrames:null}};
    await fs.writeTextAtomic(repository.resolveProjectFile(projectId,"edit/ai-director-plan.json"),JSON.stringify(plan));return plan;
  };
  return{
    generate:build,
    apply:async(projectId,plan,selectedIds,meta):Promise<VisualPlanApplyResult>=>{
      const selected=plan.suggestions.filter(item=>selectedIds.includes(item.id));const commands=selected.filter(item=>item.recommendation.engine==="remotion").map(item=>({type:"add-clip" as const,trackId:"motion-main",clip:{id:`motion-${item.id}`,type:"motion" as const,engine:"remotion" as const,effectId:item.recommendation.effectId!,props:item.recommendation.props??{},startFrame:item.startFrame,durationInFrames:item.endFrame-item.startFrame,enabled:true,layer:10}}));
      const before=await repository.load(projectId);let project=before;let transactionId:string|null=null;let alreadyApplied=false;
      if(commands.length){const committed=await mutations.applyTransaction(projectId,{expectedRevision:meta.expectedRevision,transactionId:meta.operationId,transaction:{label:"Fake visual plan apply",commands}});project=committed.project;transactionId=meta.operationId;alreadyApplied=committed.alreadyApplied;}
      const emptyDensity={motionCards:0,cardsPerMinute:0,peakConcurrency:0,averageGapFrames:null,minimumGapFrames:null};const diff:VisualPlanDiff={add:selected.map(item=>({suggestionId:item.id,sceneId:item.sceneId,engine:item.recommendation.engine,effectId:item.recommendation.effectId,startFrame:item.startFrame,endFrame:item.endFrame})),remove:[],shorten:[],styleChanges:[],densityBefore:emptyDensity,densityAfter:emptyDensity};
      return{project,diff,transactionId,appliedIds:selected.map(item=>item.id),alreadyApplied};
    },
  };
};

describe("V2.2 W2 production workflow stages",()=>{
  it("registers all 14 existing-capability stages with a readiness PREVIEW and encoded FINAL_RENDER",()=>{
    expect(W2_CAPABILITY_WORKFLOW_DEFINITIONS).toHaveLength(3);
    for(const definition of W2_CAPABILITY_WORKFLOW_DEFINITIONS){
      expect(definition.stages).toHaveLength(14);expect(definition.stages[0]?.id).toBe("MEDIA_IMPORT");expect(definition.stages.at(-1)?.id).toBe("FINAL_RENDER");expect(definition.entryStageIds).toEqual(["MEDIA_IMPORT"]);
      expect(definition.stages.find(stage=>stage.id==="PREVIEW")?.kind).toBe("analysis");expect(definition.stages.find(stage=>stage.id==="FINAL_RENDER")?.kind).toBe("render");
    }
  });

  it("runs the complete W2 capability workflow, executes every planned HyperFrames job, then applies Remotion and renders final",async()=>{
    const root=await makeRoot();const fs=new NodeFileSystemAdapter();const repository=new ProjectRepository(fs,root);const mutations=new ProjectMutationCoordinator(fs,repository);
    await repository.create({id:"demo",name:"Demo",now:at,width:1920,height:1080,fps:30,durationInFrames:360});
    await mutations.applyTransaction("demo",{expectedRevision:0,transactionId:"setup-media",transaction:{label:"Setup source",commands:[{type:"add-asset",asset:{id:"video-source",kind:"video",relativePath:"media/video-source.mp4",originalRelativePath:"original/video-source.mov",label:"source",mimeType:"video/mp4",originalMimeType:"video/quicktime",durationInFrames:360,width:1920,height:1080,sourceFps:30,hasAudio:true,sizeBytes:1024}},{type:"add-clip",trackId:"video-main",clip:{id:"video-main-source",type:"video",assetId:"video-source",sourceStartFrame:0,volume:1,startFrame:0,durationInFrames:360,enabled:true,layer:0}}]}});

    const jobs=new FakeProductionJobs(mutations);const visualPlan=fakeVisualPlan(fs,repository,mutations);const definitions=registerW2CapabilityWorkflowDefinitions(new WorkflowDefinitionRegistry());const stages=registerProductionWorkflowStages(new WorkflowStageRegistry(),{fs,repository,mutations,jobs,visualPlan,assetBaseUrl:"http://127.0.0.1:3000"});const store=new FileWorkflowStore(root);const runner=new WorkflowRunner(store,definitions,stages,jobs,{jobPollIntervalMs:1});const service=new WorkflowService(repository,store,definitions,runner);
    const run=await service.create({projectId:"demo",definitionId:"w2-capability-talking-head",definitionVersion:"1",sourceAssetIds:["video-source"],expectedProjectRevision:1});await service.start(run.id);await runner.waitForIdle(run.id);

    const done=await service.get(run.id);expect(done?.status).toBe("completed");expect(done?.stageExecutions).toHaveLength(14);expect(done?.stageExecutions.every(stage=>stage.status==="completed")).toBe(true);expect(jobs.createdTypes).toEqual(["video-use-transcribe","hyperframes-render","hyperframes-render","render-final"]);
    const hfInputs=jobs.createdInputs.filter(input=>input.type==="hyperframes-render");expect(hfInputs).toHaveLength(2);expect(hfInputs.map(input=>input.input.effectId)).toEqual(["process-flow","map-route"]);
    const motionExecution=done?.stageExecutions.find(stage=>stage.stageId==="MOTION_GENERATION");expect(motionExecution?.jobIds).toHaveLength(2);
    const project=await repository.load("demo");expect(project.script.segments).toHaveLength(2);expect(project.scenes.length).toBeGreaterThan(0);expect(project.tracks.find(track=>track.id==="captions-main")?.clips.length).toBe(2);const motion=project.tracks.find(track=>track.id==="motion-main")?.clips??[];expect(motion.filter(clip=>clip.type==="motion"&&clip.engine==="hyperframes")).toHaveLength(2);expect(motion.some(clip=>clip.type==="motion"&&clip.engine==="remotion")).toBe(true);
    expect(done?.artifacts.filter(artifact=>artifact.kind==="motion")).toHaveLength(2);expect(done?.artifacts.some(artifact=>artifact.kind==="transcript")).toBe(true);expect(done?.artifacts.some(artifact=>artifact.kind==="script-analysis")).toBe(true);expect(done?.artifacts.some(artifact=>artifact.kind==="visual-plan")).toBe(true);expect(done?.artifacts.some(artifact=>artifact.kind==="final-render")).toBe(true);
  });
});
