import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import type {AgentRunnerInput} from "@/lib/ai/runner";
import {AgentSessionRepository} from "@/lib/ai/session/repository";
import {AgentSessionSchema} from "@/lib/ai/session/schema";
import type {DurableJobRuntime} from "@/lib/jobs/runtime";
import {ProjectMutationCoordinator} from "@/lib/project/mutation-coordinator";
import {ProjectRepository} from "@/lib/project/repository";
import {createProtectedProductionExecutionService} from "@/lib/production/autonomy/composition";
import {ProductionEditProtectionRepository} from "@/lib/production/autonomy/repository";
import {ProductionEditProtectionService} from "@/lib/production/autonomy/service";
import {
  ApplicationProductionStepRunner,
  ProductionVisualPlanProposalResolver,
  ProductionVisualPlanTargetResolver,
} from "@/lib/production/execution/application-runner";
import {ApplicationProductionAgentStepPort} from "@/lib/production/execution/agent-step-port";
import {ProductionExecutionRepository} from "@/lib/production/execution/repository";
import {ApplicationProductionQAStepPort} from "@/lib/production/execution/qa-step-port";
import {
  ApplicationProductionRepairStepPort,
  ProductionQARepairResolver,
  ProductionQARepairTargetResolver,
} from "@/lib/production/execution/repair-step-port";
import type {ProductionStepRunnerInput} from "@/lib/production/execution/executor";
import {ProductionMissionRepository} from "@/lib/production/mission/repository";
import {ProductionMissionSchema} from "@/lib/production/mission/schema";
import {ProductionPlanRepository} from "@/lib/production/plan/repository";
import {ProductionPlanSchema} from "@/lib/production/plan/schema";
import {createQARepairProposal} from "@/lib/production/qa/repair";
import {QAFindingSchema,QAReportSchema,type QAReport} from "@/lib/production/qa/schema";
import type {ProductionQAService} from "@/lib/production/qa/service";
import {VisualPlanService} from "@/lib/visual-planner/service";
import type {WorkflowService} from "@/lib/workflows/service";

const PROJECT_ID="project-1";
const MISSION_ID="11111111-1111-4111-8111-111111111111";
const PLAN_ID="22222222-2222-4222-8222-222222222222";
const EXECUTION_ID="33333333-3333-4333-8333-333333333333";
const OPERATION_IDS=[
  "44444444-4444-4444-8444-444444444441",
  "44444444-4444-4444-8444-444444444442",
  "44444444-4444-4444-8444-444444444443",
  "44444444-4444-4444-8444-444444444444",
  "44444444-4444-4444-8444-444444444445",
  "44444444-4444-4444-8444-444444444446",
  "44444444-4444-4444-8444-444444444447",
  "44444444-4444-4444-8444-444444444448",
];
const PROPOSAL_ID="55555555-5555-4555-8555-555555555555";
const TURN_ID="66666666-6666-4666-8666-666666666666";
const REPAIR_PROPOSAL_ID="77777777-7777-4777-8777-777777777777";
const NOW="2026-08-29T00:00:00.000Z";
const VISUAL_SKILL="numeric-evidence-emphasis@1.0.0";

const visualPlan={
  version:2 as const,
  projectId:PROJECT_ID,
  generatedAt:NOW,
  source:"rules" as const,
  context:{intent:"proof-led B2B visual"},
  suggestions:[{
    id:"suggestion-1",
    sceneId:"scene-1",
    startFrame:0,
    endFrame:30,
    spokenText:"15 day factory build",
    semanticType:"proof" as const,
    recommendation:{engine:"remotion" as const,effectId:"big-number",props:{}},
    reason:"Show numeric proof",
    confidence:.95,
    alternatives:[],
  }],
  densityBefore:{motionCards:0,cardsPerMinute:0,peakConcurrency:0,averageGapFrames:null,minimumGapFrames:null},
};

class DeterministicQA{
  readonly reports=new Map<string,QAReport>();
  constructor(private readonly projects:ProjectRepository,private readonly firstRenderJobId:string){}

