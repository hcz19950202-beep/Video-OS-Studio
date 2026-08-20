# Video OS Studio V1 — Windows Local Validation

This checklist begins **after** the historical Phase 0 validation in `LOCAL_VALIDATION.md`.

Do not mark a phase `LOCAL VERIFIED`, `PRD ACCEPTED` or `RENDER VERIFIED` unless the listed real Windows checks have actually been performed.

## Environment

Record before testing:

```text
OS:
Node:
npm:
FFmpeg:
ffprobe:
Chrome/Chromium:
VIDEO_OS_DATA_ROOT:
VIDEO_USE_ROOT:
VIDEO_USE_PYTHON:
REMOTION_CLI_PATH / package:
HyperFrames doctor:
```

Run baseline checks:

```powershell
git fetch origin
git checkout feature/phase-0-foundation
git pull
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run dev
ffmpeg -version
ffprobe -version
```

---

## Phase 1 — Project UI / real media

- [x] Create a project in the browser.
- [x] Confirm it is written under `VIDEO_OS_DATA_ROOT\projects`.
- [x] Import a real MP4.
- [x] Confirm ffprobe-derived duration, size and FPS metadata appear.
- [x] Player can play/pause/seek the real MP4 without critical console errors.
- [x] Fit / 100% / Safe controls work.
- [x] Switch 9:16 / 16:9 / 1:1 and confirm Player updates.
- [x] Save, refresh/restart the app, reopen the project and confirm state restores.
- [x] `project.json` contains only relative asset paths.
- [x] `project.backup.json` is created after subsequent saves.

Status:

```text
CODE COMPLETE: PASS
CLOUD VERIFIED: PENDING (Acceptance Closure changes await GitHub CI)
LOCAL VERIFIED: PASS
PRD ACCEPTED: PASS
```

## Phase 2 — Timeline

- [x] Five tracks are visible: Video / Captions / Motion / B-roll / Audio.
- [x] Timeline click moves the Remotion Player playhead.
- [x] Move a clip and confirm frame position persists after reload.
- [x] Resize a clip and confirm duration persists.
- [x] Duplicate and delete work.
- [x] Timeline zoom works.
- [x] Track lock prevents dragging.
- [x] Track hide state persists and is restored.

## Phase 3 — Effect Registry

For each built-in Remotion effect:

- [x] Big Number
- [x] Metric Focus
- [x] Keyword Impact
- [x] Lower Third

Verify:

- [x] Add from Library at current playhead.
- [x] A Motion clip is created in the Timeline.
- [x] Big Number renders in the Remotion Player and final MP4; the other catalog entries were added and created clips.
- [x] Save/reopen preserves the Motion clips.

## Phase 4 — Schema Inspector

- [x] Selecting a Motion clip opens the generic Inspector.
- [x] Text updates preview.
- [x] Number updates preview.
- [x] Color updates preview.
- [x] Select updates preview.
- [x] Switch updates preview.
- [x] Slider updates preview.
- [x] Changes persist through Project Commands after reload.

## Phase 5 — Captions

- [x] Import a Chinese SRT.
- [x] Import a VTT.
- [x] Cues become frame-based Caption clips.
- [x] Caption timing is frame based and appears in the rendered output.
- [x] Primary preset works.
- [x] Minimal preset works.
- [x] Bold preset works.
- [x] Number emphasis works.
- [x] Keyword emphasis works.
- [x] Caption layer remains readable above Motion overlays.
- [x] Chinese font fallback is acceptable on Windows for the tested SRT.

## Phase 6 — Remotion render

The app defaults to the pinned `@remotion/cli@4.0.506` through `npx`. A matching local CLI may be supplied with `REMOTION_CLI_PATH`.

