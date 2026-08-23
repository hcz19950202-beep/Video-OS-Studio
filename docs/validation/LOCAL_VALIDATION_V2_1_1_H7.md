# Video OS Studio V2.1.1 H7 — Local Windows / Browser Acceptance

> Workstream: H7 Frontend Consolidation  
> PR: #26  
> Branch: `hardening/v2.1.1-h7-frontend-consolidation`  
> Base accepted H6 main: `11aafb2ab634ce06c5aa032382cc4263f9749f2d`  
> Cloud code gate SHA: `0ed249406297fd382d0aade311f8566a6f4d462d`  
> Cloud code gate CI: Run `32635740757` — PASS  
> Frozen handoff SHA: **resolve from the final PR #26 branch HEAD after this validation contract and the H7 status checkpoint pass the full four-gate CI. GPT Web supplies that exact SHA in PR #26 and the Codex handoff prompt.**

## 1. Purpose

H7 is the final V2.1.1 frontend hardening workstream. It consolidates frontend responsibilities without changing the accepted H0–H6 architecture or expanding the product into V2.2.

Local acceptance is required because H7 changes browser/runtime-sensitive behavior:

- Remotion Player frame synchronization;
- Canvas pointer gesture preview timing;
- Workspace render responsibility;
- typed client/error handling in live UI flows;
- locale plumbing;
- V2.1 CSS token usage.

Local acceptance validates the frozen implementation. It must not start V2.2 Workflow Runtime, a real external AI provider, Project Schema changes, a broad visual redesign, or unrelated editor work.

### H7 scope interpretation

The Master PRD allows large CSS/i18n cleanup to be gradual/partially deferred. H7 therefore requires the release-critical frontend boundaries to be correct and the changed surfaces to be consolidated, while it does **not** require a risky late-stage rewrite of every historical stylesheet or every pre-existing inline bilingual string.

Required H7 outcomes are:

1. Project/media/job/planner-facing UI uses typed client boundaries in the consolidated target areas;
2. API errors use one structured client error contract;
3. `StudioWorkspaceV21` no longer owns network/mutation orchestration and no longer subscribes to live playback frames;
4. Remotion Player synchronization is event-driven rather than 100 ms top-level polling;
5. Canvas pointer drafts are local/rAF-coalesced and durable mutation remains one commit per completed gesture;
6. VisualPlanner uses the shared typed Studio dictionary;
7. V2.1 CSS moves repeated shell colors toward shared tokens without redesigning layout.

## 2. Cloud acceptance already proved

Cloud code gate:

```text
SHA: 0ed249406297fd382d0aade311f8566a6f4d462d
Run: 32635740757
Node / npm: 24.19.0 / 11.17.0
```

Four jobs passed:

```text
ubuntu-verify:       PASS
windows-verify:      PASS
browser-smoke:       PASS
windows-media-smoke: PASS
```

Ubuntu code gates:

```text
format-check: PASS
lint: PASS with exactly 2 pre-existing @next/next/no-img-element warnings
typecheck: PASS
unit: 56 passed files + 1 Windows-media smoke skipped in normal matrix
      236 passed tests + 1 skipped
build: PASS
```

H7-focused automated coverage includes:

```text
tests/h7/client-contracts.test.ts          7 PASS
tests/h7/workspace-consolidation.test.ts   3 PASS
tests/h7/player-event-bridge.test.ts       1 PASS
tests/h7/raf-latest.test.ts                2 PASS
tests/h7/i18n-consolidation.test.ts        1 PASS
```

Cloud browser smoke also passed the accepted H6 flow:

```text
Create/Open
→ tiny import
→ Caption edit
→ Canvas Apply
→ AI rules Analyze/Apply
→ Undo/Redo
→ Save/Reopen
```

Cloud Windows media smoke passed after H7 changes, proving no regression in MP4/MOV/PNG/FLAC/SRT/Range/short Remotion render infrastructure.

This cloud evidence does not replace the final local Windows/browser interaction acceptance below.

## 3. Entry gate

Do not start local validation until GPT Web supplies an exact **frozen handoff SHA** from the final green PR #26 branch HEAD.

Create an isolated worktree and isolated data root, for example:

