import {beforeEach,describe,expect,it,vi} from "vitest";
import {ApiRequestError,requestJson,toClientErrorState} from "@/lib/client/api";
import {addHyperFramesEffect} from "@/lib/client/hyperframes";
import {cancelJob,createJob,getJob,listJobs,retryJob} from "@/lib/client/jobs";
import {importProjectMedia} from "@/lib/client/media";
import {applyVisualPlan,generateVisualPlan} from "@/lib/client/planner";
import {ProjectRequestError,parseProjectResponse} from "@/lib/client/project-mutations";
import {createStudioProject,listRecentProjects} from "@/lib/client/projects";
import {createRenderJob,getRenderJob} from "@/lib/client/renders";
import {applyVideoUseEdl,prepareVideoUse} from "@/lib/client/video-use";
import {createProject} from "@/lib/project/factory";

const fetchMock=vi.fn<typeof fetch>();
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});

beforeEach(()=>{
  fetchMock.mockReset();
  vi.stubGlobal("fetch",fetchMock);
});

describe("H7 typed client contracts",()=>{
  it("centralizes structured API errors and keeps ProjectRequestError compatibility",async()=>{
    fetchMock.mockResolvedValueOnce(json({code:"PROJECT_REVISION_CONFLICT",message:"Project changed",action:"reload",retryable:true,details:{expectedRevision:2,currentRevision:3},requestId:"req-1"},409));
    await expect(requestJson("/api/example")).rejects.toMatchObject({
      name:"ApiRequestError",
      status:409,
      code:"PROJECT_REVISION_CONFLICT",
      action:"reload",
      retryable:true,
      requestId:"req-1",
    });

    const response=json({code:"PROJECT_REVISION_CONFLICT",message:"Project changed",retryable:true},409);
    let caught:unknown;
    try{await parseProjectResponse(response);}catch(error){caught=error;}
    expect(caught).toBeInstanceOf(ApiRequestError);
    expect(caught).toBeInstanceOf(ProjectRequestError);
    expect(toClientErrorState(caught)).toEqual({message:"Project changed",action:undefined,retryable:true});
  });

  it("uses typed Project collection clients",async()=>{
    const project=createProject({id:"h7-project",name:"H7 Project",now:"2026-08-23T10:00:00.000Z"});
    fetchMock
      .mockResolvedValueOnce(json({projects:[{id:"h7-project",name:"H7 Project",updatedAt:"2026-08-23T10:00:00.000Z",revision:0}]}))
      .mockResolvedValueOnce(json({project},201));

    expect(await listRecentProjects()).toHaveLength(1);
    const created=await createStudioProject({name:"H7 Project",width:1080,height:1920,fps:30,scenario:"blank"});
    expect(created.project.id).toBe("h7-project");
    expect(fetchMock).toHaveBeenNthCalledWith(1,"/api/projects",{cache:"no-store"});
    expect(fetchMock).toHaveBeenNthCalledWith(2,"/api/projects",expect.objectContaining({method:"POST"}));
    const createInit=fetchMock.mock.calls[1]?.[1];
    expect(JSON.parse(String(createInit?.body))).toMatchObject({name:"H7 Project",width:1080,height:1920,fps:30,scenario:"blank"});
  });

  it("keeps media import streaming and H1 revision metadata in the typed client",async()=>{
    const project=createProject({id:"h7-project",name:"H7 Project",now:"2026-08-23T10:00:00.000Z"});
    project.project.revision=7;
    const file=new File([new Uint8Array([1,2,3])],"tiny clip.mp4",{type:"video/mp4"});
    fetchMock.mockResolvedValueOnce(json({project,import:{kind:"video",normalized:false,assetId:"asset-1"}}));

    const result=await importProjectMedia(project,file,"media-op-1");
    expect(result.import?.assetId).toBe("asset-1");
    const [url,init]=fetchMock.mock.calls[0]??[];
    expect(String(url)).toContain("/api/projects/h7-project/media?");
    expect(String(url)).toContain("fileName=tiny+clip.mp4");
    expect(String(url)).toContain("expectedRevision=7");
    expect(String(url)).toContain("operationId=media-op-1");
    expect(init).toMatchObject({method:"POST",body:file,headers:{"Content-Type":"video/mp4"}});
  });

  it("uses typed planner generation and apply boundaries",async()=>{
    const project=createProject({id:"h7-project",name:"H7 Project",now:"2026-08-23T10:00:00.000Z"});
    const plan={projectId:"h7-project",source:"rules",generatedAt:"2026-08-23T10:00:00.000Z",suggestions:[]} as never;
    const diff={add:[],remove:[],shorten:[],styleChanges:[],densityBefore:{cardsPerMinute:0,peakConcurrency:0,motionCards:0},densityAfter:{cardsPerMinute:0,peakConcurrency:0,motionCards:0}} as never;
    fetchMock
      .mockResolvedValueOnce(json({plan}))
      .mockResolvedValueOnce(json({project,diff,transactionId:null,appliedIds:[]}));

    expect(await generateVisualPlan("h7-project",{intent:"restrained",safeArea:{profileId:"none",top:0,right:0,bottom:0,left:0}})).toStrictEqual(plan);
    const applied=await applyVisualPlan("h7-project",{expectedRevision:0,operationId:"ai-1",plan,selectedIds:[]});
    expect(applied.project.project.id).toBe("h7-project");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/projects/h7-project/visual-plan");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/projects/h7-project/visual-plan/apply");
  });

  it("uses typed render clients without changing the durable render API",async()=>{
    const renderJob={id:"00000000-0000-4000-8000-000000000001",projectId:"h7-project",mode:"final",status:"queued",stage:"queued",progress:0,attempt:1,createdAt:"2026-08-23T10:00:00.000Z",updatedAt:"2026-08-23T10:00:00.000Z"} as const;
    fetchMock.mockResolvedValueOnce(json({job:renderJob},202)).mockResolvedValueOnce(json({job:renderJob}));

    expect((await createRenderJob("h7-project","final",{sizing:"project",container:"mp4",codec:"h264",audio:"none",quality:"high"})).id).toBe(renderJob.id);
    expect((await getRenderJob(renderJob.id)).status).toBe("queued");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/projects/h7-project/renders");
    expect(fetchMock.mock.calls[1]?.[0]).toBe(`/api/renders/${renderJob.id}`);
  });

  it("provides typed generic Job list/create/get/cancel/retry clients",async()=>{
    const job={id:"00000000-0000-4000-8000-000000000001",type:"media-normalize",projectId:"h7-project",status:"queued",stage:"queued",progress:0,attempt:1,input:{},createdAt:"2026-08-23T10:00:00.000Z",updatedAt:"2026-08-23T10:00:00.000Z"} as const;
    fetchMock
      .mockResolvedValueOnce(json({jobs:[job]}))
      .mockResolvedValueOnce(json({job},202))
      .mockResolvedValueOnce(json({job,artifacts:[]}))
      .mockResolvedValueOnce(json({job:{...job,status:"cancelled"}}))
      .mockResolvedValueOnce(json({job:{...job,attempt:2}},202));

    expect(await listJobs({projectId:"h7-project",limit:5})).toHaveLength(1);
    expect((await createJob({type:"media-normalize",projectId:"h7-project",input:{sourceRelativePath:"input/a.mov",outputRelativePath:"input/a.mp4"}})).id).toBe(job.id);
    expect((await getJob(job.id)).artifacts).toEqual([]);
    expect((await cancelJob(job.id)).status).toBe("cancelled");
    expect((await retryJob(job.id)).attempt).toBe(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/jobs?projectId=h7-project&limit=5");
  });

  it("routes HyperFrames and video-use operations through typed clients",async()=>{
    const project=createProject({id:"h7-project",name:"H7 Project",now:"2026-08-23T10:00:00.000Z"});
    const prepared={project,wordCount:2,scriptSegmentCount:1,text:"hello world",packedText:"packed",transcriptRelativePath:"edit/transcripts/a.json",packedTranscriptRelativePath:"edit/takes_packed.md",alreadyApplied:false};
    fetchMock
      .mockResolvedValueOnce(json({project}))
      .mockResolvedValueOnce(json({result:prepared}))
      .mockResolvedValueOnce(json({project}));

    const hyperframes=await addHyperFramesEffect("h7-project",{expectedRevision:0,operationId:"hf-1",effectId:"process-flow",props:{},startFrame:0,durationInFrames:60});
    expect(hyperframes.project.id).toBe("h7-project");
    expect((await prepareVideoUse("h7-project",{expectedRevision:0,operationId:"vu-prepare-1"})).scriptSegmentCount).toBe(1);
    const edl={version:1,ranges:[{start:0,end:1,beat:"HOOK",reason:"keep"}]} as never;
    expect((await applyVideoUseEdl("h7-project",{expectedRevision:0,operationId:"vu-edl-1",edl})).project.id).toBe("h7-project");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/projects/h7-project/hyperframes");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/projects/h7-project/video-use/prepare");
    expect(fetchMock.mock.calls[2]?.[0]).toBe("/api/projects/h7-project/video-use/apply-edl");
  });
});
