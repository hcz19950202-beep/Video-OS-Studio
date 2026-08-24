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
current_milestone: V2.2 WORKFLOW RUNTIME
v2_2_status: W3 HUMAN REVIEW + INVALIDATION ACTIVE
active_workstream: V2.2-W3 Human Review + Invalidation
active_branch: feature/v2.2-w3-human-review-invalidation
active_pr: 34
local_validation_required: NO by default for W3; real browser review validation belongs to W4
next_workstream_after_w3: W4 Workflow UI
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
V2.2 W3 Human Review + Invalidation            → PR #34 ACTIVE
```

W2 was accepted after cloud CI plus exact-SHA Local Codex Windows validation on code SHA `5b13234d9e512adf57f486767d36552fa6d254c7`. Real MOV import/normalization, video-use, HyperFrames, Remotion final render, Workflow artifacts/revisions and encoded MP4 all passed. The evidence report is `docs/validation/LOCAL_VALIDATION_V2_2_W2.md`.

## Active V2.2 documents

```text
docs/prd/Video_OS_Studio_V2_2_Workflow_Runtime_Master_PRD.md
docs/prd/Video_OS_Studio_V2_2_Development_Plan.md
docs/validation/LOCAL_VALIDATION_V2_2_W2_CONTRACT.md
docs/validation/LOCAL_VALIDATION_V2_2_W2.md
```

## V2.2 product objective

> Connect existing Video OS capabilities into a durable, visible, reviewable and retryable production Workflow so a user can import a real video and generate an editable first draft without manually triggering every subsystem.

A production Real AI Provider / multi-turn AI Editing Agent is not V2.2 scope and remains V2.3.

## V2.2 delivery sequence

```text
R0 Repository / Roadmap Sync              → PR #30 COMPLETE
W0 Workflow Contract                      → PR #31 COMPLETE
W1 Workflow Runtime Core                  → PR #32 COMPLETE
W2 Existing Capability Stage Integration  → PR #33 COMPLETE
W3 Human Review + Invalidation            → PR #34 ACTIVE
W4 Workflow UI                            → NEXT AFTER W3
W5 Failure / Retry / Restart Hardening    → FUTURE
W6 End-to-End Release Acceptance          → FUTURE
```

## W3 scope contract

W3 adds durable human-in-the-loop behavior without adding the W4 UI/API surface.

Canonical production Workflow definitions become:

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

Implementation rules:

1. Accepted `w2-capability-* @1` definitions remain registered and immutable for persisted W2 runs.
2. New `video-production-* @1` definitions add `CONTENT_REVIEW` and `ASSEMBLY_REVIEW` durable checkpoints.
3. Human-reviewed Project state is authoritative. Approving a checkpoint does not automatically regenerate Script/Scenes/Captions and overwrite human edits.
4. `WorkflowService` resolves the latest Project revision itself for approve/resume/replay actions; UI-supplied revision state is not trusted as truth.
5. Each executed Stage records input identity from current Project revision plus dependency output digests.
6. Human-requested recalculation uses explicit `replayFromStage`: invalidate only the selected retryable Stage and transitive downstream dependents; unrelated accepted upstream work remains intact.
7. Affected old checkpoints become `superseded`; when recalculation reaches review again, a fresh checkpoint is created.
8. Stale Workflow artifacts belonging to invalidated Stages are removed, while historical Job IDs / operation IDs remain available for audit/reuse semantics.
9. Manual Project edits while Workflow is paused are reflected on resume before new Stages start.
10. No Project Schema or engine-pin changes are allowed.

## W3 merge gates

Cloud gate:

```text
format / lint / typecheck / unit / build
W2 definition immutability tests
16-stage production definition tests
Checkpoint A/B wait + approval tests
latest Project revision approval tests
Stage inputDigest tests
selective transitive invalidation tests
checkpoint supersession tests
stale Workflow artifact removal tests
pause/manual-edit/resume revision refresh tests
existing browser/media regression smoke
```

Local Codex is not mandatory for W3 unless review uncovers platform-specific behavior. W4 owns real Windows browser/review interaction acceptance; W5 owns crash/restart chaos acceptance.

## Carry-forward requirement for W4

`lib/server/runtime.ts` currently has an internal fallback asset base URL of `http://127.0.0.1:3000`. W4 user-facing Workflow/API rendering must model request origin / asset-base URL explicitly rather than permanently assuming port 3000.

## Development ownership

```text
GPT Web + GitHub
→ architecture / Workflow semantics / definitions / tests / PR / CI / review / merge / status

Local Codex on Windows
→ only when an exact-SHA workstream gate depends on real Windows/browser/media/engine behavior
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

While PR #34 is active, do not begin W4 implementation. Finish W3 cloud review/CI and merge it first. Start W4 only from the new accepted `main`.

## Read order for agents

1. resolve live GitHub `main`, active branch/PR and CI state;
2. `PROJECT_STATUS.md`;
3. `AGENTS.md`;
4. `SYSTEM.md`;
5. `docs/prd/Video_OS_Studio_V2_2_Workflow_Runtime_Master_PRD.md`;
6. `docs/prd/Video_OS_Studio_V2_2_Development_Plan.md`;
7. W2 validation reports when real-engine history is relevant.
