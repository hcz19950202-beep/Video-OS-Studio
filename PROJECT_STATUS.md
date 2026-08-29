# Video OS Studio — Current Project Status

> Current-state source of truth for GPT Web, Local Codex, and other development agents. Historical PRs, commits, CI runs, and acceptance reports remain immutable evidence. Status-sync commits are governance truth, not substitutes for the exact product heads cited below.

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
active_stage: B5B CONTROLLED AUTONOMY COMPLETE CANDIDATE / B5C NEXT
active_branch: feature/v2.4-b5b-controlled-autonomy / PR #75
local_action_required: NONE
next_action: FINAL EXACT-HEAD CI → EXPECTED-HEAD MERGE PR #75 → EXACT-MAIN CI → START B5C PRODUCTION WORKSPACE
v2_4_status: DEVELOPMENT ACTIVE
```

## V2.4 authoritative docs and sequence

```text
docs/prd/Video_OS_Studio_V2_4_Autonomous_Production_Agent_Master_PRD.md
docs/prd/Video_OS_Studio_V2_4_Development_Plan.md
```

```text
R0  Repository / PRD / Runtime Truth Sync
B0  Production Mission Contracts + Store
B1  Production Planner + Mission Step Graph
B2  Asset Intelligence + Semantic Retrieval
B3  Reusable Video Skills
B4  Self-QA + Repair Proposals
B5a Mission Executor / risk policy
B5b Controlled autonomy + protected-edit boundary
B5c Production Workspace UX
B6  End-to-End Autonomous Real Video Acceptance
B7  Campaign / Batch Production + Dashboard
Release
```

B6 must not begin until B5 is accepted. B7 must not begin until B6 proves one real autonomous video Mission end-to-end.

## V2.4 milestone evidence

```text
R0  Repository / PRD / Runtime Truth Sync    → COMPLETE / PR #66 / exact-main CI #769 PASS
B0  Production Mission Contracts + Store    → COMPLETE / PR #67 / exact-main CI #781 PASS
B1  Production Planner + Mission Step Graph → COMPLETE / PR #68 / exact-main CI #792 PASS
B2  Asset Intelligence + Semantic Retrieval → COMPLETE / PR #69 / exact-main CI #825 PASS
B3  Reusable Video Skills                   → COMPLETE / PR #70 / merge 62ba5ab13f49f1d920bfce6626c3ea2293128cc3 / exact-main CI #835 PASS
B4  Self-QA + Repair Proposals              → COMPLETE / PR #71 / merge 695e49446fca7025d442a147737c126231ddf7fe / exact-main CI #840 PASS
B5a Mission Executor Core                   → COMPLETE / PR #73 / merge b222f210535e96dfa5b0f36cdb04128f271cefd7 / exact-main CI #845 PASS
B5b Controlled Autonomy + Protected Edits   → COMPLETE CANDIDATE / PR #75 / product head af8d6e6bdf89c3d2801b3546d5136bde9d657ac5 / CI #852 PASS
B5c Production Workspace / Mission UI       → NEXT
B6  Autonomous Real Video Acceptance        → NOT STARTED
B7  Campaign / Batch Production             → NOT STARTED
```

Draft PR #74 was closed without merge only because the connected GitHub Ready-for-review GraphQL mutation was incompatible with the current GitHub schema. PR #75 uses the same branch/history as a non-Draft replacement; product code was not changed by the PR-container replacement.

## Accepted architecture boundaries through B4

- `project.json` remains durable editing truth; Mission, Plan, Workflow, Job, Agent Session, QA Report, Asset Intelligence, Video Skill, and Production Execution remain separate domain truths.
- Production Mission is a durable production objective/state machine outside `project.json`.
- Production Plan is immutable inspectable intent/dependency truth, not an executor or mutation log.
- Asset Intelligence is derived metadata keyed to Project Asset identity, not a second media store.
- Video Skills are typed/versioned declarative production knowledge, not executable code.
- QA Reports are immutable structured production evidence; technical render QA uses actual Job/artifact + bounded FFmpeg/ffprobe evidence.
- Semantic QA checks based on Project/Timeline truth do not claim rendered-frame visual understanding beyond demonstrated evidence.
- B4 repair output remains bounded proposal/request truth and does not itself auto-mutate the Project.

## B5a — accepted Mission Executor core

Accepted main: `b222f210535e96dfa5b0f36cdb04128f271cefd7` via PR #73. Exact-main CI #845 / run `33229524858` passed Ubuntu, Windows, Browser, and Windows exact-SHA media gates.

B5a establishes:

- durable `ProductionExecution` state outside `project.json`;
- exact Mission + Plan + Project-revision binding;
- dependency-aware one-step advancement;
- application-owned minimum-risk and checkpoint policy;
- Assist / Guided / Auto / full-production policy inputs without generic authority grants;
- stable per-step operation IDs reused across retries;
- durable attempt/provider/agent/repair/render/workflow budgets;
- stale Project fail-closed behavior;
- revision-evidence verification for mutation-sensitive completion;
- cancellation that prevents later progression while preserving verifiable in-flight completion evidence;
- re-plan invalidation of old executions/checkpoints;
- restart-safe resume without rerunning completed steps;
- a default blocking runner when no bounded handler exists.

B5a deliberately did not expose a public Mission execution API or implement a full real-production handler graph.

## B5b — controlled autonomy completion candidate

Product head: `af8d6e6bdf89c3d2801b3546d5136bde9d657ac5` on PR #75. CI #852 / run `33231076522` passed all four gates:

```text
Ubuntu Verify        PASS — format / lint / typecheck / full unit suite / build
Windows Verify       PASS — format / lint / typecheck / full unit suite
Browser Smoke        PASS
Windows Media Smoke  PASS — exact SHA / pinned FFmpeg / existing real-media + B4 QA regression
```

B5b adds the application-owned manual/protected-edit boundary without changing Project Schema:

- logical mutation targets distinguish `create`, `append`, `modify`, and `remove`;
- Plan `targets` are optional, bounded, path-safe, and only valid for `edit-project` steps;
- Plan/provider intent cannot self-assert AI ownership or remove protection;
- durable protection truth lives outside `project.json` as `ai-owned`, `human-modified`, or explicit `protected` state;
- native `Track.locked` is explicit non-overridable protection;
- application-side command resolution derives actual Project mutation targets before delegate side effects;
- actual mutation scope must be contained by the Plan-declared scope or execution fails closed;
- safe creation and append to an unlocked collection may proceed when policy allows;
- unknown existing `modify` / `remove` requires review;
- recorded human-modified work requires review before overwrite;
- explicit `protected` state and native Track locks remain blocked even after a checkpoint was approved;
- missing application-owned target resolver fails closed;
- stale Project revision fails closed before protected execution;
- `ProductionEditProtectionRepository` / `ProductionEditProtectionService` are registered as server runtime singleton truth;
- `createProtectedProductionExecutionService()` is the canonical composition path for a future concrete bounded runner + application target resolver;
- integration tests exercise `ProductionExecutionService → ProductionMissionExecutor → ProtectedProductionStepRunner` and prove human-modified work blocks before delegate side effects.

### B5b runtime truth

B5a/B5b are still controlled execution **core** layers. There is not yet a public Mission execution API or a concrete full-production step-handler graph in server runtime. B5c/B6 must not fake or bypass that gap: any future real mutation-capable runner must be composed through the protected application boundary and existing typed Agent/Workflow/Job/Apply services.

B5b does not add generic shell, arbitrary filesystem, unrestricted network, arbitrary process execution, raw computer-use authority, or a direct `project.json` write path.

## B5c next-work boundary

B5c extends the existing Studio / AI Workspace surfaces to expose durable Mission truth without hidden chain-of-thought.

Target surfaces:

```text
Mission goal/header
Plan step list
current activity + durable progress
Autonomy mode
review checkpoints
Agent conversation
Assets/evidence
Skills used
QA findings
Workflow/Job links
final-render readiness
```

Required visible states include planning, ready, running, waiting review, blocked, retrying, repairing, QA pass/fail, cancelled, and completed.

B5c must reuse current Studio/Agent/Workflow UI architecture and must not introduce a second editor, second execution truth, or browser-only fake Mission state.

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
Project Schema:                       2.0.0
Node:                                 24.x
remotion:                             4.0.513
@remotion/player:                     4.0.513
@remotion/cli:                        4.0.513
hyperframes:                          0.8.10
@playwright/test:                     1.62.1
prettier:                             3.8.1
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
Skill != Project
Production Execution != Project
Production Execution != Workflow
Production Execution != Job
Edit Protection != Project
REUSE > MODIFY > CREATE
```

- stale Project/Workflow/Mission-dependent mutation state fails closed;
- default server security remains loopback-first;
- Project mutation must pass accepted application-owned mutation services and revision guards;
- protected/manual edits must not be silently overwritten;
- V2.4 autonomy must use application-owned policies and bounded typed services, never generic shell/filesystem/network/process/computer authority.
