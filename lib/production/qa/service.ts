import {randomUUID} from "node:crypto";
import {isDeepStrictEqual} from "node:util";
import {z} from "zod";
import type {FileSystemAdapter,FfmpegAdapter,MediaProbeResult} from "@/adapters/contracts";
import type {JobArtifact,JobRecord} from "@/lib/jobs/schema";
import type {ProductionMission} from "@/lib/production/mission/schema";
import {QAInvalidRenderJobError,QAProjectUnavailableError} from "@/lib/production/qa/errors";
import {evaluateProjectSemanticQA,qaReportStatusFor} from "@/lib/production/qa/evaluate";
import {createQARepairProposal} from "@/lib/production/qa/repair";
import {QAReportRepository} from "@/lib/production/qa/repository";
import {
  QAExpectationsSchema,
  QAFindingSchema,
  QAReportIdSchema,
  QAReportSchema,
  RunProductionQAInputSchema,
  type QAExpectations,
  type QAFinding,
  type QAReport,
  type RunProductionQAInput,
} from "@/lib/production/qa/schema";
import {ExportProfileSchema} from "@/lib/render/profile";
import {ProjectRelativePathSchema} from "@/schemas/asset";
import {ProjectIdSchema,type Project} from "@/schemas/project";

const RevisionSchema=z.number().int().nonnegative();
const asRecord=(value:unknown):Record<string,unknown>=>value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
const safeFinding=(finding:QAFinding)=>QAFindingSchema.parse(finding);
const qaEvidence=(source:QAFinding["evidence"][number]["source"],summary:string,ref?:string)=>({source,summary,...(ref?{ref}:{})});

export interface ProductionQAProjectReader{
  load(projectId:string):Promise<Project>;
  resolveProjectFile(projectId:string,relativePath:string):string;
}
export interface ProductionQAJobReader{
  get(jobId:string):Promise<JobRecord|null>;
  getArtifacts(jobId:string):Promise<JobArtifact[]>;
}
export interface ProductionQAMissionReader{
  require(projectId:string,missionId:string):Promise<ProductionMission>;
  linkQAReport(projectId:string,missionId:string,reportId:string):Promise<ProductionMission>;
}
export interface ProductionQAServiceOptions{
  now?:()=>string;
  createReportId?:()=>string;
  createRepairId?:()=>string;
}
export interface ProductionQARunOptions{
  reportId?:string;
}

const reportMatchesStableRun=(report:QAReport,input:{projectId:string;missionId:string;renderJobId:string;projectRevision:number;expectations:QAExpectations})=>
  report.projectId===input.projectId&&
  report.missionId===input.missionId&&
  report.renderJobId===input.renderJobId&&
  report.projectRevision===input.projectRevision&&
  isDeepStrictEqual(report.expectations,input.expectations);

export class ProductionQAService{
  private readonly now:()=>string;
  private readonly createReportId:()=>string;
  private readonly createRepairId:()=>string;

  constructor(
    readonly repository:QAReportRepository,
    private readonly projects:ProductionQAProjectReader,
    private readonly jobs:ProductionQAJobReader,
    private readonly missions:ProductionQAMissionReader,
    private readonly fs:FileSystemAdapter,
    private readonly ffmpeg:FfmpegAdapter,
    options:ProductionQAServiceOptions={},
  ){
    this.now=options.now??(()=>new Date().toISOString());
    this.createReportId=options.createReportId??randomUUID;
    this.createRepairId=options.createRepairId??randomUUID;
  }

  private async requireProject(projectId:string){
    try{return await this.projects.load(ProjectIdSchema.parse(projectId));}
    catch{throw new QAProjectUnavailableError(projectId);}
  }

  private technicalFinding(id:string,status:QAFinding["status"],severity:QAFinding["severity"],message:string,evidence:QAFinding["evidence"]=[]){
    return safeFinding({id,category:"technical",status,severity,message,evidence});
  }