- [x] Export a real final MP4.
- [x] Export a transparent overlay WebM.
- [x] Failed render displays an actionable error and Retry works.
- [x] Download endpoint exposes the completed render.
- [x] Run `ffprobe` on final MP4 and record codec, dimensions, duration and FPS.
- [x] Run `ffprobe` on overlay WebM and confirm VP9, `alpha_mode=1`, and no audio stream.
- [x] Extract beginning/middle/end frames and visually inspect them.
- [x] Confirm final MP4 includes A-roll + Motion + Captions.
- [x] Confirm overlay excludes A-roll/background at the Remotion PNG stage and carries WebM `alpha_mode=1`; see the decoder caveat below.

Status after all checks:

```text
RENDER VERIFIED: PASS
```

## Phase 7 — HyperFrames

Run first (the installed CLI marks `inspect` deprecated, so the adapter now uses `check`):

```powershell
npx hyperframes doctor
```

Then verify both blocks:

- [x] Process Flow renders.
- [x] Map Route renders.
- [x] HyperFrames lint and `check` pass on both generated workspaces.
- [x] Transparent WebM is produced.
- [x] WebM overlays correctly in the final Remotion composition.
- [x] Same parameters reuse the cached Map Route asset when a preset is used.
- [x] A failed render surfaces an actionable error (the first Map Route lint failure was shown in Studio).

## Phase 8 — video-use

Configure a real stable `VIDEO_USE_ROOT` containing `SKILL.md` and `helpers/` plus its own required credentials/dependencies.

- [x] `Transcribe + Pack` runs on a real talking-head MP4.
- [x] `takes_packed.md` is produced and shown in Studio.
- [x] Word-level timestamps are plausible (337 monotonic faster-whisper words, 0.00–73.22 s for a 74.633333 s source).
- [x] Create/review a confirmed EDL.
- [x] Apply EDL before Motion/B-roll/Audio design.
- [x] EDL seconds convert to frame-based Video clips.
- [x] `sourceStartFrame` is persisted in the rough-cut Video clips.
- [x] Existing captions remap correctly through kept ranges.
- [x] Attempting rough cut after Motion/B-roll/Audio exist is blocked rather than silently corrupting timing.
- [x] Run video-use timeline QA on relevant boundaries where available.

## Phase 9 — Visual Planner

Use timed captions that include at least a percentage, a concrete number and a logistics/process statement.

- [x] Generate Plan creates `edit/animation-slots.json`.
- [x] Suggestions show engine/effect/frame/confidence/reason.
- [x] Generating does not mutate Timeline.
- [x] Uncheck at least one suggestion.
- [x] Apply Selected writes only checked slots.
- [x] Remotion suggestions render correctly.
- [x] HyperFrames suggestions invoke the normal HyperFrames pipeline.
- [x] Planner avoids excessive strong visual events.

## Phase 10 — Asset Library

- [x] Select a customized Motion clip and Save selected.
- [x] Preset appears in `VIDEO_OS_DATA_ROOT\library\asset-registry.json`.
- [x] Favorite/Star persists.
- [x] Promote writes a `library\promoted\preset-*.json` manifest.
- [x] Open/create a different project.
- [x] Use the preset at current playhead.
- [x] The reused clip keeps the saved props and asset ID.
- [x] Save/reopen the second project and confirm it remains.
- [x] Repeat with the tested HyperFrames Map Route preset.

---

## Full V1 acceptance scenario

Use one real 60–90 second talking-head video:

```text
Create project
→ import MP4
→ video-use Transcribe + Pack
→ review/apply EDL
→ import/create captions
→ AI Visual Plan
→ review/apply selected slots
→ manually adjust Timeline
→ edit Effect Inspector
→ add HyperFrames block
→ save a reusable Preset
→ export final MP4
→ export alpha WebM
→ ffprobe + frame inspection
→ restart Studio
→ reopen project
→ confirm durable state
```

Final status must be recorded separately:

```text
CODE COMPLETE: PASS
CLOUD VERIFIED: PASS
LOCAL VERIFIED: PASS / FAIL
PRD ACCEPTED: PASS / FAIL
RENDER VERIFIED: PASS / FAIL
```