  async run(projectId:string,input:{missionId:string;renderJobId:string},options:{reportId?:string}={}):Promise<QAReport>{
    const project=await this.projects.load(projectId);
    const reportId=options.reportId!;
    const existing=this.reports.get(reportId);
    if(existing)return existing;
    const needsRepair=input.renderJobId===this.firstRenderJobId;
    const finding=QAFindingSchema.parse(needsRepair?{
      id:"goal-duration-target",category:"goal",status:"fail",severity:"warning",
      message:"Rendered duration is outside the deterministic Mission target.",
      evidence:[{source:"mission",summary:"Deterministic acceptance requires one bounded timing repair.",ref:MISSION_ID}],
    }:{
      id:"goal-duration-target",category:"goal",status:"pass",severity:"info",
      message:"Rendered duration now satisfies the deterministic Mission target.",
      evidence:[{source:"mission",summary:"Timing repair is reflected in the rerendered Project.",ref:MISSION_ID}],
    });
    const repairProposal=needsRepair?createQARepairProposal({
      reportId,
      projectId,
      baseProjectRevision:project.project.revision,
      findings:[finding],
    },{now:()=>NOW,createId:()=>REPAIR_PROPOSAL_ID}):undefined;
    const report=QAReportSchema.parse({
      id:reportId,
      projectId,
      missionId:input.missionId,
      renderJobId:input.renderJobId,
      projectRevision:project.project.revision,
      renderSourceProjectRevision:project.project.revision,
      status:needsRepair?"repair-recommended":"pass",
      expectations:{},
      technicalEvidence:{},
      findings:[finding],
      ...(repairProposal?{repairProposal}:{}),
      createdAt:NOW,
    });
    this.reports.set(report.id,report);
    return report;
  }

  async load(projectId:string,reportId:string):Promise<QAReport|null>{
    const report=this.reports.get(reportId)??null;
    return report?.projectId===projectId?report:null;
  }
}

