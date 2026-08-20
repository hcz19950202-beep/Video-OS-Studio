# Video OS Studio V1.1 — UI / i18n Local Validation

> Branch: `feature/v1.1-overlay-ui-i18n`
> PR: #2
> Purpose: validate the new workstation shell without reopening the already accepted V1 media/render architecture.

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

Use one of the previously accepted real V1 projects, preferably the full-chain talking-head project.

## A. Layout acceptance

At 1920x1080:

- [x] top status bar remains one compact row
- [x] left panel, center preview, right Inspector are all visible
- [x] bottom Timeline is visible without page-level scrolling
- [x] central preview is the largest visual region
- [x] right Inspector can scroll independently
- [x] left library can scroll independently
- [x] Timeline remains usable with multiple clips
- [x] no overlap between top actions and metrics

At 1440x900:

- [x] core edit workflow is still usable
- [x] no critical controls are clipped
- [x] responsive hiding behavior is acceptable

Capture full-screen screenshots in both resolutions.

## B. Visual-style acceptance

Compare against the supplied Overlay Studio references for structural feel, not pixel cloning:

- [x] near-black flat workstation surfaces
- [x] thin dividers and low-radius controls
- [x] orange-red active/focus state is clear
- [x] UI does not look like large SaaS dashboard cards
- [x] metric labels use compact mono treatment
- [x] parameter Inspector feels dense but readable
- [x] Timeline has professional editor density
- [x] light theme remains usable and does not reduce contrast below acceptable levels

## C. Chinese / English acceptance

Default / Chinese:

- [x] top navigation Chinese labels
- [x] left project/global/assets labels Chinese
- [x] Effect Library labels and built-in effect names Chinese
- [x] Timeline controls and track names Chinese
- [x] right Inspector section labels Chinese
- [x] Caption Inspector Chinese
- [x] Render controls Chinese
- [x] video-use panel Chinese
- [x] AI Visual Planner Chinese
- [x] My Assets / preset operations Chinese

Switch to English:

- [x] the above primary operational surfaces switch to English immediately
- [x] Project content / user-authored video text is NOT translated or modified
- [x] selected clip and Project state are unchanged
- [x] language selection survives browser reload
- [x] `document.documentElement.lang` matches the selected locale

## D. Theme acceptance

- [x] Dark → Light updates the entire workstation shell
- [x] Light → Dark updates the entire workstation shell
- [x] theme survives reload
- [x] Project JSON is unchanged by theme switch
- [x] locale/theme preferences are stored outside Project JSON

## E. Workstation metrics

With a project containing Motion clips:

- [x] TIME follows current Remotion frame
- [x] CARDS equals enabled Motion clip count
- [x] DENSITY is Motion cards/minute
- [x] PEAK equals maximum concurrent Motion clips
- [x] SEL changes when a Timeline clip is selected
- [x] no metric mutates Project state

## F. Effect Library

- [x] Effect search filters by name / ID / category / bilingual built-in name
- [x] category chips filter correctly
- [x] clicking a Remotion effect inserts at the current playhead
- [x] Effects workspace shows a wider catalog grid
- [x] HyperFrames cards still render/add through the existing pipeline
- [x] no effect is silently duplicated by a single click

## G. Inspector

Select a Remotion Motion clip:

- [x] selected card identity is visible
- [x] Start Frame updates Timeline / Player through Project Command
- [x] Duration Frames updates Timeline / Player through Project Command
- [x] Content fields update preview
- [x] Style fields update preview
- [x] Timing fields render in the correct group
- [x] delete card works and clears selection

Select a Caption clip:

- [x] Caption timing controls work
- [x] Primary / Minimal / Bold work
- [x] emphasis selection works
- [x] keyword editing persists
- [x] delete works

## H. Existing V1 regression smoke

Do not redo full V1 acceptance; verify no UI rewrite broke the chain:

- [x] real MP4 opens and Player plays/seeks
- [x] SRT/VTT project state still loads
- [x] Timeline drag/resize persists
- [x] video-use panel can still access existing workflow
- [x] AI Visual Plan still generates/reviews/applies
- [x] local preset list still loads/uses
- [x] final MP4 render can still be started
- [x] alpha WebM render can still be started

## I. JSON export

- [x] Export JSON downloads the current Project JSON
- [x] exported file validates against current Project schema
- [x] exported JSON contains project-relative asset paths only

## Final gate

Record issues as `UI-001`, `UI-002`, ... and fix only real V1.1 UI/i18n regressions.

Final result:

```text
CODE COMPLETE: PASS
CLOUD VERIFIED: PENDING CI
LOCAL UI VERIFIED: PASS
I18N VERIFIED: PASS
V1 REGRESSION SMOKE: PASS
```

## Acceptance record — 2026-08-20

- Project: `v1-rough-cut-validation-98c8f21e` (`V1 Rough Cut Validation`)
- Screenshots:
  - `E:\Video-OS-Data\validation-evidence\v1.1-ui\01-1920x1080-zh-dark.png`
  - `E:\Video-OS-Data\validation-evidence\v1.1-ui\02-1920x1080-en-dark.png`
  - `E:\Video-OS-Data\validation-evidence\v1.1-ui\03-1920x1080-zh-light.png`
  - `E:\Video-OS-Data\validation-evidence\v1.1-ui\04-1440x900-zh-dark.png`
- Exported JSON: schema validation PASS; 6 assets, 5 tracks, 0 absolute asset paths.
- Final render smoke: `f46caaac-0111-462c-b72c-c4d939b564d4` completed at 100%.
- Alpha render smoke: `db29fc8b-c45c-4753-9736-38c56c2a0fc2` completed at 100%.

### Issues

- `UI-001` — Persisted locale/theme were read during the first client render, so non-default preferences disagreed with the server-rendered Chinese/dark shell and caused a React hydration mismatch. Fixed by using `useSyncExternalStore` with stable server snapshots, browser-storage snapshots, a same-window preference event, and a layout effect for `<html>` attributes. Reload regression in English/light and Chinese/dark no longer reports a hydration error.

Do not merge PR #2 until these gates are PASS and the user approves the UI direction from screenshots.
