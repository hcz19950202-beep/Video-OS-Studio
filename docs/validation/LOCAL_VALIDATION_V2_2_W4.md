# Video OS Studio V2.2-W4 Local Windows Workflow UI Validation

## Final Verdict

PASS — W4 local Windows Workflow UI acceptance passed on the cloud-green exact SHA. PR #35 was not merged and W5 was not started.

## Repository truth

| Field | Evidence |
| --- | --- |
| Repository | hcz19950202-beep/Video-OS-Studio |
| Branch | feature/v2.2-w4-workflow-ui |
| PR | #35 |
| Exact tested SHA | 99a4476613e77563861601eaa07ecb3881bc6219 |
| Cloud CI | Run 32714475263 / #536; Ubuntu, Windows, Browser and Windows media PASS |
| Project Schema | 2.0.0 |
| Engine pins | Unchanged |
| Worktree | Clean |

## Environment

| Component | Evidence |
| --- | --- |
| Windows | Windows 10 Home China, build 19045 |
| Node | 24.19.0 |
| npm | 11.6.2 |
| FFmpeg | 8.1.1-full_build |
| ffprobe | 8.1.1-full_build |
| Python | 3.12.10 |
| video-use | %USERPROFILE%/.codex/skills/video-use; VIDEO_USE_PYTHON=python |
| HyperFrames | 0.8.10 |
| Remotion | 4.0.513 for remotion, @remotion/player and @remotion/cli |
| Playwright | @playwright/test 1.62.1 |

## Source fixture

The source was an existing real talking-head MOV outside the repository. It was not moved or modified and was not committed.

| Field | Evidence |
| --- | --- |
| Fixture name | w2-short-talking-20260824.MOV |
| Type | Real MOV / QuickTime source |
| Duration | 15.015000s |
| Video | H.264, 1080x1920, 60000/1001 fps |
| Audio | AAC, 48000Hz, stereo |
| Speech | Intelligible spoken Chinese; video-use produced 64 timed words and 4 script segments |

## Project and Workflow

| Field | Evidence |
| --- | --- |
| Project ID | w4-real-1787565141226-96aa0882 |
| Workflow ID | c4c8ec10-0b09-4416-906f-35aa67166967 |
| Definition | video-production-talking-head@2 |
| Final Workflow status | completed |
| Final Project revision | 6 |
| Project readback | Schema 2.0.0, 1920x1080, 30fps, 4 caption clips |

## Real browser operation path

Studio Browser → Project → Create Project → Talking Head → real MOV import → AI → Workflow → Generate First Draft → visible CONTENT_REVIEW → Timeline caption selection → Expand inspector → Typography → Font Size = 60 → Project revision 4 → 5 → Approve & Continue → visible ASSEMBLY_REVIEW → Approve & Continue → Motion / B-roll / Audio / Timeline / Preview → FINAL_RENDER → completed → browser reload → Recent Projects reopen → AI → Workflow → Download MP4.

## Stage status table

All 16 stages were completed; no stage was skipped.

| # | Stage | Status | Attempt | Base revision | Job IDs |
| ---: | --- | --- | ---: | ---: | --- |
| 1 | MEDIA_IMPORT | completed | 1 | 1 | — |
| 2 | MEDIA_PROBE | completed | 1 | 1 | — |
| 3 | MEDIA_NORMALIZE | completed | 1 | 1 | — |
| 4 | TRANSCRIBE | completed | 1 | 1 | cdc7a15e-e3ab-4938-8e19-50d4fa97eeca |
| 5 | SCRIPT_ANALYSIS | completed | 1 | 2 | — |
| 6 | SCENE_DETECTION | completed | 1 | 2 | — |
| 7 | CAPTION_GENERATION | completed | 1 | 3 | — |
| 8 | VISUAL_PLANNING | completed | 1 | 4 | — |
| 9 | CONTENT_REVIEW | completed | 1 | 4 | — |
| 10 | MOTION_GENERATION | completed | 1 | 5 | — |
| 11 | BROLL_ASSEMBLY | completed | 1 | 6 | — |
| 12 | AUDIO_ASSEMBLY | completed | 1 | 6 | — |
| 13 | TIMELINE_ASSEMBLY | completed | 1 | 6 | — |
| 14 | PREVIEW | completed | 1 | 6 | — |
| 15 | ASSEMBLY_REVIEW | completed | 1 | 6 | — |
| 16 | FINAL_RENDER | completed | 1 | 6 | 7deb0e86-51ab-4c80-8464-5f19b1ef5ca0 |

