# Video OS Studio — Current Project Status

> This file is the single current-state source of truth for GPT Web, local Codex, and other development agents.
> Conversation memory, old PR descriptions, historical PRDs, and prior validation reports are evidence; they do not override this file.

## Status semantics

When read from `main`, this file describes the accepted checkpoint and the next allowed workstream.

When read from a feature branch, status changes are proposed until the PR merges. Resolve live `main`, branch, PR, and CI SHAs from GitHub rather than making this file self-reference its own commit SHA.

## Proposed accepted checkpoint after H2 / PR #21 merge

```yaml
product_version: 2.1.0
released_v2_1_sha: fcfb341367b6ff5e8911693483c14196386c5a93
project_schema: 2.0.0
current_milestone: V2.1.1 Engineering Hardening
last_completed_workstream: H2 Engine Process Runtime
next_allowed_workstream: H3 Durable Job Runtime
active_workstream_on_main: none until an H3 branch/PR is opened
next_product_milestone: V2.2 Workflow Runtime only after V2.1.1 release
```

Delivery history:

```text
R0 Repository Truth / Agent Guardrails  → PR #17 COMPLETE
H0 Correctness Hotfix                   → PR #19 COMPLETE
H1 Project Transaction Safety           → PR #20 COMPLETE
H2 Engine Process Runtime               → PR #21 COMPLETE after merge
H3 Durable Job Runtime                  → NEXT
```

## H2 acceptance evidence

```text
PR: #21
Base accepted main: 32b419d2a8010f34ed48664a9e87278eec3b36ff
Frozen cloud input: 231a29638ad78c2962d53849146338bf56a0a696
Local validation final head: 6e5b939a4883671422f1040d9f62e8123e9f8c2a
Local validation: PASS
Final GitHub verify on local head: PASS
Test files: 40
Tests: 161
Remotion: 4.0.513 exact
@remotion/player: 4.0.513 exact
@remotion/cli: 4.0.513 exact
HyperFrames: 0.8.10 exact
```

Acceptance authority:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H2.md
```

H2 local acceptance proved:

- literal argv with spaces, shell metacharacters, quotes, and Unicode on Windows;
- `TOOL_TIMEOUT` and `TOOL_ABORTED` terminate owned parent + child process trees;
- bounded stdout/stderr capture while live log callbacks continue;
- Remotion launches through the installed package's real JavaScript bin entry, not runtime `npx --package`;
- a real 3-second 1080x1920 H.264 Remotion render completes and ffprobe validates it;
- real Remotion cancellation leaves no new owned Node/Chrome/FFmpeg process;
- HyperFrames 0.8.10 runs through the installed package bin and passes doctor/lint/check/render sufficiently for product rendering;
- a real 4-second 1080x1920 VP9 HyperFrames WebM is generated and validated;
- HyperFrames abort/timeout cleanup succeeds;
- FFmpeg/ffprobe probe, binary waveform, video normalization, audio normalization, abort and timeout succeed;
- representative video-use/Python execution, abort and timeout succeed;
- browser/application regression succeeds across real MOV import, Caption edit, Canvas edit, save/reopen, Undo/Redo, preview, Remotion render, and HyperFrames add;
- no H2-owned residual process remains after validation.

H2 local defects fixed before acceptance:

```text
V2.1.1-H2-LV-001
Windows path assertion used a POSIX hard-coded path.
Fix: use node:path join in the cross-platform package-root test.

