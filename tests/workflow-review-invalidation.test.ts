import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {createProject} from "@/lib/project/factory";
import {W2_CAPABILITY_WORKFLOW_DEFINITIONS,W3_REVIEW_WORKFLOW_DEFINITIONS} from "@/lib/workflows/production-definitions";
import {WorkflowDefinitionRegistry,WorkflowStageRegistry} from "@/lib/workflows/registry";
import {WorkflowRunner} from "@/lib/workflows/runner";
import {WorkflowDefinitionSchema,type WorkflowDefinition} from "@/lib/workflows/schema";
import {WorkflowService} from "@/lib/workflows/service";
import {FileWorkflowStore} from "@/lib/workflows/store";

const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});
const waitFor=async<T>(read:()=>Promise<T>,predicate:(value:T)=>boolean,timeoutMs=3000)=>{const started=Date.now();while(Date.now()-started<timeoutMs){const value=await read();if(predicate(value))return value;await new Promise(resolve=>setTimeout(resolve,5));}throw new Error("Timed out waiting for workflow review state.");};
const stage=(id:string,dependsOn:string[]=[],kind:WorkflowDefinition["stages"][number]["kind"]="analysis",retryable=true):WorkflowDefinition["stages"][number]=>({id,kind,dependsOn,optional:false,retryable,reviewRequired:kind==="checkpoint",invalidates:[],executorKey:`executor-${id}`});
const reviewFlow=()=>WorkflowDefinitionSchema.parse({
  id:"review-flow",version:"1",name:"Review Flow",scenario:"talking-head",entryStageIds:["A"],stages:[
    stage("A"),
    stage("REVIEW_A",["A"],"checkpoint",false),
    stage("B",["REVIEW_A"]),
    stage("C",["B"]),
    stage("REVIEW_B",["C"],"checkpoint",false),
    stage("FINAL",["REVIEW_B"]),
  ],
});

const makeHarness=async(flow=reviewFlow())=>{
  const root=await mkdtemp(join(tmpdir(),"video-os-w3-"));roots.push(root);
  const store=new FileWorkflowStore(root);const definitions=new WorkflowDefinitionRegistry();definitions.register(flow);const stages=new WorkflowStageRegistry();const runner=new WorkflowRunner(store,definitions,stages,undefined,{jobPollIntervalMs:2});
  let project=createProject({id:"demo",name:"Demo",now:"2026-08-24T00:00:00.000Z",width:1920,height:1080,fps:30,durationInFrames:300});
  const projects={load:async()=>project};const service=new WorkflowService(projects,store,definitions,runner);const run=await service.create({projectId:"demo",definitionId:flow.id,definitionVersion:flow.version,sourceAssetIds:[],expectedProjectRevision:0});
  const setRevision=(revision:number)=>{project={...project,project:{...project.project,revision,updatedAt:new Date().toISOString()}};};
  return{root,store,definitions,stages,runner,service,run,setRevision,getProject:()=>project};
};
const registerReviewExecutors=(h:Awaited<ReturnType<typeof makeHarness>>)=>{
  h.stages.register("executor-A",{start:async context=>({kind:"completed",outputDigest:`a-${context.execution.attempt}`})});
  h.stages.register("executor-B",{start:async context=>({kind:"completed",outputDigest:`b-${context.execution.attempt}`,artifacts:[{id:`artifact-b-${context.execution.attempt}`,stageId:"B",kind:"other",createdAt:new Date().toISOString(),digest:`b-${context.execution.attempt}`}]})});
  h.stages.register("executor-C",{start:async context=>({kind:"completed",outputDigest:`c-${context.execution.attempt}`})});
  h.stages.register("executor-FINAL",{start:async context=>({kind:"completed",outputDigest:`final-${context.execution.attempt}`})});
};

