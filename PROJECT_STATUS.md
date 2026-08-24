# Video OS Studio — Current Project Status

> This file is the current-state source of truth for GPT Web, local Codex, and other development agents. Historical PRs and validation reports remain evidence; they do not override this file.

## Current checkpoint

```yaml
product_version: 2.1.1
project_schema: 2.0.0
released_baseline: v2.1.1
release_status: COMPLETE
release_main_sha: 223b66799baf5b5faf1d1321a671d3fb5c6a0930
release_tag: v2.1.1
release_tag_sha: 223b66799baf5b5faf1d1321a671d3fb5c6a0930
v2_2_r0_main: 64c6ea3ece5770a2999a67dabec8d83837aa62d2
v2_2_w0_main: 9914b1e65d27a7d40e997295d94eeb5ce4c3deea
current_milestone: V2.2 WORKFLOW RUNTIME
v2_2_status: W1 WORKFLOW RUNTIME CORE ACTIVE
active_workstream: V2.2-W1 Workflow Runtime Core
active_branch: feature/v2.2-w1-workflow-runtime
active_pr: PENDING
local_validation_required: NO for W1
next_workstream_after_w1: W2 Existing Capability Stage Integration
future_milestone: V2.3 Real AI Director / AI Editing Agent
```

## Accepted delivery history

```text
V2.1.1 Engineering Hardening / Final Release  → COMPLETE
V2.1.1 tag v2.1.1                            → COMPLETE
V2.2 R0 Repository / Roadmap Sync             → PR #30 COMPLETE
V2.2 W0 Workflow Contract                     → PR #31 COMPLETE
V2.2 W1 Workflow Runtime Core                 → ACTIVE
```

W0 established the independent durable Workflow contract under `lib/workflows/*` and `VIDEO_OS_DATA_ROOT/workflows`. The existing Project `workflow` field remains the V2.1 Scenario Starter. Project Schema remains `2.0.0`.

## Active V2.2 documents

```text
docs/prd/Video_OS_Studio_V2_2_Workflow_Runtime_Master_PRD.md
docs/prd/Video_OS_Studio_V2_2_Development_Plan.md
```

## V2.2 product objective

> Connect existing Video OS capabilities into a durable, visible, reviewable and retryable production Workflow so a user can import a real video and generate an editable first draft without manually triggering every subsystem.

Target product flow:

```text
Create Project
→ Import source video
→ Select Scenario
→ Generate First Draft
→ Media / Transcript / Script / Scenes / Captions / Visual Plan
→ Human Review
→ Motion / B-roll / Audio / Timeline Assembly
→ Preview
→ Human Review
→ Final Render
```

A production Real AI Provider / multi-turn AI Editing Agent is not V2.2 scope and remains V2.3.

## V2.2 delivery sequence

```text
R0 Repository / Roadmap Sync              → PR #30 COMPLETE
W0 Workflow Contract                      → PR #31 COMPLETE
W1 Workflow Runtime Core                  → ACTIVE
W2 Existing Capability Stage Integration  → NEXT
W3 Human Review + Invalidation            → FUTURE
W4 Workflow UI                            → FUTURE
W5 Failure / Retry / Restart Hardening    → FUTURE
W6 End-to-End Release Acceptance          → FUTURE
V2.2 Release Finalization                 → FUTURE
```

## W1 scope contract

W1 may implement only cloud-safe orchestration/runtime behavior on top of the accepted W0 contract:

```text
WorkflowDefinitionRegistry
WorkflowStageRegistry
WorkflowService
WorkflowRunner
Stage dependency readiness
start / pause / resume / cancel
stage retry
human checkpoint wait / approve
activity log
Job-runtime port + durable Job reconciliation
restart reconciliation for persisted Workflow state
unit/integration tests using deterministic fake Stage/Job implementations
```

W1 must **not** implement:

```text
real FFmpeg/video-use/HyperFrames/Remotion stages
real video production workflow definitions
Workflow API/UI
Real AI Provider / Agent
Project Schema changes
replacement Durable Job runtime
```

Pause semantics: do not start a new Stage while paused; an already-running Stage/Job may reach terminal state. Cancel requests cancellation of the active attached Durable Job where present.

Recovery semantics: a persisted running job-backed Stage is reconciled from Durable Job truth. A persisted running non-job Stage with no durable external truth is marked interrupted rather than guessed successful.

W1 normally requires no Local Codex gate. Real Windows/process/media/restart evidence is reserved for W2/W4/W5/W6 according to the active development plan.

## Local validation policy

```text
R0: NO
W0: NO
W1: NO (cloud-safe runtime contract only)
W2: YES for FFmpeg/video-use/HyperFrames/Remotion/real media
W3: conditional; otherwise covered with W4/W5
W4: YES for real Windows browser/media flow
W5: YES and release-blocking
W6: YES and release-blocking
```

## Development ownership

```text
GPT Web + GitHub
→ PRD / architecture / cloud-safe code / tests / branch / PR / CI / review / merge / status

Local Codex on Windows
→ exact-SHA real browser/media/engine/restart acceptance + in-scope fixes + evidence
```

GitHub is the single code source of truth. Local Codex validates only the exact branch/SHA handed off by GPT Web and pushes any in-scope fixes back to that same branch.

## Accepted engine / schema invariants

```text
Project Schema:       2.0.0
remotion:             4.0.513
@remotion/player:     4.0.513
@remotion/cli:        4.0.513
hyperframes:          0.8.10
@playwright/test:     1.62.1
```

Always preserve:

```text
Source Media != Project Canvas != Export Profile
Project != Workflow != Job
```

And:

1. Project JSON is the durable Project source of truth.
2. Workflow state is independent orchestration state under `VIDEO_OS_DATA_ROOT/workflows`.
3. Durable Job state represents concrete execution work; W1 must not create a second Job system.
4. Canonical internal timeline timing is frame-based.
5. Durable Project edits use validated Commands / Transactions / bounded services.
6. Workflow code does not directly hand-edit runtime `project.json`.
7. UI/Workflow modules do not spawn FFmpeg, Remotion, HyperFrames or video-use directly.
8. Remotion remains the master composition/render engine.
9. HyperFrames remains the deterministic complex-motion asset engine.
10. video-use and FFmpeg/ffprobe remain behind adapters/services.
11. Project Schema and engine pins are not changed incidentally.
12. `REUSE > MODIFY > CREATE`.

## PR #18 disposition

PR #18 is closed/unmerged and retained only as future V2.3 AI Agent architecture input. Do not branch V2.2 implementation from it.

## Next allowed phase

While W1 is active:

- finish Workflow Runtime Core and deterministic cloud tests only;
- no real engine Stage integration;
- no API/UI;
- no Real AI Provider;
- no Project Schema or engine-pin changes.

After W1 is reviewed, CI-clean and merged, create W2 from the new accepted `main`. W2 is the first workstream that requires an exact-SHA Local Codex handoff for real Windows/media/engine validation.

## Read order for agents

1. resolve live GitHub `main`, active branch/PR and CI state;
2. `PROJECT_STATUS.md`;
3. `AGENTS.md`;
4. `SYSTEM.md`;
5. `docs/prd/Video_OS_Studio_V2_2_Workflow_Runtime_Master_PRD.md`;
6. `docs/prd/Video_OS_Studio_V2_2_Development_Plan.md`;
7. active local validation contract only when the workstream requires local evidence.

If live GitHub state conflicts with this file, stop and resolve the conflict rather than guessing.