```text
E:\Video-OS-Studio-H7-Validation
E:\Video-OS-Data\v2.1.1-h7-validation-<short-sha>
```

Required first checks:

```powershell
git fetch origin
git worktree add --detach E:\Video-OS-Studio-H7-Validation <FROZEN_HANDOFF_SHA>
cd E:\Video-OS-Studio-H7-Validation
git rev-parse HEAD
```

`git rev-parse HEAD` must exactly equal the supplied frozen handoff SHA before any validation action.

Set an isolated runtime root:

```powershell
$env:VIDEO_OS_DATA_ROOT="E:\Video-OS-Data\v2.1.1-h7-validation-<short-sha>"
```

Read, in order:

1. `PROJECT_STATUS.md`
2. `AGENTS.md`
3. `SYSTEM.md`
4. `docs/prd/Video_OS_Studio_V2_1_1_Engineering_Hardening_Master_PRD.md`
5. this document
6. PR #26 and its latest CI evidence

If repository truth, PR state, or supplied SHA disagree, stop and report the mismatch instead of guessing.

## 4. Environment evidence

Record:

- Windows edition/build/architecture;
- Node and npm;
- Chrome version/path;
- FFmpeg and ffprobe versions/paths;
- Remotion package versions;
- HyperFrames package version;
- Playwright package/browser version;
- Python version and `VIDEO_USE_ROOT` if video-use is exercised;
- isolated worktree;
- isolated `VIDEO_OS_DATA_ROOT`.

Expected pins remain:

```text
remotion             4.0.513
@remotion/player     4.0.513
@remotion/cli        4.0.513
hyperframes          0.8.10
@playwright/test     1.62.1
```

H7 must not upgrade these.

## 5. Clean code gate

From the isolated worktree:

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Required:

- all commands PASS;
- normal unit matrix remains at or above the frozen cloud baseline;
- only the two pre-existing `@next/next/no-img-element` warnings are acceptable;
- no new H7 warning/error may be ignored.

Run browser smoke:

```powershell
npx --no-install playwright install chromium
npm run test:e2e
```

Run focused Windows media regression:

```powershell
$env:H6_WINDOWS_MEDIA_SMOKE="1"
npm run test:windows-media
Remove-Item Env:H6_WINDOWS_MEDIA_SMOKE
```

## 6. Typed client / structured error acceptance

Use the real Studio in Chrome and Chrome DevTools Network/Console.

Validate normal UI flows still use their existing routes successfully:

- Recent Project list / Create / Open;
- Project Command mutations;
- raw media import;
- Visual Planner generate/apply;
- Render job create/query;
- HyperFrames add/render where available;
- video-use prepare/apply if configured.

For consolidated target UI surfaces, verify there is no browser-visible regression caused by typed clients.

### Structured error path

Produce at least one deterministic stale mutation / revision conflict through a disposable Project or a validation-only browser/API harness while keeping the Studio open.

Required:

- server returns the existing structured conflict code;
- UI shows a sanitized actionable error rather than `[object Object]` or raw server internals;
- no absolute filesystem path, raw stack, or raw FFmpeg stderr leaks into the user-facing message;
- no unhandled Promise rejection;
- latest durable Project remains intact;
- reload/retry path remains usable.

Do not weaken H1 semantics to make the UI flow pass.

## 7. Player event synchronization

H7 removed the previous 100 ms `getCurrentFrame()/isPlaying()` polling path and now bridges supported Remotion Player events into the player store.

Use a real project with playable media.

Validate:

1. start playback;
2. let it run for at least 5–10 seconds;
3. time/frame readout advances continuously;
4. Timeline playhead follows playback;
5. Canvas active-clip behavior follows the current frame;
6. pause stops the playing state at the correct frame;
7. seek to two non-adjacent positions;
8. readout / Timeline / Canvas synchronize to each seek;
9. resume playback from the seeked frame;
10. reaching the end produces a stopped/non-playing state.

Also inspect console:

- no event listener error;
- no duplicate-listener warning;
- no frame-sync unhandled rejection.

The validation does not require a React Profiler performance number. Cloud source-contract tests already prove `StudioWorkspaceV21` no longer subscribes to `currentFrame`; local acceptance proves the user-visible event-driven behavior remains correct.