Record every local defect as `LV-xxx`; fix it on a branch/PR and return the fix to GitHub. Do not keep long-lived local-only code changes.

---

## Windows execution record — 2026-08-20

The run used the real source file
`C:\Users\hcz\Downloads\老王___出海营销-社媒外贸高质量获客，实现打法拆解-20260726225744.mp4`
(74.633333 seconds, 1080x1920, 30 fps, AAC audio, 3,946,114 bytes).

Environment observed:

```text
OS: Windows (PowerShell)
Node: v24.19.0 (Codex bundled runtime)
npm: npm CLI from C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js
FFmpeg/ffprobe: 8.1.1
VIDEO_OS_DATA_ROOT: E:\Video-OS-Data
VIDEO_USE_ROOT: C:\Users\hcz\.codex\skills\video-use
VIDEO_USE_PYTHON: python
Remotion: @remotion/cli@4.0.506 through npx
```

Baseline result: `npm ci`, `npm run lint`, serial `npm run typecheck`, `npm run test` (18 files / 51 tests), and `npm run build` all passed. Lint reports only the two existing `img` warnings in the library cards. A parallel first typecheck raced the build-generated `.next` route files; the serial rerun passed.

Projects and durable evidence:

- `V1 Validation Project` (`v1-validation-project-e8150243`) — browser UI, canvas, Inspector, timeline, locks/hide, captions, save/reopen.
- `V1 Rough Cut Validation` (`v1-rough-cut-validation-98c8f21e`) — full real-media chain and final renders.
- `project.json` has relative paths only and `project.backup.json` exists after subsequent saves.
- The clean project persisted two EDL video clips (150 + 324 frames), four caption clips, three effect types, and a reused Map Route preset clip after the restart/reopen test.

Render evidence:

```text
Final MP4:
E:\Video-OS-Data\projects\v1-rough-cut-validation-98c8f21e\render\final-3bb4c724-92f8-4892-a6eb-fb9f4a28de34.mp4
ffprobe: H.264, 1080x1920, 30 fps, 15.850667 s, yuvj420p, AAC 48 kHz

Overlay WebM (rerun after --muted fix):
E:\Video-OS-Data\projects\v1-rough-cut-validation-98c8f21e\render\overlay-95c34b33-c29e-456e-916f-a451d0254653.webm
ffprobe: VP8, 1080x1920, 30 fps, 15.800000 s, one video stream, no audio stream, alpha_mode=1
```

Beginning/middle/end frames were extracted to `C:\Users\hcz\AppData\Local\Temp\v1-final-frame0.png`, `v1-final-frame3.png`, `v1-final-frame8.png`, and `v1-final-frame15.png`. The middle frames visibly contain the real A-roll, Chinese captions, Remotion Big Number, HyperFrames Process Flow, and Map Route. A direct Remotion overlay still test reported RGBA alpha (`alphaMin=0`, `alphaMax=255`, about 1.99M fully transparent pixels). FFmpeg 8.1.1's decoder exposes the encoded WebM as `yuv420p` and cannot run `alphaextract`, despite `alpha_mode=1`; this is recorded as an external decoder caveat, not silently promoted to a stronger native-alpha claim.

HyperFrames doctor result is `PARTIAL_ENV`: version, Node, CPU, disk, FFmpeg, FFprobe and Chrome passed; available memory was about 1.0 GB of 23.7 GB, and optional Whisper/TTS/MusicGen/Docker checks were unavailable. The required Process Flow and Map Route renders, lint/check, and cached preset reuse all passed.

### Local validation findings

