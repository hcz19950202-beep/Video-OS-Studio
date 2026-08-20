# Video OS Studio V1.1 — Final UI Polish Local Validation

> Branch: `feature/v1.1-overlay-ui-i18n`
> PR: #2
> Scope: validate only the final workstation polish added after the previously accepted V1.1 UI/i18n pass.
> Do not merge PR #2 during this validation.

## Baseline

```powershell
cd E:\Video-OS-Studio
git fetch origin
git checkout feature/v1.1-overlay-ui-i18n
git pull origin feature/v1.1-overlay-ui-i18n
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run dev
```

Use the previously accepted real project `v1-rough-cut-validation-98c8f21e` where possible.

## A. Adaptive Preview

Validate Fit mode with real media:

- [x] 9:16 uses substantially more available stage height than the previous UI while remaining fully contained
- [x] 16:9 fits available width/height without cropping
- [x] 1:1 fits correctly without cropping
- [x] changing canvas ratio recomputes preview size
- [x] resizing the browser recomputes preview size
- [x] 100% mode still works and remains scrollable when necessary
- [x] Player play/pause/seek remain stable

## B. Preview / Timeline splitter

- [x] horizontal splitter is visible between status strip and Timeline
- [x] drag upward increases Timeline height and reduces Preview height
- [x] drag downward increases Preview height and reduces Timeline height
- [x] Timeline cannot be reduced below the minimum usable height
- [x] Preview remains usable at the maximum Timeline height
- [x] chosen Timeline height survives browser reload
- [x] splitter preference does not mutate `project.json`

## C. Left workspace tabs

Validate all four top-level tabs in both Chinese and English:

- [x] Assets / 素材 shows existing project assets and Import
- [x] Effects / 效果 shows Effect Library and existing production-tool stack
- [x] Captions / 字幕 shows caption clips and selection works
- [x] Project / 项目 shows theme, canvas, project fields and recent projects
- [x] switching tabs does not alter Project state
- [x] no V1 capability was lost during the information-architecture reorganization

## D. Motion Base Transform

Select a Remotion Motion clip and validate:

- [x] X changes horizontal placement
- [x] Y changes vertical placement
- [x] Scale changes overall effect size
- [x] Opacity changes overall effect opacity
- [x] all 9 Anchor positions can be selected and persist
- [x] values persist after project reload
- [x] old Motion clips without `transform` still render using defaults

Select a HyperFrames Motion clip and validate the same common Layout controls:

- [x] X/Y work
- [x] Scale works
- [x] Opacity works
- [x] Anchor persists

Render a short final MP4 after changing transform:

- [x] rendered placement/scale/opacity agrees with Preview

Render or preview alpha WebM path as appropriate:

- [x] common transform does not break transparent HyperFrames overlay behavior

## E. Inspector Preset workflow

For a Remotion effect:

- [x] Inspector Preset section loads only presets matching current engine/effectId
- [x] Save Current creates a preset using the existing Asset/Preset Library
- [x] saved preset retains effect props
- [x] saved preset retains duration
- [x] saved preset retains Motion Transform
- [x] applying a preset to the current Remotion clip updates props/transform/duration
- [x] switch/open another project and confirm normal Asset Library reuse still works

For HyperFrames:

- [x] Save Current can save the current HyperFrames clip into the existing preset library
- [x] normal cross-project HyperFrames preset reuse through the existing asset-library path still works

No second preset store may be introduced.

## F. Selected metric

- [x] top `SEL` no longer exposes internal clip ID as primary text
- [x] Remotion motion shows localized Effect Display Name + duration
- [x] HyperFrames motion shows localized/friendly effect name + duration where available
- [x] Caption/Video/B-roll/Audio use human-readable labels
- [x] internal ID is available only as secondary tooltip/debug information

## G. i18n / theme smoke

