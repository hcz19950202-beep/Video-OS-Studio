# Video OS Studio — Current Project Status

> Current-state source of truth for GPT Web, Local Codex, and other development agents. Historical PRs, commits, CI runs, and acceptance reports remain evidence; this file intentionally avoids self-referential branch-head SHAs.

## Current checkpoint

```yaml
released_product_version: 2.3.1
project_schema: 2.0.0
released_tag: v2.3.1
released_commit: 6e07d1dbdd0ec4d64d022f7c821e133ddf207637
released_tag_object_sha: b91d0c3adbaef09cd5c323481ec6bb04c516dd6e

package_json_version: 2.3.1
package_lock_version: 2.3.1

active_development_workstream: V2.4 AUTONOMOUS PRODUCTION AGENT
active_stage: B0 PRODUCTION MISSION CONTRACTS + STORE COMPLETE / B1 READY
active_branch: NONE — CREATE B1 BRANCH FROM ACCEPTED B0 MAIN
local_action_required: NONE
next_action: START B1 PRODUCTION PLANNER + MISSION STEP GRAPH
v2_4_status: DEVELOPMENT ACTIVE
```

## V2.4 authoritative planning docs

```text
docs/prd/Video_OS_Studio_V2_4_Autonomous_Production_Agent_Master_PRD.md
docs/prd/Video_OS_Studio_V2_4_Development_Plan.md
```

Authoritative sequence:

```text
R0  Repository / PRD / Runtime Truth Sync
B0  Production Mission Contracts + Store
B1  Production Planner + Mission Step Graph
B2  Asset Intelligence + Semantic Retrieval
B3  Reusable Video Skills
B4  Self-QA + Repair Proposals
B5  Controlled Autonomy + Mission Executor + Production Workspace
B6  End-to-End Autonomous Real Video Acceptance
B7  Campaign / Batch Production + Production Dashboard
Release
```

B7 must not begin until B6 proves one real autonomous video Mission end-to-end.

## V2.4 milestone evidence

```text
R0 Repository / PRD / Runtime Truth Sync    → COMPLETE / PR #66 / exact-main CI #769 PASS
B0 Production Mission Contracts + Store    → COMPLETE / PR #67 / cloud gates PASS
B1 Production Planner + Mission Step Graph → READY / not started
B2 Asset Intelligence + Semantic Retrieval → NOT STARTED
B3 Reusable Video Skills                   → NOT STARTED
B4 Self-QA + Repair Proposals              → NOT STARTED
B5 Controlled Autonomy + Mission Executor  → NOT STARTED
B6 Autonomous Real Video Acceptance        → NOT STARTED
B7 Campaign / Batch Production             → NOT STARTED
```

### B0 accepted product boundary

B0 introduces a durable Production Mission layer outside `project.json`:

- strict `ProductionMission` schema;
- Windows-safe UUID Mission IDs;
- bounded target and autonomy-policy contracts;
- references to existing Agent Session / WorkflowRun / Durable Job ID schemas rather than duplicate runtime truth;
- persistence beneath `VIDEO_OS_DATA_ROOT/projects/<projectId>/production/missions`;
- atomic primary/backup persistence;
- durable exclusive-lock protection;
- corrupt-primary backup recovery with lock-time primary recheck;
- repository-path identity validation;
- cross-instance atomic read-modify-write through `repository.mutate()`;
- Project revision capture on Mission creation without Project mutation;
- bounded Mission detail updates and terminal-state behavior;
- idempotent cancellation.

B0 explicitly does **not** implement Planner, Asset Intelligence, Video Skills, QA, Mission Executor, Campaign production, Project Schema migration, dependency upgrades, or engine/runtime changes.

### B0 cloud evidence

- CI #776: Ubuntu / Windows / Browser / Windows Media PASS on the final B0 product implementation candidate.
- CI #777: Ubuntu / Windows / Browser / Windows Media PASS after B0 completion status sync.
- CI #778: Ubuntu / Windows / Windows Media PASS; the first Browser attempt timed out in the pre-existing A5 workflow acceptance while waiting for one WorkflowRun, then the Browser job passed on rerun on the same exact PR contents without product or test changes. This is classified as CI/Playwright flake, not a B0 product defect.

No Local Codex gate is required for B0 because B0 does not change browser/media/process/runtime behavior or the accepted shared filesystem implementation. Its real Node filesystem concurrency behavior is exercised in cloud unit gates on both Ubuntu and Windows.

## V2.3.1 immutable release truth

```text
Release tag:                v2.3.1
Annotated tag object:       b91d0c3adbaef09cd5c323481ec6bb04c516dd6e
Dereferenced release commit: 6e07d1dbdd0ec4d64d022f7c821e133ddf207637
Final release CI:           #765 / run 33158996259 / four gates PASS
Post-release truth PR:      #65
```

`v2.3.0` and `v2.3.1` are immutable and must never be moved or recreated.

## Package and dependency truth

```text
package.json version:                 2.3.1
package-lock.json top-level version:  2.3.1
package-lock packages[""].version:    2.3.1

Project Schema:       2.0.0
Node:                 24.x
remotion:             4.0.513
@remotion/player:     4.0.513
@remotion/cli:        4.0.513
hyperframes:          0.8.10
@playwright/test:     1.62.1
prettier:             3.8.1
```

Any later change to these values requires an explicitly scoped workstream and acceptance gate.

## Permanent accepted invariants

```text
Source Media != Project Canvas != Export Profile
Project != Workflow != Job
Agent Session != Project
Mission != Project
Mission != Workflow
QA Report != Project
REUSE > MODIFY > CREATE
```

- `project.json` remains durable editing truth.
- Workflow state remains separate orchestration truth.
- Durable Job state remains concrete execution truth.
- Agent Session remains conversation/tool orchestration truth.
- Production Mission is a production objective/state machine, not Project truth.
- Agent/provider/tool execution has no direct Project or Workflow mutation authority.
- stale Project/Workflow/Mission-dependent mutation state fails closed.
- default server security remains loopback-first.
- V2.4 autonomy must use application-owned policies and bounded services, never generic shell/filesystem authority.

## B1 next-work boundary

Start **B1 Production Planner + Mission Step Graph** from the accepted B0 merge on `main`.

B1 may add:

- durable Production Plan contracts/repository;
- Mission step graph and dependency validation;
- Planner service reading bounded Mission + Project context;
- explicit review checkpoints;
- Mission ↔ Plan references without copying Project/Workflow/Job truth;
- stale `baseProjectRevision` handling for planning inputs.

B1 must not prematurely implement Asset Intelligence, reusable Video Skills, Self-QA/repair, Mission Executor, unrestricted autonomy, campaign/batch production, or a new Workflow/Job engine.

Local Codex is not required for B1 unless the implementation introduces or changes real browser/media/process/runtime behavior.
