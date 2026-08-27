import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {AgentProposalApplicationService,AgentProposalStaleError} from "@/lib/ai/application";
import {AgentSessionRepository} from "@/lib/ai/session/repository";
import {AgentSessionSchema} from "@/lib/ai/session/schema";
import {createProject} from "@/lib/project/factory";
import {ProjectSchema,type Project} from "@/schemas/project";
import type {VisualPlan,VisualPlanDiff} from "@/lib/visual-planner/schema";

const now="2026-08-27T05:00:00.000Z";
const projectId="agent-application-project";
const sessionId="session-application";
const proposalId="proposal-visual";
const operationId="operation-visual";

const buildProject=(revision=3):Project=>{
  const project=createProject({id:projectId,name:"Agent Application",now,durationInFrames:600});
  project.project.revision=revision;
  return ProjectSchema.parse(project);
};

const plan:VisualPlan={
  version:2,
  projectId,
  generatedAt:now,
  source:"rules",
  context:{intent:"Show proof"},
  suggestions:[
    {id:"suggestion-proof",sceneId:"scene-proof",startFrame:60,endFrame:120,spokenText:"15 days",semanticType:"number",recommendation:{engine:"remotion",effectId:"big-number"},reason:"Show concrete proof.",confidence:.94,alternatives:[]},
    {id:"suggestion-cta",sceneId:"scene-cta",startFrame:360,endFrame:420,spokenText:"Send your project",semanticType:"cta",recommendation:{engine:"remotion",effectId:"cta-card"},reason:"Make the CTA explicit.",confidence:.9,alternatives:[]},
  ],
  densityBefore:{motionCards:0,cardsPerMinute:0,peakConcurrency:0,averageGapFrames:null,minimumGapFrames:null},
};

const sessionInput=()=>AgentSessionSchema.parse({
  id:sessionId,
  projectId,
  providerId:"mock-provider",
  model:"mock-model",
  status:"active",
  createdAt:now,
  updatedAt:now,
  messages:[],
  turns:[],
  proposals:[{
    id:proposalId,
    sessionId,
    projectId,
    baseProjectRevision:3,
    title:"Proof + CTA visual pass",
    summary:"Add proof and CTA motion cards.",
    rationale:["The proof and CTA deserve visual emphasis."],
    operations:[{id:operationId,kind:"visual-plan",summary:"Apply the proposed visual plan.",payload:{plan,selectedIds:["suggestion-proof","suggestion-cta"]}}],
    warnings:[],
    createdAt:now,
    status:"draft",
  }],
  approvedOperations:[],
});

const diffFor=(selectedIds:string[]):VisualPlanDiff=>({
  add:selectedIds.map((suggestionId,index)=>({suggestionId,sceneId:index===0?"scene-proof":"scene-cta",engine:"remotion",effectId:index===0?"big-number":"cta-card",startFrame:index===0?60:360,endFrame:index===0?120:420})),
  remove:[],
  shorten:[],
  styleChanges:[],
  densityBefore:{motionCards:0,cardsPerMinute:0,peakConcurrency:0,averageGapFrames:null,minimumGapFrames:null},
  densityAfter:{motionCards:selectedIds.length,cardsPerMinute:selectedIds.length*3,peakConcurrency:selectedIds.length?1:0,averageGapFrames:null,minimumGapFrames:null},
});

