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

- [ ] Create a project in the browser.
- [ ] Confirm it is written under `VIDEO_OS_DATA_ROOT\projects`.
- [ ] Import a real MP4.
- [ ] Confirm ffprobe-derived duration, size and FPS metadata appear.
- [ ] Player can play/pause/seek the real MP4 without critical console errors.
- [ ] Fit / 100% / Safe controls work.
- [ ] Switch 9:16 / 16:9 / 1:1 and confirm Player updates.
- [ ] Save, refresh/restart the app, reopen the project and confirm state restores.
- [ ] `project.json` contains only relative asset paths.
- [ ] `project.backup.json` is created after subsequent saves.

Status:

```text
CODE COMPLETE: PASS
CLOUD VERIFIED: PASS
LOCAL VERIFIED: PENDING
PRD ACCEPTED: PENDING
```

## Phase 2 — Timeline

- [ ] Five tracks are visible: Video / Captions / Motion / B-roll / Audio.
- [ ] Timeline click moves the Remotion Player playhead.
- [ ] Move a clip and confirm frame position persists after reload.
- [ ] Resize a clip and confirm duration persists.
- [ ] Duplicate and delete work.
- [ ] Timeline zoom works.
- [ ] Track lock prevents dragging.
- [ ] Track hide affects preview as expected.

## Phase 3 — Effect Registry

For each built-in Remotion effect:

- [ ] Big Number
- [ ] Metric Focus
- [ ] Keyword Impact
- [ ] Lower Third

Verify:

- [ ] Add from Library at current playhead.
- [ ] A Motion clip is created in the Timeline.
- [ ] Effect renders in Remotion Player.
- [ ] Save/reopen preserves the Motion clip.

## Phase 4 — Schema Inspector

- [ ] Selecting a Motion clip opens the generic Inspector.
- [ ] Text updates preview.
- [ ] Number updates preview.
- [ ] Color updates preview.
- [ ] Select updates preview.
- [ ] Switch updates preview.
- [ ] Slider updates preview.
- [ ] Changes persist through Project Commands after reload.

## Phase 5 — Captions

- [ ] Import a Chinese SRT.
- [ ] Import a VTT.
- [ ] Cues become frame-based Caption clips.
- [ ] Caption timing follows playback.
- [ ] Primary preset works.
- [ ] Minimal preset works.
- [ ] Bold preset works.
- [ ] Number emphasis works.
- [ ] Keyword emphasis works.
- [ ] Caption layer remains readable above Motion overlays.
- [ ] Chinese font fallback is acceptable on Windows.

## Phase 6 — Remotion render

The app defaults to the pinned `@remotion/cli@4.0.506` through `npx`. A matching local CLI may be supplied with `REMOTION_CLI_PATH`.

- [ ] Export a real final MP4.
- [ ] Export a transparent overlay WebM.
- [ ] Failed render displays an actionable error and Retry works.
- [ ] Download endpoint returns the completed file.
- [ ] Run `ffprobe` on final MP4 and record codec, dimensions, duration and FPS.
- [ ] Run `ffprobe` on overlay WebM and confirm expected VP8/alpha-capable output.
- [ ] Extract beginning/middle/end frames and visually inspect them.
- [ ] Confirm final MP4 includes A-roll + Motion + Captions.
- [ ] Confirm overlay excludes A-roll/background and preserves transparency.

Status after all checks:

```text
RENDER VERIFIED: PASS / FAIL
```

## Phase 7 — HyperFrames

Run first:

```powershell
npx hyperframes doctor
```

Then verify both blocks:

- [ ] Process Flow renders.
- [ ] Map Route renders.
- [ ] HyperFrames lint passes.
- [ ] HyperFrames inspect passes.
- [ ] Transparent WebM is produced.
- [ ] WebM overlays correctly inside Remotion Player.
- [ ] Same parameters reuse cached asset instead of rendering again.
- [ ] A failed render surfaces an actionable error.

## Phase 8 — video-use

Configure a real stable `VIDEO_USE_ROOT` containing `SKILL.md` and `helpers/` plus its own required credentials/dependencies.

- [ ] `Transcribe + Pack` runs on a real talking-head MP4.
- [ ] `takes_packed.md` is produced and shown in Studio.
- [ ] Word-level timestamps are plausible.
- [ ] Create/review a confirmed EDL.
- [ ] Apply EDL before Motion/B-roll/Audio design.
- [ ] EDL seconds convert to frame-based Video clips.
- [ ] `sourceStartFrame` produces the intended rough cut in Player.
- [ ] Existing captions remap correctly through kept ranges.
- [ ] Attempting rough cut after Motion/B-roll/Audio exist is blocked rather than silently corrupting timing.
- [ ] Run video-use timeline QA on relevant boundaries where available.

## Phase 9 — Visual Planner

Use timed captions that include at least a percentage, a concrete number and a logistics/process statement.

- [ ] Generate Plan creates `edit/animation-slots.json`.
- [ ] Suggestions show engine/effect/frame/confidence/reason.
- [ ] Generating does not mutate Timeline.
- [ ] Uncheck at least one suggestion.
- [ ] Apply Selected writes only checked slots.
- [ ] Remotion suggestions render correctly.
- [ ] HyperFrames suggestions invoke the normal HyperFrames pipeline.
- [ ] Planner avoids excessive strong visual events.

## Phase 10 — Asset Library

- [ ] Select a customized Remotion Motion clip and Save selected.
- [ ] Preset appears in `VIDEO_OS_DATA_ROOT\library\asset-registry.json`.
- [ ] Favorite/Star persists.
- [ ] Promote writes a `library\promoted\preset-*.json` manifest.
- [ ] Open/create a different project.
- [ ] Use the preset at current playhead.
- [ ] The reused clip renders with saved props.
- [ ] Save/reopen the second project and confirm it remains.
- [ ] Repeat with a HyperFrames preset if Phase 7 local validation passed.

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