- `LV-001` (fixed): Map Route used GSAP `left`, which HyperFrames lint rejected as non-transform motion. Replaced it with a measured `x` transform and raised the route point z-index to keep contrast/readability. Studio render and manual `lint`/`check` then passed.
- `LV-002` (fixed): Remotion adapter invoked npx without an executable package entry and omitted the `render` subcommand. It now uses `npx --yes --package @remotion/cli@4.0.506 remotion render ...`.
- `LV-003` (fixed): Remotion bundling could not resolve the project's `@/` aliases. Composition entry imports were made relative where appropriate and `remotion.config.js` now supplies the `@` webpack alias. `remotion compositions remotion/index.ts` and the real MP4 export pass.
- `LV-004` (verified guard): Applying video-use EDL after Motion existed returns the intended 400/actionable message. Applying the same confirmed EDL in a clean project succeeds and writes frame-based clips.
- `LV-005` (fixed/closed): the earlier check selected the wrong media element and the asset endpoint also lacked byte-range responses. The endpoint now returns correct `206`/`Content-Range`/`Accept-Ranges` responses, and A-roll is identified by the exact original MP4 asset ID while excluding HyperFrames WebM elements. With `<OffthreadVideo trimBefore>`, Player frame 75/149/150/300 mapped to media time 2.5/4.966666/7.2/12.2 seconds with absolute error below 0.000001 seconds; Play/Pause also kept the same formula, `readyState=4`, `seeking=false`, `playbackRate=1`.
- `LV-006` (fixed/closed): the historical VP8 overlay advertised alpha but would not load in this Chromium build. Overlay render now uses VP9. Chromium's native `<video>` returned `canPlayType=probably`, `readyState=4`, 1080x1920, no media error, and at 3 seconds the red/green checkerboard remained visible through transparent pixels while animation/caption pixels covered it. Screenshot and browser recording are retained under `E:\Video-OS-Data\validation-evidence\v1-acceptance-closure` and `C:\Users\hcz\.config\browser-harness\agent-workspace\recordings\video-os-v1-acceptance-closure`.
- `LV-007` (fixed/closed): changing A-roll to `<Video trimBefore>` fixed preview timing but made the final CLI render time out in `<Html5Video>`. Using the official render-safe `<OffthreadVideo trimBefore>` keeps the non-deprecated trim API, preserves exact browser synchronization, and completed the retried final MP4.

### Gate decision

```text
CODE COMPLETE: PASS
CLOUD VERIFIED: PENDING — Acceptance Closure commit has not yet completed GitHub CI
LOCAL VERIFIED: PASS
PRD ACCEPTED: PASS
RENDER VERIFIED: PASS
```

## Acceptance Closure — 2026-08-20

The requested V1 closure was run against `v1-rough-cut-validation-98c8f21e` without redoing Phases 0–10 and without merging PR #1.

### LV-005 media synchronization evidence

The A-roll element was selected only when `currentSrc` contained `media-2f7b1965-7c1c-4e58-9e8d-056705bb6dee`; HyperFrames WebM elements were excluded. The two EDL clips are `(start=0, sourceStart=0, duration=150)` and `(start=150, sourceStart=216, duration=324)` at 30 fps.

| Test | Player frame | Expected media time | Native `currentTime` | Error |
| --- | ---: | ---: | ---: | ---: |
| First clip middle | 75 | 2.500000 | 2.500000 | 0 |
| First clip end boundary | 149 | 4.966667 | 4.966666 | -0.000001 |
| Second clip boundary | 150 | 7.200000 | 7.200000 | 0 |
| Second clip | 300 | 12.200000 | 12.200000 | 0 |
| Play then Pause | 77 | 2.566667 | 2.566666 | -0.000001 |

All samples used `expectedMediaTime = sourceStartFrame / fps + (playerFrame - clip.startFrame) / fps`. Paused samples reported `paused=true`, `readyState=4`, `seeking=false`, and `playbackRate=1`.

### LV-006 Chromium alpha evidence

