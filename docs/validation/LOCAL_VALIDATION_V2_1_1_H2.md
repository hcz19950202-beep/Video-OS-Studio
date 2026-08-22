# Video OS Studio V2.1.1 H2 — Local Windows Engine Runtime Validation Contract

> Workstream: H2 Engine Process Runtime  
> Branch: `hardening/v2.1.1-h2-engine-runtime`  
> PR: #21  
> Authority: `PROJECT_STATUS.md` + `docs/prd/Video_OS_Studio_V2_1_1_Engineering_Hardening_Master_PRD.md`

## 0. Purpose

H2 proves deterministic local engine/process execution on Windows. It does **not** build H3 durable jobs.

Required H2 outcomes:

- external tools execute through `NodeToolRunner` with literal argv and `shell:false`;
- timeout and `AbortSignal` cancellation terminate the owned Windows process tree;
- stdout/stderr can stream while bounded capture is retained for diagnostics;
- Remotion runs from an exact project-local package version, not runtime `npx --package` downloads;
- HyperFrames runs from an exact project-local package version, not unversioned runtime `npx`;
- FFmpeg/ffprobe and video-use use the same process lifecycle contract;
- paths containing spaces and non-ASCII characters remain literal argv values;
- no residual owned child process remains after success, timeout, or cancellation.

H3 queue persistence, restart recovery, retry scheduling, durable job logs/status, and concurrency slots are out of scope.

## 1. Entry gate

Do not use conversation memory as the project source of truth.

Read in order:

1. `PROJECT_STATUS.md`
2. `AGENTS.md`
3. `SYSTEM.md`
4. `docs/prd/Video_OS_Studio_V2_1_1_Engineering_Hardening_Master_PRD.md`
5. this file
6. PR #21 current state

Create a new isolated worktree, for example:

```powershell
E:\Video-OS-Studio-H2-Validation
```

Use a new isolated runtime root, for example:

```powershell
$env:VIDEO_OS_DATA_ROOT="E:\Video-OS-Data\v2.1.1-h2-validation-<sha>"
```

Before any work:

```powershell
git fetch origin
git checkout hardening/v2.1.1-h2-engine-runtime
git reset --hard <FROZEN_CLOUD_SHA_FROM_GPT_WEB>
git status --short
git rev-parse HEAD
node --version
npm --version
```

`git rev-parse HEAD` must exactly match the frozen cloud SHA supplied by GPT Web. If not, stop.

Record Windows version, Node/npm, Chrome, FFmpeg/ffprobe, Python, and the available video-use root.

The repository declares Node `24.x`. Prefer Node 24 for H2 acceptance when available. If the machine remains on Node 25.x, record the mismatch explicitly; do not silently change the repository engine declaration.

## 2. Phase A — complete the deterministic dependency lock

The cloud implementation intentionally did not hand-edit npm dependency trees.

### H2-D1 — Remotion exact alignment

The accepted pre-H2 lock resolved both existing Remotion packages to `4.0.513`. H2 code expects that runtime family.

Generate a real npm lock update, not a hand-edited lock:

```powershell
npm install --save-exact remotion@4.0.513 @remotion/player@4.0.513 @remotion/cli@4.0.513
```

Requirements after install:

```text
remotion             = 4.0.513 exact
@remotion/player     = 4.0.513 exact
@remotion/cli        = 4.0.513 exact
```

No caret/range is allowed for those three H2 runtime packages.

Verify with npm/package metadata and confirm the `@remotion/cli` package exposes the `remotion` npm bin entry consumed by `resolveProjectNodeBin`.

### H2-D2 — HyperFrames exact validated pin

Do not leave product runtime on `npx hyperframes` or `hyperframes@latest`.

Select an exact HyperFrames candidate using real local evidence. The first candidate may be the current npm release visible at validation time, but **version selection is not accepted merely because it is latest**.

A candidate is valid only if it passes the required H2 HyperFrames doctor/check/render proof below using this repository's generated HyperFrames work directory and templates.

Once a candidate passes, install that exact version into project dependencies:

```powershell
npm install --save-exact hyperframes@<VALIDATED_VERSION>
```

Record the chosen exact version in Actual Results.

If the first candidate fails because of a confirmed CLI regression, do not silently cycle versions. Record the failure/root cause and choose another exact candidate only with evidence.

### H2-D3 — clean-lock reproducibility

After package changes:

