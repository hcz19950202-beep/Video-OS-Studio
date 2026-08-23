# Video OS Studio — Current Project Status

> This file is the single current-state source of truth for GPT Web, local Codex, and other development agents.
> Conversation memory, old PR descriptions, historical PRDs, and prior validation reports are evidence; they do not override this file.

## Status semantics

When read from `main`, this file describes the accepted checkpoint and the next allowed workstream.

When read from a feature branch, status changes are proposed until the PR merges. Resolve live GitHub `main`, branch, PR, CI, and final handoff SHAs at runtime rather than making this file self-reference the SHA of the commit that contains it.

## Proposed accepted checkpoint after H6 / PR #25 merge

```yaml
product_version: 2.1.0
released_v2_1_sha: fcfb341367b6ff5e8911693483c14196386c5a93
project_schema: 2.0.0
current_milestone: V2.1.1 Engineering Hardening
accepted_h5_main: c639ebf2b6b91613b4cb772215599a6bd713638a
last_completed_workstream: H6 Automated Acceptance
h6_pull_request: 25
h6_branch: hardening/v2.1.1-h6-automated-acceptance
h6_frozen_input: c019689884877a12660e73e1ec8ba81aa9e76e69
h6_local_validation_final_head: 53a2c5ca5323723ded1aa75feef73feef34cbd02
h6_local_windows_release_acceptance: PASS
h6_final_head_ci: Run 32631619687 PASS
next_allowed_workstream: H7 Frontend Consolidation
next_product_milestone: V2.2 Workflow Runtime only after V2.1.1 release
```

On this H6 feature branch, the H7 unlock above is only a **proposed next checkpoint**. H7 must not start until PR #25 actually merges and the accepted `main` SHA is resolved from GitHub. Once this file is read from merged `main`, H7 is the next allowed workstream.

## Delivery history

```text
R0 Repository Truth / Agent Guardrails  → PR #17 COMPLETE
H0 Correctness Hotfix                   → PR #19 COMPLETE
H1 Project Transaction Safety           → PR #20 COMPLETE
H2 Engine Process Runtime               → PR #21 COMPLETE
H3 Durable Job Runtime                  → PR #22 COMPLETE
H4 Streaming Media Pipeline             → PR #23 COMPLETE
H5 Project / Data Hardening             → PR #24 COMPLETE
H6 Automated Acceptance                 → PR #25 ACCEPTANCE COMPLETE · MERGE PENDING
H7 Frontend Consolidation               → NEXT ONLY AFTER PR #25 MERGES
```

## H6 acceptance evidence

### Cloud implementation and frozen checkpoint

```text
PR: #25
Branch: hardening/v2.1.1-h6-automated-acceptance
Base accepted H5 main: c639ebf2b6b91613b4cb772215599a6bd713638a
Cloud code SHA: 3667867c9f43680b668229efbd67414e4a3e20b1
Cloud code CI: Run 32626056514 PASS
Frozen local-validation input: c019689884877a12660e73e1ec8ba81aa9e76e69
Frozen checkpoint CI: Run 32626439309 PASS
Local validation final head: 53a2c5ca5323723ded1aa75feef73feef34cbd02
Final local-head GitHub verify: Run 32631619687 PASS
```

Final GitHub CI on the local validation final head passed all four required jobs:

```text
ubuntu-verify:       PASS
windows-verify:      PASS
browser-smoke:       PASS
windows-media-smoke: PASS
```

Final cloud unit baseline remains:

```text
51 passed test files + 1 Windows-media smoke file skipped in the normal unit matrix
222 passed tests + 1 skipped
Build PASS
```

The skipped Windows-media test is intentional in the ordinary matrix and passes in the dedicated `windows-media-smoke` job.

### Local Windows release acceptance

