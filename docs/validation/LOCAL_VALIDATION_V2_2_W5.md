# Video OS Studio V2.2-W5 Local Windows Failure / Retry / Restart Validation

## Verdict

**PASS**

All required W5 chaos scenarios and the final healthy real-browser workflow passed on the exact tested code SHA. No Project Schema, engine pin, or product-code change was made during this acceptance run.

## Repository truth

| Field | Evidence |
|---|---|
| Repository | `hcz19950202-beep/Video-OS-Studio` |
| Branch | `feature/v2.2-w5-failure-retry-restart` |
| PR | #36 |
| Exact tested code SHA | `b1cf950fe1fc7802a2e05c35a3ad0b00f16f1abc` |
| GitHub CI | Run `32839454264` / #561 — Ubuntu, Windows, Browser, Windows Media all PASS |
| Report scope | Report-only change after acceptance; no code change during this run |

## Environment and pins

| Component | Version / configuration |
|---|---|
| Windows | Windows 10 22H2, `10.0.19045`, x64 |
| Node | `v24.19.0` |
| FFmpeg | `8.1.1-full_build-www.gyan.dev` |
| ffprobe | `8.1.1-full_build-www.gyan.dev` |
| Python | `3.12.13` |
| video-use | Local adapter configured through `VIDEO_USE_ROOT` and `VIDEO_USE_PYTHON`; real configured Python/model runtime used |
| HyperFrames | `0.8.10` |
| Remotion | `4.0.513` |
| Playwright | `1.62.1` |
| Project Schema | `2.0.0` |

## Real source fixture

- Type: real talking-head MP4 with clear spoken Chinese speech.
- Duration: `15.018000s`.
- Source probe: H.264/AAC, `1080×1920`, `60000/1001` fps.
- The original source media was not committed and no private source path is recorded here.

## Runtime Boundary Regression

The boundary regression ran before C1–C6.

| Check | Result | Evidence |
|---|---|---|
| Next worker handoff | PASS | Boundary Project `w5-boundary-worker-handoff-43c31982`; real transcribe Job `1ec0f0fd-7fd3-4d76-a09b-6bb35a32cd8b` completed attempt 1. Claimer worker PID changed while `runtimeId=65761123-1a91-46e2-985c-fd8456a5db25` and `runtimeStartedAt` remained unchanged; Job was not interrupted. |
| Real executor death | PASS | Real Remotion PID `45556` was terminated while RuntimeOwner stayed alive. Job `3561966f-d243-4e35-b3c7-f9533e7152c3` became retryable `TOOL_RUN_FAILED`, then fresh attempt 2 completed. |
| True runtime restart | PASS | Job `ad4ed72e-4481-47c9-aea6-f518a5b06041` was active when the isolated runtime tree was killed; restart produced new runtime `d4c770ba-9fe4-4211-a203-8235b7eb57b0` with previous runtime `65761123-1a91-46e2-985c-fd8456a5db25`; old Job became `JOB_INTERRUPTED`, retry attempt 2 completed. |
| Stale revision retry | PASS | W5 hardening tests verified stale expected revision creates a fresh mutation Job and preserves the human edit. |
| Workflow/Job shared RuntimeOwner | PASS | Workflow and Job stores used the single root `.runtime-owner.json`; no nested Workflow/Job owner files. Targeted boundary suite: 32/32 passed. |

## Chaos result table

