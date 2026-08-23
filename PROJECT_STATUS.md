# Video OS Studio — Current Project Status

> This file is the current-state source of truth for GPT Web, local Codex, and other development agents. Historical PRs, validation reports, and prior PRDs remain evidence, but they do not override this file.

## Current checkpoint

```yaml
product_version: 2.1.0
released_v2_1_sha: fcfb341367b6ff5e8911693483c14196386c5a93
project_schema: 2.0.0
current_milestone: V2.1.1 Engineering Hardening
last_completed_workstream: H7 Frontend Consolidation
accepted_h7_main: 06481c1d78c93bcadfa4be7ec58dd4c250cc19c3
active_phase: V2.1.1 Final Release Acceptance
release_acceptance_branch: release/v2.1.1-final-acceptance
release_acceptance_pr: 27
release_acceptance_status: ACTIVE
next_gate: frozen-SHA isolated Windows final release smoke
v2_2_status: BLOCKED until V2.1.1 Final Release Acceptance is accepted
```

`product_version` intentionally remains `2.1.0` during acceptance. Do not bump to `2.1.1`, create a release tag, or begin V2.2 until the Final Definition of Done is accepted.

## Delivery history

```text
R0 Repository Truth / Agent Guardrails  → PR #17 COMPLETE
H0 Correctness Hotfix                   → PR #19 COMPLETE
H1 Project Transaction Safety           → PR #20 COMPLETE
H2 Engine Process Runtime               → PR #21 COMPLETE
H3 Durable Job Runtime                  → PR #22 COMPLETE
H4 Streaming Media Pipeline             → PR #23 COMPLETE
H5 Project / Data Hardening             → PR #24 COMPLETE
H6 Automated Acceptance                 → PR #25 COMPLETE
H7 Frontend Consolidation               → PR #26 COMPLETE
V2.1.1 Final Release Acceptance         → ACTIVE / PR #27 DRAFT
```

## Accepted H7 checkpoint

Accepted H7 merge/main SHA:

```text
06481c1d78c93bcadfa4be7ec58dd4c250cc19c3
```

H7 evidence:

```text
PR #26
Base accepted H6 main: 11aafb2ab634ce06c5aa032382cc4263f9749f2d
Frozen local-validation input: e1b1675001c3b62e113f94650c86e9326303f214
Local code checkpoint after fixes: 042dcd18252ca333f8b2c3c4de9c1a1f99eaae59
Local validation head: 879379b7517c17ed8cc8bbc3eb68feb1136de03e
Local-validation exact-head CI: Run 32640006356 PASS
H7 COMPLETE status checkpoint: ebddae56db531f56af5bf3f0d598cd85f744c49f
Status-checkpoint CI: Run 32640615112 PASS
Accepted merge/main: 06481c1d78c93bcadfa4be7ec58dd4c250cc19c3
```

All four H7 final CI gates passed:

```text
ubuntu-verify:       PASS
windows-verify:      PASS
browser-smoke:       PASS
windows-media-smoke: PASS
```

Final automated baseline at H7 acceptance:

```text
format-check: PASS
lint: PASS with exactly 2 pre-existing @next/next/no-img-element warnings
typecheck: PASS
unit: 57 passed files + 1 skipped / 238 passed tests + 1 skipped
build: PASS
```

Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H7.md`.

H7 local Windows/browser acceptance also found and fixed image B-roll composition: image Assets are routed through the still-image path while video Assets remain on video playback. Regression coverage exists in `tests/h7/master-composition-media.test.ts`.

## V2.1.1 Final Release Acceptance

This is a release gate, not a new feature workstream.

Draft PR: **#27 `chore: V2.1.1 final release acceptance`**.

Allowed work on `release/v2.1.1-final-acceptance`:

- repository-truth and release-acceptance documentation;
- current-main CI / browser / Windows / media / engine release smoke;
- explicit reconciliation of R0 and H0–H7 accepted evidence against the Master PRD Final Definition of Done;
- minimal fixes for defects that block the V2.1.1 release;
- regression tests for any such release-blocking fix.

Not allowed:

- V2.2 Workflow Runtime;
- real external AI provider;
- broad AI Command Bar;
- visual redesign;
- unrelated editor features;
- Project Schema migration without an approved migration decision;
- opportunistic refactors unrelated to a demonstrated release blocker.

The authoritative local acceptance contract is:

`docs/validation/LOCAL_VALIDATION_V2_1_1_FINAL_RELEASE.md`

GPT Web must freeze an exact green branch SHA before local Codex begins release acceptance.

### Final Definition of Done

V2.1.1 may release only when all of the following are explicitly supported by accepted evidence and the current-main final release smoke:

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

The Master PRD also requires local Codex evidence for the final release smoke and for runtime-sensitive Remotion/Chrome, HyperFrames, FFmpeg/ffprobe, Windows process behavior, real media, and video-use. If real local video-use evidence cannot be produced and no approved repository rule explicitly makes that requirement optional, Final Release Acceptance must report that gate as blocked rather than silently waiving it.

## Accepted foundations

### R0 — Repository Truth / Agent Guardrails

PR #17 established `PROJECT_STATUS.md`, `AGENTS.md`, repository handoff rules, and current-document precedence.

### H0 — Correctness Hotfix

Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H0.md`.

