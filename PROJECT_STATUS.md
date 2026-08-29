# Video OS Studio — Current Project Status

> Current-state source of truth for GPT Web, Local Codex, and other development agents. Historical PRs, commits, CI runs, and acceptance reports remain immutable evidence. GitHub is the code/status source of truth.

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
active_stage: B7 CAMPAIGN / BATCH PRODUCTION — CLOUD ACCEPTANCE PASS / LOCAL WINDOWS FINAL GATE NEXT
active_branch: feature/v2.4-b7-campaign-production / PR #79
accepted_b6_main: 37602f0fd3cb9558fb51259b23936521d216098b
b7_last_product_head: f7799cdfa1459f6d1aea613d69faab53059f3c1e
b7_cloud_ci: CI #955 / run 33259603403 / PASS
local_action_required: PENDING — only after the final post-status exact HEAD is green and frozen
next_action: FINAL EXACT-HEAD CI → FREEZE SHA → LOCAL CODEX VERIFY ONLY REAL 2-VIDEO BATCH → UPDATE PR #79 → MERGE → EXACT-MAIN CI
v2_4_status: B7 ACCEPTANCE ACTIVE
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

B7 began only after B6 merged to `main` and its exact-main CI passed.

## V2.4 milestone evidence

```text
R0  Repository / PRD / Runtime Truth Sync    → COMPLETE / PR #66 / exact-main CI #769 PASS
B0  Production Mission Contracts + Store    → COMPLETE / PR #67 / exact-main CI #781 PASS
B1  Production Planner + Mission Step Graph → COMPLETE / PR #68 / exact-main CI #792 PASS
B2  Asset Intelligence + Semantic Retrieval → COMPLETE / PR #69 / exact-main CI #825 PASS
B3  Reusable Video Skills                   → COMPLETE / PR #70 / main 62ba5ab13f49f1d920bfce6626c3ea2293128cc3 / CI #835 PASS
B4  Self-QA + Repair Proposals              → COMPLETE / PR #71 / main 695e49446fca7025d442a147737c126231ddf7fe / CI #840 PASS
B5a Mission Executor Core                   → COMPLETE / PR #73 / main b222f210535e96dfa5b0f36cdb04128f271cefd7 / CI #845 PASS
B5b Controlled Autonomy + Protected Edits   → COMPLETE / PR #75 / main 078f06992f9e474f806ac5869e7a5d9951ec17d0 / CI #856 PASS
B5c Production Workspace / Mission UI       → COMPLETE / PR #77 / main 3edf0ef14a92b8307e36b8c21dcd9fc6d634181b / CI #894 PASS
B6  Autonomous Real Video Acceptance        → COMPLETE / PR #78 / main 37602f0fd3cb9558fb51259b23936521d216098b / CI #929 PASS
B7  Campaign / Batch Production             → CLOUD ACCEPTANCE PASS / PR #79 / LOCAL REAL-BATCH GATE PENDING
```

PR #76 was the B5c Draft container; PR #77 replaced it without changing the accepted B5c product head and was merged. PR #78 B6 passed both exact-SHA cloud acceptance and isolated Local Windows VERIFY ONLY acceptance before merge.

## B6 accepted core

Accepted main: `37602f0fd3cb9558fb51259b23936521d216098b` via PR #78. Exact-main CI #929 / run `33252826396` passed after the frozen B6 product SHA had already passed mandatory Local Windows VERIFY ONLY acceptance with a real user MP4.

B6 proves the bounded autonomous single-video chain:

```text
real Project/media
→ durable Mission + Plan
→ Agent proposal
→ protected Project mutation
→ Workflow
→ Durable Job
→ real Remotion render
→ QA
→ one typed bounded repair
→ rerender
→ final QA pass
```

B6 preserves stable operation/Job identities, revision-safe recovery, stale fail-closed behavior, bounded repair loops, protected/manual edit semantics, and no generic shell/filesystem/network/computer authority.

## B7 current product boundary

B7 is a Campaign control plane above accepted isolated Production Missions; it is not a second editor or second Project truth.

Implemented on PR #79:

- durable Campaign aggregate outside individual `project.json` files;
- one mutable Project per Campaign Mission entry;
- logical shared Brand / Asset / Policy / Skill / Export Template references only;
- bounded Campaign Mission concurrency (`1..8`, default `2`);
- resource limiting for heavy render work;
- per-Mission cancel and failure isolation;
- explicit retry-failed semantics that do not rerun successful siblings;
- duplicate enqueue and skipped-success paths are durable no-ops;
- waiting-review / blocked resume is explicit and never auto-approves underlying review truth;
- Campaign archive does not implicitly delete Projects or Missions;
- Campaign Dashboard joins durable Campaign state with current Mission/Project Workspace truth;
- dashboard reload/restart reconstructs from durable state rather than browser memory;
- Campaign execution bridges into the accepted protected `ProductionExecutionService` path;
- read-only Campaign/Dashboard runtime does not require AI provider initialization; execution provider setup is lazy;
- no shared mutable Project truth between outputs.

## B7 deterministic/cloud acceptance

Last product head before this governance sync:

`f7799cdfa1459f6d1aea613d69faab53059f3c1e`

CI #955 / run `33259603403` passed all six jobs:

```text
ubuntu-verify                    PASS — format / lint / typecheck / unit / build
windows-verify                   PASS — format / lint / typecheck / unit
browser-smoke                    PASS — durable Campaign Dashboard browser coverage
windows-media-smoke              PASS — accepted real-media/B4 regression
windows-b6-core-acceptance       PASS — B6 single-video real-engine regression remains intact
windows-b7-campaign-acceptance   PASS — exact-SHA Windows two-video real-render batch gate
```

B7 cloud/deterministic coverage proves:

- N Mission/Project isolation;
- one Mission failure does not corrupt successful siblings;
- one Mission cancel does not kill another;
- configured concurrency is honored;
- duplicate enqueue/idempotency;
- retry-failed reruns only failed Missions;
- repository/runtime reconstruction preserves Campaign truth;
- Dashboard reload uses durable state;
- archive preserves Project/Mission truth;
- API action allow-listing;
- B6 regression remains green.

Windows B7 CI evidence at `f7799cdfa1459f6d1aea613d69faab53059f3c1e`:

```text
Campaign status: completed
Campaign concurrency configured: 2
max Mission concurrency observed: 2
heavy render resource limit observed: 1
source fixtures: two distinct H.264/AAC 640x360 videos, 4.2 s each
render outputs: two distinct real Remotion MP4 Jobs
output dimensions: 640x360
output fps: 30
output duration: 4.245333 s each
output audio: present
Durable reload status: completed
Project revisions: isolated at revision 2 per output
.props.json residue: none
.hf-work residue: none
```

The CI sources are encoded fixtures, so this evidence does **not** replace the Development Plan's Local Codex real-video batch acceptance when B7 claims actual local resource/process isolation.

## B7 remaining mandatory gate

After this status-sync commit receives a completely green exact-head CI, freeze that exact SHA and run Local Codex in VERIFY ONLY mode using a separate clean detached Git worktree.

Required local case:

```text
Windows
Node 24.x
FFmpeg / ffprobe
Chrome
exact frozen SHA
2 distinct real user MOV/MP4 videos, each >= 3 seconds
npm ci
npm run test:windows-b7
```

The local run must prove:

- both real user videos import independently;
- two isolated Projects/Missions exist;
- Campaign Mission concurrency reaches the configured bound where allowed;
- render resource limiting remains bounded;
- two distinct real Remotion outputs are produced;
- outputs are valid H.264/AAC MP4s with expected dimensions/fps/duration;
- durable Campaign/Dashboard state survives repository reconstruction;
- no cross-Project mutation/state leakage;
- no duplicate Jobs/mutation identities;
- no `.props.json`, `.hf-work`, stale lock, temporary acceptance residue or new orphan engine/process;
- acceptance worktree stays clean;
- user's primary worktree and existing local changes are untouched.

Local Codex must not edit source, format source, fix failures, stash/reset/restore user work, commit, push, merge, move the SHA, or weaken acceptance. Any genuine code/runtime defect returns to GPT Web + GitHub for repair and a new frozen SHA.

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

No B7 change alters these pins or Project Schema.

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
Campaign != Project
Campaign != Mission
REUSE > MODIFY > CREATE
```

- `project.json` remains the editing truth for each output;
- stale Project/Workflow/Mission-dependent mutation state fails closed;
- default server security remains loopback-first;
- Project mutation must pass accepted application-owned mutation services and revision guards;
- protected/manual edits must not be silently overwritten;
- Campaign scheduling never grants generic shell/filesystem/network/process/computer authority;
- Campaign retry/cancel/archive operations must not silently destroy sibling output truth.
