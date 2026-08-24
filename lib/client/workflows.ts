import {requestJson} from "@/lib/client/api";
import type {WorkflowActivity} from "@/lib/workflows/activity";
import type {WorkflowRun,WorkflowScenario} from "@/lib/workflows/schema";

export type CreateWorkflowInput={
  projectId:string;
  scenario:WorkflowScenario;
  sourceAssetIds:string[];
  expectedProjectRevision:number;
};

export type WorkflowAction=
  |{action:"start"}
  |{action:"pause"}
  |{action:"resume"}
  |{action:"cancel"}
  |{action:"approve";checkpointId:string}
  |{action:"retry";stageId:string}
  |{action:"replay";stageId:string};

export const listWorkflows=async(projectId?:string):Promise<WorkflowRun[]>=>{
  const suffix=projectId?`?projectId=${encodeURIComponent(projectId)}`:"";
  const payload=await requestJson<{workflows:WorkflowRun[]}>(`/api/workflows${suffix}`,{cache:"no-store"});
  return payload.workflows;
};

export const createWorkflow=async(input:CreateWorkflowInput):Promise<WorkflowRun>=>{
  const payload=await requestJson<{workflow:WorkflowRun}>("/api/workflows",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(input),
  });
  return payload.workflow;
};

export const getWorkflow=async(workflowId:string):Promise<WorkflowRun>=>{
  const payload=await requestJson<{workflow:WorkflowRun}>(`/api/workflows/${encodeURIComponent(workflowId)}`,{cache:"no-store"});
  return payload.workflow;
};

export const actOnWorkflow=async(workflowId:string,action:WorkflowAction):Promise<WorkflowRun>=>{
  const payload=await requestJson<{workflow:WorkflowRun}>(`/api/workflows/${encodeURIComponent(workflowId)}`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(action),
  });
  return payload.workflow;
};

export const getWorkflowActivity=async(workflowId:string):Promise<WorkflowActivity[]>=>{
  const payload=await requestJson<{activity:WorkflowActivity[]}>(`/api/workflows/${encodeURIComponent(workflowId)}/activity`,{cache:"no-store"});
  return payload.activity;
};

export const createAndStartWorkflow=async(input:CreateWorkflowInput):Promise<WorkflowRun>=>{
  const created=await createWorkflow(input);
  return actOnWorkflow(created.id,{action:"start"});
};
