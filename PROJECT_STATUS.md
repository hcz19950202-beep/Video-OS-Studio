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
v2_2_w2_main: bfcc862aed29969e61c5c3723179585e6c583a07
v2_2_w3_main: 23193e537a2c403f8d3c82806db991603cb27dca
current_milestone: V2.2 WORKFLOW RUNTIME
v2_2_status: W4 WORKFLOW UI ACTIVE
active_workstream: V2.2-W4 Workflow UI
active_branch: feature/v2.2-w4-workflow-ui
active_pr: NOT OPENED YET
local_validation_required: YES after cloud-green exact head
local_validation_contract: docs/validation/LOCAL_VALIDATION_V2_2_W4_CONTRACT.md
local_validation_test: tests/e2e/w4-local-real.spec.ts
next_workstream_after_w4: W5 Failure / Retry / Restart Hardening
future_milestone: V2.3 Real AI Director / AI Editing Agent
```

## Accepted delivery history

```text
V2.1.1 Engineering Hardening / Final Release  → COMPLETE
V2.1.1 tag v2.1.1                            → COMPLETE
V2.2 R0 Repository / Roadmap Sync             → PR #30 COMPLETE
V2.2 W0 Workflow Contract                     → PR #31 COMPLETE
V2.2 W1 Workflow Runtime Core                 → PR #32 COMPLETE
V2.2 W2 Existing Capability Stage Integration → PR #33 COMPLETE / main bfcc862a...
V2.2 W3 Human Review + Invalidation            → PR #34 COMPLETE / main 23193e53...
V2.2 W4 Workflow UI                            → ACTIVE
```

W2 was accepted after cloud CI plus exact-SHA Local Codex Windows validation. Real MOV import/normalization, video-use, HyperFrames, Remotion final render, Workflow artifacts/revisions and encoded MP4 passed. Evidence: `docs/validation/LOCAL_VALIDATION_V2_2_W2.md`.

W3 added two durable review checkpoints, latest-Project-revision approval, explicit replay from a selected Stage, transitive downstream invalidation, checkpoint supersession, artifact invalidation and pause/manual-edit/resume revision refresh. PR #34 merged only after Ubuntu, Windows, browser smoke and Windows media smoke all passed.

## Active V2.2 documents

```text
docs/prd/Video_OS_Studio_V2_2_Workflow_Runtime_Master_PRD.md
docs/prd/Video_OS_Studio_V2_2_Development_Plan.md
docs/validation/LOCAL_VALIDATION_V2_2_W2.md
docs/validation/LOCAL_VALIDATION_V2_2_W4_CONTRACT.md
```

## V2.2 product objective

> Connect existing Video OS capabilities into a durable, visible, reviewable and retryable production Workflow so a user can import a real video and generate an editable first draft without manually triggering every subsystem.

Real external AI Provider / multi-turn AI Editing Agent remains V2.3 scope.

## Delivery sequence

```text
R0 Repository / Roadmap Sync              → COMPLETE
W0 Workflow Contract                      → COMPLETE
W1 Workflow Runtime Core                  → COMPLETE
W2 Existing Capability Stage Integration  → COMPLETE
W3 Human Review + Invalidation            → COMPLETE
W4 Workflow UI                            → ACTIVE
W5 Failure / Retry / Restart Hardening    → NEXT AFTER W4
W6 End-to-End Release Acceptance          → FUTURE
```

## W4 scope contract

W4 exposes the accepted W1-W3 Workflow runtime as a visible product flow inside the existing Studio shell.

User-facing production definitions remain 16 stages:

```text
MEDIA_IMPORT
MEDIA_PROBE
MEDIA_NORMALIZE
TRANSCRIBE
SCRIPT_ANALYSIS
SCENE_DETECTION
CAPTION_GENERATION
VISUAL_PLANNING
CONTENT_REVIEW
MOTION_GENERATION
BROLL_ASSEMBLY
AUDIO_ASSEMBLY
TIMELINE_ASSEMBLY
PREVIEW
ASSEMBLY_REVIEW
FINAL_RENDER
```

W4 implementation rules:

1. Existing W2/W3 persisted definitions/runs remain readable and immutable. W4 user-facing definitions use `video-production-* @2`.
2. The current AI Workspace is reused. It exposes `Composer` and `Workflow` modes; no second editor/application is created.
3. Workflow UI covers Generate First Draft, Stage/Job progress, Content Review, Assembly Review, approve, replay, retry, pause, resume, cancel, activity and final MP4 download.
4. Human Project edits during Review stay authoritative. Approval reads latest Project revision; regeneration is explicit through `replayFromStage`.
5. Workflow-originated Project mutations are reloaded into the active editor when Workflow revision advances.
6. W4 HTTP routes call `WorkflowService`; UI does not touch Workflow files directly and does not spawn engines.
7. `assetBaseUrl` is persisted on WorkflowRun and refreshed from request origin so user-facing final render does not permanently depend on `127.0.0.1:3000`.
8. Project JSON remains durable editing truth; Workflow state remains outside Project JSON under `VIDEO_OS_DATA_ROOT/workflows`.
9. Project Schema stays `2.0.0`; Remotion/HyperFrames/video-use pins do not change.
10. Cloud UI tests must not require real external engines; exact-SHA Local Codex acceptance owns real browser/media/engine proof.

## W4 merge gates

Cloud gate:

```text
format / lint / typecheck / unit / build
W4 @2 definition + origin-binding tests
Workflow HTTP/client contract tests
existing H6 browser regression
W4 browser smoke for durable Workflow discovery/cancel without launching engines
Windows media regression smoke
```

Mandatory Local Codex exact-SHA gate before merge:

```text
real Windows browser
real source MOV/MP4 import
Generate First Draft through visible Workflow UI
CONTENT_REVIEW visible
manual Project edit during review
Approve using latest revision
ASSEMBLY_REVIEW visible
Final Render through Durable Job
MP4 download + ffprobe
browser reload/reopen durable Workflow state
request-origin / non-3000 binding check
no residual Workflow-linked active Jobs/process leaks
```

GPT Web must first produce a cloud-green exact W4 head. Local Codex then follows `docs/validation/LOCAL_VALIDATION_V2_2_W4_CONTRACT.md`. Any in-scope fix is pushed to the same W4 branch and requires GitHub re-review/CI plus a rerun of local acceptance on the new exact SHA.

## Development ownership

```text
GPT Web + GitHub
→ product/UI/API/client/Workflow integration, cloud tests, PR, CI, review, merge, status

