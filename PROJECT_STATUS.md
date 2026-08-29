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
active_stage: B7 CAMPAIGN / BATCH PRODUCTION — LOCAL REAL-MEDIA DEFECT REPAIR
active_branch: feature/v2.4-b7-campaign-production / PR #79
accepted_b6_main: 37602f0fd3cb9558fb51259b23936521d216098b
b7_last_cloud_candidate: 8bd1dab21206c745531cfb53b65b1e8c529f7393
b7_last_cloud_ci: CI #956 / run 33263067354 / PASS
b7_local_gate: FAIL — real user media exposed Remotion frame extraction failure
local_action_required: NONE — GPT Web development reopened; do not rerun Codex yet
next_action: FIX REAL-MEDIA RENDER PATH → REGRESSION TEST → FULL CLOUD CI → FREEZE NEW SHA → LOCAL CODEX VERIFY ONLY
v2_4_status: B7 DEVELOPMENT REOPENED
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
B7  Campaign / Batch Production             → DEVELOPMENT REOPENED / PR #79 / LOCAL REAL-MEDIA GATE FAILED
```

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

## B7 product boundary

B7 is a Campaign control plane above accepted isolated Production Missions; it is not a second editor or second Project truth.

Implemented on PR #79:

- durable Campaign aggregate outside individual `project.json` files;
- one mutable Project per Campaign Mission entry;
- logical shared Brand / Asset / Policy / Skill / Export Template references only;
- bounded Campaign Mission concurrency (`1..8`, default `2`);
- resource limiting for heavy render work;
- per-Mission cancel and failure isolation;
- retry-failed semantics that do not rerun successful siblings;
- duplicate enqueue and skipped-success paths are durable no-ops;
- waiting-review / blocked resume is explicit and never auto-approves underlying review truth;
- archive does not implicitly delete Projects or Missions;
- Campaign Dashboard reconstructs from durable Campaign + Mission/Project truth;
- Campaign execution bridges into the accepted protected `ProductionExecutionService` path;
- no shared mutable Project truth between outputs.

## B7 cloud candidate history

Exact SHA `8bd1dab21206c745531cfb53b65b1e8c529f7393` passed CI #956 / run `33263067354` across six jobs:

```text
ubuntu-verify                    PASS
windows-verify                   PASS
browser-smoke                    PASS
windows-media-smoke              PASS
windows-b6-core-acceptance       PASS
windows-b7-campaign-acceptance   PASS
```

Cloud B7 used two generated 4.2-second H.264/AAC fixtures and proved configured Mission concurrency `2`, observed Mission concurrency `2`, heavy render resource limit `1`, two distinct Projects/Jobs/MP4s, durable reload, and no `.props.json` / `.hf-work` residue.

That SHA is no longer an acceptance candidate because the mandatory Local Windows real-user-media gate failed.

## B7 Local Windows real-user-media failure

Local Codex ran VERIFY ONLY on exact SHA `8bd1dab21206c745531cfb53b65b1e8c529f7393` in a detached clean worktree with two distinct real user MP4s:

```text
Source A: H.264/AAC, 720x1280, 30 fps, 583.354921 s, 89,591,973 bytes
Source B: H.264/AAC, 1024x576, 30 fps, 65.921451 s, 4,274,293 bytes
```

Mission 2 rendered successfully to a real H.264/AAC 640x360 MP4. Mission 1 failed twice inside the Remotion compositor and the Mission then blocked after exhausting the declared render budget.

Underlying render error:

```text
Could not extract frame from compositor:
No frame found at position 3635200 for source
The proxy returned HTTP 500 at time=2.3666666666666667.
remotion-render exited with code 1.
```

The final `PRODUCTION_EXECUTION_BUDGET_EXCEEDED` error is the bounded executor's consequence of two render failures; it is not the decoder root cause.

The acceptance worktree remained source-clean and no new persistent Node/FFmpeg orphan was confirmed. The user's primary repository HEAD and existing `next-env.d.ts` content stayed unchanged, but a new untracked `.video_agent/plugin_root` appeared during the verification session. Its source was not proven to be Video OS product code; the next local acceptance must prevent verifier/plugin state from touching the primary repository and must require an exact before/after status match.

## B7 repair boundary

GPT Web + GitHub own the repair. Local Codex remains VERIFY ONLY.

The repair must:

- address the real-media Remotion frame extraction path rather than increasing Mission retry/render budgets;
- keep Project Schema `2.0.0` unchanged;
- preserve B6 accepted single-video behavior;
- add a deterministic regression capable of exercising problematic timestamp/frame-gap media characteristics;
- rerun the complete cloud CI, including B6 and B7 Windows real-engine gates;
- freeze a new exact SHA only after all cloud gates pass;
- rerun Local Windows B7 with two real user videos before PR #79 can leave Draft or merge.

## Package and dependency truth before repair

```text
package.json version:                 2.3.1
package-lock.json top-level version:  2.3.1
packages[""].version:                 2.3.1
Project Schema:                       2.0.0
Node:                                 24.x
remotion:                             4.0.513
@remotion/player:                     4.0.513
@remotion/cli:                        4.0.513
hyperframes:                          0.8.10
@playwright/test:                     1.62.1
prettier:                             3.8.1
```

Any new Remotion-family package used by the repair must be pinned to the existing `4.0.513` family and accepted by a fresh lockfile/CI cycle.

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
- stale mutation-dependent state fails closed;
- Project mutation must pass accepted application-owned mutation services and revision guards;
- protected/manual edits must not be silently overwritten;
- Campaign retry/cancel/archive operations must not silently destroy sibling output truth;
- no generic shell/filesystem/network/process/computer authority is introduced by B7 or its repair.
