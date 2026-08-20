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

- [ ] top status bar remains one compact row
- [ ] left panel, center preview, right Inspector are all visible
- [ ] bottom Timeline is visible without page-level scrolling
- [ ] central preview is the largest visual region
- [ ] right Inspector can scroll independently
- [ ] left library can scroll independently
- [ ] Timeline remains usable with multiple clips
- [ ] no overlap between top actions and metrics

At 1440x900:

- [ ] core edit workflow is still usable
- [ ] no critical controls are clipped
- [ ] responsive hiding behavior is acceptable

Capture full-screen screenshots in both resolutions.

## B. Visual-style acceptance

Compare against the supplied Overlay Studio references for structural feel, not pixel cloning:

- [ ] near-black flat workstation surfaces
- [ ] thin dividers and low-radius controls
- [ ] orange-red active/focus state is clear
- [ ] UI does not look like large SaaS dashboard cards
- [ ] metric labels use compact mono treatment
- [ ] parameter Inspector feels dense but readable
- [ ] Timeline has professional editor density
- [ ] light theme remains usable and does not reduce contrast below acceptable levels

## C. Chinese / English acceptance

Default / Chinese:

- [ ] top navigation Chinese labels
- [ ] left project/global/assets labels Chinese
- [ ] Effect Library labels and built-in effect names Chinese
- [ ] Timeline controls and track names Chinese
- [ ] right Inspector section labels Chinese
- [ ] Caption Inspector Chinese
- [ ] Render controls Chinese
- [ ] video-use panel Chinese
- [ ] AI Visual Planner Chinese
- [ ] My Assets / preset operations Chinese

Switch to English:

- [ ] the above primary operational surfaces switch to English immediately
- [ ] Project content / user-authored video text is NOT translated or modified
- [ ] selected clip and Project state are unchanged
- [ ] language selection survives browser reload
- [ ] `document.documentElement.lang` matches the selected locale

## D. Theme acceptance

- [ ] Dark → Light updates the entire workstation shell
- [ ] Light → Dark updates the entire workstation shell
- [ ] theme survives reload
- [ ] Project JSON is unchanged by theme switch
- [ ] locale/theme preferences are stored outside Project JSON

## E. Workstation metrics

With a project containing Motion clips:

- [ ] TIME follows current Remotion frame
- [ ] CARDS equals enabled Motion clip count
- [ ] DENSITY is Motion cards/minute
- [ ] PEAK equals maximum concurrent Motion clips
- [ ] SEL changes when a Timeline clip is selected
- [ ] no metric mutates Project state

## F. Effect Library

- [ ] Effect search filters by name / ID / category / bilingual built-in name
- [ ] category chips filter correctly
- [ ] clicking a Remotion effect inserts at the current playhead
- [ ] Effects workspace shows a wider catalog grid
- [ ] HyperFrames cards still render/add through the existing pipeline
- [ ] no effect is silently duplicated by a single click

## G. Inspector

Select a Remotion Motion clip:

- [ ] selected card identity is visible
- [ ] Start Frame updates Timeline / Player through Project Command
- [ ] Duration Frames updates Timeline / Player through Project Command
- [ ] Content fields update preview
- [ ] Style fields update preview
- [ ] Timing fields render in the correct group
- [ ] delete card works and clears selection

Select a Caption clip:

- [ ] Caption timing controls work
- [ ] Primary / Minimal / Bold work
- [ ] emphasis selection works
- [ ] keyword editing persists
- [ ] delete works

## H. Existing V1 regression smoke

Do not redo full V1 acceptance; verify no UI rewrite broke the chain:

- [ ] real MP4 opens and Player plays/seeks
- [ ] SRT/VTT project state still loads
- [ ] Timeline drag/resize persists
- [ ] video-use panel can still access existing workflow
- [ ] AI Visual Plan still generates/reviews/applies
- [ ] local preset list still loads/uses
- [ ] final MP4 render can still be started
- [ ] alpha WebM render can still be started

## I. JSON export

- [ ] Export JSON downloads the current Project JSON
- [ ] exported file validates against current Project schema
- [ ] exported JSON contains project-relative asset paths only

## Final gate

Record issues as `UI-001`, `UI-002`, ... and fix only real V1.1 UI/i18n regressions.

Final result:

```text
CODE COMPLETE: PASS / FAIL
CLOUD VERIFIED: PASS / FAIL
LOCAL UI VERIFIED: PASS / FAIL
I18N VERIFIED: PASS / FAIL
V1 REGRESSION SMOKE: PASS / FAIL
```

Do not merge PR #2 until these gates are PASS and the user approves the UI direction from screenshots.