Authority:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H6.md
```

Local environment:

```text
Windows: Windows 10 19045 x64
Node / npm: 25.2.1 / 11.6.2
Chrome: 151.0.7922.138
FFmpeg / ffprobe: 8.1.1
Remotion: 4.0.513 exact
HyperFrames: 0.8.10 exact
Playwright: 1.62.1 exact
VIDEO_USE_ROOT: NOT CONFIGURED
```

Local Codex acceptance passed:

- clean `npm ci`, format-check, lint, typecheck, unit and production build;
- Playwright H6 smoke 1/1;
- real Create/Open, tiny import, Caption edit, Canvas change, deterministic AI rules Analyze/Apply, Undo/Redo and Save/Reopen;
- real MP4 import/probe;
- real MOV normalization with original retained and working MP4 produced;
- image import without unnecessary video normalization;
- real FLAC normalization to M4A and ffprobe verification;
- real SRT parsing into Caption clips;
- Asset Range `206` and invalid Range `416` behavior;
- real three-second 1080×1920 30fps muted Final MP4 through the product Remotion path;
- HyperFrames `0.8.10` doctor/lint/check/render plus UI `process-flow` render;
- representative app regression including playback/seek, Final Render and HyperFrames add/render;
- no H6 `.tmp/.part/.partial` residue and no H6-owned Node/Chrome/FFmpeg/ffprobe/Python/HyperFrames process residue.

No H6 product defect was reproduced, so the local Codex push was documentation-only. The frozen-to-final diff is exactly one commit and only modifies the H6 validation document.

Non-blocking local environment notes:

- local validation used Node `25.2.1` while the repository declares Node `24.x`; repository CI validates Node `24.19.0`;
- the two pre-existing `@next/next/no-img-element` warnings remain;
- local FFmpeg `8.1.1` differs from the GitHub Windows smoke's exact Chocolatey FFmpeg `9.0.1`; both required behavior paths passed;
- optional HyperFrames Docker/whisper/TTS/BGM/memory notes were recorded, while required health/lint/check/render gates passed;
- the machine's normal port 3000 was occupied by an unrelated existing service, so the identical checked-in Playwright test used temporary local port 3010;
- video-use was not configured locally, so no H6 provider/runtime change was made.

The local report's `MERGE RECOMMENDATION: NO` is an authority/stop-rule statement: Local Codex was instructed not to merge and to return control to GPT Web. It is not a failed acceptance gate. GPT Web independently reviewed the frozen-to-final diff and final GitHub CI before the merge decision.

## H6 accepted behavior

### CI and formatting

- workflow concurrency cancels obsolete same-branch/PR runs;
- Ubuntu runs install / format-check / lint / typecheck / unit / build;
- Windows runs install / format-check / lint / typecheck / unit;
- H6 formatting uses the exact locked Prettier version without broadly reformatting compact legacy product code;
- CI automation is read-only after checked-in dependency/format outputs are generated.

### Route and engine contracts

H6 contract tests cover:

- Project create/list/load/replace;
- H1 Command and Transaction envelopes;
- streaming media upload and payload-too-large preflight;
- Asset GET/HEAD/single-byte Range including invalid Range;
- durable Job create/query/cancel/retry;
- Project render request origin/export profile;
- Remotion final/overlay/custom/muted argv semantics;
- HyperFrames argv;
- FFmpeg normalization argv;
- Windows launcher/process semantics.

### Browser smoke

The Playwright smoke uses the public Command API only to seed a deterministic proof Scene and Caption fixture. All user acceptance actions after seeding are performed through the real UI. Exact `@playwright/test` is `1.62.1`.

### Windows media smoke

The dedicated GitHub Windows media job installs exact FFmpeg/ffprobe `9.0.1` because the current Windows runner image does not preinstall FFmpeg. It exercises real `MediaImportService`, `NodeFfmpegAdapter`, streaming Range response, `NodeRemotionCliAdapter`, real MP4/MOV/PNG/FLAC/SRT fixtures and a short Final render.

## H7 next scope gate

H7 Frontend Consolidation is the next allowed V2.1.1 workstream **only after PR #25 merges** and the accepted H6 `main` SHA is resolved.

Before H7 implementation:

1. resolve live GitHub `main` after PR #25 merge;
2. reread the H7 section of `docs/prd/Video_OS_Studio_V2_1_1_Engineering_Hardening_Master_PRD.md`;
3. create a new H7 branch from the exact accepted H6 main SHA;
4. open H7 as its own Draft PR;
5. keep H7 limited to frontend consolidation and do not absorb V2.2 Workflow Runtime or unrelated product work.

## Accepted prior foundations

### H5 — Project / Data Hardening

Accepted main before H6:

```text
c639ebf2b6b91613b4cb772215599a6bd713638a
```

Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H5.md`.

