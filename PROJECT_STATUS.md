# Video OS Studio — Current Project Status

> This file is the single current-state source of truth for GPT Web, local Codex, and other development agents.
> Conversation memory, old PR descriptions, historical PRDs, and prior validation reports are evidence; they do not override this file.

## Status semantics

When read from `main`, this file describes the accepted checkpoint and the next allowed workstream.

When read from a feature branch, status changes are proposed until the PR merges. Resolve live GitHub `main`, branch, PR, and CI SHAs at runtime rather than making this file self-reference its own commit SHA.

## Proposed accepted checkpoint after H3 / PR #22 merge

```yaml
product_version: 2.1.0
released_v2_1_sha: fcfb341367b6ff5e8911693483c14196386c5a93
project_schema: 2.0.0
current_milestone: V2.1.1 Engineering Hardening
last_completed_workstream: H3 Durable Job Runtime
next_allowed_workstream: H4 Streaming Media Pipeline
active_workstream_on_main: none until H4 branch/PR is opened
next_product_milestone: V2.2 Workflow Runtime only after V2.1.1 release
```

Delivery history:

```text
R0 Repository Truth / Agent Guardrails  → PR #17 COMPLETE
H0 Correctness Hotfix                   → PR #19 COMPLETE
H1 Project Transaction Safety           → PR #20 COMPLETE
H2 Engine Process Runtime               → PR #21 COMPLETE
H3 Durable Job Runtime                  → PR #22 COMPLETE after merge
H4 Streaming Media Pipeline             → NEXT
```

## H3 acceptance evidence

```text
PR: #22
Base accepted H2 main: 7a832a5fb04b0826224de0acdd0e56d360e064a3
Frozen cloud input: 74d26ab933c0421dd45c25ae5471a0ffff5ab75d
Local validation final head: 5c9f3a5b3f5c4f196f7bde458529a39cfd73f1d2
Local validation: PASS
Final GitHub verify: PASS
Final local test baseline: 42 files / 171 tests
```

Acceptance authority:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H3.md
```

H3 local Windows acceptance proved:

- durable job storage under `VIDEO_OS_DATA_ROOT/jobs/<jobId>/` with `job.json`, `stdout.log`, `stderr.log`, and `artifacts.json`;
- durable statuses `queued / preparing / running / completed / failed / cancelled / interrupted`;
- Job API and Render compatibility API behavior;
- real Final and Overlay Remotion jobs;
- active cancel through H2 AbortSignal/process-tree termination and same-job retry with incremented attempt;
- real HyperFrames 0.8.10 job with H1-safe Project attachment;
- real FFmpeg media-normalize job;
- real video-use transcribe job with H1-safe Script commit;
- normal server restart preserves completed jobs, outputs, logs, timestamps, and artifacts without rerun;
- controlled unclean restart converts active jobs to retryable `JOB_INTERRUPTED` while queued jobs requeue;
- scheduler limits verified: render=1, HyperFrames=1, normalize=2, transcribe=1, with cross-group concurrency;
- durable log flush/tail behavior and artifact retry semantics;
- stale long-job Project commits fail with `PROJECT_REVISION_CONFLICT` rather than silently overwriting current Project state;
- representative V2.1 browser regression passed;
- no H3-owned residual process remained.

H3 local defects fixed before acceptance:

```text
V2.1.1-H3-LV-001
Windows durable metadata read/write and atomic rename contention.
Fix: per-path serialization across reads, appends and atomic writes; repeated stress produced no EPERM/EEXIST/rename collision or leftover temp files.

V2.1.1-H3-LV-002
Next route workers could falsely classify an active job as interrupted.
Fix: durable runtime-owner marker plus same-root global runtime reuse so route module evaluation inside one server owner does not trigger restart recovery.

