# Video OS Studio — Current Project Status

> Current-state source of truth for GPT Web, Local Codex, and other development agents. Historical PRs, commits, CI runs, local acceptance reports, released tags, and tag objects remain immutable evidence. GitHub is the code/status source of truth.

## Current checkpoint

```yaml
released_product_version: 2.3.1
released_tag: v2.3.1
released_commit: 6e07d1dbdd0ec4d64d022f7c821e133ddf207637
released_tag_object_sha: b91d0c3adbaef09cd5c323481ec6bb04c516dd6e

project_schema: 2.0.0

release_candidate_version: 2.4.0
package_json_version: 2.4.0
package_lock_version: 2.4.0
release_candidate_tag: v2.4.0

active_development_workstream: V2.4 AUTONOMOUS PRODUCTION AGENT
active_stage: RELEASE FINALIZATION
active_branch: release/v2.4.0-finalization
accepted_b7_main: fe883ca5581d721e996e833d43d7b7f88faebc41
accepted_b7_pr: PR #79
accepted_b7_main_ci: CI #969 / run 33291257927 / PASS
accepted_b7_local_gate: PASS — two distinct real user videos including the previously failing 583.354921 s source
release_version_sync: run 33291616642 / PASS
release_tag_status: PENDING — do not claim v2.4.0 released until annotated tag and independent dereference verification complete
local_action_required: NONE — release-finalization changes are metadata/docs only
next_action: RELEASE PR EXACT-HEAD CI → DIFF AUDIT → MERGE → EXACT-MAIN CI → CREATE ANNOTATED v2.4.0 TAG → VERIFY TAG OBJECT + DEREFERENCE → POST-RELEASE TRUTH SYNC
v2_4_status: RELEASE FINALIZATION IN PROGRESS
```

## V2.4 authoritative docs and sequence

```text
docs/prd/Video_OS_Studio_V2_4_Autonomous_Production_Agent_Master_PRD.md
docs/prd/Video_OS_Studio_V2_4_Development_Plan.md
docs/acceptance/V2_4_RELEASE_FINALIZATION.md
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
Release Finalization
```

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
B7  Campaign / Batch Production             → COMPLETE / PR #79 / main fe883ca5581d721e996e833d43d7b7f88faebc41 / CI #969 PASS / Local Windows real-user-media PASS
Release Finalization                        → IN PROGRESS / release/v2.4.0-finalization
```

## B7 accepted final product boundary

Accepted product main:

`fe883ca5581d721e996e833d43d7b7f88faebc41`

PR #79 merged only after:

- frozen product SHA `e053cbd953d58c61b4df98bec9e35d60faf1bbaf` passed CI #968 / run `33265665932` across Ubuntu, Windows, Browser, Windows Media, B6 real-engine and B7 real-batch gates;
- mandatory Local Windows VERIFY ONLY passed on the same exact product SHA with two distinct real user MP4s;
- the exact 583.354921-second H.264/AAC source that failed the previous candidate rendered successfully to a valid 583.424-second H.264/AAC 640x360 30 fps output;
- the second 65.921451-second source rendered successfully to a valid 65.984-second H.264/AAC 640x360 30 fps output;
- configured Mission concurrency `2`, observed Mission concurrency `2`, heavy render resource limit `1`;
- distinct Projects, Jobs and output paths;
- durable Campaign reload `completed`;
- no cross-Project mutable truth leakage;
- no `.props.json`, `.hf-work`, stale lock/tmp/temp residue or attributable orphan runtime process;
- primary local worktree HEAD/status preserved exactly.

Resulting exact-main CI #969 / run `33291257927` passed all six jobs on `fe883ca...` at attempt 1.

## Accepted V2.4 product capabilities

V2.4 adds a bounded production-orchestration layer above the immutable Project / Workflow / Durable Job / Agent foundations:

```text
Production Goal
→ Production Mission
→ Production Plan / Step Graph
→ Asset Intelligence + reusable Skills
→ controlled Agent execution
→ protected Project mutation
→ existing Workflow / Durable Jobs
→ real Remotion render
→ Self-QA
→ bounded repair
→ final review/evidence
```

B7 adds the batch control plane:

```text
Campaign
  shared logical references / policy
  ├─ Mission A → Project A → Workflow / Jobs
  ├─ Mission B → Project B → Workflow / Jobs
  └─ Mission C → Project C → Workflow / Jobs
```

Accepted boundaries:

- Mission, Plan, QA, Skill/Asset intelligence and Campaign truth remain outside `project.json`;
- one mutable Project truth per output;
- no second Workflow, Durable Job, Agent Session or master renderer;
- application-owned revision/risk/idempotency/edit-protection boundaries remain authoritative;
- Campaign failure/cancel/retry/archive cannot silently destroy sibling Project truth;
- no generic Agent shell/filesystem/network/process/computer authority;
- Remotion remains master renderer;
- ordinary video uses frame-perfect OffthreadVideo by default, with one narrow in-Job HTML5 compatibility retry only for the exact known Offthread `No frame found at position` extraction failure;
- transparent HyperFrames video remains on OffthreadVideo.

## Release metadata synchronization

Release branch:

`release/v2.4.0-finalization`

Base accepted product main:

`fe883ca5581d721e996e833d43d7b7f88faebc41`

One-shot GitHub Actions version synchronization:

```text
workflow run: 33291616642 / PASS
package.json.version:                    2.3.1 → 2.4.0
package-lock.json.version:               2.3.1 → 2.4.0
package-lock.json.packages[""].version:  2.3.1 → 2.4.0
```

The workflow structurally compared package/lock JSON before and after the npm version command and failed closed unless those three version fields were the only semantic changes. The temporary workflow removed itself and is absent from the final release diff.

Frozen pins remain:

```text
Project Schema:       2.0.0
Node:                 24.x
remotion:             4.0.513
@remotion/player:     4.0.513
@remotion/cli:        4.0.513
hyperframes:          0.8.10
@playwright/test:     1.62.1
prettier:             3.8.1
```

## Release boundary

Until the annotated `v2.4.0` tag is independently verified:

- immutable released product remains `v2.3.1`;
- V2.4.0 is a release candidate only;
- do not describe the release candidate branch or merge commit as an immutable release;
- never move/recreate `v2.3.0` or `v2.3.1`;
- do not create/move `v2.4.0` before the release PR exact-head CI and resulting exact-main CI are green;
- after tag creation, independently verify Git object type `tag`, tag target type `commit`, and exact dereferenced release commit before marking V2.4 RELEASED.

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
- no generic shell/filesystem/network/process/computer authority is introduced by V2.4.
