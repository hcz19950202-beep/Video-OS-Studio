# Video OS Studio V2.1.1 H0 — Local Windows Validation Contract

> Workstream: H0 Correctness Hotfix  
> Branch: `hardening/v2.1.1-h0-correctness`  
> PR: #19  
> Authority: `PROJECT_STATUS.md` + `docs/prd/Video_OS_Studio_V2_1_1_Engineering_Hardening_Master_PRD.md`

## 0. Entry gate

Do not use conversation memory as the source of truth.

Before validation:

```powershell
git fetch origin
git checkout hardening/v2.1.1-h0-correctness
git reset --hard <FROZEN_GREEN_SHA_FROM_GPT_WEB>
git status --short
git rev-parse HEAD
```

The local HEAD must exactly match the frozen green SHA supplied in the GPT Web handoff. If it does not, stop.

Use a new isolated runtime root, for example:

```powershell
$env:VIDEO_OS_DATA_ROOT="E:\Video-OS-Data\v2.1.1-h0-validation"
```

Do not reuse or mutate release-acceptance data.

Run:

```powershell
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

All must pass before browser validation.

## 1. Scope

H0 local validation is deliberately narrow. Validate only:

1. Script A-roll correctness behavior;
2. Caption Inspector bounded/minimal commits;
3. Canvas mutation success/error cleanup;
4. representative style resolution/preview regression.

Do not add H1 revision/mutex/idempotency work locally. Do not start H2+ work.

## 2. Script A-roll validation

Use a short real or existing safe talking-head project **before** Captions/Motion/B-roll/Audio/Scenes are added and with a usable Script transcript.

### H0-S1 — remove/restore still works

1. Open the project through normal Studio UI.
2. Record Project revision and duration.
3. Remove one middle Script segment.
4. Confirm duration decreases and A-roll closes the removed gap.
5. Restore the same segment.
6. Confirm duration/source mapping returns to the original state.
7. Save, restart dev server, reopen, and confirm persistence.

### H0-S2 — Video presentation survives Script rebuild

Before the Script remove, give the A-roll a distinctive supported Video presentation through normal product controls/commands where available, for example:

```text
fit = cover
muted = true
volume != 1
transform x/y/scale/rotation != defaults
layer != default where safely supported
```

After remove and after restore, inspect the resulting A-roll clips/Project state and confirm the presentation properties remain preserved.

### H0-S3 — unsafe ambiguity blocks instead of deleting data

Create this only in the isolated validation project:

- canonical Script A-roll remains present;
- add another user-managed Video clip/source into the Video editing state so the A-roll is no longer provably canonical.

Attempt Script remove.

Expected:

- operation is rejected with an actionable safety message;
- no Video clip is deleted;
- Project revision does not change;
- project remains reopenable.

Do not weaken the safety check to make this test pass.

## 3. Caption Inspector validation

Use a project with at least one Caption clip.

### H0-C1 — number input is draft until commit

For `fontSize`:

1. record current Project revision;
2. focus the number input;
3. change the number without blurring;
4. confirm no durable Project revision is created merely by typing/spinning while focus remains in the field;
5. blur the field or press Enter;
6. confirm exactly one durable edit is committed;
7. reopen and confirm the value persists.

Repeat one representative test for `fontWeight`, `lineHeight`, or `maxWidth`.

### H0-C2 — unrelated Caption fields survive sequential edits

1. set a distinctive `fontFamily`;
2. commit;
3. change only `fontSize`;
4. commit;
5. confirm final Caption retains both the newer font family and the new size;
6. restart/reopen and confirm both persist.

H0 reduces overlapping writes but does **not** claim full concurrent stale-request protection. That remains H1 / Issue #11.

### H0-C3 — select inputs remain one-action/one-commit

Change one representative select such as Caption preset/alignment.

Expected: one user selection produces one durable edit, not a request storm.

## 4. Canvas validation

Use a Video, B-roll, or Motion clip visible in Canvas mode.

### H0-V1 — normal gesture commit

Perform:

- drag;
- resize or rotate;
- one keyboard nudge.

For each action:

- live draft appears during the gesture where supported;
- completion commits the change;
- draft/guides clear after completion;
- no unhandled-promise error appears in browser console.

### H0-V2 — failed command cleanup

Using a safe local method (for example temporarily making a targeted command endpoint fail in the browser harness without changing committed source), force one Canvas mutation request to fail.

Expected:

- Canvas draft is cleared;
- Project remains at the last durable state;
- visible error feedback appears;
- browser console has no unhandled Promise rejection;
- after restoring the endpoint, the next normal Canvas edit succeeds.

Do not commit test-only endpoint breakage.

## 5. Style regression

Open representative Motion and Caption visuals and confirm:

- Linked Motion accent still overrides an explicit Clip accent when the Linked style defines accent;
- explicit Clip Motion accent is not replaced by Brand primary when no Linked accent exists;
- Brand primary is used as Motion accent fallback when neither Linked nor Clip accent exists;
- Caption Linked fields override matching Clip fields while unrelated Clip fields remain intact and Brand supplies missing defaults.

No visual redesign is permitted in H0.

## 6. Regression minimum

Before reporting PASS:

```text
Project open/save/reopen
Script remove/restore
Caption edit
Canvas drag/resize/rotate/nudge
Undo/Redo for representative supported edit
Preview playback
one short Final Render smoke if the local environment is already configured
```

The Final Render smoke is regression evidence only; H0 does not change render engines.

## 7. Defect handling

Use IDs:

```text
V2.1.1-H0-LV-001
V2.1.1-H0-LV-002
...
```

For every defect record:

- reproduction;
- expected;
- actual;
- root cause;
- changed files;
- regression test;
- commit SHA;
- local evidence.

Fix only H0 defects on the same branch:

```text
hardening/v2.1.1-h0-correctness
```

After a fix:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
git push origin hardening/v2.1.1-h0-correctness
```

