# Video OS Studio — Current Project Status

> Current-state source of truth for GPT Web, Local Codex, and other development agents. Historical PRs, commits, CI runs, and acceptance reports remain evidence. This file is intentionally concise and avoids using its own status-sync commit as product evidence.

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
active_stage: B5A MISSION EXECUTOR COMPLETE CANDIDATE / B5B NEXT
active_branch: feature/v2.4-b5a-mission-executor / PR #72 — FINAL STATUS SYNC
local_action_required: NONE
next_action: FINAL EXACT-HEAD CI → READY PR #72 → EXPECTED-HEAD MERGE → EXACT-MAIN CI → START B5B BOUNDED AUTONOMY HANDLERS
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

B5 is being delivered in bounded sub-stages:

```text
B5a Mission Executor + risk/checkpoint/budget contracts
B5b Bounded real autonomy handlers + safeguards
B5c Production Workspace / Mission UI
```

B6 must not start until B5 controlled autonomy is accepted. B7 must not begin until B6 proves one real autonomous video Mission end-to-end.

## V2.4 milestone evidence

```text
R0 Repository / PRD / Runtime Truth Sync    → COMPLETE / PR #66 / exact-main CI #769 PASS
B0 Production Mission Contracts + Store    → COMPLETE / PR #67 / exact-main CI #781 PASS
B1 Production Planner + Mission Step Graph → COMPLETE / PR #68 / exact-main CI #792 PASS
B2 Asset Intelligence + Semantic Retrieval → COMPLETE / PR #69 / exact-main CI #825 PASS
B3 Reusable Video Skills                   → COMPLETE / PR #70 / merge 62ba5ab13f49f1d920bfce6626c3ea2293128cc3 / exact-main CI #835 PASS
B4 Self-QA + Repair Proposals              → COMPLETE / PR #71 / merge 695e49446fca7025d442a147737c126231ddf7fe / exact-main CI #840 PASS
B5a Mission Executor Core                  → COMPLETE CANDIDATE / PR #72 / product head 775be240450245bef54cf1c1cfc450a5415b4802 / CI #842 attempt 2 PASS
B5b Bounded Autonomy Handlers              → NEXT
B5c Production Workspace / Mission UI      → NOT STARTED
B6 Autonomous Real Video Acceptance        → NOT STARTED
B7 Campaign / Batch Production             → NOT STARTED
```

## Accepted architecture boundaries through B4

### B0 — Production Mission

- Production Mission is durable production-objective/state-machine truth outside `project.json`.
- Mission persistence uses atomic/backup writes and repository mutation guards.
- Mission references Agent Session, WorkflowRun, Job, Plan and QA evidence instead of duplicating those truths.
- Mission creation captures Project revision without mutating Project truth.

### B1 — Production Plan

- Production Plan is immutable, inspectable production intent and dependency-graph truth, not an executor or mutation log.
- Step kinds, owners, risks, evidence IDs and review requirements are allow-listed and validated.
- Plan generation captures Project revision and fails closed on revision drift or concurrent Mission changes.
- Re-planning preserves prior immutable Plans and records lineage.

### B2 — Asset Intelligence

- Asset Intelligence is derived metadata keyed to Project Asset identity, not a second media store.
- Search is deterministic and stale derived records are excluded until current Asset descriptors match.
- Agent retrieval scope is forced from active Project context.
- No accepted claim of real visual face/object/topic understanding was introduced by B2.

### B3 — Reusable Video Skills

- Video Skills are typed/versioned declarative production knowledge, not executable code or Project truth.
- Recipe references are constrained to allow-listed services/components and exact registry membership is re-resolved before application requests.
- `search_video_skills` is read-only; `select_video_skill` is proposal-only.
- Project ID/revision are context-owned and cannot be injected by the Agent caller.
- Trusted mode ordering remains `REUSE > MODIFY > CREATE`; absent trusted reuse history, the current Agent path does not fabricate reuse evidence.
- Final B3 frozen head `320b5f94038d4839c19a73d621f117df0e714119` passed CI #834; merge `62ba5ab13f49f1d920bfce6626c3ea2293128cc3` passed exact-main CI #835 / run `33187867867`.

### B4 — Self-QA + Repair Proposals

- QA reports are immutable structured production evidence outside Project truth.
- Real technical render QA resolves only Project-owned render Job/artifact evidence and uses bounded FFmpeg/ffprobe inspection.
- Missing artifacts, probe failures, invalid technical metadata and stale render revisions become structured findings.
- Semantic hook/CTA/evidence/caption/Scene checks are Project/Timeline evidence and do not claim rendered-frame visual recognition.
- Repair output is a bounded allow-listed proposal/request only; B4 does not execute repair loops or mutate Project automatically.
- Frozen B4 head `1c23103d049ddeb428939faf364ed4286be09da8` passed CI #839 including exact-SHA Windows real-media QA smoke.
- Accepted merge `695e49446fca7025d442a147737c126231ddf7fe` passed exact-main CI #840 / run `33191880356`.

## B5a completion-candidate boundary

B5a adds the controlled Mission Executor core without yet wiring real autonomous production handlers:

- durable `ProductionExecution` truth lives beneath the production runtime area and remains outside editable `project.json`;
- execution is bound to exact Mission + Plan + expected Project revision;
- `advance()` progresses at most one runnable step and only records completion after durable evidence;
- stable per-step `operationId` is generated once and reused across retries, preventing retry identity drift;
- completed/skipped steps are never rerun during normal resume or repository restart;
- application-owned minimum risk policy prevents a Plan from lowering required safeguards;
- explicit review, human-review, high-risk, final-review and autonomy-mode checkpoints are enforced by the application layer;
- assist/guided/auto/full-production modes are policy inputs, not arbitrary authority grants;
- stale Project revision fails closed before a bounded step runner is invoked;
- revision-guarded completion requires `projectRevisionAfter` and verifies it against the currently loaded Project before accepting success;
- attempt/total/render/workflow/provider-call/agent-turn/repair-loop budgets are durable and enforced;
- runner-reported provider/agent/repair usage is persisted before over-budget execution is blocked;
- cancellation writes Mission cancel intent first, stops later progression and preserves verifiable durable completion evidence returned by an already in-flight bounded step;
- an already-cancelled Mission cannot create a new execution;
- re-plan supersedes/blocks the old Plan execution and an old checkpoint cannot be approved against a new Plan;
- Mission writes from the executor do not overwrite a concurrent cancel or Plan replacement;
- review never creates an execution; inspection never creates an execution;
- default `BlockingProductionStepRunner` fails closed when no bounded handler exists;
- B5a does not directly invoke generic shell/filesystem/network/process execution and does not add a direct Project mutation authority path.

### B5a cloud evidence

- Initial product commit: `bbbcb711ea1d66c56bdc2c50b53422caa838207c`, parent exactly accepted B4 main `695e49446fca7025d442a147737c126231ddf7fe`.
- Initial diff: 14 expected files only; execution core plus minimal Mission/planner integration and dedicated schema/executor tests.
- CI #841 passed format/lint/typecheck and exposed one new-test assertion-shape defect only: a Zod optional property was correctly omitted while `toMatchObject` expected an explicit `undefined`. Product cancellation behavior and durable evidence preservation were already correct.
- Test-only correction commit `775be240450245bef54cf1c1cfc450a5415b4802` changed the assertion to semantic `toBeUndefined()` checks; no product code changed.
- CI #842 / run `33196358223` on exact product head `775be240450245bef54cf1c1cfc450a5415b4802`:
  - Ubuntu Verify PASS: format, lint, typecheck, full unit suite, build;
  - Windows Verify PASS: format, lint, typecheck, full unit suite;
  - Windows Media Smoke PASS on exact tested SHA, including pinned FFmpeg/runtime and existing real-media+B4 QA smoke;
  - Browser Smoke first attempt hit one existing A4 stale-guard timing failure while H6/A7/W4 and other browser tests passed;
  - same-SHA Browser job re-run passed without product-code changes, confirming the first A4 result as non-deterministic E2E timing rather than a B5a code regression;
  - attempt 2 also re-confirmed Ubuntu, Windows and Windows Media gates as PASS.
- B5a tests cover evidence-gated progression, guided checkpoints, stale Project revision, stable retry operation IDs, attempt and provider/agent/repair usage budgets, revision-evidence fail-closed behavior, cancelled-Mission start refusal, in-flight cancellation evidence preservation, re-plan checkpoint invalidation, and restart-safe resume without rerunning completed steps.
- No Local Codex action is required for B5a itself: it introduces no new Remotion/HyperFrames/FFmpeg engine behavior. Existing CI still verifies no browser/media regression.

B5a is not B5 complete. It deliberately does **not** implement real Agent/Workflow/Render step handlers, automatic QA-repair execution, full Mission autonomy, Production Workspace UI, or B6 autonomous real-video acceptance.

## B5b next-work boundary

Start B5b only after PR #72 merges and its merge commit passes exact-main CI.

B5b should connect the accepted Mission Executor to explicitly bounded application-owned handlers and existing domain services. It may:

- implement a handler registry keyed to accepted Production Plan step kinds/owners;
- connect low-risk Agent analysis/planning through existing Agent/tool boundaries without granting generic execution authority;
- connect Project mutation only through the accepted Proposal → Review/Apply path or another equally bounded application-owned service accepted by tests;
- connect Workflow and durable Job operations through existing typed services, preserving their own state truth and cancellation semantics;
- connect preview/final render only through accepted durable Job/render services and evidence IDs;
- feed accepted QA reports and bounded repair proposals back into the Mission loop with the already-defined repair-loop budget;
- use the stable executor `operationId` as idempotency identity wherever a downstream side-effect service supports/needs it;
- preserve stale-revision checks before and after mutation-sensitive operations;
- retain application-owned risk/checkpoint policy and require human review where policy says so;
- add integration tests proving that retries/cancel/restart/replan do not duplicate accepted side effects.

B5b must not:

- expose generic shell, arbitrary filesystem, unrestricted network or arbitrary process execution to the Agent/provider;
- let model-generated Plan risk values bypass application-owned minimum risk;
- mutate Project truth by directly writing `project.json`;
- treat Workflow, Job, Agent Session, QA Report or Execution state as interchangeable truth;
- silently retry a completed side effect under a new idempotency identity;
- bypass a required checkpoint or final review;
- claim B6 real autonomous video acceptance before the explicit B6 gate.

B5c Production Workspace/UI remains a later B5 sub-stage after the bounded executor/handler path is accepted.

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
REUSE > MODIFY > CREATE
```

- `project.json` remains durable editing truth.
- Workflow state remains separate orchestration truth.
- Durable Job state remains concrete execution truth.
- Agent Session remains conversation/tool orchestration truth.
- Production Mission is a production objective/state machine, not Project truth.
- Production Plan is inspectable production intent and a step graph, not an executor or mutation log.
- Asset Intelligence is derived metadata, not Project/media truth.
- Video Skills are declarative reusable production knowledge, not arbitrary executable code.
- QA Report is structured evidence, not Project truth.
- Production Execution is controlled orchestration/audit truth, not Project, Workflow or Job truth.
- stale Project/Workflow/Mission-dependent mutation state fails closed.
- default server security remains loopback-first.
- V2.4 autonomy must use application-owned policies and bounded services, never generic shell/filesystem/network/process authority.