const harness=async(revision=3)=>{
  const fs=new InMemoryFileSystemAdapter();
  const sessions=new AgentSessionRepository(fs,"/agent-application");
  await sessions.create(sessionInput());
  const projectRef={current:buildProject(revision)};
  const appliedOperations=new Map<string,{expectedRevision:number;appliedRevision:number}>();
  const previewSelections:string[][]=[];
  const applySelections:string[][]=[];
  const service=new AgentProposalApplicationService({
    sessions,
    projects:{load:async()=>ProjectSchema.parse(projectRef.current)},
    mutations:{getOperation:async(_projectId,stableId)=>{
      const record=appliedOperations.get(stableId);
      return record?{operationId:stableId,kind:"visual-plan",expectedRevision:record.expectedRevision,appliedRevision:record.appliedRevision,status:"applied" as const,recordedAt:now}:null;
    }},
    visualPlans:{
      preview:async(_projectId,_plan,selectedIds)=>{previewSelections.push([...selectedIds]);return diffFor(selectedIds);},
      apply:async(_projectId,_plan,selectedIds,meta)=>{
        applySelections.push([...selectedIds]);
        const expectedRevision=meta?.expectedRevision??projectRef.current.project.revision;
        const stableId=meta?.operationId??"unexpected-operation";
        const next=structuredClone(projectRef.current);
        next.project.revision=expectedRevision+1;
        projectRef.current=ProjectSchema.parse(next);
        appliedOperations.set(stableId,{expectedRevision,appliedRevision:projectRef.current.project.revision});
        return{project:projectRef.current,diff:diffFor(selectedIds),transactionId:stableId,appliedIds:[...selectedIds],alreadyApplied:false};
      },
    },
    now:()=>now,
  });
  return{sessions,projectRef,previewSelections,applySelections,service};
};

describe("V2.3 A4 Agent proposal application boundary",()=>{
  it("reviews a proposal and builds structured diff without mutating Project truth",async()=>{
    const test=await harness();
    const before=JSON.stringify(test.projectRef.current);

    const result=await test.service.preview({projectId,sessionId,proposalId});

    expect(JSON.stringify(test.projectRef.current)).toBe(before);
    expect(test.projectRef.current.project.revision).toBe(3);
    expect(test.previewSelections).toEqual([["suggestion-proof","suggestion-cta"]]);
    expect(result.preview.operations[0]?.visualPlanDiff?.add).toHaveLength(2);
    expect(result.preview.operations[0]?.selectableChangeIds).toEqual(["suggestion-proof","suggestion-cta"]);
    expect(result.session.proposals[0]?.status).toBe("reviewed");
    expect(result.session.approvedOperations).toHaveLength(0);
  });

  it("applies only confirmed visual changes once and makes an identical retry idempotent",async()=>{
    const test=await harness();
    await test.service.preview({projectId,sessionId,proposalId});

    const applied=await test.service.apply({projectId,sessionId,proposalId,expectedRevision:3,changeIds:["suggestion-proof"]});

    expect(test.applySelections).toEqual([["suggestion-proof"]]);
    expect(applied.project.project.revision).toBe(4);
    expect(applied.appliedChangeIds).toEqual(["suggestion-proof"]);
    expect(applied.session.proposals[0]?.status).toBe("applied");
    expect(applied.session.approvedOperations).toHaveLength(1);
    expect(applied.transactionId).toBe(applied.applyOperationId);

    const retried=await test.service.apply({projectId,sessionId,proposalId,expectedRevision:3,changeIds:["suggestion-proof"]});
    expect(retried.alreadyApplied).toBe(true);
    expect(retried.project.project.revision).toBe(4);
    expect(test.applySelections).toHaveLength(1);
  });

  it("marks a proposal stale and blocks Apply when Project revision changed",async()=>{
    const test=await harness(4);

    await expect(test.service.apply({projectId,sessionId,proposalId,expectedRevision:3})).rejects.toBeInstanceOf(AgentProposalStaleError);

    expect(test.applySelections).toHaveLength(0);
    expect(test.projectRef.current.project.revision).toBe(4);
    expect((await test.sessions.require(projectId,sessionId)).proposals[0]?.status).toBe("stale");
    expect((await test.sessions.require(projectId,sessionId)).approvedOperations).toHaveLength(0);
  });

  it("rejects a proposal without changing Project truth",async()=>{
    const test=await harness();
    const before=JSON.stringify(test.projectRef.current);

    const rejected=await test.service.reject({projectId,sessionId,proposalId});

    expect(rejected.proposals[0]?.status).toBe("rejected");
    expect(JSON.stringify(test.projectRef.current)).toBe(before);
    expect(test.applySelections).toHaveLength(0);
  });
});
