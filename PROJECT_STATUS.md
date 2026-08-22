# Video OS Studio — Current Project Status

> This file is the single current-state source of truth for GPT Web, local Codex, and other development agents.
> Conversation memory, old PR descriptions, historical PRDs, and prior validation reports are evidence; they do not override this file.

## Status semantics

When read from `main`, this file describes the accepted checkpoint and the next allowed workstream.

When read from a feature branch, status changes are proposed until the PR merges. Resolve live `main`, branch, PR, and CI SHAs from GitHub rather than making this file self-reference its own commit SHA.

## Accepted main checkpoint

```yaml
product_version: 2.1.0
released_v2_1_sha: fcfb341367b6ff5e8911693483c14196386c5a93
project_schema: 2.0.0
accepted_main_after_h2: 7a832a5fb04b0826224de0acdd0e56d360e064a3
current_milestone: V2.1.1 Engineering Hardening
last_completed_workstream: H2 Engine Process Runtime
active_workstream: H3 Durable Job Runtime
next_allowed_after_h3_acceptance: H4 Streaming Media Pipeline
next_product_milestone: V2.2 Workflow Runtime only after V2.1.1 release
```

Delivery history:

```text
R0 Repository Truth / Agent Guardrails  → PR #17 COMPLETE
H0 Correctness Hotfix                   → PR #19 COMPLETE
H1 Project Transaction Safety           → PR #20 COMPLETE
H2 Engine Process Runtime               → PR #21 COMPLETE
H3 Durable Job Runtime                  → PR #22 ACTIVE
H4 Streaming Media Pipeline             → BLOCKED until H3 acceptance
```

## H3 active workstream

```yaml
branch: hardening/v2.1.1-h3-durable-job-runtime
pull_request: 22
base_main_sha: 7a832a5fb04b0826224de0acdd0e56d360e064a3
cloud_implementation: complete for planned H3 durable-job architecture
latest_green_cloud_code_before_status_checkpoint: 39844f187b574923a3d3b19cba7425b8dee91777
cloud_test_baseline: 41 test files / 168 tests
cloud_ci: green before final status checkpoint
windows_durable_job_validation: pending
merge_status: blocked until local H3 acceptance and final CI
h4_status: blocked
```

The final branch SHA for local Codex must be resolved from GitHub after this status checkpoint itself passes CI. Do not copy a stale SHA from documentation.

## H3 cloud implementation

H3 replaces the old in-memory render-job lifecycle with a file-backed durable runtime built on the accepted H2 ToolRunner.

Durable state:

```text
queued
preparing
running
completed
failed
cancelled
interrupted
```

Durable storage:

```text
VIDEO_OS_DATA_ROOT/jobs/<jobId>/job.json
VIDEO_OS_DATA_ROOT/jobs/<jobId>/stdout.log
VIDEO_OS_DATA_ROOT/jobs/<jobId>/stderr.log
VIDEO_OS_DATA_ROOT/jobs/<jobId>/artifacts.json
```

Supported H3 job types:

```text
render-final
render-overlay
hyperframes-render
media-normalize
video-use-transcribe
```

Default concurrency groups:

```text
render       1
hyperframes  1
normalize    2
transcribe   1
```

Implemented behavior:

- durable `job.json` metadata with stage/progress/attempt/timestamps/input/output/error;
- atomic Windows-safe metadata/artifact writes;
- persistent stdout/stderr files and bounded public log-tail API;
- per-job log write sequencing so a job does not claim terminal completion before queued live-log writes flush;
- queued jobs survive restart and re-enter the scheduler;
- jobs found in `preparing` or `running` after unclean process restart become durable `interrupted` with retryable `JOB_INTERRUPTED`;
- active cancellation propagates through `AbortSignal` into H2 ToolRunner/process-tree cancellation;
- cancellation winning during `preparing` blocks the executor from subsequently entering `running`;
- queued cancellation removes the job from the queue;
- retry keeps the same durable job ID, increments `attempt`, preserves historical logs, clears transient output/error and previous artifact metadata, and does not delete actual media files;
- non-retryable Project revision/conflict-style errors are not blindly retried;
- bounded scheduler slots prevent unbounded external-engine concurrency;
- generic Job API supports create/list/get/cancel/retry/log access;
- existing Render routes remain compatibility wrappers over Durable Job Runtime;
- Final/Overlay Remotion, HyperFrames render, FFmpeg normalization, and video-use transcribe executors route through accepted H2 engine adapters;
- HyperFrames/video-use durable jobs still attach Project results through the accepted H1 revision-safe mutation envelope rather than directly editing `project.json`;
- no H4 streaming upload/range changes are bundled into H3.

Latest green cloud code CI before this status checkpoint:

