import {createReadStream} from "node:fs";
import {copyFile,mkdtemp,rm,stat} from "node:fs/promises";
import {createServer,type Server} from "node:http";
import {tmpdir} from "node:os";
import {basename,extname,join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {NodeFileSystemAdapter} from "@/adapters/filesystem";
import {NodeFfmpegAdapter} from "@/adapters/ffmpeg";
import {NodeHyperFramesAdapter} from "@/adapters/hyperframes";
import {NodeRemotionCliAdapter} from "@/adapters/remotion-cli";
import {NodeVideoUseAdapter} from "@/adapters/video-use";
import {HyperFramesRenderService} from "@/lib/hyperframes/render-service";
import {createJobExecutors} from "@/lib/jobs/executors";
import {DurableJobRuntime} from "@/lib/jobs/runtime";
import {FileJobStore} from "@/lib/jobs/store";
import {MediaImportService} from "@/lib/media/import-service";
import {ProjectMutationCoordinator} from "@/lib/project/mutation-coordinator";
import {ProjectRepository} from "@/lib/project/repository";
import {VideoUseService} from "@/lib/video-use/service";
import {RulesVisualPlannerAdapter} from "@/lib/visual-planner/rules";
import {VisualPlanSchema,type VisualPlan} from "@/lib/visual-planner/schema";
import {VisualPlanService} from "@/lib/visual-planner/service";
import {registerW2CapabilityWorkflowDefinitions} from "@/lib/workflows/production-definitions";
import {registerProductionWorkflowStages,type ProductionWorkflowVisualPlan} from "@/lib/workflows/production-stages";
import {WorkflowDefinitionRegistry,WorkflowStageRegistry} from "@/lib/workflows/registry";
import {WorkflowRunner} from "@/lib/workflows/runner";
import {WorkflowService} from "@/lib/workflows/service";
import {FileWorkflowStore} from "@/lib/workflows/store";
import {HYPERFRAMES_EFFECTS} from "@/shared/hyperframes/registry";

const roots:string[]=[];const servers:Server[]=[];
afterEach(async()=>{await Promise.all(servers.splice(0).map(server=>new Promise<void>(resolve=>server.close(()=>resolve()))));await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});
const windowsW2It=process.env.W2_WINDOWS_WORKFLOW_SMOKE==="1"?it:it.skip;
const mimeFor=(path:string)=>extname(path).toLowerCase()===".mov"?"video/quicktime":"video/mp4";

const startAssetServer=async(repository:ProjectRepository)=>{
  const server=createServer(async(req,res)=>{
    try{
      const url=new URL(req.url??"/","http://127.0.0.1");const match=url.pathname.match(/^\/api\/projects\/([^/]+)\/assets\/([^/]+)$/u);if(!match){res.statusCode=404;res.end();return;}
      const projectId=decodeURIComponent(match[1]!);const assetId=decodeURIComponent(match[2]!);const project=await repository.load(projectId);const asset=project.assets.find(item=>item.id===assetId);if(!asset){res.statusCode=404;res.end();return;}
      const path=repository.resolveProjectFile(projectId,asset.relativePath);const info=await stat(path);const range=req.headers.range;res.setHeader("Accept-Ranges","bytes");res.setHeader("Content-Type",asset.mimeType||"application/octet-stream");
      if(range){const parsed=range.match(/^bytes=(\d+)-(\d*)$/u);if(!parsed){res.statusCode=416;res.end();return;}const start=Number(parsed[1]);const end=parsed[2]?Math.min(Number(parsed[2]),info.size-1):info.size-1;if(start>end||start>=info.size){res.statusCode=416;res.end();return;}res.statusCode=206;res.setHeader("Content-Range",`bytes ${start}-${end}/${info.size}`);res.setHeader("Content-Length",String(end-start+1));createReadStream(path,{start,end}).pipe(res);return;}
      res.statusCode=200;res.setHeader("Content-Length",String(info.size));createReadStream(path).pipe(res);
    }catch(error){res.statusCode=500;res.end(error instanceof Error?error.message:String(error));}
  });
  servers.push(server);await new Promise<void>((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",()=>resolve());});const address=server.address();if(!address||typeof address==="string")throw new Error("Unable to start W2 local asset server.");return`http://127.0.0.1:${address.port}`;
};

const forceAtLeastOneHyperframesPlan=(real:VisualPlanService,fs:NodeFileSystemAdapter,repository:ProjectRepository):ProductionWorkflowVisualPlan=>({
  generate:async(projectId:string):Promise<VisualPlan>=>{
    const generated=await real.generate(projectId);if(generated.suggestions.some(item=>item.recommendation.engine==="hyperframes"))return generated;
    const project=await repository.load(projectId);const scene=project.scenes[0];const caption=project.tracks.find(track=>track.id==="captions-main")?.clips.find(clip=>clip.type==="caption");if(!scene||!caption)throw new Error("W2 acceptance needs at least one Scene and timed Caption before forcing a HyperFrames fixture suggestion.");
    const effect=HYPERFRAMES_EFFECTS.find(item=>item.id==="process-flow")!;const startFrame=Math.max(scene.startFrame,caption.startFrame);const endFrame=Math.min(project.canvas.durationInFrames,scene.endFrame,startFrame+Math.max(30,Math.min(effect.defaultDurationInFrames,project.canvas.fps*4)));if(endFrame<=startFrame)throw new Error("W2 acceptance could not place a HyperFrames fixture inside the first Scene.");
    const forced=VisualPlanSchema.parse({...generated,suggestions:[...generated.suggestions,{id:"w2-local-forced-process-flow",sceneId:scene.id,startFrame,endFrame,spokenText:caption.text,semanticType:"process",recommendation:{engine:"hyperframes",effectId:"process-flow",props:structuredClone(effect.defaults)},reason:"W2 exact-SHA acceptance fixture: guarantee one real HyperFrames Durable Job even when the source speech does not naturally trigger a process/map recommendation.",confidence:1,alternatives:[]}]});
    await fs.writeTextAtomic(repository.resolveProjectFile(projectId,"edit/ai-director-plan.json"),JSON.stringify(forced,null,2));return forced;
  },
  apply:(projectId,plan,selectedIds,meta)=>real.apply(projectId,plan,selectedIds,meta),
});

describe("V2.2 W2 Windows real-engine Workflow acceptance",()=>{
  windowsW2It("imports real talking media and completes video-use → HyperFrames → Remotion through durable Workflow Jobs",async()=>{
    expect(process.platform).toBe("win32");const source=process.env.W2_SOURCE_VIDEO;if(!source)throw new Error("Set W2_SOURCE_VIDEO to a short real talking-head MOV/MP4 before running W2 local acceptance.");const sourceInfo=await stat(source);if(sourceInfo.size<=0)throw new Error("W2_SOURCE_VIDEO is empty.");
    const root=process.env.W2_DATA_ROOT||await mkdtemp(join(tmpdir(),"video-os-w2-real-"));if(!process.env.W2_DATA_ROOT)roots.push(root);const staging=join(root,"acceptance-source",basename(source));await fsPromoteSource(source,staging);

    const fs=new NodeFileSystemAdapter();const ffmpeg=new NodeFfmpegAdapter();const repository=new ProjectRepository(fs,root);const mutations=new ProjectMutationCoordinator(fs,repository);const hyperFrames=new HyperFramesRenderService(fs,new NodeHyperFramesAdapter(),repository,mutations);const videoUse=new VideoUseService(fs,new NodeVideoUseAdapter(),repository,mutations);const remotion=new NodeRemotionCliAdapter();
    const jobStore=new FileJobStore(root);const jobs=new DurableJobRuntime(jobStore,createJobExecutors({fs,repository,remotion,ffmpeg,hyperFrames,videoUse}));await jobs.waitUntilReady();
    const visualPlanReal=new VisualPlanService(fs,repository,new RulesVisualPlannerAdapter(),hyperFrames,mutations);const visualPlan=forceAtLeastOneHyperframesPlan(visualPlanReal,fs,repository);const importer=new MediaImportService(fs,ffmpeg,repository,undefined,mutations);

    const projectId=`w2-real-${Date.now()}`;await repository.create({id:projectId,name:"W2 Real Workflow Acceptance",width:640,height:360,fps:30,durationInFrames:300,scenario:"talking-head"});const importResult=await importer.importWithReport({projectId,fileName:basename(source),mimeType:mimeFor(source),sourcePath:staging,sizeBytes:sourceInfo.size,expectedRevision:0,operationId:"w2-local-real-media-import"});
    const importedAsset=importResult.project.assets.find(asset=>asset.id===importResult.import.assetId);expect(importedAsset?.kind).toBe("video");expect(importedAsset?.durationInFrames).toBeGreaterThan(0);expect(importedAsset?.width).toBeGreaterThan(0);expect(importedAsset?.height).toBeGreaterThan(0);if(extname(source).toLowerCase()===".mov"){expect(importResult.import.normalized).toBe(true);expect(importResult.import.workingRelativePath.toLowerCase()).toMatch(/\.mp4$/u);}

    const assetBaseUrl=await startAssetServer(repository);const definitions=registerW2CapabilityWorkflowDefinitions(new WorkflowDefinitionRegistry());const stages=registerProductionWorkflowStages(new WorkflowStageRegistry(),{fs,repository,mutations,jobs,visualPlan,assetBaseUrl});const workflowStore=new FileWorkflowStore(root);const runner=new WorkflowRunner(workflowStore,definitions,stages,jobs,{jobPollIntervalMs:100});const service=new WorkflowService(repository,workflowStore,definitions,runner);
    const run=await service.create({projectId,definitionId:"w2-capability-talking-head",definitionVersion:"1",sourceAssetIds:[importResult.import.assetId],expectedProjectRevision:importResult.project.project.revision});await service.start(run.id);await runner.waitForIdle(run.id);const done=await service.get(run.id);if(done?.status!=="completed")throw new Error(`W2 real Workflow ended in ${done?.status??"missing"}: ${done?.error?.code??""} ${done?.error?.message??""}`);

    const allJobs=await jobs.list();const workflowJobIds=new Set(done.stageExecutions.flatMap(stage=>stage.jobIds));const linkedJobs=allJobs.filter(job=>workflowJobIds.has(job.id));expect(linkedJobs.some(job=>job.type==="video-use-transcribe"&&job.status==="completed")).toBe(true);expect(linkedJobs.some(job=>job.type==="hyperframes-render"&&job.status==="completed")).toBe(true);const finalJob=linkedJobs.find(job=>job.type==="render-final");expect(finalJob?.status).toBe("completed");expect(linkedJobs.every(job=>["completed","failed","cancelled","interrupted"].includes(job.status))).toBe(true);
    const finalRelativePath=String(finalJob?.output?.outputRelativePath??"");expect(finalRelativePath).toMatch(/\.mp4$/u);const finalPath=repository.resolveProjectFile(projectId,finalRelativePath);const finalProbe=await ffmpeg.probe(finalPath);expect(finalProbe.durationSeconds).toBeGreaterThan(0);expect(finalProbe.width).toBe(640);expect(finalProbe.height).toBe(360);
    const project=await repository.load(projectId);expect(project.script.segments.some(segment=>segment.words.length>0)).toBe(true);expect(project.scenes.length).toBeGreaterThan(0);expect(project.tracks.find(track=>track.id==="captions-main")?.clips.length).toBeGreaterThan(0);expect(project.tracks.find(track=>track.id==="motion-main")?.clips.some(clip=>clip.type==="motion"&&clip.engine==="hyperframes")).toBe(true);expect(done.artifacts.some(artifact=>artifact.kind==="transcript")).toBe(true);expect(done.artifacts.some(artifact=>artifact.kind==="motion")).toBe(true);expect(done.artifacts.some(artifact=>artifact.kind==="final-render")).toBe(true);

    console.log("W2_ACCEPTANCE_EVIDENCE",JSON.stringify({branch:"feature/v2.2-w2-stage-integration",workflowId:done.id,projectId,source:{name:basename(source),mimeType:mimeFor(source),normalized:importResult.import.normalized,workingRelativePath:importResult.import.workingRelativePath},workflowStatus:done.status,stageExecutions:done.stageExecutions.map(stage=>({stageId:stage.stageId,status:stage.status,attempt:stage.attempt,jobIds:stage.jobIds,outputDigest:stage.outputDigest})),jobs:linkedJobs.map(job=>({id:job.id,type:job.type,status:job.status,attempt:job.attempt,output:job.output})),artifacts:done.artifacts,projectRevision:project.project.revision,finalRender:{relativePath:finalRelativePath,width:finalProbe.width,height:finalProbe.height,durationSeconds:finalProbe.durationSeconds}},null,2));
  },45*60*1000);
});

async function fsPromoteSource(source:string,target:string){const fs=new NodeFileSystemAdapter();const directory=target.slice(0,Math.max(target.lastIndexOf("/"),target.lastIndexOf("\\")));if(directory)await fs.ensureDir(directory);await copyFile(source,target);}
