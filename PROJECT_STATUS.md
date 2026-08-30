# Video OS Studio — Current Project Status

> Current-state source of truth for GPT Web, Local Codex, and other development agents. Historical PRs, commits, CI runs, local acceptance reports, released tags, and tag objects remain immutable evidence. GitHub is the code/status source of truth.

## Current checkpoint

```yaml
released_product_version: 2.4.0
released_tag: v2.4.0
released_commit: da22a5415cbf8ad2a9ce93b912b41b787b29a9b1
released_tag_object_sha: 96ebdd67e2412ed4d25be36cc6120f1bba8a8734
project_schema: 2.0.0

package_json_version: 2.4.0
package_lock_version: 2.4.0

active_development_workstream: NONE
active_stage: V2.4 RELEASE COMPLETE
active_branch: docs/v2.4.0-release-truth
accepted_b7_main: fe883ca5581d721e996e833d43d7b7f88faebc41
release_pr: PR #80
release_pr_frozen_head: c4a395f9d3059dab7d2b6794df57fce292e8ea6d
release_pr_ci: CI #970 / run 33291797863 / PASS
release_main_ci: CI #971 / run 33292090068 / PASS after one browser-only timing-flake rerun
release_tag_creation: run 33292747452 / PASS
local_action_required: NONE
next_action: POST-RELEASE TRUTH-SYNC PR CI → MERGE; then begin no new product workstream until separately planned/approved
v2_4_status: RELEASED
```

## Immutable release truth

Video OS Studio V2.4.0 is released at the annotated tag `v2.4.0`.

```text
release commit:      da22a5415cbf8ad2a9ce93b912b41b787b29a9b1
annotated tag:       v2.4.0
tag object SHA:      96ebdd67e2412ed4d25be36cc6120f1bba8a8734
tag target type:     commit
dereferenced target: da22a5415cbf8ad2a9ce93b912b41b787b29a9b1
tag message:         Video OS Studio v2.4.0
```

Independent GitHub Git Data verification proved `refs/tags/v2.4.0` points to an object of type `tag`, not directly to a commit, and that tag object targets the exact release commit above.