```powershell
Remove-Item -Recurse -Force node_modules
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

All must pass.

Verify `package.json` and `package-lock.json` are the only dependency-lock files changed intentionally.

Commit the dependency lock to the H2 branch before final acceptance. This is expected H2 work, not an H3 change.

## 3. ToolRunner Windows process contract

### H2-P1 — literal argv with difficult paths

Use a safe test directory containing both spaces and non-ASCII characters, for example:

```text
E:\Video OS 测试\H2 Engine\
```

Prove a ToolRunner child receives arguments containing:

- spaces;
- `&` or another shell metacharacter;
- quotes;
- non-ASCII characters.

Expected: arguments arrive literally as separate argv entries. No shell interpolation or path splitting occurs.

### H2-P2 — timeout kills an owned process tree

Create a temporary validation-only Node fixture outside committed source or under the isolated data root:

```text
parent Node process
  -> child Node process that stays alive
```

Run the parent through `NodeToolRunner` with a short timeout.

Expected:

- result rejects as `ToolTimeoutError` / code `TOOL_TIMEOUT`;
- the parent PID terminates;
- the child PID terminates;
- `Get-Process -Id <pid>` cannot find either after the bounded cleanup period;
- no unrelated process is killed.

Do not commit the validation-only infinite-loop fixture.

### H2-P3 — AbortSignal kills an owned process tree

Repeat the owned parent/child fixture using `AbortController` instead of timeout.

Expected:

- result rejects as `ToolAbortedError` / code `TOOL_ABORTED`;
- parent and child are both gone;
- no unhandled Promise rejection;
- next ToolRunner execution succeeds.

### H2-P4 — bounded logs

Run a safe fixture that emits stdout/stderr larger than the configured capture limit while also using `onLog`.

Expected:

- live callback receives output;
- retained diagnostic output is bounded to the configured tail size;
- process completes without maxBuffer-style failure.

## 4. Remotion real runtime proof

Use the exact project-local `@remotion/cli@4.0.513` installed in Phase A.

### H2-R1 — no npx fallback

Prove `NodeRemotionCliAdapter` resolves:

```text
node_modules/@remotion/cli/package.json
  -> bin.remotion
  -> node <remotion-cli.js> ...argv
```

Expected:

- process command is Node, not `npx` / `npx.cmd`;
- no `--package @remotion/cli...` exists;
- CLI package version equals `4.0.513`;
- `remotion` and `@remotion/player` also equal `4.0.513`.

### H2-R2 — real 2–5 second render

Create/open an isolated simple project and render a short Final output through the normal application/service path where practical.

Expected:

- output MP4 exists and is non-empty;
- ffprobe reports plausible width/height/FPS/duration;
- ToolRunner emits process metadata/logs;
- no residual Remotion/Chrome/FFmpeg child remains after completion;
- source media / Project Canvas / Export Profile separation is preserved.

### H2-R3 — cancellation

Start a render long enough to cancel safely and abort it through the adapter/ToolRunner execution option or a focused local harness around the real adapter.

Expected:

- `TOOL_ABORTED` is preserved, not flattened into a generic engine error;
- Remotion Node process and owned Chrome/FFmpeg descendants terminate;
- partial output is not mistaken for completed output;
- a subsequent render can start normally.

Do not implement H3 durable job cancellation APIs in order to perform this test.

## 5. HyperFrames real runtime proof

### H2-H1 — exact project-local CLI

Confirm `resolveProjectNodeBin("hyperframes","hyperframes")` resolves the installed package's real JS bin entry and launches it with Node.

Expected:

- no `.cmd` shell wrapper is required;
- no product runtime `npx hyperframes` call occurs;
- `HYPERFRAMES_NO_UPDATE_CHECK=1` is present for product execution;
- exact package version is recorded.

### H2-H2 — doctor/check/render

Use at least one existing Video OS HyperFrames effect, preferably `process-flow`; if practical also test `map-route`.

Run real local health verification and the adapter path.

Expected:

- HyperFrames environment/doctor is healthy enough to render;
- generated work directory passes `lint --json`;
- generated work directory passes `check --json`;
- transparent WebM is produced;
- output is non-empty and ffprobe-readable;
- no residual Chrome/FFmpeg/HyperFrames Node process remains.

If `--strict` blocks a pre-existing template warning, classify whether it is an H2 runtime defect or a content/template defect before changing code. Do not weaken the process contract merely to hide a real warning.

### H2-H3 — cancellation/timeout

Run one safe HyperFrames operation that can be cancelled or deliberately given a bounded timeout.

Expected:

- structured `TOOL_ABORTED` or `TOOL_TIMEOUT` survives;
- owned browser/process tree terminates;
- next HyperFrames operation succeeds.

## 6. FFmpeg / ffprobe proof

Use a real MP4/MOV/audio sample outside the repository.

### H2-F1 — normal operations

Verify:

- ffprobe works through ToolRunner;
- waveform extraction works with binary stdout mode;
- one representative video normalization works;
- one representative audio normalization works if a safe sample is available.

Paths should include at least one space/non-ASCII case.

### H2-F2 — cancellation/timeout

Start a sufficiently long normalization and cancel it, or use a focused real FFmpeg invocation through the adapter with an intentionally short timeout.

Expected:

- structured abort/timeout error;
- ffmpeg process is gone;
- no child process remains;
- subsequent ffprobe/normalization succeeds.

## 7. video-use proof

Use the configured local video-use skill/runtime if present.

Verify at minimum:

- Python executable resolves;
- `VIDEO_USE_ROOT` helpers exist;
- Prepare/transcribe or another representative helper executes through ToolRunner;
- paths with spaces remain literal;
- stdout/stderr handling is healthy;
- one timeout/abort proof is performed where safe;
- no residual Python/FFmpeg child remains after abort.

If local video-use dependencies are genuinely unavailable, record the exact missing dependency as a remaining H2 failure rather than hiding it with `NOT REQUIRED`.

## 8. App regression boundary

After engine validation, run a representative application regression:

```text
Create/Open project
Media import
Caption edit
Canvas edit
Save/Reopen
Undo/Redo
Preview playback
Final short Remotion render
HyperFrames effect render/add when validated
```

No H3 queue/persistence implementation is allowed.

## 9. Defect handling

Use IDs:

```text
V2.1.1-H2-LV-001
V2.1.1-H2-LV-002
...
```

For every defect record:

- reproduction;
- expected;
- actual;
- root cause;
- process/child evidence;
- changed files;
- regression test;
- commit SHA;
- local evidence.

Fix only H2 defects on:

```text
hardening/v2.1.1-h2-engine-runtime
```

After any code/dependency fix:

```powershell
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
git push origin hardening/v2.1.1-h2-engine-runtime
```

Do not merge locally. Do not start H3.

## 10. Explicitly prohibited in H2

Do not implement:

- persistent Job Store;
- queued/preparing/running/completed durable job state machine;
- retry scheduling;
- restart recovery;
- job concurrency slots;
- persistent stdout/stderr job files;
- H4 streaming upload/range work;
- H5 orphan media cleanup;
- Project Schema changes;
- real AI Provider;
- unrelated UI redesign.

Those belong to later workstreams.

## 11. Final report format

Return exactly:

```text
BRANCH:
FINAL HEAD:
FROZEN INPUT HEAD:
LOCAL WORKTREE:
LOCAL DATA ROOT:
WINDOWS:
NODE/NPM:
CHROME:
PYTHON:
FFMPEG/FFPROBE:

