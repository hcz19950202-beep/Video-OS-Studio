import type {JobRecord} from "@/lib/jobs/schema";
import type {WorkflowJobRuntimePort} from "@/lib/workflows/runner";

export type WorkflowJobRuntimeSource=WorkflowJobRuntimePort;

const workflowRetryableJob=(job:JobRecord):JobRecord=>{
  if(job.error?.code!=="PROJECT_REVISION_CONFLICT"||job.error.retryable)return job;
  return{...job,error:{...job.error,retryable:true,details:{...(job.error.details??{}),workflowRetryMode:"fresh-input-job"}}};
};

export const createWorkflowJobRuntimePort=(source:WorkflowJobRuntimeSource):WorkflowJobRuntimePort=>({
  get:async jobId=>{const job=await source.get(jobId);return job?workflowRetryableJob(job):null;},
  cancel:jobId=>source.cancel(jobId),
  retry:jobId=>source.retry(jobId),
});