Previous immutable release tags `v2.3.0` and `v2.3.1` remain unchanged and must never be moved or recreated. `v2.4.0` is now equally immutable.

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
V2.4.0 Release
```

## V2.4 milestone evidence

```text
R0   COMPLETE / PR #66 / exact-main CI #769 PASS
B0   COMPLETE / PR #67 / exact-main CI #781 PASS
B1   COMPLETE / PR #68 / exact-main CI #792 PASS
B2   COMPLETE / PR #69 / exact-main CI #825 PASS
B3   COMPLETE / PR #70 / exact-main CI #835 PASS
B4   COMPLETE / PR #71 / exact-main CI #840 PASS
B5a  COMPLETE / PR #73 / exact-main CI #845 PASS
B5b  COMPLETE / PR #75 / exact-main CI #856 PASS
B5c  COMPLETE / PR #77 / exact-main CI #894 PASS
B6   COMPLETE / PR #78 / main 37602f0fd3cb9558fb51259b23936521d216098b / CI #929 PASS
B7   COMPLETE / PR #79 / main fe883ca5581d721e996e833d43d7b7f88faebc41 / CI #969 PASS / Local Windows real-user-media PASS
V2.4.0 RELEASE / PR #80 / release commit da22a5415cbf8ad2a9ce93b912b41b787b29a9b1 / CI #971 PASS / annotated tag verified
```

## Release-finalization evidence

Accepted B7 product main before release metadata:

`fe883ca5581d721e996e833d43d7b7f88faebc41`

Release metadata branch:

`release/v2.4.0-finalization`

The one-shot version synchronization changed only:

```text
package.json.version:                    2.3.1 → 2.4.0
package-lock.json.version:               2.3.1 → 2.4.0
package-lock.json.packages[""].version:  2.3.1 → 2.4.0
```

Version-sync run `33291616642` passed structural guards proving no dependency, devDependency, engine, package-tree or lock-integrity drift.

PR #80 frozen exact head:

`c4a395f9d3059dab7d2b6794df57fce292e8ea6d`

CI #970 / run `33291797863` passed all six release gates on that exact head:

```text
ubuntu-verify                    PASS
windows-verify                   PASS
browser-smoke                    PASS
windows-media-smoke              PASS
windows-b6-core-acceptance       PASS
windows-b7-campaign-acceptance   PASS
```

PR #80 merged with expected-head protection as:

`da22a5415cbf8ad2a9ce93b912b41b787b29a9b1`

The release PR head and resulting merge commit have the identical Git tree:

`4c034eb056ea75f186ba388fa31d0a9108c5db96`

Resulting main CI #971 / run `33292090068` initially had one Browser Smoke timing failure in the legacy H1 editing-boundary test: an Undo-state poll remained at `system-ui H1 Draft` rather than `system-ui` for the 10-second wait. The same Git tree had passed Browser Smoke in CI #970; all other #971 gates passed. A Browser-only rerun on the unchanged exact main SHA passed the full Playwright suite, and workflow attempt 2 completed `SUCCESS`. No product code was changed for the rerun.

Tag creation run `33292747452` then created `v2.4.0` only after rechecking that `origin/main` still exactly equaled the release commit and that the tag did not already exist. The workflow verified the local/remote annotated object and dereference before succeeding.

## Mandatory B7 real-user-media acceptance

Frozen B7 product SHA:

`e053cbd953d58c61b4df98bec9e35d60faf1bbaf`

Local Windows VERIFY ONLY passed using two distinct real user MP4s, including the exact long source that exposed the prior Remotion frame-extraction failure.

```text
Source A input:  H.264/AAC / 720x1280 / 30 fps / 583.354921 s / 89,591,973 bytes
Source A output: H.264/AAC / 640x360  / 30 fps / 583.424 s    / 80,167,848 bytes

Source B input:  H.264/AAC / 1024x576 / 30 fps / 65.921451 s / 4,274,293 bytes
Source B output: H.264/AAC / 640x360  / 30 fps / 65.984 s    / 14,171,415 bytes

configured Mission concurrency: 2
observed Mission concurrency:   2
observed heavy-render limit:    1
durable Campaign reload:        completed
cross-Project mutable leakage:  NO
.props.json residue:            NO
.hf-work residue:               NO
stale lock/tmp residue:         NO
attributable orphan process:    NO
primary local worktree:         preserved exactly
```

## Accepted V2.4 product capabilities

V2.4 adds a bounded production-orchestration layer above the Project / Workflow / Durable Job / Agent foundations:

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

B7 adds an isolated Campaign control plane:

```text
Campaign
  shared logical references / policy
  ├─ Mission A → Project A → Workflow / Jobs
  ├─ Mission B → Project B → Workflow / Jobs
  └─ Mission C → Project C → Workflow / Jobs
```

Accepted boundaries include:

- Mission, Plan, QA, Skill/Asset Intelligence and Campaign truth outside `project.json`;
- one mutable Project truth per output;
- no second Workflow, Durable Job, Agent Session or master renderer;
- application-owned revision/risk/idempotency/edit-protection boundaries;
- bounded Campaign concurrency and heavy-render resources;
- sibling failure/cancel isolation and retry-failed semantics;
- no generic Agent shell/filesystem/network/process/computer authority;
- Remotion remains the master renderer;
- ordinary Project video/B-roll defaults to frame-perfect OffthreadVideo, with one narrow same-Job HTML5 compatibility rerun only for the exact known Offthread `No frame found at position` extraction failure;
- timeout/cancel/unrelated render errors are not reclassified;
- transparent HyperFrames video remains on OffthreadVideo.

## Frozen technical invariants

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
- Campaign operations must not silently destroy sibling output truth;
- no generic shell/filesystem/network/process/computer authority is introduced by V2.4;
- released tags `v2.3.0`, `v2.3.1`, and `v2.4.0` are immutable and must never be moved or recreated.
