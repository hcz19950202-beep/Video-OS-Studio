import type {WorkflowRunStatus,WorkflowStageStatus} from "@/lib/workflows/schema";

const RUN_TRANSITIONS:Record<WorkflowRunStatus,ReadonlySet<WorkflowRunStatus>>={
  pending:new Set(["running","cancelled"]),
  running:new Set(["waiting_review","paused","completed","failed","cancelled","interrupted"]),
  waiting_review:new Set(["running","paused","cancelled"]),
  paused:new Set(["running","cancelled"]),
  completed:new Set(),
  failed:new Set(["running","cancelled"]),
  cancelled:new Set(),
  interrupted:new Set(["running","cancelled"]),
};

const STAGE_TRANSITIONS:Record<WorkflowStageStatus,ReadonlySet<WorkflowStageStatus>>={
  pending:new Set(["ready","skipped","cancelled","invalidated"]),
  ready:new Set(["running","skipped","cancelled","invalidated"]),
  running:new Set(["waiting_review","completed","failed","cancelled","interrupted"]),
  waiting_review:new Set(["completed","cancelled","invalidated"]),
  completed:new Set(["invalidated"]),
  failed:new Set(["ready","cancelled"]),
  cancelled:new Set(["ready"]),
  interrupted:new Set(["ready","cancelled"]),
  skipped:new Set(["invalidated"]),
  invalidated:new Set(["pending"]),
};

export class WorkflowStateTransitionError extends Error{
  readonly code="WORKFLOW_INVALID_STATE";
  constructor(readonly entity:"run"|"stage",readonly from:string,readonly to:string){
    super(`Workflow ${entity} cannot transition from ${from} to ${to}.`);
    this.name="WorkflowStateTransitionError";
  }
}

export const canTransitionWorkflowRunStatus=(from:WorkflowRunStatus,to:WorkflowRunStatus)=>RUN_TRANSITIONS[from].has(to);
export const assertWorkflowRunStatusTransition=(from:WorkflowRunStatus,to:WorkflowRunStatus)=>{
  if(!canTransitionWorkflowRunStatus(from,to))throw new WorkflowStateTransitionError("run",from,to);
};

export const canTransitionWorkflowStageStatus=(from:WorkflowStageStatus,to:WorkflowStageStatus)=>STAGE_TRANSITIONS[from].has(to);
export const assertWorkflowStageStatusTransition=(from:WorkflowStageStatus,to:WorkflowStageStatus)=>{
  if(!canTransitionWorkflowStageStatus(from,to))throw new WorkflowStateTransitionError("stage",from,to);
};