| Scenario | Workflow / scope | Stage / Job evidence | Result |
|---|---|---|---|
| C1 Transcribe kill/restart/retry | Workflow `db5f544e-2f47-417e-9d28-cb8dc0e6ed37` | `TRANSCRIBE`; Job `49de57bf-4588-4735-997b-d6e89fdf98e9`: attempt 1 interrupted after process-tree kill; attempt 2 completed. Project revision advanced from imported revision 1 to revision 4; transcript/script artifacts were not duplicated. | PASS |
| C2 Commit gap | Deterministic W5 seam | `CAPTION_GENERATION` seam: Project transaction committed, simulated crash before Workflow completion, retry discovered the applied operation. `seed-script` remained applied; revision stayed at 2 after retry and caption count stayed 1. | PASS |
| C3 HyperFrames round 1 | Workflow `db5f544e-2f47-417e-9d28-cb8dc0e6ed37` | `MOTION_GENERATION`; process-flow Job `19aa8497-fb62-4164-b70f-3eaa2266142c`: attempt 1 interrupted, attempt 2 completed. | PASS |
| C3 HyperFrames round 2 | Same Workflow | map-route Job `98c0785b-b523-45d1-ad73-21b6913fa60e`: attempt 1 interrupted, attempt 2 completed. Replay reconciliation recorded fresh completed Job `2eb7d624-6d1b-471b-8e5b-a5c527f62164`; final motion outputs remained terminal and parseable. | PASS |
| C4 Final Render | Same Workflow | `FINAL_RENDER`; Job `34e6ad4c-e97f-43c7-9ed2-8a51aff53ebb`: attempt 1 interrupted, attempt 2 completed. `sourceProjectRevision=8`; no partial output was accepted. | PASS |
| C5 Human edit during long Job | Same isolated Project | Human edit `w5-c5-human-edit` advanced revision 8→9 and renamed the Project. Old Job `a78b34ac-3874-42da-aa80-8701390837b3` failed with `PROJECT_REVISION_CONFLICT` (`expectedRevision=8`, `currentRevision=9`). Fresh Job `1eacc34c-8b4c-4430-adb6-43e1198db53a` used revision 9 and completed at revision 10; human edit preserved. | PASS |
| C6 Retry / replay idempotency | Deterministic W5 seams | W5 hardening, Project concurrency, and history suites passed; historical operation/Job IDs were preserved, applied operations were not duplicated, and repeated retry did not duplicate captions/motion/history. | PASS |

## C2 / C6 operation and history evidence

- `seed-script`: `applied`, revision 1 seed transaction in the commit-gap seam.
- `w5-operation-log-lock`: `applied`, concurrent operation-log read/write proof.
- `w5-c5-human-edit`: `applied`, revision 9 human edit preserved through stale Job failure and fresh retry.
- Deterministic commit-gap derived caption operation: verified `applied` at revision 2; retry mutation call count remained 1.
- Replay history seam retained historical Job `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb` and historical operation `caption-op` while clearing active retry references.

## Final Render stale-revision proof

The W5 deterministic Final Render seam passed:

- old completed render Job: `33333333-3333-4333-8333-333333333333`, source revision 5;
- Project changed to revision 6 before reconcile;
- Workflow rejected the stale output as `WORKFLOW_RENDER_STALE`, retryable;
- fresh render Job: `44444444-4444-4444-8444-444444444444` was created for revision 6.

## Final healthy real-browser workflow

Fresh isolated run through the real UI (`tests/e2e/w4-local-real.spec.ts`) passed in 2.5 minutes.

| Field | Evidence |
|---|---|
| Project | `w4-real-1787656937106-b07fe5c2` |
| Workflow | `44b09067-ce85-44d0-b8ce-2ce18e72af15` |
| assetBaseUrl | `http://localhost:3000` |
| Project revision | 6 |
| UI path | Project → Talking Head → import real source → AI → Workflow → Generate First Draft → edit Typography Font Size → approve Content Review → approve Assembly Review → Download MP4 |
| Human edit | Inspector expanded; Typography visible; Font Size changed; Project revision 4→5 |
| Reload / reopen | PASS; persisted Workflow reopened from Recent Projects |
| UI Download | PASS |

### Final healthy Stage table

| # | Stage | Status | Attempt |
|---:|---|---|---:|
| 1 | `MEDIA_IMPORT` | completed | 1 |
| 2 | `MEDIA_PROBE` | completed | 1 |
| 3 | `MEDIA_NORMALIZE` | completed | 1 |
| 4 | `TRANSCRIBE` | completed | 1 |
| 5 | `SCRIPT_ANALYSIS` | completed | 1 |
| 6 | `SCENE_DETECTION` | completed | 1 |
| 7 | `CAPTION_GENERATION` | completed | 1 |
| 8 | `VISUAL_PLANNING` | completed | 1 |
| 9 | `CONTENT_REVIEW` | completed | 1 |
| 10 | `MOTION_GENERATION` | completed | 1 |
| 11 | `BROLL_ASSEMBLY` | completed | 1 |
| 12 | `AUDIO_ASSEMBLY` | completed | 1 |
| 13 | `TIMELINE_ASSEMBLY` | completed | 1 |
| 14 | `PREVIEW` | completed | 1 |
| 15 | `ASSEMBLY_REVIEW` | completed | 1 |
| 16 | `FINAL_RENDER` | completed | 1 |

