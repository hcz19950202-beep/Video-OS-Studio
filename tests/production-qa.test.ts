import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import type {FfmpegAdapter,MediaProbeResult} from "@/adapters/contracts";
import type {JobArtifact,JobRecord} from "@/lib/jobs/schema";
import type {ProductionMission} from "@/lib/production/mission/schema";
import {prepareQARepairApplication} from "@/lib/production/qa/repair";
import {QAReportRepository} from "@/lib/production/qa/repository";
import {ProductionQAService,type ProductionQAJobReader,type ProductionQAMissionReader,type ProductionQAProjectReader} from "@/lib/production/qa/service";
import {QARepairReviewRequiredError,QARepairStaleProjectError} from "@/lib/production/qa/errors";
import type {Project} from "@/schemas/project";

const PROJECT_ID="project-1";
const MISSION_ID="11111111-1111-4111-8111-111111111111";
const JOB_ID="22222222-2222-4222-8222-222222222222";
const REPORT_ID="33333333-3333-4333-8333-333333333333";
const REPAIR_ID="44444444-4444-4444-8444-444444444444";
const OUTPUT_RELATIVE_PATH="render/final.mp4";
const OUTPUT_PATH=`/data/projects/${PROJECT_ID}/${OUTPUT_RELATIVE_PATH}`;

const projectAt=(revision=7)=>({
  project:{id:PROJECT_ID,revision,name:"QA project",createdAt:"2026-08-28T10:00:00.000Z",updatedAt:"2026-08-28T10:00:00.000Z"},
  canvas:{width:1080,height:1920,fps:30,durationInFrames:1350},
  script:{segments:[{active:true,words:[
    {text:"Labour",startFrame:0,endFrame:10},
    {text:"15 days",startFrame:150,endFrame:170},
    {text:"Send your project",startFrame:1200,endFrame:1240},
  ]}]},
  tracks:[{clips:[{type:"caption",enabled:true,text:"15 days. Send your project.",startFrame:150,durationInFrames:1100}]}],
  scenes:[
    {id:"hook",semanticType:"hook",startFrame:0,endFrame:150},
    {id:"proof",semanticType:"proof",startFrame:150,endFrame:1000},
    {id:"cta",semanticType:"cta",startFrame:1000,endFrame:1350},
  ],
  brand:{name:"Example"},
} as unknown as Project);

const mission:ProductionMission={
  id:MISSION_ID,projectId:PROJECT_ID,title:"Mission",brief:"Create the approved ad.",target:{targetDurationSeconds:45},autonomyPolicy:{mode:"guided",finalReviewRequired:true},baseProjectRevision:7,status:"running",qaReportIds:[],agentSessionIds:[],workflowRunIds:[],jobIds:[JOB_ID],createdAt:"2026-08-28T10:00:00.000Z",updatedAt:"2026-08-28T10:00:00.000Z",
};

const completedJob=(output:Record<string,unknown>={outputRelativePath:OUTPUT_RELATIVE_PATH,mode:"final",sourceProjectRevision:7,profile:{sizing:"project",width:1080,height:1920,fps:30,container:"mp4",codec:"h264",audio:"aac",quality:"high"}}):JobRecord=>({
  id:JOB_ID,type:"render-final",projectId:PROJECT_ID,status:"completed",stage:"completed",progress:1,attempt:1,input:{},output,createdAt:"2026-08-28T10:01:00.000Z",updatedAt:"2026-08-28T10:02:00.000Z",finishedAt:"2026-08-28T10:02:00.000Z",
});
const renderArtifact:JobArtifact={id:"render-output",kind:"render",label:"final render",relativePath:OUTPUT_RELATIVE_PATH,mimeType:"video/mp4"};
const defaultProbe:MediaProbeResult={durationSeconds:45,width:1080,height:1920,fps:30,hasAudio:true};

const setup=async(options:{project?:Project;job?:JobRecord;artifacts?:JobArtifact[];probe?:MediaProbeResult;probeError?:Error;writeOutput?:boolean}={})=>{
  const fs=new InMemoryFileSystemAdapter();
  const project=options.project??projectAt();
  if(options.writeOutput!==false){await fs.ensureDir(`/data/projects/${PROJECT_ID}/render`);await fs.writeBinary(OUTPUT_PATH,new Uint8Array([1,2,3]));}
  const projects:ProductionQAProjectReader={load:async()=>project,resolveProjectFile:(projectId,relativePath)=>`/data/projects/${projectId}/${relativePath}`};
  const jobs:ProductionQAJobReader={get:async()=>options.job??completedJob(),getArtifacts:async()=>options.artifacts??[renderArtifact]};
  let linked:string|undefined;
  const missions:ProductionQAMissionReader={require:async()=>mission,linkQAReport:async(_projectId,_missionId,reportId)=>{linked=reportId;return{...mission,qaReportIds:[reportId]};}};
  const ffmpeg={probe:async()=>{if(options.probeError)throw options.probeError;return options.probe??defaultProbe;}} as unknown as FfmpegAdapter;
  const repository=new QAReportRepository(fs,"/data");
  const service=new ProductionQAService(repository,projects,jobs,missions,fs,ffmpeg,{now:()=>"2026-08-28T12:00:00.000Z",createReportId:()=>REPORT_ID,createRepairId:()=>REPAIR_ID});
  return{fs,repository,service,getLinked:()=>linked};
};