Accepted behavior includes frozen historical schemas, explicit migrations, Project-wide referential integrity, bounded/revision-safe History, lightweight Recent Project summaries, compensating failed-import cleanup, and guarded orphan maintenance.

### H4 — Streaming Media Pipeline

Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H4.md`.

Accepted behavior includes streaming browser upload, Asset/output Range serving, and bounded large-media memory.

### H3 — Durable Job Runtime

Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H3.md`.

Accepted behavior includes durable file-backed Jobs, cancellation/retry/restart recovery/concurrency/logs/artifacts.

### H2 — Engine Process Runtime

Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H2.md`.

Exact accepted engine pins:

```text
remotion             4.0.513
@remotion/player     4.0.513
@remotion/cli        4.0.513
hyperframes          0.8.10
```

### H1 — Project Transaction Safety

Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H1.md`.

Accepted behavior includes per-Project serialization, `expectedRevision`, operation IDs, idempotency, and structured conflicts.

### H0 — Correctness Hotfix

Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H0.md`.

Accepted behavior includes safe Script rebuild, minimal Inspector commits, style precedence, and Canvas error cleanup.

## Architecture invariants

Always preserve:

```text
Source Media != Project Canvas != Export Profile
```

And:

1. Project JSON is the durable Project source of truth.
2. Canonical timeline timing is frame-based.
3. Durable edits use validated Commands / Transactions / bounded services.
4. UI modules do not spawn FFmpeg, Remotion, HyperFrames, or video-use directly.
5. Agents do not directly hand-edit runtime `project.json`.
6. Remotion remains the master composition/render engine.
7. HyperFrames remains the deterministic complex-motion asset engine.
8. `VIDEO_OS_DATA_ROOT` remains outside repository code by default.
9. Studio UI theme/locale are separate from generated-video Brand.
10. `REUSE > MODIFY > CREATE`.

## Development split

### GPT Web + GitHub owns

- architecture and PRD decisions;
- cloud-safe implementation;
- branch/PR/CI/review/merge;
- cloud unit/API/contract/automation tests;
- review of local Codex fixes;
- accepted checkpoint maintenance.

### Local Codex owns

- Windows-specific runtime acceptance;
- real browser/media/engine behavior;
- filesystem/process/performance evidence;
- Windows media/render smoke and active-workstream defect fixes.

## Handoff protocol

```text
GPT Web
→ resolve accepted main
→ create one workstream branch
→ implement cloud-safe scope
→ full CI green
→ checkpoint repository truth
→ full checkpoint CI green
→ freeze exact branch HEAD

Local Codex
→ isolated worktree/data root
→ checkout exact frozen handoff SHA
→ follow the active validation contract
→ fix only active-workstream defects
→ push code/docs commits to the same branch
→ return FINAL HEAD + evidence

GPT Web
→ review frozen→final diff
→ verify final CI
→ prepare accepted checkpoint
→ merge
→ resolve accepted main
→ only then open the next workstream
```

## Blocked until V2.1.1 is complete

Do not start:

- real external AI Provider;
- broad AI Command Bar;
- V2.2 Workflow Runtime implementation;
- unrelated major editor features;
- Project Schema migration without an approved migration decision.

## Read order for agents

1. resolve current GitHub `main`, branch, PR, and CI state;
2. `PROJECT_STATUS.md`;
3. `AGENTS.md`;
4. `SYSTEM.md`;
5. `docs/prd/Video_OS_Studio_V2_1_1_Engineering_Hardening_Master_PRD.md`;
6. active validation contract when one exists;
7. active PR diff/CI.

If another document conflicts with this file, stop and resolve the conflict instead of guessing.