  private notEvaluatedTechnical(id:string,message:string){return this.technicalFinding(id,"not-evaluated","info",message);}

  async run(projectIdInput:string,input:RunProductionQAInput,runOptions:ProductionQARunOptions={}):Promise<QAReport>{
    const projectId=ProjectIdSchema.parse(projectIdInput);
    const parsed=RunProductionQAInputSchema.parse(input);
    const expectations=QAExpectationsSchema.parse(parsed.expectations??{});
    const initialProject=await this.requireProject(projectId);
    const stableReportId=runOptions.reportId===undefined?undefined:QAReportIdSchema.parse(runOptions.reportId);
    if(stableReportId){
      const existing=await this.repository.load(projectId,stableReportId);
      if(existing){
        if(!reportMatchesStableRun(existing,{projectId,missionId:parsed.missionId,renderJobId:parsed.renderJobId,projectRevision:initialProject.project.revision,expectations}))throw new Error("Stable QA report ID conflicts with different immutable QA input.");
        await this.missions.linkQAReport(projectId,parsed.missionId,existing.id);
        return existing;
      }
    }

    let mission=await this.missions.require(projectId,parsed.missionId);
    if(mission.projectId!==projectId)throw new QAInvalidRenderJobError("The QA Mission does not belong to this Project.");
    const job=await this.jobs.get(parsed.renderJobId);
    if(!job||job.projectId!==projectId||job.type!=="render-final"||job.status!=="completed")throw new QAInvalidRenderJobError();

    const output=asRecord(job.output);
    const outputRelativePathResult=ProjectRelativePathSchema.safeParse(output.outputRelativePath);
    const sourceRevisionResult=RevisionSchema.safeParse(output.sourceProjectRevision);
    const profileResult=ExportProfileSchema.safeParse(asRecord(output.profile));
    const artifacts=await this.jobs.getArtifacts(job.id);
    const renderArtifact=outputRelativePathResult.success?artifacts.find(item=>item.id==="render-output"&&item.kind==="render"&&item.relativePath===outputRelativePathResult.data):undefined;
    const findings:QAFinding[]=[];

    findings.push(this.technicalFinding(
      "technical-render-artifact",
      renderArtifact?"pass":"fail",
      renderArtifact?"info":"error",
      renderArtifact?"The completed render Job has a matching durable render artifact reference.":"The completed render Job is missing a matching durable render artifact reference.",
      renderArtifact?[qaEvidence("render-artifact","Durable render artifact identity matches the Job output reference.",renderArtifact.id)]:[qaEvidence("render-job","No matching render-output artifact was found for this completed Job.",job.id)],
    ));

    let outputExists=false;
    let probe:MediaProbeResult|undefined;
    if(outputRelativePathResult.success){
      const outputPath=this.projects.resolveProjectFile(projectId,outputRelativePathResult.data);
      outputExists=await this.fs.exists(outputPath).catch(()=>false);
      findings.push(this.technicalFinding(
        "technical-output-exists",
        outputExists?"pass":"fail",
        outputExists?"info":"error",
        outputExists?"The trusted final-render artifact exists.":"The trusted final-render artifact is missing.",
        [qaEvidence("render-artifact",outputExists?"Artifact existence was checked through the Project-owned render reference.":"The Project-owned render reference did not resolve to an existing artifact.",renderArtifact?.id??job.id)],
      ));
      if(outputExists){
        try{probe=await this.ffmpeg.probe(outputPath);}
        catch{probe=undefined;}
      }
    }else{
      findings.push(this.technicalFinding("technical-output-exists","fail","error","The completed render Job does not contain a valid Project-relative output reference.",[qaEvidence("render-job","No valid Project-relative output reference is available.",job.id)]));
    }

    findings.push(probe?
      this.technicalFinding("technical-probe","pass","info","ffprobe successfully inspected the trusted final-render artifact.",[qaEvidence("ffprobe","ffprobe returned bounded media metadata for the trusted artifact.")]):
      outputExists?this.technicalFinding("technical-probe","fail","error","ffprobe could not inspect the trusted final-render artifact.",[qaEvidence("ffprobe","Media probing failed; internal tool details are intentionally not included.")]):this.notEvaluatedTechnical("technical-probe","ffprobe was not run because no trusted existing render artifact was available."));

    if(probe){
      const durationPass=Number.isFinite(probe.durationSeconds)&&probe.durationSeconds>0;
      findings.push(this.technicalFinding("technical-duration",durationPass?"pass":"fail",durationPass?"info":"error",durationPass?"The rendered duration is valid.":"The rendered duration is invalid.",[qaEvidence("ffprobe",durationPass?`Duration is ${probe.durationSeconds.toFixed(3)} seconds.`:"No positive finite duration was returned.")]));
      const width=probe.width;
      const height=probe.height;
      const validDimensions=typeof width==="number"&&width>0&&typeof height==="number"&&height>0;
      const expectedWidth=profileResult.success?profileResult.data.width:undefined;
      const expectedHeight=profileResult.success?profileResult.data.height:undefined;
      const dimensionsMatch=validDimensions&&(expectedWidth===undefined||width===expectedWidth)&&(expectedHeight===undefined||height===expectedHeight);
      findings.push(this.technicalFinding("technical-dimensions",dimensionsMatch?"pass":"fail",dimensionsMatch?"info":"error",dimensionsMatch?"Rendered dimensions are valid and match the resolved export metadata when available.":"Rendered dimensions are missing, invalid, or do not match the export metadata.",[qaEvidence("ffprobe",validDimensions?`Dimensions are ${width}x${height}.`:"Valid positive width and height were not returned.")]));
      const fpsPass=probe.fps===undefined||(Number.isFinite(probe.fps)&&probe.fps>0);
      findings.push(this.technicalFinding("technical-fps",fpsPass?"pass":"fail",fpsPass?"info":"warning",fpsPass?"Rendered frame-rate metadata is valid when reported.":"Rendered frame-rate metadata is invalid.",[qaEvidence("ffprobe",probe.fps===undefined?"Frame-rate metadata was not reported.":`Frame rate is ${probe.fps.toFixed(3)} fps.`)]));
      if(expectations.expectAudio===undefined){
        findings.push(this.notEvaluatedTechnical("technical-audio","Audio presence was not evaluated because no audio expectation was supplied."));
      }else{
        const audioPass=probe.hasAudio===expectations.expectAudio;
        findings.push(this.technicalFinding("technical-audio",audioPass?"pass":"fail",audioPass?"info":"error",audioPass?"Rendered audio-stream presence matches the configured expectation.":"Rendered audio-stream presence does not match the configured expectation.",[qaEvidence("ffprobe",`Audio stream present: ${probe.hasAudio?"yes":"no"}.`)]));
      }
    }else{
      findings.push(this.notEvaluatedTechnical("technical-duration","Duration could not be evaluated without successful media probing."));
      findings.push(this.notEvaluatedTechnical("technical-dimensions","Dimensions could not be evaluated without successful media probing."));
      findings.push(this.notEvaluatedTechnical("technical-fps","Frame rate could not be evaluated without successful media probing."));
      findings.push(this.notEvaluatedTechnical("technical-audio","Audio presence could not be evaluated without successful media probing."));
    }

    const project=await this.requireProject(projectId);
    mission=await this.missions.require(projectId,parsed.missionId);
    const stale=!sourceRevisionResult.success||sourceRevisionResult.data!==project.project.revision;
    findings.push(this.technicalFinding(
      "technical-project-revision",
      stale?"fail":"pass",
      stale?"error":"info",
      stale?"The final render does not prove the current Project revision; semantic QA fails closed.":"The final render source revision matches the current Project revision.",
      [qaEvidence("render-job",sourceRevisionResult.success?`Render source revision is ${sourceRevisionResult.data}; current Project revision is ${project.project.revision}.`:`Render source revision metadata is unavailable; current Project revision is ${project.project.revision}.`,job.id)],
    ));

    let semantic=evaluateProjectSemanticQA(project,mission,expectations);
    if(stale){
      semantic=semantic.map(item=>item.category==="policy"?item:safeFinding({...item,status:"not-evaluated",severity:"info",message:"This semantic check was not evaluated because the render does not prove the current Project revision.",evidence:[qaEvidence("render-job","Semantic QA fails closed for stale or missing render revision evidence.",job.id)]}));
    }

    if(mission.target.targetDurationSeconds!==undefined){
      semantic=semantic.filter(item=>item.id!=="goal-duration-target");
      if(probe&&!stale){
        const target=mission.target.targetDurationSeconds;
        const tolerance=Math.max(1,target*.1);
        const pass=Math.abs(probe.durationSeconds-target)<=tolerance;
        semantic.push(safeFinding({id:"goal-duration-target",category:"goal",status:pass?"pass":"fail",severity:pass?"info":"warning",message:pass?"Rendered duration is within the Mission target tolerance.":"Rendered duration falls outside the Mission target tolerance.",evidence:[qaEvidence("ffprobe",`Rendered duration is ${probe.durationSeconds.toFixed(3)} seconds.`),qaEvidence("mission",`Mission target duration is ${target} seconds with ${tolerance.toFixed(3)} seconds tolerance.`,mission.id)]}));
      }else{
        semantic.push(safeFinding({id:"goal-duration-target",category:"goal",status:"not-evaluated",severity:"info",message:"Mission duration target was not evaluated because current trusted probe evidence is unavailable.",evidence:[qaEvidence("mission",`Mission target duration is ${mission.target.targetDurationSeconds} seconds.`,mission.id)]}));
      }
    }
    findings.push(...semantic);

    const reportId=QAReportIdSchema.parse(stableReportId??this.createReportId());
    const repairProposal=createQARepairProposal({reportId,projectId,baseProjectRevision:project.project.revision,findings},{now:this.now,createId:this.createRepairId});
    const technicalEvidence={
      ...(renderArtifact?{renderArtifactId:renderArtifact.id}:{}),
      ...(probe?{durationSeconds:probe.durationSeconds,...(probe.width?{width:probe.width}:{}),...(probe.height?{height:probe.height}:{}),...(probe.fps?{fps:probe.fps}:{}),hasAudio:probe.hasAudio}:{}),
    };
    const report=QAReportSchema.parse({
      id:reportId,
      projectId,
      missionId:mission.id,
      renderJobId:job.id,
      projectRevision:project.project.revision,
      ...(sourceRevisionResult.success?{renderSourceProjectRevision:sourceRevisionResult.data}:{}),
      status:qaReportStatusFor(findings),
      expectations,
      technicalEvidence,
      findings,
      ...(repairProposal?{repairProposal}:{}),
      createdAt:this.now(),
    });
    let persisted=report;
    try{persisted=await this.repository.create(report);}
    catch(error){
      if(!stableReportId)throw error;
      const raced=await this.repository.load(projectId,stableReportId);
      if(!raced||!reportMatchesStableRun(raced,{projectId,missionId:mission.id,renderJobId:job.id,projectRevision:project.project.revision,expectations}))throw error;
      persisted=raced;
    }
    await this.missions.linkQAReport(projectId,mission.id,persisted.id);
    return persisted;
  }

  async load(projectId:string,reportId:string){await this.requireProject(projectId);return this.repository.load(projectId,reportId);}
  async latest(projectId:string,missionId?:string){await this.requireProject(projectId);return this.repository.latest(projectId,missionId);}
  async list(projectId:string){await this.requireProject(projectId);return this.repository.list(projectId);}
}