V2.1.1-H2-LV-002
The first regenerated npm lock was incomplete for Ubuntu npm ci.
Fix: add the required cross-platform @emnapi/core and @emnapi/runtime 1.11.3 optional lock entries; subsequent Ubuntu CI passed.
```

Non-blocking H2 environment notes:

- local host used Node 25.2.1 while the repository declares Node `24.x`; keep the repository declaration unchanged unless a future workstream deliberately changes support policy;
- HyperFrames optional Docker / whisper / TTS / BGM tooling is not required for the accepted H2 product path;
- two existing `@next/next/no-img-element` lint warnings remain non-blocking.

## H2 accepted behavior

H2 establishes deterministic external-engine execution:

- shared `NodeToolRunner` uses `spawn(command, argv)` with `shell:false`;
- tool runs expose PID, exit code/signal, duration, bounded diagnostics, live logs, timeout, and AbortSignal cancellation;
- Windows owned process trees terminate through `taskkill /PID <pid> /T /F`;
- Unix owned process groups use TERM → KILL fallback;
- structured `TOOL_TIMEOUT` and `TOOL_ABORTED` survive engine adapter boundaries;
- FFmpeg binary stdout is supported without maxBuffer-style whole-output failure;
- Remotion, HyperFrames, FFmpeg/ffprobe, and video-use/Python share the same process lifecycle contract;
- npm CLIs resolve from the package's actual JavaScript `bin` entry and execute through Node, avoiding `.cmd` shell wrappers;
- normal Remotion and HyperFrames product runtime no longer depends on unpinned runtime `npx` package downloads;
- Remotion runtime packages are aligned exactly at `4.0.513`;
- HyperFrames is pinned at the locally validated exact version `0.8.10`.

## H3 next scope gate

H3 may begin only after PR #21 merges and the new accepted `main` SHA is resolved from GitHub.

H3 owns **Durable Job Runtime**. Required direction from the Master PRD:

```text
statuses:
queued / preparing / running / completed / failed / cancelled / interrupted

storage:
VIDEO_OS_DATA_ROOT/jobs/<jobId>/job.json
VIDEO_OS_DATA_ROOT/jobs/<jobId>/stdout.log
VIDEO_OS_DATA_ROOT/jobs/<jobId>/stderr.log
VIDEO_OS_DATA_ROOT/jobs/<jobId>/artifacts.json

job types:
render-final
render-overlay
hyperframes-render
media-normalize
video-use-transcribe
```

H3 must add durable job records, cancellation/retry APIs, real progress/stages, bounded concurrency, and restart recovery. It must build on the H2 ToolRunner rather than reintroducing engine-specific process management.

H3 must **not** absorb H4 streaming media, H5 orphan cleanup/data hardening, H6 Windows CI expansion, or unrelated editor features into the same PR.

## H1 accepted behavior

H1 established the no-silent-lost-update foundation:

- all durable Project writers use `expectedRevision` and stable operation identifiers;
- per-Project mutation serialization prevents silent overwrite;
- stale writes return structured `409 PROJECT_REVISION_CONFLICT`;
- duplicate identical operations apply at most once;
- operation IDs remain bound to their original payload;
- `operations.jsonl` records pending/applied/aborted audit semantics;
- normal Save does not whole-project PUT;
- Caption Issue #11 was proven fixed with real interleaved stale-write Windows acceptance.

H1 acceptance authority:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H1.md
```

## H0 accepted behavior

H0 established safe Script A-roll rebuild boundaries, bounded/minimal Caption commits, explicit Linked → Clip → Brand style resolution, and Canvas mutation error/draft cleanup.

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

- Windows-only verification and fixes;
- real Remotion/HyperFrames/FFmpeg/video-use processes;
- Chrome/browser behavior;
- real media/render artifacts;
- process-tree, restart, persistence, and performance evidence when required by the active validation contract.

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
→ push exact code/dependency/docs commits to the same branch
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
- two existing `@next/next/no-img-element` lint warnings remain non-blocking.
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
- large UI rewrite unrelated to active hardening defects.

## Read order for agents

1. `PROJECT_STATUS.md`
2. `AGENTS.md`
3. `SYSTEM.md`
4. `docs/prd/Video_OS_Studio_V2_1_1_Engineering_Hardening_Master_PRD.md`
5. active validation contract when one exists
6. current GitHub main / active PR / CI state

If another document conflicts with this file, stop and resolve the conflict instead of guessing.
