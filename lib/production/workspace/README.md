# Production Workspace

B5c Production Workspace is a derived read model over existing V2.4 durable truths.

It does not persist a second Mission, Plan, Execution, QA, Workflow, Job, Agent Session, or Project state.

The Workspace service may aggregate only bounded logical evidence and current Project revision. It must not expose machine paths, hidden reasoning, or generic execution authority.

Until a concrete protected ProductionExecutionService is wired into server runtime, B5c may display execution/checkpoint truth but must not expose fake Run, Advance, or Approve controls.