describe("V2.2 W3 human review and invalidation",()=>{
  it("keeps accepted W2 definitions immutable and adds 16-stage review definitions",()=>{
    expect(W2_CAPABILITY_WORKFLOW_DEFINITIONS).toHaveLength(3);expect(W3_REVIEW_WORKFLOW_DEFINITIONS).toHaveLength(3);
    for(const definition of W2_CAPABILITY_WORKFLOW_DEFINITIONS){expect(definition.version).toBe("1");expect(definition.stages).toHaveLength(14);expect(definition.stages.some(item=>item.kind==="checkpoint")).toBe(false);}
    for(const definition of W3_REVIEW_WORKFLOW_DEFINITIONS){
      expect(definition.id).toMatch(/^video-production-/u);expect(definition.version).toBe("1");expect(definition.stages).toHaveLength(16);
      expect(definition.stages.map(item=>item.id)).toEqual(["MEDIA_IMPORT","MEDIA_PROBE","MEDIA_NORMALIZE","TRANSCRIBE","SCRIPT_ANALYSIS","SCENE_DETECTION","CAPTION_GENERATION","VISUAL_PLANNING","CONTENT_REVIEW","MOTION_GENERATION","BROLL_ASSEMBLY","AUDIO_ASSEMBLY","TIMELINE_ASSEMBLY","PREVIEW","ASSEMBLY_REVIEW","FINAL_RENDER"]);
      expect(definition.stages.find(item=>item.id==="CONTENT_REVIEW")).toMatchObject({kind:"checkpoint",reviewRequired:true,dependsOn:["VISUAL_PLANNING"]});
      expect(definition.stages.find(item=>item.id==="ASSEMBLY_REVIEW")).toMatchObject({kind:"checkpoint",reviewRequired:true,dependsOn:["PREVIEW"]});
    }
  });

  it("approves a checkpoint against the latest Project revision and uses it for downstream input identity",async()=>{
    const h=await makeHarness();registerReviewExecutors(h);await h.service.start(h.run.id);await h.runner.waitForIdle(h.run.id);
    const firstReview=await h.service.get(h.run.id);expect(firstReview?.status).toBe("waiting_review");const checkpoint=firstReview!.checkpoints.find(item=>item.stageId==="REVIEW_A")!;expect(checkpoint.baseProjectRevision).toBe(0);
    h.setRevision(2);await h.service.approveCheckpoint(h.run.id,checkpoint.id);await h.runner.waitForIdle(h.run.id);
    const secondReview=await h.service.get(h.run.id);expect(secondReview?.status).toBe("waiting_review");expect(secondReview?.lastKnownProjectRevision).toBe(2);expect(secondReview?.checkpoints.find(item=>item.id===checkpoint.id)).toMatchObject({status:"approved",resolvedProjectRevision:2});
    const reviewExecution=secondReview!.stageExecutions.find(item=>item.stageId==="REVIEW_A")!;const b=secondReview!.stageExecutions.find(item=>item.stageId==="B")!;
    expect(reviewExecution.outputDigest).toBeTruthy();expect(b).toMatchObject({status:"completed",baseProjectRevision:2,attempt:1});expect(b.inputDigest).toBeTruthy();
    const approved=(await h.service.activity(h.run.id)).find(item=>item.event==="review-approved"&&item.stageId==="REVIEW_A");expect(approved?.details).toMatchObject({resolvedProjectRevision:2,projectChanged:true});
  });

  it("replays only the selected stage and its transitive downstream while preserving unrelated approved upstream work",async()=>{
    const h=await makeHarness();registerReviewExecutors(h);await h.service.start(h.run.id);await h.runner.waitForIdle(h.run.id);
    const reviewA=(await h.service.get(h.run.id))!.checkpoints.find(item=>item.stageId==="REVIEW_A")!;await h.service.approveCheckpoint(h.run.id,reviewA.id);await h.runner.waitForIdle(h.run.id);
    const before=await h.service.get(h.run.id);expect(before?.status).toBe("waiting_review");const reviewB=before!.checkpoints.find(item=>item.stageId==="REVIEW_B"&&item.status==="waiting_review")!;const bBefore=before!.stageExecutions.find(item=>item.stageId==="B")!;expect(before?.artifacts.map(item=>item.id)).toContain("artifact-b-1");
    h.setRevision(1);await h.service.replayFromStage(h.run.id,"B");await h.runner.waitForIdle(h.run.id);
    const replayed=await h.service.get(h.run.id);expect(replayed?.status).toBe("waiting_review");expect(replayed?.lastKnownProjectRevision).toBe(1);
    expect(replayed?.stageExecutions.find(item=>item.stageId==="A")).toMatchObject({status:"completed",attempt:1});expect(replayed?.stageExecutions.find(item=>item.stageId==="REVIEW_A")).toMatchObject({status:"completed",attempt:1});
    const bAfter=replayed!.stageExecutions.find(item=>item.stageId==="B")!;expect(bAfter).toMatchObject({status:"completed",attempt:2,baseProjectRevision:1});expect(bAfter.inputDigest).not.toBe(bBefore.inputDigest);expect(replayed?.stageExecutions.find(item=>item.stageId==="C")).toMatchObject({status:"completed",attempt:2});
    expect(replayed?.stageExecutions.find(item=>item.stageId==="REVIEW_B")).toMatchObject({status:"waiting_review",attempt:2});expect(replayed?.stageExecutions.find(item=>item.stageId==="FINAL")?.status).toBe("invalidated");
    expect(replayed?.checkpoints.find(item=>item.id===reviewB.id)?.status).toBe("superseded");expect(replayed?.checkpoints.filter(item=>item.stageId==="REVIEW_B"&&item.status==="waiting_review")).toHaveLength(1);
    expect(replayed?.artifacts.map(item=>item.id)).not.toContain("artifact-b-1");expect(replayed?.artifacts.map(item=>item.id)).toContain("artifact-b-2");
    const activity=await h.service.activity(h.run.id);const invalidated=new Set(activity.filter(item=>item.event==="stage-invalidated").map(item=>item.stageId));expect(invalidated).toEqual(new Set(["B","C","REVIEW_B","FINAL"]));expect(activity.some(item=>item.event==="review-superseded"&&item.details?.checkpointId===reviewB.id)).toBe(true);
  },15_000);

  it("rejects replaying a stage that is downstream of the active review checkpoint",async()=>{
    const h=await makeHarness();registerReviewExecutors(h);await h.service.start(h.run.id);await h.runner.waitForIdle(h.run.id);expect((await h.service.get(h.run.id))?.currentStageId).toBe("REVIEW_A");
    await expect(h.service.replayFromStage(h.run.id,"B")).rejects.toThrow(/downstream of the active review checkpoint/u);
  });

  it("refreshes Project revision on resume so work after a manual paused edit starts from the new revision",async()=>{
    const flow=WorkflowDefinitionSchema.parse({id:"pause-review",version:"1",name:"Pause Review",scenario:"talking-head",entryStageIds:["slow"],stages:[stage("slow"),stage("after",["slow"])]});const h=await makeHarness(flow);let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
    h.stages.register("executor-slow",{start:async()=>{await gate;return{kind:"completed",outputDigest:"slow"};}});h.stages.register("executor-after",{start:async context=>({kind:"completed",outputDigest:`after-${context.execution.baseProjectRevision}`})});
    await h.service.start(h.run.id);await waitFor(()=>h.service.get(h.run.id),run=>run?.stageExecutions.find(item=>item.stageId==="slow")?.status==="running");await h.service.pause(h.run.id);h.setRevision(4);release();await h.runner.waitForIdle(h.run.id);
    const paused=await h.service.get(h.run.id);expect(paused?.status).toBe("paused");expect(paused?.stageExecutions.find(item=>item.stageId==="after")?.status).toBe("pending");await h.service.resume(h.run.id);await h.runner.waitForIdle(h.run.id);
    const done=await h.service.get(h.run.id);expect(done?.status).toBe("completed");expect(done?.lastKnownProjectRevision).toBe(4);expect(done?.stageExecutions.find(item=>item.stageId==="after")).toMatchObject({baseProjectRevision:4,outputDigest:"after-4"});expect(done?.stageExecutions.find(item=>item.stageId==="after")?.inputDigest).toBeTruthy();
  });
});