## 8. Workspace live-frame isolation

While playback is running:

- switch between Edit / AI / Script / Motion workspace presets;
- open Media and Project panels;
- use Add B-roll / Add Audio at a non-zero playhead position.

Required:

- added clips start at the actual click-time playhead frame, not a stale frame;
- Workspace controls remain responsive during playback;
- no repeated network request is caused merely by frame updates;
- no transient Project draft/input is unexpectedly reset by playback;
- Create/Open/Save/import behavior remains unchanged.

Record at least one expected vs actual `startFrame` for Add B-roll or Add Audio.

## 9. Canvas rAF gesture acceptance

Use a project with at least one transformable video/b-roll/motion clip visible at the current frame.

### 9.1 Drag

Perform a rapid drag with many pointer moves before pointer-up.

Required:

- preview follows smoothly;
- no durable Project revision is created for every pointer move;
- pointer-up commits the **last** pointer position, not the previous animation-frame value;
- one completed gesture produces exactly one durable mutation/revision change;
- Undo restores the pre-drag transform in one step;
- Redo restores the final drag transform in one step.

Record before/preview/final `x/y` and revision.

### 9.2 Resize

Perform a rapid resize.

Required:

- final `scale` equals the last gesture state;
- one durable commit;
- Undo/Redo one step each;
- no stale preview remains after completion.

### 9.3 Rotate

Perform a rapid rotate.

Required:

- final rotation equals the last gesture state;
- one durable commit;
- Undo/Redo one step each;
- no stale guides/draft remain.

### 9.4 Cancel / error cleanup

Trigger pointer cancel where practical using Playwright/CDP or a validation-only harness.

Required:

- queued rAF preview is cancelled;
- no stale draft remains;
- no unintended durable mutation is committed;
- next gesture works normally.

If a mutation is intentionally made stale/conflicting during a gesture, the H0 Canvas error contract must still clear preview state and surface an error without false success.

## 10. Planner i18n acceptance

Open AI / Visual Planner with a project containing Scenes.

In Chinese:

- generate a rules plan;
- inspect prompt, source, plan stats, activity, review list, diff preview, apply bar.

Switch Studio locale to English and repeat.

Required:

- all H7-migrated VisualPlanner labels/activity strings switch through the shared typed dictionary;
- no missing-key text such as `planner.director.*` is rendered;
- dynamic counts/transaction text interpolate correctly;
- plan generation/apply behavior is unchanged by locale switching.

Do not turn H7 local acceptance into a full translation rewrite of unrelated historical UI strings.

## 11. CSS token / visual regression

H7 only performs incremental token consolidation in `app/v21.css`; it is not a visual redesign.

Validate representative desktop viewports:

```text
1920 × 929
1440 × 900
1280 × 720
```

Check both Studio themes where available.

At minimum inspect:

- top bar;
- tool rail;
- left content panel;
- viewer;
- inspector;
- timeline;
- project cards;
- media import state;
- canvas presets;
- active/hover/disabled buttons;
- error banner.

Required:

- no unexpected clipping/overlap;
- no unreadable text/background pair;
- accent/border/panel tokens remain coherent;
- light theme does not inherit an obviously broken dark hardcode on the changed tokenized surfaces;
- no layout dimensions changed solely because of H7 token replacement.

Capture screenshots or record visual observations in Actual Results. Do not commit screenshots unless the repository already has an explicit versioned fixture location for them.

## 12. Render / HyperFrames / video-use UI regression

### Render

From Studio UI, start a short Final Render on a disposable project.

Required:

- typed render client starts the durable job;
- status polling reaches terminal state;
- completed output remains accessible;
- error state remains sanitized if an intentional failure is tested.

A large render is unnecessary; H6/H3/H4 already own engine/durability/load acceptance.

### HyperFrames

Use one existing effect such as `process-flow`.

Required:

- add/render through existing H7 typed client succeeds;
- returned Project revision is applied;
- no raw-fetch-specific UI regression;
- no H7-owned process residue.

### video-use

If `VIDEO_USE_ROOT` is configured, run one representative prepare/apply path through the UI.

If not configured, record:

```text
VIDEO-USE: NOT CONFIGURED
```

