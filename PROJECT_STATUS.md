# Video OS Studio — Current Project Status

> This file is the single current-state source of truth for GPT Web, local Codex, and other development agents.
> Conversation memory, old PR descriptions, historical PRDs, and prior validation reports are evidence; they do not override this file.

## Status semantics

When read from `main`, this file describes the accepted checkpoint and the next allowed workstream.

When read from a feature branch, status changes are proposed until the PR merges. Resolve live GitHub `main`, branch, PR, and CI SHAs at runtime rather than making this file self-reference its own commit SHA.

## Accepted main + active workstream

```yaml
product_version: 2.1.0
released_v2_1_sha: fcfb341367b6ff5e8911693483c14196386c5a93
project_schema: 2.0.0
accepted_main_after_h3: 0abaa07d715087631644f62e7e6d6c075125a1b3
current_milestone: V2.1.1 Engineering Hardening
last_completed_workstream: H3 Durable Job Runtime
active_workstream: H4 Streaming Media Pipeline
next_allowed_after_h4_acceptance: H5 Project / Data Hardening
next_product_milestone: V2.2 Workflow Runtime only after V2.1.1 release
```

Delivery history:

```text
R0 Repository Truth / Agent Guardrails  → PR #17 COMPLETE
H0 Correctness Hotfix                   → PR #19 COMPLETE
H1 Project Transaction Safety           → PR #20 COMPLETE
H2 Engine Process Runtime               → PR #21 COMPLETE
H3 Durable Job Runtime                  → PR #22 COMPLETE
H4 Streaming Media Pipeline             → PR #23 ACTIVE
H5 Project / Data Hardening             → BLOCKED
```

## H4 active state

```yaml
branch: hardening/v2.1.1-h4-streaming-media
pull_request: 23
base_main_sha: 0abaa07d715087631644f62e7e6d6c075125a1b3
cloud_implementation: complete for planned streaming architecture
cloud_ci: final checkpoint pending
windows_large_media_validation: pending
merge_status: blocked until local acceptance and final CI
h5_status: blocked
```

H4 cloud implementation now includes:

- normal Studio upload changed from multipart `FormData` to raw browser `File` body plus `fileName`, `expectedRevision`, and `operationId` query metadata;
- server media route consumes `request.body` as a Web stream rather than `request.formData()` / `File.arrayBuffer()`;
- upload is staged under Project `.uploads/<uuid>.part` with byte counting, 2 GB enforcement, backpressure, abort handling, and partial-file cleanup;
- `MediaImportService` accepts staged file paths so large normal uploads do not require a full `Uint8Array` payload;
- native files are moved into Project storage and unstable formats may still normalize through accepted H2 FFmpeg behavior;
- Asset GET/HEAD uses `stat + createReadStream(start,end)` rather than full `readBinary()`;
- Render output GET/HEAD uses the same streaming file response path;
- single byte-range support covers bounded, open-ended, and suffix ranges;
- HTTP serving includes 200/206/416, `Content-Length`, `Content-Range`, `Accept-Ranges`, canonical server-side MIME, `Cache-Control`, and `X-Content-Type-Options: nosniff`;
- filesystem adapter supports staged-file move with Windows/local-filesystem behavior and EXDEV copy/remove fallback;
- H4 unit coverage exercises full/ranged/HEAD responses, 416, canonical MIME, upload byte limits, partial cleanup, and staged-file import.

