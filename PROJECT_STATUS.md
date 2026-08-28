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
active_stage: B1 PRODUCTION PLANNER + MISSION STEP GRAPH COMPLETE / B2 READY
active_branch: NONE ON ACCEPTED MAIN — CREATE B2 BRANCH AFTER PR #68 MERGE
local_action_required: NONE
next_action: MERGE B1 PR #68 AFTER FINAL EXACT-HEAD CI, THEN START B2 ASSET INTELLIGENCE + SEMANTIC RETRIEVAL
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
B0 Production Mission Contracts + Store    → COMPLETE / PR #67 / exact-main CI #781 PASS
B1 Production Planner + Mission Step Graph → COMPLETE / PR #68 / product candidate CI #790 PASS / final status-sync CI pending
B2 Asset Intelligence + Semantic Retrieval → READY
B3 Reusable Video Skills                   → NOT STARTED
B4 Self-QA + Repair Proposals              → NOT STARTED
B5 Controlled Autonomy + Mission Executor  → NOT STARTED
B6 Autonomous Real Video Acceptance        → NOT STARTED
B7 Campaign / Batch Production             → NOT STARTED
```

## B0 accepted product boundary

B0 introduces a durable Production Mission layer outside `project.json`:

- strict `ProductionMission` schema with Windows-safe UUID Mission IDs;
- bounded target and autonomy-policy contracts;
- references to existing Agent Session / WorkflowRun / Durable Job IDs instead of duplicate runtime truth;
- persistence beneath `VIDEO_OS_DATA_ROOT/projects/<projectId>/production/missions`;
- atomic primary/backup persistence and durable exclusive-lock protection;
- corrupt-primary recovery with lock-time primary recheck;
- repository-path identity validation;
- cross-instance atomic read-modify-write through `repository.mutate()`;
- Project revision capture on Mission creation without Project mutation;
- bounded Mission detail updates, terminal-state guards, and idempotent cancellation.

B0 does not implement Planner, Asset Intelligence, Video Skills, QA, Mission Executor, Campaign production, Project Schema migration, dependency upgrades, or engine/runtime changes.

## B1 accepted product boundary

B1 adds a durable planning layer above Production Missions without turning Plan into Project/Workflow/Job truth:

- immutable `ProductionPlan` and `ProductionPlanStep` contracts;
- allow-listed step kinds, execution owners, risk classes, and logical evidence references;
- strict step-kind ↔ execution-owner compatibility;
- dependency uniqueness, missing-dependency rejection, self-dependency rejection, and DAG/cycle validation;
- explicit review checkpoints for high-risk and human-review steps;
- rejection of arbitrary executable command fields, machine paths, and command-like normalized Plan text;
- immutable Plan persistence beneath `VIDEO_OS_DATA_ROOT/projects/<projectId>/production/plans`;
- Mission `planId` links the current Plan while historical Plans remain immutable audit evidence;
- re-planning records `supersedesPlanId` and preserves prior Plans;
- bounded Planner context containing Mission brief/target/autonomy plus accepted Project metadata, canvas, Script summary, Scene metadata, and Asset metadata;
- Planner context excludes asset filesystem paths and original filenames;
- deterministic mock Planner fixtures;
- Project revision capture before planning and post-generation revision recheck;
- persisted Plan freshness inspection and fail-closed stale Plan behavior;
- Mission semantic compare-and-link guard prevents concurrent Mission edits or plan replacement from being overwritten;
- Planner failure leaves Project and Mission durable truth unchanged;
- Planner produces Plan proposals only and never mutates `project.json` directly.

B1 does not implement Plan execution, Asset Intelligence, Video Skills, QA/repair, controlled autonomy, campaign/batch production, Project Schema migration, dependency upgrades, or browser/media/process runtime changes.

### B1 cloud evidence

- CI #782 exposed only lint errors in newly added B1 tests; product runtime was not exercised and the test lint defects were corrected.
- CI #787 passed format/lint/typecheck and exposed only assertion-shape mismatches in B1 tests; the tested product behavior itself matched the intended optional-field and owner-contract semantics.
- CI #790 / run `33170780714`: Ubuntu / Windows / Browser / Windows Media all PASS after final B1 self-review and immutable re-plan-lineage coverage.
- PR #68 has no external review/thread blockers at the B1 completion checkpoint.

No Local Codex gate is required for B1 because B1 does not change real browser/media/process/runtime behavior. Local/live acceptance remains reserved for later workstreams that claim real media intelligence or autonomous execution behavior.

## V2.3.1 immutable release truth

```text
Release tag:                 v2.3.1
Annotated tag object:        b91d0c3adbaef09cd5c323481ec6bb04c516dd6e
Dereferenced release commit: 6e07d1dbdd0ec4d64d022f7c821e133ddf207637
Final release CI:            #765 / run 33158996259 / four gates PASS
Post-release truth PR:       #65
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
Production Plan != Project
Production Plan != Workflow
Production Plan != Job
QA Report != Project
REUSE > MODIFY > CREATE
```

- `project.json` remains durable editing truth.
- Workflow state remains separate orchestration truth.
- Durable Job state remains concrete execution truth.
- Agent Session remains conversation/tool orchestration truth.
- Production Mission is a production objective/state machine, not Project truth.
- Production Plan is an inspectable proposal/step graph, not an executor or mutation log.
- Agent/provider/tool execution has no direct Project or Workflow mutation authority.
- stale Project/Workflow/Mission-dependent mutation state fails closed.
- default server security remains loopback-first.
- V2.4 autonomy must use application-owned policies and bounded services, never generic shell/filesystem authority.

## B2 next-work boundary

Start **B2 Asset Intelligence + Semantic Retrieval** only after PR #68 merges and the B1 merge commit passes exact-main CI.

B2 may add:

- typed derived asset-analysis records outside Project Asset truth;
- analysis provenance/versioning and invalidation contracts;
- deterministic analyzer fixtures;
- semantic tags/summaries and bounded usable ranges when supported by evidence;
- retrieval/ranking by Scene, script, Mission, or production need;
- Agent/tool-facing retrieval that returns logical Asset IDs and bounded metadata rather than filesystem paths;
- optional real analyzer adapters only behind explicit bounded interfaces.

B2 must reuse existing Project Asset IDs and existing media services rather than create a second Asset store. It must not implicitly upload raw local media to a remote provider.

If B2 remains deterministic/mock-only, cloud gates are sufficient and no claim of real-media intelligence may be made. If B2 claims real video intelligence, a mandatory Local Codex exact-SHA gate must prove real local video analysis, durable semantic metadata, retrieval against real production need, restart/reopen behavior, and no path/raw-media leakage.
