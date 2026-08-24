# Video OS Studio V2.2-W2 Local Windows Validation Report

## Verdict

**PASS — V2.2-W2 local exact-SHA acceptance passed.**

This report records the real Windows run required by
`docs/validation/LOCAL_VALIDATION_V2_2_W2_CONTRACT.md`. No product code,
Project Schema, or engine pin was changed.

## Repository truth

| Field | Evidence |
| --- | --- |
| Repository | `hcz19950202-beep/Video-OS-Studio` |
| Branch | `feature/v2.2-w2-stage-integration` |
| PR | `#33` |
| Tested code SHA | `5b13234d9e512adf57f486767d36552fa6d254c7` |
| Workflow definition | `w2-capability-talking-head@1` |
| Project Schema | `2.0.0` |
| Worktree after validation | clean; no code diff |

## Environment

| Component | Version / configuration |
| --- | --- |
| OS | Windows 10 Home China, build `19045` |
| Node | `24.19.0` |
| npm | `11.6.2` |
| FFmpeg / ffprobe | `8.1.1-full_build` |
| Python | `3.12.10` |
| video-use | `%USERPROFILE%\\.codex\\skills\\video-use`; `VIDEO_USE_PYTHON=python` |
| Remotion | `remotion`, `@remotion/player`, `@remotion/cli` all `4.0.513` |
| HyperFrames | `0.8.10` |
| Playwright | `@playwright/test@1.62.1` |

The first dependency attempt used the system Node `25.2.1` and was rejected by
the repository engine requirement; it also hit `EPERM` from pre-existing stale
engine processes. Those processes were stopped, then the contract checks were
rerun with Node `24.19.0`. No repository file was changed by this recovery.

## Commands executed

The canonical contract commands were executed through the Node 24 runtime:

```powershell
node --version
npm ci --no-audit --no-fund
npm run typecheck
npm test

$env:W2_WINDOWS_WORKFLOW_SMOKE="1"
$env:W2_SOURCE_VIDEO="<short real MOV outside the repository>"
$env:W2_DATA_ROOT="<isolated external validation data root>"
$env:VIDEO_USE_ROOT="$HOME\.codex\skills\video-use"
$env:VIDEO_USE_PYTHON="python"
npx vitest run tests/w2/windows-workflow-smoke.test.ts --reporter=verbose
```

Results:

- `npm ci --no-audit --no-fund`: passed.
- `npm run typecheck`: passed.
- `npm test`: passed, `63` test files / `271` tests; `2` files / `2` tests skipped by their existing platform/media guards.
- W2 smoke: passed, `1` test; duration `220.73s`.
- Installed pins read back with `npm ls`: Remotion `4.0.513`, HyperFrames `0.8.10`, Playwright `1.62.1`.

## Real source fixture and import

The fixture was a derivative made outside the repository from a real iPhone
talking-head MOV. The original media was not moved or modified, and neither
the fixture nor generated media was added to Git.

| Field | Evidence |
| --- | --- |
| Fixture | `w2-short-talking-20260824.MOV` |
| Container / duration | MOV / `15.015000s` |
| Video input | H.264, `1080x1920`, `60000/1001` fps |
| Audio input | AAC, `48000Hz`, stereo |
| Imported MIME | `video/quicktime` |
| Normalization | `true`; working asset became project-relative MP4 |
| Working asset | `input/media-e40d758d30952241f339-w2-short-talking-20260824-working.mp4` |
| Imported metadata | `451` frames, `1080x1920`, audio present |

## Workflow result

| Field | Evidence |
| --- | --- |
| Workflow ID | `a000491b-44cf-48a9-bf58-26972a7042c2` |
| Project ID | `w2-real-1787559690582` |
| Final Workflow status | `completed` |
| Stage execution count | `14` |
| Final known Project revision | `6` |

### Stage table

| # | Stage | Status | Attempt | Base revision | Durable Job ID |
| ---: | --- | --- | ---: | ---: | --- |
| 1 | `MEDIA_IMPORT` | `completed` | 1 | 1 | — |
| 2 | `MEDIA_PROBE` | `completed` | 1 | 1 | — |
| 3 | `MEDIA_NORMALIZE` | `completed` | 1 | 1 | — |
| 4 | `TRANSCRIBE` | `completed` | 1 | 1 | `a11f9ada-8358-4063-92bf-f80f1a83d487` |
| 5 | `SCRIPT_ANALYSIS` | `completed` | 1 | 2 | — |
| 6 | `SCENE_DETECTION` | `completed` | 1 | 2 | — |
| 7 | `CAPTION_GENERATION` | `completed` | 1 | 3 | — |
| 8 | `VISUAL_PLANNING` | `completed` | 1 | 4 | — |
| 9 | `MOTION_GENERATION` | `completed` | 1 | 4 | `8147ee4b-41eb-405d-9cf9-f7e25fac9620` |
| 10 | `BROLL_ASSEMBLY` | `completed` | 1 | 6 | — |
| 11 | `AUDIO_ASSEMBLY` | `completed` | 1 | 6 | — |
| 12 | `TIMELINE_ASSEMBLY` | `completed` | 1 | 6 | — |
| 13 | `PREVIEW` | `completed` | 1 | 6 | — |
| 14 | `FINAL_RENDER` | `completed` | 1 | 6 | `81c52d7b-12dd-4373-a5ac-f7aaf3c158ef` |