Then wait for GitHub CI and return the new SHA to GPT Web.

## 8. Final report to GPT Web

Return exactly:

```text
BRANCH:
FINAL HEAD:
FROZEN INPUT HEAD:
LOCAL DATA ROOT:
NODE/NPM:
BROWSER:

CODE CHECKS: PASS/FAIL
SCRIPT H0: PASS/FAIL
CAPTION H0: PASS/FAIL
CANVAS H0: PASS/FAIL
STYLE REGRESSION: PASS/FAIL
SAVE/REOPEN: PASS/FAIL
FINAL RENDER SMOKE: PASS/FAIL/NOT REQUIRED

DEFECTS FIXED:
COMMITS PUSHED:
REMAINING FAILURES:
UNHANDLED CONSOLE ERRORS:

MERGE RECOMMENDATION: YES/NO
```

## 9. Actual Results — 2026-08-22 local Windows validation

### Entry gate and environment

- `git fetch origin`: PASS.
- Isolated worktree: `E:\Video-OS-Studio-H0-Validation`.
- Branch: `hardening/v2.1.1-h0-correctness`.
- Frozen input HEAD: `a3e56d9ea21f13e3ce7de9ed7b69d8c5d160940c`.
- Entry `git rev-parse HEAD`: exact match with the frozen input HEAD.
- Isolated data root: `E:\Video-OS-Data\v2.1.1-h0-validation-20260822-a3e56d9e`.
- Node/npm: `v25.2.1 / 11.6.2`; `npm ci` passed with the expected `EBADENGINE` warning because this repository declares Node `24.x`.
- Browser: local Chrome through CDP/browser-use, `1920×929`, app served at `http://127.0.0.1:3000`.
- FFmpeg/ffprobe: available. Real copied MP4 probe passed: H.264/AAC, `1080×1920`, `75.809067s`, `77,038,275` bytes. No residual `ffmpeg`/`ffprobe` process remained.

### Code checks

- `npm run lint`: PASS — 0 errors, 2 existing `@next/next/no-img-element` warnings in `EffectLibrary.tsx` and `HyperFramesLibrary.tsx`.
- `npm run typecheck`: PASS.
- `npm run test`: PASS — 35 test files, 137 tests.
- `npm run build`: PASS.
- H0 targeted regression set (`script-editing`, `style-resolution-h0`, `canvas-change-v2.1`): PASS — 3 files, 16 tests.

### H0 actual results

