# Video OS Studio — Current Project Status

> This file is the current-state source of truth for GPT Web, local Codex, and other development agents. Historical PRs and validation reports remain evidence; they do not override this file.

## Current checkpoint

```yaml
product_version: 2.1.1
project_schema: 2.0.0
released_baseline: v2.1.1
release_status: COMPLETE
release_tag: v2.1.1
release_tag_sha: 223b66799baf5b5faf1d1321a671d3fb5c6a0930
v2_2_r0_main: 64c6ea3ece5770a2999a67dabec8d83837aa62d2
v2_2_w0_main: 9914b1e65d27a7d40e997295d94eeb5ce4c3deea
v2_2_w1_main: 5c98117a2ca30217ac8865e99eb87fe410ee7192
current_milestone: V2.2 WORKFLOW RUNTIME
v2_2_status: W2 EXISTING CAPABILITY STAGE INTEGRATION ACTIVE
active_workstream: V2.2-W2 Existing Capability Stage Integration
active_branch: feature/v2.2-w2-stage-integration
active_pr: PENDING
local_validation_required: YES after cloud-green exact head
next_workstream_after_w2: W3 Human Review + Invalidation
future_milestone: V2.3 Real AI Director / AI Editing Agent
```

## Accepted delivery history

```text
V2.1.1 Engineering Hardening / Final Release  → COMPLETE
V2.1.1 tag v2.1.1                            → COMPLETE
V2.2 R0 Repository / Roadmap Sync             → PR #30 COMPLETE
V2.2 W0 Workflow Contract                     → PR #31 COMPLETE
V2.2 W1 Workflow Runtime Core                 → PR #32 COMPLETE / main 5c98117a...
V2.2 W2 Existing Capability Stage Integration → ACTIVE
```

W1 established the durable cloud-safe orchestration core: Definition/Stage registries, WorkflowService, WorkflowRunner, dependency scheduling, pause/resume/cancel/retry, checkpoints, activity logging and Durable Job reconciliation.

## Active V2.2 documents

```text
docs/prd/Video_OS_Studio_V2_2_Workflow_Runtime_Master_PRD.md
docs/prd/Video_OS_Studio_V2_2_Development_Plan.md
```

## V2.2 product objective

> Connect existing Video OS capabilities into a durable, visible, reviewable and retryable production Workflow so a user can import a real video and generate an editable first draft without manually triggering every subsystem.

A production Real AI Provider / multi-turn AI Editing Agent is not V2.2 scope and remains V2.3.

## V2.2 delivery sequence

```text
R0 Repository / Roadmap Sync              → PR #30 COMPLETE
W0 Workflow Contract                      → PR #31 COMPLETE
W1 Workflow Runtime Core                  → PR #32 COMPLETE
W2 Existing Capability Stage Integration  → ACTIVE
W3 Human Review + Invalidation            → NEXT AFTER W2
W4 Workflow UI                            → FUTURE
W5 Failure / Retry / Restart Hardening    → FUTURE
W6 End-to-End Release Acceptance          → FUTURE
```

## W2 scope contract

W2 integrates the system already built. Target Stage adapters:

```text
MEDIA_IMPORT
MEDIA_PROBE
MEDIA_NORMALIZE
TRANSCRIBE
SCRIPT_ANALYSIS
SCENE_DETECTION
CAPTION_GENERATION
VISUAL_PLANNING
MOTION_GENERATION
BROLL_ASSEMBLY
AUDIO_ASSEMBLY
TIMELINE_ASSEMBLY
PREVIEW
FINAL_RENDER
```

Implementation rules:

1. Media import/probe/normalization provenance reuses `MediaImportService`; Workflow does not create a second import pipeline. Generate First Draft begins after media is imported into Project.
2. `video-use-transcribe`, HyperFrames and final Remotion render delegate to the accepted V2.1.1 Durable Job Runtime.
3. Scene/Caption/visual mutations use `ProjectMutationCoordinator` / Project Transactions; Workflow never writes `project.json` directly.
4. Rules Visual Planner remains the V2.2 planning source. No Real AI Provider is introduced.
5. W2 internal capability definitions exist for Stage/engine acceptance only. User-facing Human Review and Generate First Draft definitions are completed in W3/W4.
6. One Motion Stage may apply deterministic Remotion suggestions and at most one Durable HyperFrames render; additional HyperFrames suggestions remain in the Visual Plan for future review rather than being silently run outside Durable Jobs.
7. Project Schema remains `2.0.0` and engine pins remain unchanged.

## W2 merge gates

Cloud gate:

```text
format / lint / typecheck / unit / build
Stage registration and definition tests
Durable Job delegation tests
Project transaction / revision tests
full fake-engine capability workflow test
existing browser/media regression smoke
```

Local exact-SHA gate is mandatory before merge:

```text
Windows real media import/probe/normalization
real FFmpeg/ffprobe
real video-use transcription
real HyperFrames render through Durable Job
real Remotion final render through Durable Job
Project/Workflow artifact and revision evidence
no direct engine spawn from Workflow
```

GPT Web must first produce a cloud-green exact W2 head. Only then hand that exact SHA to Local Codex. Codex may fix only W2-scope defects and must push fixes to the same branch.

## Development ownership

```text
GPT Web + GitHub
→ architecture / stage adapters / workflow definitions / cloud-safe code / tests / PR / CI / review / merge / status

Local Codex on Windows
→ exact-SHA real media/FFmpeg/video-use/HyperFrames/Remotion acceptance + in-scope fixes + evidence
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

- Project JSON is durable video-editing truth.
- Workflow state remains under `VIDEO_OS_DATA_ROOT/workflows`.
- Durable Jobs remain concrete execution truth.
- Workflow Stage code does not spawn FFmpeg, Remotion, HyperFrames or video-use directly.
- Long-running mutation work preserves revision/idempotency contracts.
- `REUSE > MODIFY > CREATE`.

## PR #18 disposition

PR #18 remains closed/unmerged and is future V2.3 Agent architecture input only.

## Next allowed phase

While W2 is active, do not begin W3. Finish online W2, obtain a cloud-green exact SHA, execute the mandatory Local Codex W2 acceptance contract, review any returned fixes and re-run CI before merge.

## Read order for agents

1. resolve live GitHub `main`, active branch/PR and CI state;
2. `PROJECT_STATUS.md`;
3. `AGENTS.md`;
4. `SYSTEM.md`;
5. `docs/prd/Video_OS_Studio_V2_2_Workflow_Runtime_Master_PRD.md`;
6. `docs/prd/Video_OS_Studio_V2_2_Development_Plan.md`;
7. W2 local validation contract only after GPT Web freezes a cloud-green exact SHA.
