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

- [ ] 9:16 uses substantially more available stage height than the previous UI while remaining fully contained
- [ ] 16:9 fits available width/height without cropping
- [ ] 1:1 fits correctly without cropping
- [ ] changing canvas ratio recomputes preview size
- [ ] resizing the browser recomputes preview size
- [ ] 100% mode still works and remains scrollable when necessary
- [ ] Player play/pause/seek remain stable

## B. Preview / Timeline splitter

- [ ] horizontal splitter is visible between status strip and Timeline
- [ ] drag upward increases Timeline height and reduces Preview height
- [ ] drag downward increases Preview height and reduces Timeline height
- [ ] Timeline cannot be reduced below the minimum usable height
- [ ] Preview remains usable at the maximum Timeline height
- [ ] chosen Timeline height survives browser reload
- [ ] splitter preference does not mutate `project.json`

## C. Left workspace tabs

Validate all four top-level tabs in both Chinese and English:

- [ ] Assets / 素材 shows existing project assets and Import
- [ ] Effects / 效果 shows Effect Library and existing production-tool stack
- [ ] Captions / 字幕 shows caption clips and selection works
- [ ] Project / 项目 shows theme, canvas, project fields and recent projects
- [ ] switching tabs does not alter Project state
- [ ] no V1 capability was lost during the information-architecture reorganization

## D. Motion Base Transform

Select a Remotion Motion clip and validate:

- [ ] X changes horizontal placement
- [ ] Y changes vertical placement
- [ ] Scale changes overall effect size
- [ ] Opacity changes overall effect opacity
- [ ] all 9 Anchor positions can be selected and persist
- [ ] values persist after project reload
- [ ] old Motion clips without `transform` still render using defaults

Select a HyperFrames Motion clip and validate the same common Layout controls:

- [ ] X/Y work
- [ ] Scale works
- [ ] Opacity works
- [ ] Anchor persists

Render a short final MP4 after changing transform:

- [ ] rendered placement/scale/opacity agrees with Preview

Render or preview alpha WebM path as appropriate:

- [ ] common transform does not break transparent HyperFrames overlay behavior

## E. Inspector Preset workflow

For a Remotion effect:

- [ ] Inspector Preset section loads only presets matching current engine/effectId
- [ ] Save Current creates a preset using the existing Asset/Preset Library
- [ ] saved preset retains effect props
- [ ] saved preset retains duration
- [ ] saved preset retains Motion Transform
- [ ] applying a preset to the current Remotion clip updates props/transform/duration
- [ ] switch/open another project and confirm normal Asset Library reuse still works

For HyperFrames:

- [ ] Save Current can save the current HyperFrames clip into the existing preset library
- [ ] normal cross-project HyperFrames preset reuse through the existing asset-library path still works

No second preset store may be introduced.

## F. Selected metric

- [ ] top `SEL` no longer exposes internal clip ID as primary text
- [ ] Remotion motion shows localized Effect Display Name + duration
- [ ] HyperFrames motion shows localized/friendly effect name + duration where available
- [ ] Caption/Video/B-roll/Audio use human-readable labels
- [ ] internal ID is available only as secondary tooltip/debug information

## G. i18n / theme smoke

- [ ] all new Assets / Effects / Captions / Project tab labels switch zh-CN ↔ en-US
- [ ] Layout controls are bilingual
- [ ] Preset controls are bilingual
- [ ] splitter accessibility text is bilingual
- [ ] locale survives reload
- [ ] Dark remains default for clean profile/no stored preference
- [ ] Light theme remains functional (smoke only)
- [ ] no hydration mismatch returns

## H. Timeline / V1 regression smoke

Do not repeat the full original V1 acceptance. Confirm final polish did not break:

- [ ] Timeline playhead/seek
- [ ] Timeline clip drag/resize
- [ ] track lock/hide
- [ ] Caption editing
- [ ] video-use existing workflow access
- [ ] AI Visual Planner generate/review/apply
- [ ] Remotion effect add/edit
- [ ] HyperFrames effect render/add
- [ ] final MP4 render starts/completes
- [ ] alpha WebM render starts/completes
- [ ] Project JSON export remains valid and project-relative

## I. Required screenshots

Capture real project, selected Motion clip, Dark theme:

- [ ] `1920x1080-zh-dark-polish.png`
  - enlarged Preview visible
  - four left workspace tabs visible
  - right Inspector Preset + Layout visible
  - Timeline visible
  - human-readable SEL visible
- [ ] `1920x1080-en-dark-polish.png`
- [ ] `1440x900-zh-dark-polish.png`

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
