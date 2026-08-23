import {requestJson} from "@/lib/client/api";
import type {RenderJob,RenderMode} from "@/lib/render/render-jobs";
import type {ExportProfile} from "@/lib/render/profile";

export const createRenderJob=async(projectId:string,mode:RenderMode,profile?:ExportProfile):Promise<RenderJob>=>{
  const payload=await requestJson<{job:RenderJob}>(`/api/projects/${encodeURIComponent(projectId)}/renders`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({mode,...(mode==="final"&&profile?{profile}:{})}),
  });
  return payload.job;
};

export const getRenderJob=async(jobId:string):Promise<RenderJob>=>{
  const payload=await requestJson<{job:RenderJob}>(`/api/renders/${encodeURIComponent(jobId)}`,{cache:"no-store"});
  return payload.job;
};
