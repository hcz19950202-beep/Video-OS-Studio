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
v2_2_baseline_main: 64c6ea3ece5770a2999a67dabec8d83837aa62d2
current_milestone: V2.2 WORKFLOW RUNTIME
v2_2_status: W0 WORKFLOW CONTRACT ACTIVE
active_workstream: V2.2-W0 Workflow Contract
active_branch: feature/v2.2-w0-workflow-contract
active_pr: PENDING
local_validation_required: NO for W0
next_workstream_after_w0: W1 Workflow Runtime Core
future_milestone: V2.3 Real AI Director / AI Editing Agent
```

## V2.1.1 release truth

Video OS Studio **V2.1.1 is released and accepted**.

The release tag `v2.1.1` resolves to:

```text
223b66799baf5b5faf1d1321a671d3fb5c6a0930
```

V2.1.1 Final Release Acceptance established:

```text
REPOSITORY TRUTH: PASS
DATA CORRECTNESS: PASS
TRANSACTION SAFETY: PASS
ENGINE RUNTIME: PASS
DURABLE JOBS: PASS
STREAMING MEDIA: PASS
DATA HARDENING: PASS
AUTOMATED ACCEPTANCE: PASS
ZERO KNOWN SILENT DATA LOSS: PASS
ZERO UNBOUNDED RENDER CONCURRENCY: PASS
ZERO DEFAULT RUNTIME REMOTION DOWNLOAD: PASS
ZERO FULL-FILE RANGE BUFFERING: PASS
UBUNTU CI: PASS
WINDOWS CI: PASS
LOCAL WINDOWS MEDIA/ENGINE SMOKE: PASS
RESTART RECOVERY: PASS
V2.1 REGRESSION: PASS
```

Historical authority:

- `docs/prd/Video_OS_Studio_V2_1_1_Engineering_Hardening_Master_PRD.md`
- `docs/validation/LOCAL_VALIDATION_V2_1_1_FINAL_RELEASE.md`
- accepted H0–H7 validation reports
- PR #27 final release acceptance
- PR #28 release finalization
- tag `v2.1.1`

## V2.2 product decision

V2.2 is the active milestone.

The objective is:

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

## Active V2.2 documents

```text
docs/prd/Video_OS_Studio_V2_2_Workflow_Runtime_Master_PRD.md
docs/prd/Video_OS_Studio_V2_2_Development_Plan.md
```

## V2.2 delivery sequence

```text
R0 Repository / Roadmap Sync              → PR #30 COMPLETE
W0 Workflow Contract                      → ACTIVE
W1 Workflow Runtime Core                  → NEXT
W2 Existing Capability Stage Integration  → FUTURE
W3 Human Review + Invalidation            → FUTURE
W4 Workflow UI                            → FUTURE
W5 Failure / Retry / Restart Hardening    → FUTURE
W6 End-to-End Release Acceptance          → FUTURE
V2.2 Release Finalization                 → FUTURE
```

## W0 scope contract

W0 establishes only the durable Workflow domain contract:

```text
WorkflowDefinition / versioning
WorkflowRun
WorkflowStageDefinition / Execution
WorkflowCheckpoint
WorkflowArtifactReference
WorkflowError
legal run/stage transitions
dependency integrity validation
independent workflow persistence under VIDEO_OS_DATA_ROOT/workflows
```

Important repository compatibility decision:

- existing `schemas/workflow.ts` remains the V2.1 Scenario Starter stored in Project Schema `2.0.0`;
- V2.2 Workflow Runtime state is separate and must not repurpose the Project `workflow` field;
- new WorkflowRun persistence lives outside Project JSON;
- no scheduler, Job orchestration, API, UI, engine integration or real media belongs in W0.

W0 does **not** require local Codex validation. Cloud unit/type/lint/build/CI evidence is sufficient.

## Development ownership

```text
GPT Web + GitHub
→ PRD / architecture / cloud-safe code / tests / branch / PR / CI / review / merge / status

Local Codex on Windows
→ exact-SHA real browser/media/engine/restart acceptance + in-scope fixes + evidence
```

Local Codex is intentionally not activated for W0.

## Local validation policy

```text
R0: NO
W0: NO
W1: normally NO; real process recovery is proven later in W5
W2: YES for FFmpeg/video-use/HyperFrames/Remotion/real media
W3: conditional; otherwise covered with W4/W5
W4: YES for real Windows browser/media flow
W5: YES and release-blocking
W6: YES and release-blocking
```

## Delivery history

```text
V2.1.1 R0 Repository Truth / Agent Guardrails  → PR #17 COMPLETE
V2.1.1 H0 Correctness Hotfix                   → PR #19 COMPLETE
V2.1.1 H1 Project Transaction Safety           → PR #20 COMPLETE
V2.1.1 H2 Engine Process Runtime               → PR #21 COMPLETE
V2.1.1 H3 Durable Job Runtime                  → PR #22 COMPLETE
V2.1.1 H4 Streaming Media Pipeline             → PR #23 COMPLETE
V2.1.1 H5 Project / Data Hardening             → PR #24 COMPLETE
V2.1.1 H6 Automated Acceptance                 → PR #25 COMPLETE
V2.1.1 H7 Frontend Consolidation               → PR #26 COMPLETE
V2.1.1 Final Release Acceptance                → PR #27 COMPLETE
V2.1.1 Release Finalization                    → PR #28 COMPLETE
V2.1.1 Tag                                     → v2.1.1 COMPLETE
V2.2 R0 Repository / Roadmap Sync              → PR #30 COMPLETE
V2.2 W0 Workflow Contract                      → ACTIVE
```

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
2. Canonical internal timeline timing is frame-based.
3. Durable edits use validated Commands / Transactions / bounded services.
4. Workflow orchestrates existing capabilities; it does not become a second Job system.
5. Agents do not directly hand-edit runtime `project.json`.
6. UI/Workflow modules do not spawn FFmpeg, Remotion, HyperFrames or video-use directly.
7. Remotion remains the master composition/render engine.
8. HyperFrames remains the deterministic complex-motion asset engine.
9. video-use and FFmpeg/ffprobe remain behind adapters/services.
10. `VIDEO_OS_DATA_ROOT` remains outside repository code by default.
11. Studio theme/locale remains separate from generated-video Brand.
12. Project Schema and engine pins are not changed incidentally.
13. `REUSE > MODIFY > CREATE`.

## PR #18 disposition

PR #18 is closed/unmerged and retained only as future V2.3 AI Agent architecture input. Do not branch V2.2 implementation from it.

## Next allowed phase

While W0 is active:

- domain schema/state/persistence/tests only;
- no Workflow scheduler/runtime orchestration yet;
- no API/UI;
- no engine integration;
- no Real AI Provider;
- no Project Schema or engine-pin changes.

After W0 is reviewed and merged, create W1 from the new accepted `main` and implement only Workflow Runtime Core.

## Read order for agents

1. resolve live GitHub `main`, active branch/PR and CI state;
2. `PROJECT_STATUS.md`;
3. `AGENTS.md`;
4. `SYSTEM.md`;
5. `docs/prd/Video_OS_Studio_V2_2_Workflow_Runtime_Master_PRD.md`;
6. `docs/prd/Video_OS_Studio_V2_2_Development_Plan.md`;
7. active local validation contract only when the workstream requires local evidence.

If live GitHub state conflicts with this file, stop and resolve the conflict rather than guessing.
