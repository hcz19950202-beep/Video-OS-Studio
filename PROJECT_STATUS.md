# Video OS Studio — Current Project Status

> Current-state source of truth for GPT Web, Local Codex, and other development agents. Historical PRs and validation reports remain evidence; they do not override this file.

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

V2.4 product direction:

```text
User production goal
→ Production Mission
→ Production Plan
→ Agent + reusable Skills + Asset Intelligence
→ existing Workflow / Durable Jobs / Project Commands
→ actual render
→ Self-QA
→ bounded repair
→ controlled human checkpoints
→ final publishable video
```

V2.4 is an additive production-orchestration layer. It must not create a second Project model, Workflow engine, Job runtime or unrestricted computer-control Agent.

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

B7 must not begin until B6 proves a real single-video autonomous Mission end-to-end.

## V2.4 milestone evidence

```text
R0 Repository / PRD / Runtime Truth Sync    → COMPLETE / PR #66 / main eb261969676529669f0c5c8e267d773a67f40ecc / exact-main CI #769 PASS
B0 Production Mission Contracts + Store    → COMPLETE / PR #67 / accepted final PR head a38c453afb4c852ba3c9b4ac282767414010c584 / CI #778 four gates PASS after Browser flaky rerun
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
- references to the existing Agent Session / WorkflowRun / Durable Job ID schemas rather than duplicate runtime truth;
- persistence beneath `VIDEO_OS_DATA_ROOT/projects/<projectId>/production/missions`;
- atomic primary/backup writes;
- durable exclusive-lock protection;
- corrupt-primary backup recovery with lock-time primary recheck;
- repository-path identity validation;
- cross-instance atomic read-modify-write through `repository.mutate()`;
- Project revision capture on Mission creation without Project mutation;
- bounded Mission detail update and terminal-state behavior;
- idempotent cancellation.

B0 explicitly does **not** implement Planner, Asset Intelligence, Video Skills, QA, Mission Executor, Campaign production, Project Schema migration, dependency upgrades or engine/runtime changes.

B0 accepted exact-head cloud evidence on `a38c453afb4c852ba3c9b4ac282767414010c584`:

```text
CI #778 / run 33167629607
Ubuntu Verify:       PASS
Windows Verify:      PASS
Browser Smoke:       PASS on rerun
Windows Media Smoke: PASS
```

The first Browser Smoke attempt on CI #778 timed out in the pre-existing A5 browser acceptance while waiting 20 seconds for one WorkflowRun. The B0 product implementation had already passed Browser Smoke on CI #776 and #777, and `a38c453...` differed from the #777 head only by `PROJECT_STATUS.md`. Re-running the failed Browser job on the same exact `a38c453...` head passed without any product or test change, classifying the first failure as CI/Playwright flake rather than a B0 product defect.

No Local Codex gate was required because B0 did not modify browser/media/process/runtime behavior or the accepted shared filesystem implementation; its real Node filesystem concurrency behavior was exercised inside cloud unit gates on both Ubuntu and Windows.

## V2.3.1 immutable release truth

Release tag:

`v2.3.1`

Annotated tag object:

`b91d0c3adbaef09cd5c323481ec6bb04c516dd6e`

Dereferenced release commit:

`6e07d1dbdd0ec4d64d022f7c821e133ddf207637`

The tag object is a real annotated Git tag (`type: tag`), not a lightweight ref. Independent Git object verification confirmed that the tag object dereferences exactly to the release merge commit above.

Final release-merge CI:

- CI #765 / run `33158996259`
- Ubuntu Verify: PASS
- Windows Verify: PASS
- Browser Smoke: PASS
- Windows Media Smoke: PASS

Post-release truth merge:

- PR #65: `docs(v2.3.1): record immutable release truth`
- main docs commit: `f5a0c1c42f2611273b044a1fada215126e243bfa`
- post-release main CI #767 / run `33164178367`: PASS

Release-finalization PR:

- PR #64: `release(v2.3.1): finalize patch release`
- frozen PR head: `2255952ccc2a9a259a9cba64d01b2878bee63831`
- exact-head PR CI #764 / run `33158661973`: four gates PASS
- release merge commit: `6e07d1dbdd0ec4d64d022f7c821e133ddf207637`

`v2.3.0` and `v2.3.1` remain immutable and must never be moved or recreated.

## V2.3.1 accepted product boundary

Final H5 accepted product SHA:

`e5d449b3eb3b69fca23113c2fe75a905049578ea`

H5 acceptance/report merge on main:

`c78f60aa657fd603397c8e41a170971521d609be`

Evidence:

- exact-main CI #760 / run `33155438036`: Ubuntu / Windows / Browser / Windows Media PASS;
- full Windows H5 A–E on `e5d449b...`: PASS;
- H5 report-only CI #762: PASS;
- H5 PR #61 merged as `c78f60aa657fd603397c8e41a170971521d609be`.

Full H5 report:

`docs/acceptance/V2_3_1_H5_PATCH_ACCEPTANCE.md`

Release-finalization record:

`docs/acceptance/V2_3_1_RELEASE_FINALIZATION.md`

## V2.3.1 milestone evidence

```text
R0 Hardening Truth / PRD Sync              → COMPLETE / PR #53 / main 2aeb207c2c4d77ea872edd4c1dec5648a15f20f1
H0 Correctness / Resource Hygiene          → COMPLETE / PR #54 / main 692a97a8a7500e063675bbe9dfaeef9caf849e81
H1 Editing Commit Boundary                 → COMPLETE / PR #55 / main afcbef92c8f125251305af9f46b93cee071e7e13
H2 Playback / Timeline / Waveform          → COMPLETE / PR #56 / main 090b38196026c353ecc4452841fbcbc28cbeb5d2
H3a Runtime I/O Low-Risk                   → COMPLETE / PR #57 / main 2c519b62b42ecdd537d80e7b53576598a1398c76
H3b Startup PID Probes                     → COMPLETE / PR #58 / main e2fa211de9f6d6c73be3f0e0431a8fee39b51de8
H3c Operations Ledger                      → COMPLETE / PR #59 / main f714079a57e391b779849d92320fb5dfc113492a
H4 Local-First Security Boundary           → COMPLETE / PR #60 / main 4df173cdc40a330d677302ce5038157bf1c439e4
H5 Blocker: H264 export dimension truth    → COMPLETE / PR #62 / main c34a1d337ea5434f1a9da0c385cac19ffa89d722
H5 Blocker: Windows atomic persistence     → COMPLETE / PR #63 / main e5d449b3eb3b69fca23113c2fe75a905049578ea
H5 End-to-End Patch Acceptance             → COMPLETE / PR #61 / main c78f60aa657fd603397c8e41a170971521d609be
V2.3.1 Release Metadata / Final CI          → COMPLETE / PR #64 / main 6e07d1dbdd0ec4d64d022f7c821e133ddf207637
V2.3.1 Annotated Immutable Tag              → COMPLETE / v2.3.1 / tag object b91d0c3adbaef09cd5c323481ec6bb04c516dd6e
V2.3.1 Post-release Truth Sync              → COMPLETE / PR #65 / main f5a0c1c42f2611273b044a1fada215126e243bfa
```

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

V2.4 B0 does not change these values. Any later change requires an explicit scoped workstream and acceptance gate.

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

- Project JSON remains durable editing truth.
- Workflow durable state remains separate orchestration truth.
- Durable Job runtime remains concrete execution truth.
- Agent Session remains conversation/tool orchestration truth.
- Production Mission is a production objective/state machine, not Project truth.
- Agent/provider/tool execution has no direct Project or Workflow mutation authority.
- stale Project/Workflow/Mission-dependent mutation state fails closed.
- default local server boundary remains loopback-first.
- Windows durable atomic replacement keeps bounded transient-error retry semantics.
- V2.4 autonomy must be enforced through application-owned policies and bounded services, never generic shell/filesystem authority.

## B1 next-work boundary

Start **B1 Production Planner + Mission Step Graph** from the accepted B0 merge on `main`.

B1 may add:

- durable Production Plan contracts/repository;
- Mission step graph and dependency validation;
- Planner service that reads bounded Mission + Project context;
- explicit review checkpoints;
- Mission ↔ Plan references without copying Project/Workflow/Job truth;
- stale `baseProjectRevision` handling for planning inputs.

B1 must not prematurely implement Asset Intelligence, reusable Video Skills, Self-QA/repair, Mission Executor, unrestricted autonomy, campaign/batch production or a new Workflow/Job engine.

Local Codex is not required for B1 unless the implementation introduces or changes real browser/media/process/runtime behavior.