- Historical input required by the acceptance request: `render/overlay-95c34b33-c29e-456e-916f-a451d0254653.webm` (VP8, `alpha_mode=1`) did not reach metadata-ready state in native Chromium.
- Control HyperFrames VP9 alpha assets loaded in the same `<video>` and browser session.
- The render adapter was therefore corrected to produce VP9 alpha output.
- Successful retry job: `28ac3aa7-e299-4e3d-b457-5536e351a99c`.
- Chromium checkerboard screenshot: `E:\Video-OS-Data\validation-evidence\v1-acceptance-closure\LV-006-chromium-vp9-checkerboard-frame-3s.png`.
- Browser recording: `C:\Users\hcz\.config\browser-harness\agent-workspace\recordings\video-os-v1-acceptance-closure` (141 frames).
- Page-origin media diagnostics: VP9 `canPlayType=probably`, `readyState=4`, `currentTime=3`, `paused=true`, `seeking=false`, 1080x1920, `video.error=null`. No page-origin console exception or media error was observed; extension-origin messages were excluded.

### Remaining checklist evidence

- VTT: imported a real `WEBVTT` file through the browser; three frame-based Caption clips were created.
- Minimal preset: changed a selected VTT Caption from Primary to Minimal and verified the saved project returned `preset=minimal`.
- Track lock: locked Video, attempted a 120 px clip drag, and confirmed revision/start/duration stayed `30/0/150`; the track was unlocked after the test.
- Caption EDL remap: dedicated project `v1-caption-edl-acceptance-aa55b5bc` imported the real MP4 and captions before applying ranges 1–3 s and 4–6 s. Result: two 60-frame Video clips with source starts 30/120 and three clipped/remapped captions at output frames 0/30/60.
- Failed render + Retry: failed overlay job `d9bcbe4d-815b-4425-b8d8-672620a087f6` displayed the actionable error and Retry; retry job `28ac3aa7-e299-4e3d-b457-5536e351a99c` completed. The later `LV-007` final failure was also retried successfully after the fix.
- video-use timeline QA: `timeline_view.py` produced `E:\Video-OS-Data\validation-evidence\v1-acceptance-closure\timeline-qa-edl-boundary-5s.png`; 12 frames across 3.5–6.5 seconds showed stable A-roll, readable top-layer captions, aligned overlays, and no isolated flash at the 5-second boundary.
- Visual Planner: generation preserved revision 37 and four existing Motion clips. It displayed three explainable suggestions; the first was unchecked, and Apply Selected added exactly the checked HyperFrames Process Flow at frame 180 and Remotion Big Number at frame 360.
- Visual Slots: browser preview at frame 210 decoded the new HyperFrames VP9 asset at `currentTime=1`, and frame 390 displayed `KEY NUMBER / 30 DAYS`. Both also appear in final render evidence frames at 7 and 13 seconds.
- Favorite persistence: `HF Map Route V1` was starred, the page was reloaded, the project reopened, and My Assets still displayed `★`/`Unstar`; the durable registry returned `favorite=true`.

### Final real render regression

Retry job `61a91e89-f448-44c0-b94b-d100ea5cb1a9` completed after the `LV-007` fix:

```text
E:\Video-OS-Data\projects\v1-rough-cut-validation-98c8f21e\render\final-61a91e89-f448-44c0-b94b-d100ea5cb1a9.mp4
H.264 + AAC, 1080x1920, 30 fps, 15.850667 s, 8,648,599 bytes
```

Final evidence frames are stored as `final-regression-frame-7s.png` and `final-regression-frame-13s.png` in the acceptance evidence directory.

### Final automated regression

Executed in the required order under Node v24.19.0:

```text
npm ci: PASS (392 packages)
npm run lint: PASS (0 errors; 2 existing no-img-element warnings)
npm run typecheck: PASS
npm run test: PASS (19 files, 54 tests)
npm run build: PASS (Next.js 16.3.1 production build)
```

Final gate before the Acceptance Closure commit reaches GitHub CI:

```text
CODE COMPLETE: PASS
CLOUD VERIFIED: PENDING
LOCAL VERIFIED: PASS
PRD ACCEPTED: PASS
RENDER VERIFIED: PASS
```