V2.1.1-H3-LV-003
Ubuntu concurrency regression could observe status before executor active counters settled.
Fix: test waits for both durable status and executor active counts before asserting concurrency.
```

Non-blocking H3 environment notes:

- local validation used Node 25.2.1 while repository declares Node `24.x`; repository engine declaration remains unchanged;
- two pre-existing `@next/next/no-img-element` lint warnings remain non-blocking;
- synthetic tone transcription produced zero words, but the real video-use process, transcript artifacts, packed transcript, and H1 Script commit path all completed successfully.

## H3 accepted behavior

H3 establishes the durable long-running execution foundation required by V2.1.1:

- long-running work is represented by durable job records rather than request-local in-memory state;
- supported job types are `render-final`, `render-overlay`, `hyperframes-render`, `media-normalize`, and `video-use-transcribe`;
- default concurrency groups are render=1, HyperFrames=1, normalize=2, transcribe=1;
- active cancellation propagates through accepted H2 ToolRunner semantics;
- retry keeps the same job ID, increments attempt, retains history logs, clears transient result/artifact metadata, and does not delete actual media files;
- queued jobs survive restart; previously active jobs become `interrupted` after a true server-owner restart;
- persistent logs and artifacts remain queryable across restart;
- long mutating jobs attach Project results through accepted H1 expectedRevision/operationId safety;
- existing Render routes remain compatibility wrappers over Durable Job Runtime.

## H4 next scope gate

H4 owns **Streaming Media Pipeline** and may begin only after PR #22 merges and the new accepted `main` SHA is resolved from GitHub.

Required direction from the Master PRD:

```text
Upload:
browser File stream
→ temp file
→ byte-limit enforcement
→ probe
→ optional normalize Job
→ Asset registration

Asset/output GET:
stat
→ parse Range
→ createReadStream(start,end)
→ 206
```

H4 must remove GB-scale whole-file buffering from upload and serving paths.

H4 acceptance must cover:

- no `File.arrayBuffer()` for large upload paths;
- streaming temp-file upload with size enforcement and cleanup;
- streaming GET/HEAD for assets and render outputs;
- correct 200/206/416 semantics;
- `Content-Length`, `Content-Range`, `Accept-Ranges`, canonical server MIME, and `X-Content-Type-Options: nosniff`;
- multiple Range forms including open-ended and suffix ranges;
- real large-media Windows upload/serve tests;
- Node heap/RSS evidence showing memory does not scale approximately 1:1 with media file size;
- no regression to H1 transaction safety, H2 engine execution, or H3 durable-job output behavior.

H4 must **not** absorb H5 orphan cleanup/data integrity, H6 broad CI/Playwright expansion, H7 frontend consolidation, Project Schema changes, or V2.2 Workflow Runtime.

## H2 accepted behavior

H2 acceptance authority:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H2.md
```

H2 establishes deterministic external-engine execution:

- shared `NodeToolRunner` uses argv-safe `spawn(..., {shell:false})`;
- timeout/abort, PID metadata, bounded diagnostics, live logs, and Windows process-tree termination are unified;
- Remotion / HyperFrames / FFmpeg / ffprobe / video-use share the same process lifecycle contract;
- Remotion runtime packages are pinned exactly at `4.0.513`;
- HyperFrames is pinned exactly at `0.8.10`.

## H1 accepted behavior

H1 acceptance authority:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H1.md
```

H1 establishes no-silent-lost-update Project mutation safety with per-Project serialization, `expectedRevision`, stable operation IDs, structured 409 conflicts, idempotency, and revision-safe long-job attachment.

## H0 accepted behavior

H0 acceptance authority:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H0.md
```

H0 establishes safe Script A-roll rebuild boundaries, bounded/minimal Caption commits, Linked → Clip → Brand style resolution, and Canvas mutation error/draft cleanup.

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
- filesystem/process/restart/performance evidence;
- real large-media memory evidence for H4.

## Handoff protocol

```text
GPT Web
→ resolve accepted main
→ create one workstream branch
→ implement cloud-safe scope
→ CI green
→ write local validation contract when needed
→ freeze exact green SHA

Local Codex
→ isolated worktree/data root
→ checkout exact frozen SHA
→ follow the active validation contract
→ fix only active-workstream defects
→ push exact code/docs commits to the same branch
→ return FINAL HEAD + evidence

GPT Web
→ review frozen→final diff
→ verify final CI
→ prepare accepted checkpoint
→ merge
→ only then open the next workstream
```

## Current known follow-ups

- H1 deliberate stale imports left orphan media pairs; cleanup remains H5 scope.
- current upload and asset/render output serving still have whole-file buffering paths; H4 owns their streaming rewrite.
- two existing `@next/next/no-img-element` lint warnings remain non-blocking.
- repository runtime engine declaration remains Node `24.x`.
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
6. active validation contract when one exists;
7. active PR diff/CI.

If another document conflicts with this file, stop and resolve the conflict instead of guessing.