## Review checkpoints

| Checkpoint | Base revision | Resolved revision | Status |
| --- | ---: | ---: | --- |
| CONTENT_REVIEW / Checkpoint A | 4 | 5 | approved |
| ASSEMBLY_REVIEW / Checkpoint B | 6 | 6 | approved |

## Manual Project edit

While CONTENT_REVIEW was waiting, the generated caption was selected on the Timeline, the existing Inspector was expanded, Typography was opened, and Font Size was changed to 60 through the UI.

The Project revision changed from 4 to 5. Project readback contains fontSize 60. The operation log records the expected revision 4 mutation applied at revision 5. Final Project revision is 6.

## Workflow-linked Durable Jobs

| Job ID | Type | Status | Attempt | Output |
| --- | --- | --- | ---: | --- |
| cdc7a15e-e3ab-4938-8e19-50d4fa97eeca | video-use-transcribe | completed | 1 | 64 words, 4 script segments |
| 7deb0e86-51ab-4c80-8464-5f19b1ef5ca0 | render-final | completed | 1 | Final H.264/AAC MP4 |

Workflow-linked non-terminal Jobs (queued, preparing, running): NONE.

## assetBaseUrl and non-default port check

The primary automated W4 run persisted assetBaseUrl http://localhost:3000 for its Final Render Job.

A separate bounded check started Studio with npm run dev -- --hostname 127.0.0.1 --port 3017. Studio returned HTTP 200 on /. A video-production-talking-head@2 Workflow was created through the port-3017 API and cancelled without starting engine work. Its persisted value was assetBaseUrl http://localhost:3017. The stored port was 3017, not 3000: PASS.

## Final Render and UI download

| Field | Evidence |
| --- | --- |
| Final Render Job | 7deb0e86-51ab-4c80-8464-5f19b1ef5ca0 |
| Project relative path | render/final-1920x1080-30fps-7deb0e86-51ab-4c80-8464-5f19b1ef5ca0.mp4 |
| UI download | PASS; Download MP4 completed and produced w4-final.mp4 |

## ffprobe

The Project output and downloaded UI file produced the same result:

- video codec: H.264
- audio codec: AAC, 48000Hz, stereo
- width: 1920
- height: 1080
- frame rate: 30/1
- duration: 15.082667s

## Visual inspection

Representative frames were extracted from the final MP4 at approximately t=2s and t=7s.

PASS — both frames were non-empty and showed the real talking-head video, encoded captions and generated motion overlay without black-screen, decode or corrupt-output failure.

## Reload / reopen durability

PASS — after browser reload, the same Project was reopened from Recent Projects; AI → Workflow showed the same completed Workflow ID, approved review state, Final Render state and Download MP4 action.

## Residual process check

PASS — after the automated run and bounded 3017 check, no W4-scoped Node, Python, FFmpeg, ffprobe, Remotion, HyperFrames, Chromium or video-use process remained. Ports 3000 and 3017 had no listeners.

## Commands executed

- git fetch origin
- git switch feature/v2.2-w4-workflow-ui
- git pull --ff-only origin feature/v2.2-w4-workflow-ui
- git status --short
- git rev-parse HEAD
- node --version
- npm ci --no-audit --no-fund
- npm run typecheck
- npm test
- npm ls hyperframes remotion @remotion/player @remotion/cli @playwright/test --depth=0
- W4 environment variables: VIDEO_OS_DATA_ROOT set to an isolated external data root; W4_WINDOWS_WORKFLOW_UI_SMOKE=1; W4_SOURCE_VIDEO set to the real short MOV; VIDEO_USE_ROOT=$HOME/.codex/skills/video-use; VIDEO_USE_PYTHON=python
- npx playwright test tests/e2e/w4-local-real.spec.ts --project=chromium --reporter=list
- npm run dev -- --hostname 127.0.0.1 --port 3017
- ffprobe on the Project final MP4 and downloaded UI MP4
- ffmpeg extraction of representative final MP4 frames

## Fixes and scope

The only fix was the W4 E2E Inspector interaction in tests/e2e/w4-local-real.spec.ts. The test now expands the existing Inspector and asserts the Typography section before editing Font Size. Commit: 99a4476613e77563861601eaa07ecb3881bc6219.

No product code, Project Schema, engine pin, Job architecture, Workflow architecture, credential, secret, raw source media or generated large media was committed.

Final Verdict: PASS