Accepted behavior includes safe Script rebuild, minimal Inspector commits, style precedence, and Canvas error cleanup.

### H1 — Project Transaction Safety

Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H1.md`.

Accepted behavior includes per-Project serialization, `expectedRevision`, command/transaction operation IDs, idempotency, structured conflicts, and no silent lost update.

### H2 — Engine Process Runtime

Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H2.md`.

Accepted engine pins:

```text
remotion             4.0.513
@remotion/player     4.0.513
@remotion/cli        4.0.513
hyperframes          0.8.10
```

Accepted behavior includes installed-dependency Remotion, deterministic engine argv, ToolRunner cancellation/timeout/process-tree handling, and sanitized errors.

### H3 — Durable Job Runtime

Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H3.md`.

Accepted behavior includes file-backed durable Jobs, bounded concurrency, cancellation, retry, restart recovery, logs, and artifacts.

### H4 — Streaming Media Pipeline

Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H4.md`.

Accepted behavior includes streaming browser upload, staged cleanup, GET/HEAD/Range streaming, canonical MIME/nosniff, and bounded large-media memory.

### H5 — Project / Data Hardening

Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H5.md`.

Accepted behavior includes frozen historical schemas, chained migrations, Project-wide referential integrity, bounded/revision-safe History, Recent Project summaries, failed-import compensation, and guarded orphan maintenance.

### H6 — Automated Acceptance

Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H6.md`.

Accepted behavior includes Ubuntu/Windows CI, Playwright smoke, Windows real-media smoke, real normalization/Range/render coverage, and repeatable acceptance automation.

### H7 — Frontend Consolidation

Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H7.md`.

Accepted behavior includes typed frontend clients/errors, event-driven Player sync, top-level frame isolation, rAF gesture drafts, shared Planner i18n, incremental token consolidation, and Windows/browser interaction validation.

## Architecture invariants

Always preserve:

```text
Source Media != Project Canvas != Export Profile
```

And:

1. Project JSON is the durable Project source of truth.
2. Canonical internal timeline timing is frame-based.
3. Durable edits use validated Commands / Transactions / bounded services.
4. Agents do not directly hand-edit runtime `project.json`.
5. UI modules do not spawn FFmpeg, Remotion, HyperFrames, or video-use directly.
6. Remotion remains the master composition/render engine.
7. HyperFrames remains the deterministic complex-motion asset engine.
8. video-use and FFmpeg/ffprobe remain behind adapters/services.
9. `VIDEO_OS_DATA_ROOT` remains outside repository code by default.
10. Studio UI theme/locale remains separate from generated-video Brand.
11. `REUSE > MODIFY > CREATE`.

## Development split

### GPT Web + GitHub owns

- architecture and PRD decisions;
- cloud-safe implementation;
- branches, PRs, CI, review, merge;
- unit/API/contract/automation tests;
- reviewing local Codex commits and evidence;
- accepted repository checkpoint and release decision.

### Local Codex owns

- Windows-specific runtime acceptance;
- real browser/media/engine behavior;
- FFmpeg / ffprobe, Remotion, HyperFrames, and video-use evidence;
- filesystem/process/restart/performance evidence;
- release-blocking defect fixes discovered during local acceptance.

## Handoff protocol

```text
GPT Web
→ resolve accepted main
→ create the release-acceptance branch
→ establish release contract / repository truth
→ full CI green
→ freeze exact branch HEAD

Local Codex
→ isolated worktree + isolated VIDEO_OS_DATA_ROOT
→ checkout exact frozen SHA
→ execute the final release contract
→ fix only demonstrated V2.1.1 release blockers
→ add regression tests
→ push to the same release branch
→ return FINAL HEAD + evidence

GPT Web
→ inspect frozen→final diff
→ verify exact-head CI
→ reconcile every Final Definition of Done gate
→ only if all release gates PASS: perform release checkpoint/version/tag steps
→ only after V2.1.1 is accepted may V2.2 begin
```

## Read order for agents

1. resolve live GitHub `main`, release branch, PR, and CI state;
2. `PROJECT_STATUS.md`;
3. `AGENTS.md`;
4. `SYSTEM.md`;
5. `docs/prd/Video_OS_Studio_V2_1_1_Engineering_Hardening_Master_PRD.md`;
6. `docs/validation/LOCAL_VALIDATION_V2_1_1_FINAL_RELEASE.md`;
7. accepted prior validation reports when reconciling a specific DoD gate;
8. active release PR diff/CI.

If repository truth, the frozen SHA, or local evidence disagree, stop and resolve the mismatch rather than guessing.