```text
Install: PASS
Lint: PASS (only the two pre-existing no-img-element warnings)
Typecheck: PASS
Tests: 41 files / 168 tests PASS
Build: PASS
```

## H3 local validation authority

Local Codex must follow:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H3.md
```

Required Windows proof includes:

- clean npm/code gate;
- durable four-file job layout and repeated Windows atomic writes with no leftover temp files;
- Job API and compatibility Render API behavior;
- real status/stage/progress lifecycle;
- real Final and Overlay Remotion durable jobs;
- real active cancel followed by same-job retry;
- real HyperFrames durable job and H1-safe Project attachment;
- real project-relative FFmpeg normalization job without replacing H4 upload behavior;
- real video-use transcribe durable job and H1-safe Script commit;
- completed-job persistence across normal Next server restart;
- controlled unclean-restart harness proving active → interrupted and queued → requeue semantics without intentionally orphaning real engine children;
- Windows scheduler matrix proving render=1, HyperFrames=1, normalize=2, transcribe=1;
- durable log flush/restart/tail semantics;
- artifact metadata retry semantics while actual Final Render output remains on disk;
- Project revision-conflict safety under long jobs;
- representative V2.1 app regression;
- no H3-owned residual external process after real engine tests.

If local validation finds an H3 defect, fix only H3 scope, add regression coverage, push to PR #22, and return the exact new HEAD. GPT Web must review frozen→final diff and re-run final GitHub verification before merge.

## H3 explicit non-goals

Do not implement in PR #22:

- H4 streaming browser upload;
- replacing GB-scale `File.arrayBuffer()` yet;
- streaming asset/output Range responses;
- H4 memory/RSS redesign;
- H5 orphan media cleanup;
- historical schema freeze or migration-chain rewrite;
- H6 Windows CI / broad Playwright acceptance program;
- Project Schema migration;
- real external AI Provider;
- unrelated editor/UI redesign;
- V2.2 Workflow Runtime.

Whole-file Render output serving remains an H4 concern and is not a reason to expand H3 scope.

## H2 accepted evidence

H2 acceptance authority:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H2.md
```

H2 accepted main:

```text
7a832a5fb04b0826224de0acdd0e56d360e064a3
```

H2 established deterministic external-engine execution:

- shared `NodeToolRunner` uses `spawn(command, argv)` with `shell:false`;
- structured timeout/abort, bounded diagnostics, live logs and Windows process-tree termination;
- Remotion / HyperFrames / FFmpeg / ffprobe / video-use share the same lifecycle contract;
- Remotion packages are pinned exactly at `4.0.513`;
- HyperFrames is pinned exactly at `0.8.10`;
- local Windows real-engine validation passed with no H2-owned residual process.

## H1 accepted behavior

H1 established the no-silent-lost-update foundation:

- durable Project writers use `expectedRevision` and stable operation IDs;
- same-Project writes are serialized;
- stale writes return `PROJECT_REVISION_CONFLICT`;
- duplicate identical operations apply at most once;
- operation IDs are bound to their original payload;
- long-running services attach through revision-safe mutation paths;
- normal Save no longer depends on whole-project PUT.

Acceptance authority:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H1.md
```

## H0 accepted behavior

H0 established safe Script A-roll rebuild boundaries, bounded/minimal Caption commits, explicit Linked → Clip → Brand style resolution, and Canvas mutation error/draft cleanup.

Acceptance authority:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H0.md
```

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

- Windows-only verification and H3 local defect fixes;
- real Remotion/HyperFrames/FFmpeg/video-use execution;
- real Next/Chrome/browser behavior;
- durable filesystem/restart/concurrency evidence;
- process-tree and residual-process evidence;
- real media/render artifacts.

## Handoff protocol

```text
GPT Web
→ resolve accepted main
→ implement cloud-safe workstream scope
→ CI green
→ write local validation contract
→ status checkpoint
→ final branch CI green
→ freeze exact SHA

Local Codex
→ new isolated worktree/data root
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
- current media upload / Range/output serving still buffers whole files; H4 owns the streaming rewrite.
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
- multi-timeline;
- arbitrary docking;
- full Crop / Mask engine;
- transition suite;
- generated-media marketplace;
- cloud collaboration;
- HDR / advanced color pipeline;
- desktop packaging work;
- unrelated large UI rewrite.

## Read order for agents

1. resolve current GitHub `main`, branch, PR and CI state;
2. `PROJECT_STATUS.md`;
3. `AGENTS.md`;
4. `SYSTEM.md`;
5. `docs/prd/Video_OS_Studio_V2_1_1_Engineering_Hardening_Master_PRD.md`;
6. `docs/validation/LOCAL_VALIDATION_V2_1_1_H3.md`;
7. PR #22 diff/CI.

If another document conflicts with this file, stop and resolve the conflict instead of guessing.
