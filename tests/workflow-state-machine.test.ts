import {describe,expect,it} from "vitest";
import {assertWorkflowRunStatusTransition,assertWorkflowStageStatusTransition,canTransitionWorkflowRunStatus,canTransitionWorkflowStageStatus,WorkflowStateTransitionError} from "@/lib/workflows/state-machine";

describe("V2.2 W0 workflow state machine",()=>{
  it("allows the normal run lifecycle including review and resume",()=>{
    expect(canTransitionWorkflowRunStatus("pending","running")).toBe(true);
    expect(canTransitionWorkflowRunStatus("running","waiting_review")).toBe(true);
    expect(canTransitionWorkflowRunStatus("waiting_review","running")).toBe(true);
    expect(canTransitionWorkflowRunStatus("running","completed")).toBe(true);
  });

  it("allows explicit recovery/retry transitions without reopening terminal runs",()=>{
    expect(canTransitionWorkflowRunStatus("failed","running")).toBe(true);
    expect(canTransitionWorkflowRunStatus("interrupted","running")).toBe(true);
    expect(canTransitionWorkflowRunStatus("completed","running")).toBe(false);
    expect(canTransitionWorkflowRunStatus("cancelled","running")).toBe(false);
    expect(()=>assertWorkflowRunStatusTransition("completed","running")).toThrow(WorkflowStateTransitionError);
  });

  it("rejects no-op or illegal run transitions",()=>{
    expect(canTransitionWorkflowRunStatus("pending","pending")).toBe(false);
    expect(canTransitionWorkflowRunStatus("pending","completed")).toBe(false);
    expect(()=>assertWorkflowRunStatusTransition("pending","completed")).toThrowError(expect.objectContaining({code:"WORKFLOW_INVALID_STATE",entity:"run",from:"pending",to:"completed"}));
  });

  it("supports stage execution, review and completion",()=>{
    expect(canTransitionWorkflowStageStatus("pending","ready")).toBe(true);
    expect(canTransitionWorkflowStageStatus("ready","running")).toBe(true);
    expect(canTransitionWorkflowStageStatus("running","waiting_review")).toBe(true);
    expect(canTransitionWorkflowStageStatus("waiting_review","completed")).toBe(true);
  });

  it("supports retry and invalidation without silently reviving completed work",()=>{
    expect(canTransitionWorkflowStageStatus("failed","ready")).toBe(true);
    expect(canTransitionWorkflowStageStatus("interrupted","ready")).toBe(true);
    expect(canTransitionWorkflowStageStatus("cancelled","ready")).toBe(true);
    expect(canTransitionWorkflowStageStatus("completed","invalidated")).toBe(true);
    expect(canTransitionWorkflowStageStatus("invalidated","pending")).toBe(true);
    expect(canTransitionWorkflowStageStatus("completed","running")).toBe(false);
  });

  it("throws a structured error for illegal stage transitions",()=>{
    expect(()=>assertWorkflowStageStatusTransition("pending","completed")).toThrowError(expect.objectContaining({code:"WORKFLOW_INVALID_STATE",entity:"stage",from:"pending",to:"completed"}));
  });
});