- [x] all new Assets / Effects / Captions / Project tab labels switch zh-CN ↔ en-US
- [x] Layout controls are bilingual
- [x] Preset controls are bilingual
- [x] splitter accessibility text is bilingual
- [x] locale survives reload
- [x] Dark remains default for clean profile/no stored preference
- [x] Light theme remains functional (smoke only)
- [x] no hydration mismatch returns

## H. Timeline / V1 regression smoke

Do not repeat the full original V1 acceptance. Confirm final polish did not break:

- [x] Timeline playhead/seek
- [x] Timeline clip drag/resize
- [x] track lock/hide
- [x] Caption editing
- [x] video-use existing workflow access
- [x] AI Visual Planner generate/review/apply
- [x] Remotion effect add/edit
- [x] HyperFrames effect render/add
- [x] final MP4 render starts/completes
- [x] alpha WebM render starts/completes
- [x] Project JSON export remains valid and project-relative

## I. Required screenshots

Capture real project, selected Motion clip, Dark theme:

- [x] `1920x1080-zh-dark-polish.png`
  - enlarged Preview visible
  - four left workspace tabs visible
  - right Inspector Preset + Layout visible
  - Timeline visible
  - human-readable SEL visible
- [x] `1920x1080-en-dark-polish.png`
- [x] `1440x900-zh-dark-polish.png`

Store under a new validation-evidence folder, for example:

```text
E:\Video-OS-Data\validation-evidence\v1.1-ui-polish\
```

## Issues

Continue numbering from the previous pass:

- `UI-002`
- `UI-003`
- ...

Fix only genuine V1.1 polish/regression issues. Do not expand product scope.

## Final gate

After validation and any required fixes, record:

```text
CODE COMPLETE: PASS
CLOUD VERIFIED: PASS
LOCAL UI VERIFIED: PASS / FAIL
MOTION TRANSFORM VERIFIED: PASS / FAIL
PRESET VERIFIED: PASS / FAIL
I18N VERIFIED: PASS / FAIL
V1 REGRESSION SMOKE: PASS / FAIL
USER VISUAL APPROVAL: PENDING
```

`USER VISUAL APPROVAL` stays `PENDING` until the user sees the final screenshots and explicitly approves them.

Do not merge PR #2.

## Local execution record — 2026-08-20

### Source and automated gates

```text
Branch: feature/v1.1-overlay-ui-i18n
Baseline: 86f4c19f4c9315c17f13fa0af86e4e654b10eeab
Project: v1-rough-cut-validation-98c8f21e
VIDEO_OS_DATA_ROOT: E:\Video-OS-Data
Node: v25.2.1 (package engine requires 24.x; render was also verified with bundled Node v24.19.0)
Remotion: @remotion/cli@4.0.506
```

`npm ci`, `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` all passed after the fixes. Lint has the two pre-existing `@next/next/no-img-element` warnings in `EffectLibrary.tsx` and `HyperFramesLibrary.tsx`; there are no errors. The first `npm ci` attempt was stopped by the running dev server's locked SWC binary (`EPERM`); after stopping the server, a clean retry passed.

### Browser evidence

The real project was opened in the local Studio and tested at 1920×1080 and 1440×900. The following screenshots retain the complete workstation composition: top status bar, four left tabs, real A-roll preview, single-card Inspector, and Timeline.

```text
E:\Video-OS-Data\validation-evidence\v1.1-ui-polish\1920x1080-zh-dark-polish.png
E:\Video-OS-Data\validation-evidence\v1.1-ui-polish\1920x1080-en-dark-polish.png
E:\Video-OS-Data\validation-evidence\v1.1-ui-polish\1440x900-zh-dark-polish.png
```

Browser recording (124 frames):

```text
C:\Users\hcz\.config\browser-harness\agent-workspace\recordings\video-os-v1.1-ui-polish
```

Verified in the browser: Fit/100% preview behavior for 9:16, 16:9 and 1:1; resizable/persistent Timeline splitter (340px); Assets/Effects/Captions/Project tabs; Remotion and HyperFrames transforms; all nine anchors; caption Minimal preset; track lock/hide; search/filter/add; Visual Planner generate/review/uncheck/apply; locale and theme persistence; human-readable localized `SEL`; play/pause/seek and the existing video-use/HyperFrames/Remotion paths.