### Checkpoints

| Checkpoint | Status | Base revision | Resolved revision |
|---|---|---:|---:|
| `CONTENT_REVIEW` | approved | 4 | 5 |
| `ASSEMBLY_REVIEW` | approved | 6 | 6 |

### Final healthy Jobs and artifacts

| Job ID | Type | Status | Attempt |
|---|---|---|---:|
| `5fa94741-6d24-4c92-ac1d-c09818f9addc` | `video-use-transcribe` | completed | 1 |
| `4a893e67-0f0f-4dd8-9405-ec3bf9f49c2c` | `render-final` | completed | 1 |

Workflow artifacts were parseable and included transcript JSON, packed transcript Markdown, script analysis JSON, visual plan JSON, and the final-render artifact. Final healthy Project contained 1 imported video asset, 4 script segments, 4 caption clips, 2 motion clips, and revision 6.

Final MP4 relative path:

~~~
render/final-1920x1080-30fps-4a893e67-0f0f-4dd8-9405-ec3bf9f49c2c.mp4
~~~

Final healthy ffprobe:

| Field | Result |
|---|---|
| Video codec | H.264 |
| Audio codec | AAC |
| Width × height | 1920 × 1080 |
| FPS | 30/1 |
| Duration | 15.082667s |

Visual inspection: **PASS**. A representative 7-second frame showed a non-empty real talking-head frame with visible subtitles. C4's recovered 640×360 render was also visually inspected and non-empty.

## Startup recovery and cleanup

- C1 first normal API reads after restart observed the recovered interrupted Job and Workflow; no manual recovery command was used.
- Workflow-linked non-terminal Jobs: **NONE**.
- Across the C1/chaos, Runtime Boundary, and final healthy isolated roots: all Jobs terminal; no `.lock` files remained.
- Workflow locks: 0.
- Project locks: 0.
- Operation locks: 0.
- Runtime-owner locks: 0.
- Ports 3000 and 3017: free after acceptance.
- W5-scoped Node/Next, Remotion, HyperFrames, FFmpeg/ffprobe, Chromium, and video-use Python processes: 0.

## Commands executed

~~~
git fetch origin
git switch feature/v2.2-w5-failure-retry-restart
git pull --ff-only origin feature/v2.2-w5-failure-retry-restart
git rev-parse HEAD
git status --short
npm run typecheck
npm run format:check
npm test
npm test -- --maxWorkers=1
npm test -- --maxWorkers=1 tests/runtime-owner-concurrency.test.ts tests/durable-jobs-h3.test.ts tests/workflow-w5-hardening.test.ts
npm test -- --maxWorkers=1 tests/workflow-w5-hardening.test.ts tests/project-repository-w5-concurrency.test.ts tests/history-v2.test.ts
npm run build
npm run test:e2e -- tests/e2e/w4-local-real.spec.ts
ffprobe -v error -show_entries stream=codec_name,codec_type,width,height,r_frame_rate:format=duration -of json <fixture-or-final-mp4>
ffmpeg -y -ss 7 -i <final-mp4> -frames:v 1 <frame>.png
taskkill.exe /PID <isolated-runtime-root> /T /F
~~~

All destructive process kills were limited to explicitly identified isolated W5 runtime or engine process trees. No source video, generated large media, credentials, secrets, or engine caches were committed.

## Fixes and commits

The tested SHA includes the W5-scoped fix commit:

~~~
b1cf950fe1fc7802a2e05c35a3ad0b00f16f1abc
fix(v2.2-w5): persist stable runtime owner for jobs
~~~

It persists the stable RuntimeOwner PID for Job executor liveness checks and adds the live-worker regression test. No further code/config/test changes were made during this acceptance. The only pending repository change is this validation report.

## Final Verdict

**PASS — V2.2-W5 exact-SHA Windows local chaos acceptance complete.**

No merge performed. W6 not started.