const runInput={missionId:MISSION_ID,renderJobId:JOB_ID,expectations:{expectAudio:true,expectCaptions:true,hookTerms:["Labour"],ctaTerms:["Send your project"],evidenceTerms:["15 days"],sceneCoverageMinRatio:.9}};

describe("V2.4 B4 Production QA",()=>{
  it("inspects trusted render output with ffprobe and keeps semantic evidence claims bounded",async()=>{
    const{service,repository,getLinked}=await setup();
    const report=await service.run(PROJECT_ID,runInput);
    expect(report.status).toBe("pass");
    expect(report.technicalEvidence).toMatchObject({renderArtifactId:"render-output",durationSeconds:45,width:1080,height:1920,fps:30,hasAudio:true});
    expect(report.findings.find(item=>item.id==="content-hook")?.status).toBe("pass");
    expect(report.findings.find(item=>item.id==="content-cta")?.status).toBe("pass");
    expect(report.findings.find(item=>item.id==="content-evidence")?.status).toBe("pass");
    expect(report.findings.find(item=>item.id==="policy-shell-network")?.status).toBe("not-evaluated");
    expect(report.findings.find(item=>item.id==="brand-render-compliance")?.status).toBe("not-evaluated");
    expect(report.findings.find(item=>item.id==="goal-duration-target")?.status).toBe("pass");
    expect(getLinked()).toBe(REPORT_ID);
    expect(await repository.latest(PROJECT_ID,MISSION_ID)).toEqual(report);
    const serialized=JSON.stringify(report);
    expect(serialized).not.toContain(OUTPUT_RELATIVE_PATH);
    expect(serialized).not.toContain("/data/projects");
  });

  it("produces a structured FAIL report when the completed Job has no output path",async()=>{
    const{service}=await setup({job:completedJob({mode:"final",sourceProjectRevision:7}),artifacts:[],writeOutput:false});
    const report=await service.run(PROJECT_ID,runInput);
    expect(report.status).toBe("fail");
    expect(report.findings.find(item=>item.id==="technical-output-exists")).toMatchObject({status:"fail",severity:"error"});
    expect(report.findings.find(item=>item.id==="technical-probe")?.status).toBe("not-evaluated");
    expect(report.repairProposal).toMatchObject({risk:"high",requiresReview:true,actions:[expect.objectContaining({kind:"full-rerender"})]});
  });

  it("turns ffprobe failure into bounded QA evidence without leaking internal paths",async()=>{
    const{service}=await setup({probeError:new Error("ffprobe failed at C:\\Users\\secret\\final.mp4")});
    const report=await service.run(PROJECT_ID,runInput);
    expect(report.status).toBe("fail");
    expect(report.findings.find(item=>item.id==="technical-probe")).toMatchObject({status:"fail",severity:"error"});
    expect(JSON.stringify(report)).not.toContain("C:\\Users\\secret");
    expect(JSON.stringify(report)).not.toContain("final.mp4");
  });

  it("fails closed for a stale render revision and does not run current semantic checks as passes",async()=>{
    const{service}=await setup({job:completedJob({outputRelativePath:OUTPUT_RELATIVE_PATH,mode:"final",sourceProjectRevision:6})});
    const report=await service.run(PROJECT_ID,runInput);
    expect(report.status).toBe("fail");
    expect(report.findings.find(item=>item.id==="technical-project-revision")?.status).toBe("fail");
    expect(report.findings.find(item=>item.id==="content-hook")?.status).toBe("not-evaluated");
    expect(report.repairProposal).toMatchObject({risk:"high",requiresReview:true});
  });

  it("classifies semantic failures into bounded proposal-first repairs",async()=>{
    const{service}=await setup();
    const report=await service.run(PROJECT_ID,{...runInput,expectations:{...runInput.expectations,hookTerms:["missing hook"],ctaTerms:["missing cta"],evidenceTerms:["missing evidence"],expectCaptions:false}});
    expect(report.status).toBe("repair-recommended");
    expect(report.repairProposal?.actions.map(item=>item.kind)).toEqual(expect.arrayContaining(["text-correction","reapply-skill"]));
    expect(report.repairProposal?.actions.find(item=>item.skill?.id==="numeric-evidence-emphasis")?.skill?.version).toBe("1.0.0");
    expect(report.repairProposal?.actions.find(item=>item.skill?.id==="caption-emphasis")?.skill?.version).toBe("1.0.0");
  });

  it("blocks stale repair application and requires explicit review for high-risk repair",async()=>{
    const{service}=await setup({job:completedJob({outputRelativePath:OUTPUT_RELATIVE_PATH,mode:"final",sourceProjectRevision:6})});
    const report=await service.run(PROJECT_ID,runInput);
    const proposal=report.repairProposal!;
    expect(()=>prepareQARepairApplication({proposal,currentProjectRevision:8,approved:true})).toThrow(QARepairStaleProjectError);
    expect(()=>prepareQARepairApplication({proposal,currentProjectRevision:7,approved:false})).toThrow(QARepairReviewRequiredError);
    expect(prepareQARepairApplication({proposal,currentProjectRevision:7,approved:true})).toMatchObject({proposalId:REPAIR_ID,projectId:PROJECT_ID,baseProjectRevision:7,reviewSatisfied:true});
  });
});