describe("V2.4 B6 deterministic core acceptance",()=>{
  it("runs Agent proposal through protected mutation, Workflow/Job, QA repair, rerender and final QA without duplicate identities",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const dataRoot="/data";
    const projects=new ProjectRepository(fs,dataRoot);
    const project=await projects.create({id:PROJECT_ID,name:"B6 Core Acceptance",now:NOW,durationInFrames:900});
    const mutations=new ProjectMutationCoordinator(fs,projects);
    const sessions=new AgentSessionRepository(fs,dataRoot);
    const missions=new ProductionMissionRepository(fs,dataRoot);
    const plans=new ProductionPlanRepository(fs,dataRoot);
    const executions=new ProductionExecutionRepository(fs,dataRoot);
    const protectionRepository=new ProductionEditProtectionRepository(fs,dataRoot,()=>NOW);
    const protection=new ProductionEditProtectionService(protectionRepository,()=>NOW);
    await protection.markAiOwned(PROJECT_ID,{kind:"canvas"},project.project.revision,"B6 deterministic timing surface.");

    const mission=ProductionMissionSchema.parse({
      id:MISSION_ID,
      projectId:PROJECT_ID,
      title:"B6 autonomous acceptance",
      brief:"Create one bounded proof visual, render it, repair timing once, rerender and pass QA.",
      target:{platform:"facebook",format:"product-ad",targetDurationSeconds:20,language:"en-AU"},
      autonomyPolicy:{mode:"full-production",finalReviewRequired:false},
      baseProjectRevision:0,
      status:"ready",
      planId:PLAN_ID,
      createdAt:NOW,
      updatedAt:NOW,
    });
    const plan=ProductionPlanSchema.parse({
      id:PLAN_ID,
      projectId:PROJECT_ID,
      missionId:MISSION_ID,
      version:1,
      baseProjectRevision:0,
      summary:"Deterministically prove the B6 autonomous core chain.",
      steps:[
        {id:"plan-visuals",kind:"plan-visuals",title:"Plan visuals",objective:"Persist one structured visual proposal.",dependsOn:[],risk:"low",owner:"agent",reviewRequired:false,requiresProjectRevision:false,evidence:[{kind:"skill",id:VISUAL_SKILL}]},
        {id:"edit-project",kind:"edit-project",title:"Apply visual",objective:"Apply only the persisted bounded visual proposal.",dependsOn:["plan-visuals"],risk:"medium",owner:"agent",reviewRequired:false,requiresProjectRevision:true,evidence:[],targets:[{kind:"track",id:"motion-main",action:"append"},{kind:"clip",id:"visual-suggestion-1",action:"create"}]},
        {id:"workflow",kind:"run-workflow",title:"Run workflow",objective:"Run the bounded durable workflow.",dependsOn:["edit-project"],risk:"medium",owner:"workflow",reviewRequired:false,requiresProjectRevision:true,evidence:[{kind:"workflow",id:"b6-deterministic-workflow@1"}]},
        {id:"render-first",kind:"render-final",title:"Render first",objective:"Render the current Project revision.",dependsOn:["workflow"],risk:"medium",owner:"job",reviewRequired:false,requiresProjectRevision:true,evidence:[]},
        {id:"qa-first",kind:"qa",title:"QA first",objective:"Persist QA for the first render.",dependsOn:["render-first"],risk:"low",owner:"application",reviewRequired:false,requiresProjectRevision:true,evidence:[]},
        {id:"repair",kind:"repair",title:"Repair timing",objective:"Apply one bounded structured QA timing repair.",dependsOn:["qa-first"],risk:"medium",owner:"application",reviewRequired:false,requiresProjectRevision:true,evidence:[],targets:[{kind:"canvas",action:"modify"}]},
        {id:"render-second",kind:"render-final",title:"Render second",objective:"Rerender the repaired Project revision.",dependsOn:["repair"],risk:"medium",owner:"job",reviewRequired:false,requiresProjectRevision:true,evidence:[]},
        {id:"qa-final",kind:"qa",title:"QA final",objective:"Persist passing QA for the rerendered Project.",dependsOn:["render-second"],risk:"low",owner:"application",reviewRequired:false,requiresProjectRevision:true,evidence:[]},
      ],
      generatedAt:NOW,
    });
    await missions.create(mission);
    await plans.create(plan);

    const agentRunner={
      runTurn:async(input:AgentRunnerInput)=>{
        const session=await sessions.require(input.projectId,input.sessionId);
        const proposal={
          id:PROPOSAL_ID,
          sessionId:session.id,
          projectId:PROJECT_ID,
          baseProjectRevision:0,
          title:"B6 visual proposal",
          summary:"Add one bounded numeric proof card.",
          rationale:["Use the exact persisted visual proposal."],
          operations:[{id:"visual-op",kind:"visual-plan" as const,summary:"Apply numeric proof visual.",payload:{plan:visualPlan,selectedIds:["suggestion-1"]}}],
          warnings:[],
          createdAt:NOW,
          status:"draft" as const,
        };
        return sessions.save(AgentSessionSchema.parse({
          ...session,
          updatedAt:NOW,
          turns:[...session.turns,{
            id:TURN_ID,
            baseProjectRevision:0,
            userMessageId:"b6-user-message",
            startedAt:NOW,
            completedAt:NOW,
            status:"completed",
            providerRoundTrips:1,
            toolExecutions:[],
            proposalIds:[PROPOSAL_ID],
          }],
          proposals:[...session.proposals,proposal],
        }));
      },
    };
    const agent=new ApplicationProductionAgentStepPort(agentRunner,sessions,{providerId:"deterministic-b6",now:()=>NOW});
    const proposalResolver=new ProductionVisualPlanProposalResolver(sessions);
    const visualTargets=new ProductionVisualPlanTargetResolver(proposalResolver);
    const visualPlans=new VisualPlanService(fs,projects,{} as never,{} as never,mutations);

    const workflowIds:string[]=[];
    const workflowRuns=new Map<string,{id:string;status:string;stageExecutions:{jobIds:string[]}[]}>();
    const workflow={
      create:async(input:{workflowId:string})=>{
        workflowIds.push(input.workflowId);
        const existing=workflowRuns.get(input.workflowId);
        if(existing)return existing;
        const run={id:input.workflowId,status:"pending",stageExecutions:[] as {jobIds:string[]}[]};
        workflowRuns.set(run.id,run);
        return run;
      },
      start:async(id:string)=>{
        const run=workflowRuns.get(id)!;
        run.status="running";
        return run;
      },
      get:async(id:string)=>workflowRuns.get(id)??null,
      runner:{waitForIdle:async(id:string)=>{workflowRuns.get(id)!.status="completed";}},
      projects:{load:(projectId:string)=>projects.load(projectId)},
    };

    const jobCreateIds:string[]=[];
    const jobs=new Map<string,{id:string;status:string;projectId:string;type:string;output:{sourceProjectRevision:number}}>();
    const jobRuntime={
      create:async(input:{jobId?:string;projectId:string;type:string})=>{
        const id=input.jobId!;
        jobCreateIds.push(id);
        const existing=jobs.get(id);
        if(existing)return existing;
        const current=await projects.load(input.projectId);
        const job={id,status:"completed",projectId:input.projectId,type:input.type,output:{sourceProjectRevision:current.project.revision}};
        jobs.set(id,job);
        return job;
      },
      get:async(id:string)=>jobs.get(id)??null,
    };

    const qa=new DeterministicQA(projects,OPERATION_IDS[3]);
    const qaPort=new ApplicationProductionQAStepPort(qa as unknown as Pick<ProductionQAService,"run">);
    const repairResolver=new ProductionQARepairResolver(qa as unknown as Pick<ProductionQAService,"load">);
    const repairPort=new ApplicationProductionRepairStepPort(repairResolver,projects,mutations);
    const repairTargets=new ProductionQARepairTargetResolver(repairResolver,projects);
    const applicationRunner=new ApplicationProductionStepRunner(
      agent,
      proposalResolver,
      visualPlans,
      workflow as unknown as WorkflowService,
      jobRuntime as unknown as DurableJobRuntime,
      {resolve:async()=>"http://127.0.0.1:3000"},
      {pollIntervalMs:1,waitTimeoutMs:1_000,qa:qaPort,repair:repairPort},
    );
    const targets={
      resolve:(input:ProductionStepRunnerInput)=>input.step.kind==="repair"?repairTargets.resolve(input):visualTargets.resolve(input),
    };
    const operationIds=[...OPERATION_IDS];
    const service=createProtectedProductionExecutionService({
      missions,
      plans,
      executions,
      projects,
      runner:applicationRunner,
      targets,
      protection,
    },{
      now:()=>NOW,
      createExecutionId:()=>EXECUTION_ID,
      createOperationId:()=>operationIds.shift()!,
      createCheckpointId:()=>"88888888-8888-4888-8888-888888888888",
    });

    let execution;
    for(let index=0;index<plan.steps.length;index+=1)execution=await service.advance(PROJECT_ID,MISSION_ID);

    expect(execution).toMatchObject({id:EXECUTION_ID,status:"completed",expectedProjectRevision:2});
    expect(execution!.steps.map(step=>step.status)).toEqual(plan.steps.map(()=>"completed"));
    expect(execution!.counters).toMatchObject({agentTurns:1,providerCalls:1,repairLoops:1});
    expect((await missions.require(PROJECT_ID,MISSION_ID)).status).toBe("completed");

    const finalProject=await projects.load(PROJECT_ID);
    expect(finalProject.project.revision).toBe(2);
    expect(finalProject.canvas.durationInFrames).toBe(600);
    expect(finalProject.tracks.find(track=>track.id==="motion-main")?.clips.map(clip=>clip.id)).toContain("visual-suggestion-1");

    const agentSession=await sessions.require(PROJECT_ID,OPERATION_IDS[0]);
    expect(agentSession.turns).toHaveLength(1);
    expect(agentSession.proposals.map(item=>item.id)).toEqual([PROPOSAL_ID]);
    expect(plan.steps[0].evidence).toContainEqual({kind:"skill",id:VISUAL_SKILL});

    expect(workflowIds).toEqual([OPERATION_IDS[2]]);
    expect(jobCreateIds).toEqual([OPERATION_IDS[3],OPERATION_IDS[6]]);
    expect(new Set(jobCreateIds).size).toBe(2);
    expect(jobs.get(OPERATION_IDS[3])?.output.sourceProjectRevision).toBe(1);
    expect(jobs.get(OPERATION_IDS[6])?.output.sourceProjectRevision).toBe(2);

    expect(qa.reports.get(OPERATION_IDS[4])).toMatchObject({status:"repair-recommended",projectRevision:1,renderJobId:OPERATION_IDS[3]});
    expect(qa.reports.get(OPERATION_IDS[7])).toMatchObject({status:"pass",projectRevision:2,renderJobId:OPERATION_IDS[6]});
    expect(execution!.steps[5].evidence).toEqual(expect.arrayContaining([{kind:"apply-operation",id:OPERATION_IDS[5]}]));
  });
});