## Durable Job table

| Job ID | Type | Status | Attempt | Output evidence |
| --- | --- | --- | ---: | --- |
| `a11f9ada-8358-4063-92bf-f80f1a83d487` | `video-use-transcribe` | `completed` | 1 | Project revision `2`; `64` timed words; `4` script segments; transcript JSON and `edit/takes_packed.md` |
| `8147ee4b-41eb-405d-9cf9-f7e25fac9620` | `hyperframes-render` | `completed` | 1 | Project revision `5`; asset `hf-process-flow-0cb81898474052b7`; `animations/hf-process-flow-0cb81898474052b7.webm` |
| `81c52d7b-12dd-4373-a5ac-f7aaf3c158ef` | `render-final` | `completed` | 1 | `render/final-640x360-30fps-81c52d7b-12dd-4373-a5ac-f7aaf3c158ef.mp4`; H.264/AAC final profile |

All three Job IDs are attached to the corresponding Workflow Stage. The
Workflow-linked set is `3` jobs, with `0` jobs in `queued`, `preparing`, or
`running` after completion.

## Project revision and mutation evidence

The Project was created at revision `0`. The persisted operation log shows the
expected revision chain:

```text
media import       0 → 1
video-use          1 → 2
scene transaction  2 → 3
caption transaction 3 → 4
HyperFrames        4 → 5
visual-plan/motion 5 → 6
final render       remains at 6
```

The final Project readback is Schema `2.0.0`, revision `6`, canvas `640x360`
at `30fps` / `451` frames, with `4` script segments, `64` timed words, `2`
scenes, `4` timed caption clips, and `1` HyperFrames motion clip. No duplicate
mutation or revision conflict was observed.

## Workflow artifacts

The Workflow persisted six artifact references:

| Stage | Kind | Relative path / evidence |
| --- | --- | --- |
| `TRANSCRIBE` | `transcript` | `edit/transcripts/media-e40d758d30952241f339-w2-short-talking-20260824-working.json` |
| `TRANSCRIBE` | `transcript` | `edit/takes_packed.md` |
| `SCRIPT_ANALYSIS` | `script-analysis` | `edit/workflow-script-analysis.json`, project revision `2` |
| `VISUAL_PLANNING` | `visual-plan` | `edit/ai-director-plan.json`, project revision `4` |
| `MOTION_GENERATION` | `motion` | `animations/hf-process-flow-0cb81898474052b7.webm` |
| `FINAL_RENDER` | `final-render` | `render/final-640x360-30fps-81c52d7b-12dd-4373-a5ac-f7aaf3c158ef.mp4` |

## Engine output and visual evidence

### HyperFrames

`ffprobe` readback of the Workflow-linked WebM:

```text
VP9 video, 640x360, 30fps, duration 4.000000s, alpha metadata present
```

A real frame extracted at approximately `t=2s` was `25,394` bytes. Visual
inspection showed the `process-flow` overlay (`INPUT → PROCESS → REVIEW →
OUTPUT`) rendered with intact shapes, text, and edges; no blank/corrupt frame
was observed.

### Final Remotion MP4

`ffprobe` readback:

```text
H.264 video, 640x360, 30fps, duration 15.082667s
AAC audio, 48000Hz, stereo
container: MP4; Remotion comment: Made with Remotion 4.0.513
```

Final relative path:

```text
render/final-640x360-30fps-81c52d7b-12dd-4373-a5ac-f7aaf3c158ef.mp4
```

Frames extracted from the final MP4 were non-empty (`182,577` bytes at
approximately `t=2s`; `176,872` bytes at approximately `t=7s`). Visual
inspection showed the real portrait source, encoded captions, and the
HyperFrames process-flow overlay in the final render, with no decode failure,
blank output, or corrupted overlay.

## Residual process and cleanup check

- Before the run, stale local dev/engine processes holding the repository
  runtime were stopped so the Node 24 dependency install could complete.
- After the run, the scoped query for this W2 data root, Vitest, video-use,
  HyperFrames, Remotion render, FFmpeg/ffprobe, and Remotion Chrome-headless
  processes returned `NONE`.
- Ports `3000`, `3017`, and `3018` had no listeners.
- Seventeen pre-existing stale headless Remotion/Playwright processes from an
  older local studio screenshot run were also stopped; no files or media were
  deleted.

## Scope and fixes

- No W2 defect was found.
- No code fix, regression test, Project Schema change, engine-pin change, or
  mock substitution was made.
- No W3 work was started.
- No raw source media, generated media, credentials, secrets, or private
  absolute paths were added to the repository.

## Final gates

| Gate | Result |
| --- | --- |
| Exact tested SHA | PASS |
| Real media import / ffprobe / MOV normalization | PASS |
| Real video-use Durable Job | PASS |
| Script / Scene / Caption / Rules Visual Plan | PASS |
| Real HyperFrames Durable Job | PASS |
| Real Remotion Final Render Durable Job | PASS |
| 14 W2 stages | PASS |
| Project revision and Workflow artifacts | PASS |
| Final encoded MP4 / ffprobe / frame inspection | PASS |
| No Workflow-linked non-terminal Job | PASS |
| No residual W2 engine process | PASS |

**Final verdict: PASS.**