Local Codex on Windows
→ only after GPT Web freezes the cloud-green W4 exact SHA; real browser/media/video-use/HyperFrames/Remotion acceptance + bounded fixes/evidence
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
- Workflow Stage code never directly spawns FFmpeg, Remotion, HyperFrames or video-use.
- Long-running mutation work preserves revision/idempotency contracts.
- `REUSE > MODIFY > CREATE`.

## PR #18 disposition

PR #18 remains closed/unmerged and is future V2.3 Agent architecture input only.

## Next allowed phase

Continue W4 online until the branch is cloud-green. Do not stop for Local Codex before the exact cloud-green W4 SHA is frozen. Once local W4 acceptance is required, do not begin W5 until the W4 PR is accepted and merged.

## Read order for agents

1. resolve live GitHub `main`, active branch/PR and CI state;
2. `PROJECT_STATUS.md`;
3. `AGENTS.md`;
4. `SYSTEM.md`;
5. `docs/prd/Video_OS_Studio_V2_2_Workflow_Runtime_Master_PRD.md`;
6. `docs/prd/Video_OS_Studio_V2_2_Development_Plan.md`;
7. `docs/validation/LOCAL_VALIDATION_V2_2_W4_CONTRACT.md` only after GPT Web supplies an exact cloud-green SHA.
