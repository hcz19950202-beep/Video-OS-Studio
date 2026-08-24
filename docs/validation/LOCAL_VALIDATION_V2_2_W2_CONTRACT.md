# Video OS Studio V2.2-W2 — Local Windows Validation Contract

> This is the execution contract for Local Codex. It is not acceptance evidence by itself. Do not mark W2 accepted until the exact branch/SHA has been executed locally and an evidence report has been committed.

## Repository truth

```text
Repository: hcz19950202-beep/Video-OS-Studio
Branch: feature/v2.2-w2-stage-integration
PR: #33
Workstream: V2.2-W2 Existing Capability Stage Integration
```

Before any local work:

```powershell
git fetch origin
git switch feature/v2.2-w2-stage-integration
git pull --ff-only origin feature/v2.2-w2-stage-integration
git status --short
git rev-parse HEAD
```

The HEAD must equal the exact cloud-green SHA handed off by GPT Web. If it does not, stop and resolve repository truth before testing.

## What W2 must prove locally

W2 must prove the production Workflow can reuse the real accepted engine stack rather than only fake/cloud-safe adapters:

```text
real source media
→ MediaImportService / ffprobe / normalization when needed
→ WorkflowRun
→ video-use-transcribe Durable Job
→ Script / Scene / Caption / Rules Visual Plan
→ at least one HyperFrames Durable Job
→ Remotion motion suggestions when present
→ Final Render Durable Job
→ encoded MP4
```

The Workflow itself must not directly spawn FFmpeg, video-use, HyperFrames or Remotion. Those tools remain behind existing Services / Durable Job executors / adapters.

## Required local environment

- Windows.
- Node 24.x.
- repository dependencies installed with the lockfile.
- FFmpeg + ffprobe available through the accepted local configuration (`FFMPEG_PATH` / `FFPROBE_PATH` when needed).
- `hyperframes` must resolve from this repository at pinned version `0.8.10`.
- Remotion packages must remain pinned at `4.0.513`.
- video-use skill installed at `VIDEO_USE_ROOT` (default `%USERPROFILE%\.codex\skills\video-use`) with a working Python environment.
- no Project Schema or engine-pin changes are allowed for validation convenience.

Verify first:

```powershell
node --version
npm ci --no-audit --no-fund
npm run typecheck
npm test
```

## Source fixture

Use a **short real talking-head MOV or MP4 containing intelligible speech**. Recommended duration: roughly 8–30 seconds so real transcription and final rendering stay bounded.

Do not modify or move the user's original media. If the source is long, create a short derivative outside the repository and use that derivative as the fixture, for example:

```powershell
ffmpeg -y -ss 00:00:05 -i "E:\path\to\original.mp4" -t 00:00:15 -c:v libx264 -c:a aac "E:\temp\w2-short-talking.mp4"
```

For explicit normalization proof, a short MOV fixture is preferred when available. The acceptance test copies the selected fixture into its isolated data root before `MediaImportService` consumes it.

## Mandatory real-engine test

Set the real source and run only the W2 acceptance test:

```powershell
$env:W2_WINDOWS_WORKFLOW_SMOKE="1"
$env:W2_SOURCE_VIDEO="E:\path\to\short-real-talking.mov"
$env:VIDEO_USE_ROOT="$HOME\.codex\skills\video-use"
$env:VIDEO_USE_PYTHON="python"
npx vitest run tests/w2/windows-workflow-smoke.test.ts --reporter=verbose
```

Optional: set `W2_DATA_ROOT` to a dedicated disposable directory outside the repository if the artifacts need to be inspected after the test. When omitted, the test uses and cleans a temporary isolated data root.

The test intentionally guarantees at least one real HyperFrames `process-flow` suggestion if the spoken source does not naturally cause Rules Visual Planner to choose HyperFrames. This is an **acceptance fixture only**; production planner behavior is not altered.

The test also starts a small local HTTP Range server for Project assets so Remotion can render real source media without launching a second Next.js process or a second server-side Job Runtime.

## Required PASS evidence

The console must include `W2_ACCEPTANCE_EVIDENCE` and the evidence must show:

1. Workflow status = `completed`.
2. All 14 W2 Stage executions completed.
3. Imported source has valid duration/width/height metadata.
4. MOV input, when used, produced a normalized working MP4.
5. A completed `video-use-transcribe` Job is linked to the Workflow.
6. Project Script contains real timed words.
7. Scenes and timed captions exist.
8. At least one completed `hyperframes-render` Job is linked to `MOTION_GENERATION`.
9. HyperFrames output is represented by a Project motion clip and Workflow motion artifact.
10. A completed `render-final` Job is linked to `FINAL_RENDER`.
11. Final MP4 exists and ffprobe reports positive duration and expected `640x360` acceptance canvas.
12. No Workflow-linked Job remains `queued`, `preparing` or `running` after completion.
13. Workflow activity / Stage `jobIds` / artifacts provide a trace from Workflow to concrete engine work.

After the run, inspect at least one frame from the final MP4 and, when practical, one frame from the HyperFrames WebM. Confirm the output is visually non-empty and the generated overlay is not corrupt.

## Failure handling

If acceptance fails:

- diagnose the real root cause first;
- keep fixes strictly inside W2 scope;
- push fixes to the **same branch** `feature/v2.2-w2-stage-integration`;
- do not branch from local-only state;
- do not change Project Schema, engine pins, Real AI Provider scope, or unrelated UI;
- do not bypass a real engine failure by replacing it with a mock.

Typical allowed areas:

```text
lib/workflows/*
lib/server/runtime.ts
W2-specific tests / validation docs
small adapter/service fixes only when the real W2 integration exposes an actual existing-contract defect
```

After any pushed fix, GPT Web must re-check the new GitHub head and CI. The local acceptance must then be rerun on the new accepted exact SHA before W2 merge.

## Required validation report

When PASS is achieved, create:

```text
docs/validation/LOCAL_VALIDATION_V2_2_W2.md
```

The report must include:

```text
Repository
Branch
Exact tested SHA
Windows / Node / FFmpeg / Python versions
video-use root/config
Input fixture name/type/duration (no private absolute path required)
Import + normalization result
Workflow ID / final status
Stage status table
Durable Job table (id/type/status/attempt)
Project revision before/after
Workflow artifact summary
HyperFrames output evidence
Final MP4 path relative to Project + ffprobe result
Visual frame-check result
Residual-process / non-terminal-job check
Commands executed
Any fixes made and pushed SHA(s)
Final verdict: PASS / FAIL
```

Do not commit the user's raw source media, generated large media, private absolute paths, credentials, or local environment secrets.