Do not configure a new provider/runtime solely for H7.

## 13. Representative app regression

At least:

```text
Create/Open
Import MP4
Import MOV
Import subtitle
Caption edit
Canvas drag/resize/rotate
AI Analyze/Apply
Timeline selection
Add B-roll at non-zero playhead
Undo/Redo
Preview play/pause/seek
Locale toggle
Theme toggle
Save/Reopen
Short Final Render
HyperFrames representative operation
```

Required:

- no lost update;
- no broken asset reference;
- no false success;
- no unhandled Promise rejection;
- no blocking Chrome console error introduced by H7;
- Project Schema remains `2.0.0`.

## 14. Cleanup / residue

After validation:

- no unexpected `*.tmp`, `*.part`, `*.partial` under the isolated H7 data root;
- no H7-owned Node/Chrome/FFmpeg/HyperFrames process remains;
- do not kill unrelated user processes;
- PR #26 remains Draft/unmerged;
- V2.2 remains blocked.

## 15. Defect protocol

Use IDs:

```text
V2.1.1-H7-LV-001
V2.1.1-H7-LV-002
...
```

For every H7 defect:

1. reproduce on the frozen SHA;
2. record expected vs actual;
3. identify root cause;
4. fix only H7 scope;
5. add a regression test where practical;
6. rerun affected browser/local checks;
7. rerun the full clean code gate;
8. commit and push to the same H7 branch;
9. never force-push over an unexpected remote head.

Do not use H7 validation to implement V2.2 or unrelated UI features.

## 16. Actual Results

Local Codex appends actual evidence below this heading after completing the frozen-SHA acceptance.

Do not rewrite the validation contract above. Include exact environment versions, measurements/observations, defects, commits, residual processes, and merge recommendation.

## 17. Final report format

```text
BRANCH:
FINAL HEAD:
FROZEN INPUT HEAD:
LOCAL WORKTREE:
LOCAL DATA ROOT:
WINDOWS:
NODE/NPM:
CHROME:
FFMPEG/FFPROBE:
REMOTION VERSIONS:
HYPERFRAMES VERSION:
PLAYWRIGHT VERSION:

CLEAN NPM CI: PASS/FAIL
CODE CHECKS: PASS/FAIL — test files / tests
PLAYWRIGHT H6 SMOKE: PASS/FAIL
TYPED CLIENT NORMAL FLOWS: PASS/FAIL
STRUCTURED ERROR PATH: PASS/FAIL
PLAYER EVENT SYNC: PASS/FAIL
PLAY/PAUSE/SEEK/END: PASS/FAIL
WORKSPACE FRAME ISOLATION: PASS/FAIL
ADD B-ROLL/AUDIO PLAYHEAD: PASS/FAIL — expected/actual frame
CANVAS DRAG RAF: PASS/FAIL — before/final revision + x/y
CANVAS RESIZE RAF: PASS/FAIL — before/final revision + scale
CANVAS ROTATE RAF: PASS/FAIL — before/final revision + rotation
CANVAS CANCEL/ERROR CLEANUP: PASS/FAIL
UNDO/REDO GESTURE BOUNDARY: PASS/FAIL
PLANNER I18N ZH/EN: PASS/FAIL
CSS/VISUAL 1920x929: PASS/FAIL
CSS/VISUAL 1440x900: PASS/FAIL
CSS/VISUAL 1280x720: PASS/FAIL
DARK/LIGHT THEME: PASS/FAIL
SHORT FINAL RENDER UI: PASS/FAIL
HYPERFRAMES UI REGRESSION: PASS/FAIL
VIDEO-USE: PASS/FAIL/NOT CONFIGURED
APP REGRESSION: PASS/FAIL
FINAL GITHUB VERIFY: PASS/FAIL

DEFECTS FIXED:
COMMITS PUSHED:
REMAINING FAILURES:
RESIDUAL TEMP/PROCESSES:

MERGE RECOMMENDATION: YES/NO
```

Even if all items PASS, do not merge PR #26 and do not start V2.2. Return the final report and FINAL HEAD to GPT Web for frozen-to-final review, final CI, H7 merge decision, and V2.1.1 release acceptance planning.