REMOTION VERSIONS:
HYPERFRAMES VERSION:
DEPENDENCY LOCK: PASS/FAIL
CLEAN NPM CI: PASS/FAIL
CODE CHECKS: PASS/FAIL
TOOLRUNNER ARGV: PASS/FAIL
WINDOWS TREE TIMEOUT: PASS/FAIL
WINDOWS TREE ABORT: PASS/FAIL
BOUNDED LOGS: PASS/FAIL
REMOTION REAL RENDER: PASS/FAIL
REMOTION ABORT: PASS/FAIL
HYPERFRAMES CHECK/RENDER: PASS/FAIL
HYPERFRAMES ABORT/TIMEOUT: PASS/FAIL
FFMPEG/FFPROBE: PASS/FAIL
FFMPEG ABORT/TIMEOUT: PASS/FAIL
VIDEO-USE: PASS/FAIL
APP REGRESSION: PASS/FAIL

DEFECTS FIXED:
COMMITS PUSHED:
REMAINING FAILURES:
RESIDUAL OWNED PROCESSES:

MERGE RECOMMENDATION: YES/NO
```

If validation documentation itself creates the final commit, return that new documentation HEAD accurately.

## Actual Results / Final Result — 2026-08-23

The following results are from the isolated Windows run after the E: drive was
cleaned. The H2 input was kept frozen at `231a29638ad78c2962d53849146338bf56a0a696`.

```text
BRANCH: hardening/v2.1.1-h2-engine-runtime
FINAL HEAD: c9d9d5ad9e5a4edcfabca9ff8848c1c7918b45ac before this validation record; the documentation commit is the final pushed HEAD reported in the handoff
FROZEN INPUT HEAD: 231a29638ad78c2962d53849146338bf56a0a696
LOCAL WORKTREE: E:\Video-OS-Studio-H2-Validation
LOCAL DATA ROOT: E:\Video-OS-Data\v2.1.1-h2-validation-231a2963
WINDOWS: Windows 10 Home Simplified Chinese 10.0.19045 x64
NODE/NPM: Node v25.2.1 / npm 11.6.2 (project engine warning: 24.x expected)
CHROME: 151.0.7922.138 via local Chrome CDP
PYTHON: 3.12.10; video-use isolated venv at E:\Video-OS-Data\v2.1.1-h2-validation-231a2963\video-use-venv with Pillow 12.3.0 and numpy 2.5.2
FFMPEG/FFPROBE: 8.1.1-full_build-www.gyan.dev