- **SCRIPT H0: PASS.** On the isolated `M2 EDL Baseline Safety` project with 19 Script segments and two real A-roll clips, the UI remove of `segment-005` changed duration `1971 → 1848` and rebuilt three source ranges. Restore returned `1848 → 1971` and two clips. After normalizing both A-roll clips through the Video Inspector, every rebuilt clip retained `volume=0.75`, `muted=true`, `fit=cover`, `transform={x:32,y:-18,scale:1.15,rotation:3}`, `enabled=true`, and `layer=0`.
- **SCRIPT ambiguity safety: PASS.** Adding isolated `manual-video-ambiguity` to `video-main` caused Script remove to show the actionable canonical-A-roll safety error. Revision stayed `31`, duration stayed `1971`, and all three Video clips remained present.
- **CAPTION H0: PASS.** On the real `V21-E2E-Content-First` project, `fontSize` and `fontWeight` produced zero durable requests while focused and exactly one minimal `update-caption-style` command on blur. Sequential `fontFamily=Arial` then `fontSize=72` preserved both fields. A Caption preset selection produced one command. After save, service restart, and reopen, the UI and Project JSON retained `bold / 72 / 700 / Arial`.
- **CANVAS H0: PASS after fix.** Drag, resize, rotate, and keyboard nudge showed live draft state, committed on completion, cleared guides/draft, and produced no unhandled Promise rejection. A forced command failure showed visible error feedback, preserved the last durable transform, cleared guides/draft, and the next normal nudge succeeded after endpoint restoration.
- **STYLE REGRESSION: PASS.** Motion Inspector showed the linked Motion Style accent; the H0 style contract tests passed all four Linked → Clip → Brand cases, including explicit Clip accent preservation and Caption linked-field merging.
- **SAVE/REOPEN: PASS.** Both real projects reopened after service restart. Caption values and Script/A-roll state persisted.
- **UNDO/REDO: PASS.** A real Caption preset edit followed `bold → primary → Undo (bold) → Redo (primary) → Undo (bold)` through the timeline controls, with no unhandled errors.
- **PREVIEW PLAYBACK: PASS.** Real Remotion Player playback advanced from frame 0 to frames 15/19 and paused normally with no unhandled errors.
- **FINAL RENDER SMOKE: NOT REQUIRED.** The frozen H0 input has no installed `@remotion/cli` or `.bin/remotion.cmd`; invoking the adapter would use the default network `npx` path and enter H2 Engine Runtime scope. Existing H0 validation did not modify render engines.

### Defect fixed

**V2.1.1-H0-LV-001 — duplicate Canvas child-gesture commits**

- Reproduction: resizing through `.canvas-handle.se` or rotating through `.canvas-rotate` caused the child `pointerup` and parent `.canvas-object` `pointerup` handlers to commit the same transform twice.
- Expected: one completed user gesture produces one durable Canvas command.
- Actual before fix: two identical POST commands were observed for resize and rotate; the no-lock baseline could persist them from the same revision.
- Root cause: child pointer-up events bubbled into the parent finish handler.
- Fix: `CanvasOverlay.finish` now stops propagation before committing.
- Regression test: `tests/canvas-change-v2.1.test.ts` verifies the pointer-up boundary contract.
- Fix commit pushed: `ac497b9` (`fix: prevent duplicate canvas gesture commits`).
- Post-fix browser evidence: resize and rotate each produced exactly one POST; live draft and error cleanup remained correct.

### Final H0 report

```text
BRANCH: hardening/v2.1.1-h0-correctness
FINAL HEAD: ac497b9 at validation-fix push; this Actual Results record is the following documentation commit
FROZEN INPUT HEAD: a3e56d9ea21f13e3ce7de9ed7b69d8c5d160940c
LOCAL DATA ROOT: E:\Video-OS-Data\v2.1.1-h0-validation-20260822-a3e56d9e
NODE/NPM: v25.2.1 / 11.6.2
BROWSER: local Chrome CDP/browser-use, 1920×929

CODE CHECKS: PASS
SCRIPT H0: PASS
CAPTION H0: PASS
CANVAS H0: PASS
STYLE REGRESSION: PASS
SAVE/REOPEN: PASS
FINAL RENDER SMOKE: NOT REQUIRED

DEFECTS FIXED: V2.1.1-H0-LV-001
COMMITS PUSHED: ac497b9; validation record commit follows
REMAINING FAILURES: Node 24.x declaration vs local Node 25.2.1 warning; no local Remotion CLI so final render smoke is NOT REQUIRED; H1 Issue #11 revision/conflict protection remains intentionally deferred
UNHANDLED CONSOLE ERRORS: none observed in browser instrumentation

MERGE RECOMMENDATION: YES, conditional on GitHub CI passing for the pushed H0 head; do not merge locally and do not start H1
```

## 10. H0 completion boundary

This validation did not merge PR #19, did not change `main`, and did not start H1 or any H2+ workstream.

Do not merge the PR locally and do not start H1.
