# Video OS Studio — Current Project Status

> This file is the single current-state source of truth for GPT Web, local Codex, and other development agents.
> Conversation memory, old PR descriptions, historical PRDs, and prior validation reports are evidence; they do not override this file.

## Status semantics

When read from `main`, this file describes the accepted checkpoint and the next allowed workstream.

When read from a feature branch, status changes are proposed until the PR merges. Resolve live GitHub `main`, branch, PR, CI, and final handoff SHAs at runtime rather than making this file self-reference the SHA of the commit that contains it.

## Current proposed H6 checkpoint

```yaml
product_version: 2.1.0
released_v2_1_sha: fcfb341367b6ff5e8911693483c14196386c5a93
project_schema: 2.0.0
current_milestone: V2.1.1 Engineering Hardening
accepted_h5_main: c639ebf2b6b91613b4cb772215599a6bd713638a
active_workstream: H6 Automated Acceptance
h6_pull_request: 25
h6_branch: hardening/v2.1.1-h6-automated-acceptance
h6_cloud_implementation: COMPLETE
h6_cloud_code_sha: 3667867c9f43680b668229efbd67414e4a3e20b1
h6_cloud_code_ci: Run 32626056514 PASS
h6_unit_baseline: 51 passed test files + 1 Windows-media test file skipped in normal unit matrix / 222 passed tests + 1 skipped
h6_playwright: 1 of 1 PASS
h6_windows_media: 1 of 1 PASS
h6_local_windows_release_acceptance: PENDING
merge_status: BLOCKED until local Codex acceptance and final GitHub CI
h7_status: BLOCKED until H6 merges
next_product_milestone: V2.2 Workflow Runtime only after V2.1.1 release
```

The exact **frozen handoff SHA** is the final H6 branch HEAD after this checkpoint documentation is committed and its full four-gate CI passes. It is supplied in PR #25 and the Codex handoff prompt. Do not infer it from the `h6_cloud_code_sha` above.

## Delivery history

```text
R0 Repository Truth / Agent Guardrails  → PR #17 COMPLETE
H0 Correctness Hotfix                   → PR #19 COMPLETE
H1 Project Transaction Safety           → PR #20 COMPLETE
H2 Engine Process Runtime               → PR #21 COMPLETE
H3 Durable Job Runtime                  → PR #22 COMPLETE
H4 Streaming Media Pipeline             → PR #23 COMPLETE
H5 Project / Data Hardening             → PR #24 COMPLETE
H6 Automated Acceptance                 → ACTIVE · CLOUD GREEN · LOCAL ACCEPTANCE PENDING
H7 Frontend Consolidation               → BLOCKED
```

## H6 cloud acceptance evidence

Cloud code gate:

```text
PR: #25
Branch: hardening/v2.1.1-h6-automated-acceptance
Base accepted H5 main: c639ebf2b6b91613b4cb772215599a6bd713638a
Cloud code SHA: 3667867c9f43680b668229efbd67414e4a3e20b1
Full cloud code CI: Run 32626056514 PASS
Node / npm: 24.19.0 / 11.17.0
```

Four required gates passed on Run `32626056514`:

```text
ubuntu-verify:       PASS
windows-verify:      PASS
browser-smoke:       PASS
windows-media-smoke: PASS
```

Ubuntu verification:

- install PASS;
- H6 format-check PASS for 9 H6-owned automation files;
- lint PASS with only the two pre-existing `@next/next/no-img-element` warnings in `EffectLibrary.tsx` and `HyperFramesLibrary.tsx`;
- typecheck PASS;
- unit PASS: 51 files / 222 tests, with only the Windows real-media smoke intentionally skipped in the normal cross-platform unit matrix;
- production build PASS.

Browser acceptance:

- exact `@playwright/test` `1.62.1` is locked by npm;
- Chromium smoke 1/1 PASS;
- automated path proves Create/Open, tiny import, Caption edit, Canvas preview/Apply, deterministic rules Analyze/Apply, Undo/Redo, Save/Reopen;
- no real external AI provider is introduced.

Windows media acceptance in GitHub CI:

- Windows Server 2025 runner;
- exact Chocolatey FFmpeg/ffprobe `9.0.1` installed because the current runner image does not preinstall FFmpeg;
- real-media smoke 1/1 PASS;
- real MP4 native import/probe;
- real MOV normalization to working MP4 with original metadata retained;
- real PNG import;
- real FLAC normalization to M4A and ffprobe verification;
- real SRT parsing into Caption clips;
- real byte Range `206`, `Content-Range`, byte-count and `nosniff` verification;
- one-second 320×180 Final render through the real `NodeRemotionCliAdapter`, followed by ffprobe verification.

Automation authority:

```text
.github/workflows/ci.yml
tests/h6/route-contracts.test.ts
tests/h6/engine-argv-matrix.test.ts
tests/e2e/h6-smoke.spec.ts
tests/h6/windows-media-smoke.test.ts
playwright.config.ts
```

Local validation authority:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H6.md
```

## H6 accepted cloud behavior

### CI and formatting

- obsolete same-branch/PR runs are cancelled through workflow concurrency;
- Ubuntu and Windows run independent clean npm verification;
- H6 formatting is checked through the exact locked Prettier version and does not broadly reformat compact legacy product code;
- CI is read-only; temporary dependency/format helper workflows were removed after generating exact npm/Prettier output.

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

The Playwright smoke intentionally uses the public Command API only to seed a deterministic proof Scene and Caption fixture. All user acceptance actions after seeding are performed through the real UI.

### Windows media smoke

The CI media smoke uses real `MediaImportService`, `NodeFfmpegAdapter`, streaming Range response, `NodeRemotionCliAdapter`, and real generated media fixtures. It is not a mocked substitute for local Windows release acceptance.

## H6 local acceptance gate

H6 is **not merge-ready yet**. Local Codex must validate the exact frozen handoff SHA on the user's Windows environment using an isolated worktree and `VIDEO_OS_DATA_ROOT`.

Required local areas include:

- clean npm install and all code gates;
- real Windows Chrome Playwright/application inspection;
- real MP4/MOV/image/audio/subtitle behavior;
- valid and invalid Range behavior;
- short Final Remotion render;
- HyperFrames `0.8.10` health/lint/check/render on an existing effect;
- representative H2/H3 cancellation/process cleanup regressions;
- video-use focused regression when `VIDEO_USE_ROOT` is configured;
- no H6 `.tmp/.part/.partial` residue and no H6-owned engine/browser processes remaining.

Local Codex may fix only H6 defects, must add regression coverage, and must push fixes to the same H6 branch. It must not merge PR #25 or start H7.

## Accepted prior foundations

### H5 — Project / Data Hardening

Accepted main:

```text
c639ebf2b6b91613b4cb772215599a6bd713638a
```

Authority:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H5.md
```

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
→ only then open the next workstream
```

## Blocked until H6 acceptance and merge

Do not start:

- H7 Frontend Consolidation;
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
6. `docs/validation/LOCAL_VALIDATION_V2_1_1_H6.md`;
7. PR #25 and its latest CI evidence.

If another document conflicts with this file, stop and resolve the conflict instead of guessing.