REMOTION VERSIONS: remotion 4.0.513; @remotion/cli 4.0.513; @remotion/player 4.0.513
HYPERFRAMES VERSION: 0.8.10 exact npm dependency; doctor/lint/check/render all ran through the local package bin
DEPENDENCY LOCK: PASS — package.json and package-lock.json lock the exact H2 runtime versions; no npx runtime fallback
CLEAN NPM CI: PASS — npm ci completed from the committed lock; the host blocked the separate manual node_modules removal command, but npm ci performed the clean reinstall successfully
CODE CHECKS: PASS — lint (0 errors, 2 existing no-img-element warnings), typecheck, 40 test files / 161 tests, and build
TOOLRUNNER ARGV: PASS — literal spaces, ampersand, quote, Unicode, stdout/stderr and PID metadata verified under E:\Video OS 测试\H2 Engine\argv & 非ASCII
WINDOWS TREE TIMEOUT: PASS — TOOL_TIMEOUT returned and parent/child PIDs were absent afterwards
WINDOWS TREE ABORT: PASS — TOOL_ABORTED returned and parent/child PIDs were absent afterwards
BOUNDED LOGS: PASS — stdout/stderr each capped at 1024 bytes while live log events remained bounded
REMOTION REAL RENDER: PASS — normal service path produced E:\Video-OS-Data\v2.1.1-h2-validation-231a2963\projects\h2-remotion-acceptance-107b41f6\render\final-1080x1920-30fps-385859b3-b98e-4a35-8403-e73d863df488.mp4; ffprobe h264 1080x1920 30/1, duration 3.000s
REMOTION ABORT: PASS — real adapter cancellation returned ToolAbortedError and left no new owned node/Chrome/FFmpeg process
HYPERFRAMES CHECK/RENDER: PASS — doctor, lint, strict check and strict render passed; direct E: output was 1080x1920 VP9 WebM, 30/1, 4.000s; browser app retry after E: cleanup returned HTTP 200 and wrote the E: project overlay asset
HYPERFRAMES ABORT/TIMEOUT: PASS — both adapter paths returned ToolAbortedError/ToolTimeoutError and left no new owned process
FFMPEG/FFPROBE: PASS — real probe, 160-point waveform, normalized H.264/AAC video and normalized AAC audio completed; outputs were ffprobe-valid
FFMPEG ABORT/TIMEOUT: PASS — both real adapter paths returned the expected abort/timeout errors and left no new owned process
VIDEO-USE: PASS — real timeline_view completed with the isolated Python environment; PNG output exists; abort/timeout paths returned expected errors with no owned residuals
APP REGRESSION: PASS — local Chrome CDP opened/recovered the project, imported a real .MOV, edited Caption Inspector, edited canvas state, exercised save/reopen/undo/redo/preview, completed the real Remotion render, and added HyperFrames process-flow in the browser; project revision advanced 6 -> 7 and the HyperFrames asset is present in E:\Video-OS-Data\v2.1.1-h2-validation-231a2963\projects\h2-remotion-acceptance-107b41f6\animations\hf-process-flow-d31e50f048a245f6.webm (VP9, 1080x1920, 30/1, 4.000s)

DEFECTS FIXED: V2.1.1-H2-LV-001 — made the existing package-root assertion platform-aware on Windows by using node:path join; this was a test portability defect exposed by the H2 clean Windows run
COMMITS PUSHED: c9d9d5ad9e5a4edcfabca9ff8848c1c7918b45ac (H2 dependency lock and regression test); this Actual Results section is the follow-up documentation commit
REMAINING FAILURES: No H2 product failures. Non-blocking environment notes: npm EBADENGINE warning because the host has Node 25 while the project declares 24.x; HyperFrames doctor reported low available memory, Docker unavailable, and optional whisper/TTS/BGM tools absent; two existing ESLint warnings remain. The first HyperFrames app attempt occurred before E: cleanup with only about 1 GB free and failed for low disk; the required retry after cleanup passed.
RESIDUAL OWNED PROCESSES: none observed after the H2 server and harnesses were stopped; an unrelated pre-existing Chrome renderer was not owned by H2

MERGE RECOMMENDATION: YES — H2 local Windows acceptance passed after the documented H2-only test fix and exact dependency lock. Keep PR #21 unmerged until the separate GPT Web review/merge decision; do not start H3.
```