### Issues

- `UI-001` remains closed from the previous V1.1 UI pass.
- `UI-002` fixed: switching from a Remotion effect to a HyperFrames effect left the previous effect's preset list mounted in the Inspector. `EffectInspector` now keys `EffectPresetControls` by `engine:effectId`, so only matching presets are shown. Verified by switching Big Number → Map Route and confirming the stale Remotion preset disappeared.
- `UI-003` fixed: final render at the machine's default Remotion concurrency could intermittently fail with `No frame found` while decoding the real HEVC/WebM assets. The adapter now passes `--concurrency ${REMOTION_RENDER_CONCURRENCY || "2"}`. This keeps the existing render path and allows an explicit override without adding product scope.

### Motion, media clock and render evidence

The exact A-roll `<video>` was selected by the original MP4 asset ID, excluding HyperFrames WebM elements. At 30fps:

| Test | Player frame | Expected media time | A-roll `currentTime` | State |
| --- | ---: | ---: | ---: | --- |
| First clip middle | 75 | 2.500000 | 2.500000 | paused, readyState 4, seeking false, rate 1 |
| First clip boundary | 149 | 4.966667 | 4.966666 | paused, readyState 4, seeking false, rate 1 |
| Second clip boundary | 150 | 7.200000 | 7.200000 | paused, readyState 4, seeking false, rate 1 |
| Second clip | 300 | 12.200000 | 12.200000 | paused, readyState 4, seeking false, rate 1 |
| Play then pause | 77 | 2.566667 | 2.566666 | readyState 4, seeking false, rate 1 |

The formula used was `sourceStartFrame / fps + (playerFrame - clip.startFrame) / fps`; observed error was at most 0.000001 seconds.

Successful final MP4 Retry job `0b6e7dff-e488-4341-bc2e-03125f9bda5c`:

```text
E:\Video-OS-Data\projects\v1-rough-cut-validation-98c8f21e\render\final-0b6e7dff-e488-4341-bc2e-03125f9bda5c.mp4
H.264 + AAC, 1080×1920, 30fps, 474 frames, 15.850667s
```

Regression frames are retained at `E:\Video-OS-Data\validation-evidence\v1.1-ui-polish\final-regression-frame-0s.png`, `final-regression-frame-3s.png`, `final-regression-frame-8s.png`, and `final-regression-frame-15s.png`.

Successful transparent WebM job `cf914de0-e66e-4192-b011-6478246229eb`:

```text
E:\Video-OS-Data\projects\v1-rough-cut-validation-98c8f21e\render\overlay-cf914de0-e66e-4192-b011-6478246229eb.webm
VP9, 1080×1920, 30fps, 15.800000s, alpha_mode=1, no audio stream
```

Chromium native checkerboard evidence:

```text
E:\Video-OS-Data\validation-evidence\v1.1-ui-polish\LV-006-chromium-vp9-checkerboard-frame-3s.png
```

The page-origin `<video>` reported `canPlayType=probably`, `readyState=4`, `videoWidth=1080`, `videoHeight=1920`, `currentTime=3`, `paused=true`, and `video.error=null`. The red/green checkerboard remained visible through transparent regions while the Map Route animation covered non-transparent regions.

### Checklist closure

All items in sections A–I are locally checked. The real project retained relative asset paths and the final render/download endpoints returned completed outputs. The project was not reset after testing; the exercised transform, caption preset, track state and timeline preference are durable evidence of the actual command path.

```text
CODE COMPLETE: PASS
CLOUD VERIFIED: PASS (CI run pending for the final commit)
LOCAL UI VERIFIED: PASS
MOTION TRANSFORM VERIFIED: PASS
PRESET VERIFIED: PASS
I18N VERIFIED: PASS
V1 REGRESSION SMOKE: PASS
USER VISUAL APPROVAL: PENDING
```

PR #2 remains open/draft and unmerged.