The H4 Windows authority is:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H4.md
```

Local acceptance must provide real large-media memory evidence. H4 is not accepted merely because unit tests pass.

## H4 local merge gates

Local Codex must prove on the exact GPT Web frozen SHA:

- clean npm install/lint/typecheck/test/build;
- normal browser Media import sends a raw File/Blob body, not multipart FormData;
- real large upload stages progressively and does not cause Node server memory growth approximately 1:1 with file size;
- validation-only helper harness records `process.memoryUsage()` and real filesystem streaming behavior;
- upload abort removes partial `.part` files and performs no Project mutation;
- 2 GB limit returns 413 without retaining a partial upload;
- native MP4 and normalized MOV imports remain correct;
- a stale `expectedRevision` during long import cannot overwrite a newer Project revision;
- Asset GET/HEAD and Range matrix return correct 200/206/416 headers and exact bytes;
- Asset serving memory remains bounded during large full/range transfers;
- browser playback/seek works with Range requests;
- H3 Final/Overlay outputs remain durable and stream through GET/HEAD/Range correctly;
- canonical MIME and `nosniff` are preserved;
- no unexpected H4 temp files, file handles, or owned processes remain;
- H0/H1/H2/H3 representative regression remains healthy.

Practical large-stream memory ceilings in the validation contract are:

```text
peak server/helper RSS delta / file size < 0.50
peak helper heapUsed delta / file size < 0.20
```

Actual MB values and ratios must be recorded. The goal is to prove the application no longer buffers the complete large media payload.

## H4 explicit non-goals

Do not implement in PR #23:

- H5 orphan media cleanup;
- historical-schema freeze or migration-chain rewrite;
- Project referential-integrity expansion;
- Recent Project indexing;
- H6 broad Windows CI / Playwright program;
- H7 frontend consolidation;
- Project Schema migration;
- real external AI Provider;
- V2.2 Workflow Runtime.

A stale upload may leave already-moved/normalized media after a revision conflict; record it for H5 rather than expanding H4 into orphan cleanup.

## H3 acceptance evidence

```text
PR: #22
Base accepted H2 main: 7a832a5fb04b0826224de0acdd0e56d360e064a3
Frozen cloud input: 74d26ab933c0421dd45c25ae5471a0ffff5ab75d
Local validation final head: 5c9f3a5b3f5c4f196f7bde458529a39cfd73f1d2
Post-H3 checkpoint: 609a8a81f606fd575d689d54b021bc4680c0d457
Accepted H3 main: 0abaa07d715087631644f62e7e6d6c075125a1b3
Local validation: PASS
Final local test baseline: 42 files / 171 tests
```

Acceptance authority:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H3.md
```

H3 established durable file-backed jobs, cancellation/retry/restart recovery, bounded concurrency, durable logs/artifacts, real engine jobs, and H1-safe long-job Project attachment.

## H2 accepted behavior

Acceptance authority:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H2.md
```

H2 established deterministic shared ToolRunner execution and exact runtime pins:

```text
remotion             4.0.513
@remotion/player     4.0.513
@remotion/cli        4.0.513
hyperframes          0.8.10
```

## H1 accepted behavior

Acceptance authority:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H1.md
```

H1 established per-Project serialization, `expectedRevision`, stable operation IDs, idempotency, structured revision conflicts, and revision-safe long-task attachment.

## H0 accepted behavior

Acceptance authority:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H0.md
```

H0 established safe Script A-roll rebuild boundaries, bounded/minimal Caption commits, Linked → Clip → Brand style resolution, and Canvas mutation error/draft cleanup.

## Architecture invariants

Always preserve:

```text
Source Media != Project Canvas != Export Profile
```

And:

1. Project JSON is the durable project source of truth.
2. Canonical timeline timing is frame-based.
3. Durable edits use validated Commands / Transactions / bounded services.
4. UI modules do not spawn FFmpeg, Remotion, HyperFrames, or video-use directly.
5. Agents do not directly hand-edit runtime `project.json`.
6. Remotion remains the master composition engine.
7. HyperFrames remains the deterministic complex-motion asset engine.
8. `VIDEO_OS_DATA_ROOT` remains outside repository code by default.
9. Studio UI theme/locale are separate from generated-video Brand.
10. `REUSE > MODIFY > CREATE`.

## Development split

### GPT Web + GitHub owns

- architecture and PRD decisions;
- cloud-safe implementation;
- branch/PR/CI/review/merge;
- cloud unit/contract tests;
- review of local Codex fixes;
- accepted checkpoint maintenance.

### Local Codex owns

- Windows-only verification and active-workstream fixes;
- real browser/media/engine behavior;
- filesystem/process/performance evidence;
- H4 real large-media RSS/heap evidence.

## Handoff protocol

```text
GPT Web
→ resolve accepted main
→ create one workstream branch
→ implement cloud-safe scope
→ CI green
→ write local validation contract
→ final branch CI green
→ freeze exact SHA

Local Codex
→ new isolated worktree/data root
→ checkout exact frozen SHA
→ follow active validation contract
→ fix only active-workstream defects
→ push exact code/docs commits to same branch
→ return FINAL HEAD + evidence

GPT Web
→ review frozen→final diff
→ verify final CI
→ prepare accepted checkpoint
→ merge
→ only then open next workstream
```

## Current known follow-ups

- H1 deliberate stale imports left orphan media pairs; cleanup remains H5 scope.
- H4 validation may produce stale-import orphan media by design; cleanup remains H5 scope.
- two existing `@next/next/no-img-element` lint warnings remain non-blocking.
- repository runtime engine declaration remains Node `24.x`; prior local runs used Node 25.2.1 and recorded the warning.
- Issue #10 is closed by V2.1 MOV normalization.
- Issue #11 is closed by H0 + H1 stale Caption protection.
- PR #13 is closed as superseded by the V2.1 release path.

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
6. active validation contract;
7. active PR diff/CI.

If another document conflicts with this file, stop and resolve the conflict instead of guessing.
