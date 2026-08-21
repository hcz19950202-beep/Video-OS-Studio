# Video OS Studio V2 — M4 Windows Local Validation

> Milestone: M4 Canvas + Timeline V2  
> Branch: `feature/v2-canvas-timeline`  
> PR: #7  
> Rule: do not merge PR #7 and do not start M5 until every required M4 gate passes.

## 1. Scope

M4 must prove on Windows that the accepted M3 editor core now has a real direct-manipulation Canvas and a high-frequency Timeline V2 without replacing the accepted Script / Scene / Context Inspector architecture.

```text
M3 Project State
↓
Canvas direct manipulation
↓
Project Commands / durable transforms
↓
Timeline V2 / markers / snap / waveform / shortcuts / history
↓
Save / Restart / Reopen
↓
Preview = Final Render
```

M4 includes:

- Canvas select / drag / resize / rotate;
- keyboard nudge;
- center / safe-zone / object alignment snap and guides;
- layer forward / backward;
- Canvas ↔ Inspector synchronization;
- Timeline snap to playhead / clip edges / Scene boundaries / Marker / Caption boundaries;
- Marker creation / seek / removal;
- multi-select regression;
- keyboard shortcuts;
- source-aware Split;
- bounded Undo / Redo;
- real precomputed FFmpeg waveform peaks and project-local cache;
- Scene Strip regression.

M4 does **not** include M5 AI Director, AI recommendation review/apply, AI command bar, or unrelated HyperFrames renderer replacement work.

## 2. Safety

- Do not modify the accepted M3 validation project/data root in place.
- Use an isolated worktree and isolated `VIDEO_OS_DATA_ROOT`.
- Copy the complete accepted M3 project directory so every project-relative media asset remains intact.
- Keep source A-roll / B-roll / Audio unchanged.
- Do not hand-edit `project.json` to fabricate acceptance.
- Use supported UI / API / Project Command boundaries only.
- Use `V2-M4-LV-001`, `V2-M4-LV-002`, ... for real M4 defects.
- Fix M4-only defects on `feature/v2-canvas-timeline`, push to PR #7, rerun all gates.
- The existing M3 follow-up `V2-M3-LV-001` (fresh HyperFrames VP9 alpha output on Windows Remotion compositor) is not an M4 defect unless M4 changes regress the previously accepted HyperFrames asset path. For final M4 render, the previously accepted real alpha HyperFrames WebM may be reused.

## 3. Environment

Recommended isolated worktree:

```powershell
cd E:\Video-OS-Studio
git fetch origin
git worktree add E:\Video-OS-Studio-v2-m4-validation origin/feature/v2-canvas-timeline
cd E:\Video-OS-Studio-v2-m4-validation
```

If the worktree already exists, update it safely instead of force-overwriting unrelated local work.

Record:

```text
node -v
npm -v
git branch --show-current
git rev-parse HEAD
git status
```

Require Node 24.x.

Run:

```powershell
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

Cloud baseline at handoff is the latest successful PR #7 CI. If documentation-only commits advance the branch, validate the newest head rather than an older SHA.

## 4. Isolated validation data

Use the accepted M3 project as the starting content, but copy it into a fresh M4 data root.

Accepted M3 source project:

```text
Project ID:
m2-script-scene-e19978c4

Accepted M3 project path:
E:\Video-OS-Data\v2-m3-validation-20260821-142900\projects\m2-script-scene-e19978c4
```

Create a new timestamped root, for example:

```text
E:\Video-OS-Data\v2-m4-validation-YYYYMMDD-HHMMSS
```

Copy the **complete** accepted M3 project directory under:

```text
<NEW_ROOT>\projects\m2-script-scene-e19978c4
```

Then start the dev server with:

```powershell
$env:VIDEO_OS_DATA_ROOT="<NEW_ROOT>"
npm run dev
```

Do not point M4 validation directly at the accepted M3 root.

## 5. Baseline project check

Open `m2-script-scene-e19978c4` from the real Studio UI.

Before M4 edits, confirm the accepted M3 state is still present:

- real A-roll Video;
- styled Caption clips;
- Remotion Motion clips;
- HyperFrames Motion clip using an accepted Windows-compatible alpha asset;
- B-roll;
- Audio;
- Script with 20 segments;
- 10 Scenes;
- Motion and Caption Linked Styles;
- Generated Video Brand;
- zh-CN / en-US preferences.

Record initial Project revision.

## 6. Canvas Edit mode

Enable `Canvas / 画布编辑` in Preview.

Expected:

- normal Remotion Player controls are not fighting Canvas pointer gestures while Canvas Edit is active;
- disabling Canvas Edit restores normal Player controls;
- Preview frame does not unexpectedly jump when simply entering/exiting Canvas Edit.

Capture one full-workstation screenshot with Canvas Edit active.

## 7. Canvas selection contexts

At frames where the objects are active, select from the Canvas itself:

1. Video;
2. B-roll;
3. Remotion Motion;
4. HyperFrames Motion.

Expected:

- the clicked visual object becomes the selected clip;
- Timeline selection matches;
- right Context Inspector matches the selected clip;
- selection outline follows the rendered visual layer meaningfully;
- if two visual clips overlap, the higher rendered layer is the higher Canvas hit target.

Do not require Caption direct manipulation in M4; Caption remains controlled through its accepted M3 Inspector/Timeline path.

## 8. Canvas Drag — live Preview + durable command

Use a real Motion clip and a real B-roll or Video clip.

For each:

1. record revision and Inspector X / Y;
2. drag the object in Canvas;
3. while the pointer is still down, visually confirm the **actual Preview content** follows the Canvas draft rather than only the selection frame moving;
4. release the pointer;
5. confirm the durable Inspector X / Y matches the new Canvas position;
6. confirm one pointer-up gesture causes one durable Project command / one revision increment.

Expected:

```text
pointer move
= live local Preview only

pointer up
= durable Project mutation
= one revision
```

Record before / during / after evidence for at least one Motion drag.

## 9. Canvas Resize

Use the bottom-right Canvas resize handle.

### A. Unlinked visual clip

Resize an unlinked Video/B-roll/Motion clip.

Expected:

- actual Preview content resizes live while dragging;
- scale does not jump when starting from a non-1.0 scale;
- pointer-up persists Scale;
- Inspector Scale matches Canvas;
- final render later matches.

### B. Linked Motion

Select a Motion clip that currently resolves a Motion Linked Style.

Resize it in Canvas.

Expected:

- Canvas displays that the Motion is Linked;
- the resize changes the Linked Style scale path rather than writing an invisible per-clip scale that gets ignored;
- all clips bound to the same resolved Motion Linked Style update consistently;
- M3 live-reference semantics remain intact after save/reopen.

Record the Linked Style ID and at least two affected clip IDs.

## 10. Canvas Rotation

On Video/B-roll/Motion:

- use the Canvas rotation handle;
- confirm visible live rotation while pointer is down;
- release and record Inspector Rotation;
- edit Rotation in Inspector and confirm Canvas / Preview updates back.

Use a non-zero obvious value such as 15–30 degrees for evidence, then keep or restore a reasonable final composition.

## 11. Canvas Nudge

After clicking a Canvas object, without clicking an empty Canvas area first:

```text
Arrow key          → 1 canvas unit
Shift + Arrow key  → 10 canvas units
```

Expected:

- Canvas has keyboard focus after selecting/dragging an object;
- X/Y change by the expected amount;
- Preview updates;
- each key action persists through the normal command boundary;
- keyboard event does not accidentally scrub Timeline while Canvas owns focus.

## 12. Canvas Snap and guides

Test all required snap targets with a Motion or B-roll:

### Center

Drag near canvas X=0 / Y=0.

Expected: center guide appears and the durable transform lands on the center target.

### Safe-zone

Drag near supported safe-zone guide positions.

Expected: safe guide appears and the object snaps.

### Object alignment

Place two active transformable clips near a common X or Y.

Expected: object alignment guide appears and the selected clip snaps to the other object's axis.

### Alt bypass

Repeat a snap gesture while holding Alt.

Expected: no snap is applied and no guide forces the final value.

Capture center snap and one safe/object guide screenshot.

## 13. Canvas Center and Layer Forward / Backward

Use the floating Canvas toolbar.

### Center

- move an object off-center;
- click Center;
- expect X=0 and Y=0 through a durable Project Command.

### Layer ordering

Create/use a frame where B-roll and Motion overlap visibly.

- move one visual layer forward;
- verify Preview occlusion/order changes;
- move backward;
- verify order changes back;
- confirm the command changes durable `layer` and survives reopen.

Layer behavior must match Preview and Final Render; it must not be only a Canvas outline ordering change.

## 14. Inspector ↔ Canvas round-trip

For one Video/B-roll/Motion clip:

1. Canvas Drag → Inspector X/Y changes;
2. Canvas Resize → Inspector/shared Linked Style scale changes as appropriate;
3. Canvas Rotate → Inspector Rotation changes;
4. edit X/Y/Scale/Rotation from Inspector;
5. Canvas selection geometry and Preview must reflect the Inspector values.

This bidirectional path is mandatory.

## 15. Timeline Snap

Keep Snap enabled and test drag/resize against:

1. Playhead;
2. another Clip start;
3. another Clip end;
4. Scene boundary;
5. Marker;
6. Caption boundary.

Expected:

- snap guide is visible;
- clip start/end resolves to the correct frame;
- pointer-up persists the snapped value.

Then hold Alt during a normally-snapping drag.

Expected: snap is bypassed.

Record at least three distinct snap target types with exact resulting frames.

## 16. Marker workflow

At a known Player frame:

- press `M`;
- confirm Marker appears at the current frame;
- click Marker and verify Player seeks to that frame;
- add at least two Markers;
- remove one via the supported Marker UI (current UI: context/right-click removal);
- save/reopen and confirm remaining Marker persists.

Record Marker IDs / labels / frames.

## 17. Timeline keyboard shortcuts

Outside text inputs/contenteditable fields, validate:

```text
Space              Play / Pause
Left / Right       -1 / +1 frame
Shift+Left/Right   -10 / +10 frames
M                  Add Marker
S                  Split selected clip at playhead
Delete / Backspace Delete selected clip(s)
Ctrl/Cmd + D       Duplicate selected clip(s)
Ctrl/Cmd + Z       Undo
Ctrl/Cmd+Shift+Z   Redo
Esc                Clear selection
```

Inside Inspector text/number/select/textarea inputs, typing/editing must not trigger global Timeline shortcuts.

For destructive shortcut checks, work on expendable duplicates in the isolated M4 project.

## 18. Multi-select regression

M3 multi-select must remain intact:

- Shift+Click at least three Motion clips;
- Shift+drag an empty Timeline lane over a range;
- verify selected clip IDs;
- verify `SEL` metric and Multi Inspector;
- perform one safe bulk operation and confirm one transaction = one revision.

Do not regress `Mixed` handling.

## 19. Source-aware Split continuity

### Video

Use/prepare a Video clip with a non-zero `sourceStartFrame` if possible.

Split inside the clip with `S`.

Expected:

```text
right.sourceStartFrame
=
left original sourceStartFrame
+
left duration
```

Playback across the split must continue from the matching source position, not restart the media.

### B-roll

Use a B-roll with `sourceStartFrame` and split inside it.

Expected: the right B-roll clip advances `sourceStartFrame` by the left duration and Preview playback remains continuous across the split.

The B-roll Inspector must expose/persist Source Start.

Record left/right clip IDs, timing and sourceStartFrame values.

## 20. Undo / Redo

Perform a controlled sequence, for example:

1. move a clip;
2. add Marker;
3. duplicate a clip;
4. Undo three times;
5. Redo three times.

Expected:

- each Undo / Redo restores a validated Project snapshot through the server command boundary;
- project ID is unchanged;
- each successful restore is a new durable revision rather than rewinding the revision counter;
- Project remains parseable and saveable;
- a failed restore must not corrupt the in-memory Undo/Redo stack.

Then perform one new edit after Undo and confirm the obsolete Redo branch is cleared.

## 21. Real Waveform

Use real Video and Audio assets from the project.

Expected Timeline behavior:

- Video with audio shows waveform bars;
- Audio shows waveform bars;
- waveform is based on real FFmpeg analysis, not random/static decorative CSS;
- no-audio Video must not crash the Timeline.

Verify project-local cache files appear under:

```text
<PROJECT_PATH>\cache\waveforms\
```

Expected file pattern:

```text
<assetId>-<points>.json
```

Open at least one cache JSON and confirm:

- `assetId` matches;
- `points` is bounded;
- `peaks` contains numeric values in the expected normalized range.

Refresh/reopen and confirm the waveform remains available from cache without breaking the project.

## 22. Scene Strip regression

Confirm the accepted M2 Scene Strip remains above media tracks.

- click at least three Scene blocks;
- Player seeks correctly;
- Scene Inspector still opens;
- Timeline M4 markers/snap/waveform do not obscure or break Scene Strip interaction.

## 23. Save / Stop / Restart / Reopen

Save the M4 project, stop the dev server, restart with the same isolated M4 `VIDEO_OS_DATA_ROOT`, reopen from Recent Projects.

Verify persistence of:

- Video/B-roll/Motion X/Y/Scale/Rotation/Layer;
- B-roll `sourceStartFrame` after Split;
- Markers;
- Split clip structure;
- Brand and Linked Styles;
- Script / Scenes;
- Caption styling;
- Audio properties;
- M3 context properties.

Waveform cache should still exist under the project cache directory.

Undo/Redo history itself is client-session bounded and does not need to survive a dev-server/browser restart; durable Project state must survive.

## 24. Real Final Render

Render the final M4 validation project through the normal UI.

Required checks:

- H.264 video;
- AAC audio when project contains audio;
- expected resolution;
- expected fps;
- expected duration / frame count;
- no Chromium/Remotion media errors on the accepted project asset path.

Capture Preview/final pairs proving:

1. rotated visual clip;
2. Canvas-transformed Motion/B-roll position/scale;
3. final layer ordering at an overlap frame;
4. B-roll after a Split at a frame that proves source continuity;
5. styled Caption / accepted M3 Linked Style still renders.

Use `ffprobe` on the final MP4 and retain the command output.

If the known fresh HyperFrames VP9-alpha compatibility issue reproduces, do not silently rewrite M4. Reuse the accepted M3 alpha HyperFrames asset for M4 final render and record that the known M3 follow-up remains unchanged.

## 25. zh-CN / en-US and Studio Theme regression

Verify both locales and refresh persistence.

Check new M4 primary surfaces are understandable in both locales:

- Canvas toggle;
- Center / Layer toolbar;
- Linked indication;
- Snap;
- Marker count/interaction;
- Rotation Inspector label.

Verify Dark / Light Studio Theme still changes only workstation appearance and does not mutate Generated Video Brand.

## 26. M2 / M3 regression smoke

Run a focused smoke, not a full historical acceptance rerun:

- Script word click ↔ Player seek;
- Script removal/restoration boundary still usable;
- Scene selection/Inspector;
- Project/Video/Caption/Motion/HyperFrames/B-roll/Audio/Multi Context Inspectors;
- Generated Video Brand;
- Motion + Caption Linked Styles;
- five media tracks;
- Effect Library / HyperFrames Library;
- Presets;
- Assets / Caption browser;
- Project JSON export;
- Preview/Timeline splitter;
- zh-CN / en-US;
- Dark / Light.

Do not start M5 AI Director during this smoke.

## 27. Visual evidence

Capture at minimum:

1. full workstation with Canvas Edit active;
2. Motion selected in Canvas with handles;
3. live Drag during pointer gesture;
4. Resize before/after;
5. Rotation + Inspector value;
6. Center/Safe/Object snap guide;
7. overlapping clips before/after Layer change;
8. Timeline Marker + Snap guide;
9. Video waveform;
10. Audio waveform;
11. Split Video/B-roll state;
12. Undo/Redo result;
13. English UI representative M4 context;
14. final render rotated/transformed frame;
15. final render layer-order frame;
16. final render B-roll post-split frame.

Prefer 1920×1080 workstation screenshots. Record a browser acceptance video if Browser Harness is available.

## 28. Defect handling

For every real M4 defect:

```text
V2-M4-LV-001
V2-M4-LV-002
...
```

Record:

- reproduction;
- expected;
- actual;
- root cause;
- fix;
- commit;
- evidence.

After every product fix run:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

Push only M4-scope fixes to `origin/feature/v2-canvas-timeline` and wait for PR #7 CI.

## 29. Final report

Return to GPT Web:

- final commit SHA;
- final GitHub CI run ID;
- validation worktree path;
- isolated M4 data root;
- validation project ID/path;
- automatic check results and test count;
- Canvas Video/B-roll/Remotion/HyperFrames selection result;
- live Drag result + revision before/after;
- Resize result;
- Linked Motion Canvas Resize result + Linked Style ID / affected clip IDs;
- Rotation result + Inspector round-trip;
- Nudge 1 / 10 result;
- Center/Safe/Object/Alt snap results;
- Layer forward/back result;
- Timeline snap target results with frames;
- Marker IDs/frames and persistence;
- shortcut matrix;
- multi-select regression;
- Video Split source continuity values;
- B-roll Split source continuity values;
- Undo/Redo sequence + revision behavior;
- waveform Video/Audio result;
- waveform cache paths and sample JSON properties;
- Save/Stop/Restart/Reopen result;
- M2/M3 regression smoke;
- final MP4 path + ffprobe;
- Preview/final comparison evidence;
- screenshot/evidence directory;
- browser recording path;
- all `V2-M4-LV-xxx` defects;
- remaining failed items or `NONE`.

Final gates:

```text
CODE COMPLETE: PASS / FAIL
CLOUD VERIFIED: PASS / FAIL
LOCAL VERIFIED: PASS / FAIL
PRD ACCEPTED: PASS / FAIL
RENDER VERIFIED: PASS / FAIL
VISUAL ACCEPTED: PASS / FAIL
```

Do not merge PR #7 and do not start M5. Stop and hand the result back to GPT Web.

## 30. Actual Windows Validation Results — 2026-08-21

### 30.1 Isolation and baseline

- Validation worktree: `E:\Video-OS-Studio-v2-m4-validation`
- Branch: `feature/v2-canvas-timeline`
- Handoff head: `afd41517e0449836861ee748b31c00928d4bd849`
- Isolated data root: `E:\Video-OS-Data\v2-m4-validation-20260821-181100`
- Validation project: `m2-script-scene-e19978c4`
- Project path: `E:\Video-OS-Data\v2-m4-validation-20260821-181100\projects\m2-script-scene-e19978c4`
- Accepted M3 source hash before copy: `B335173EBD32A5E149A0630786CD4C51246B4D70F81ABDACE313CCA5606DA24E`
- Final isolated project revision: `140`; final project hash: `54F848393BA3A6C41FCCAF5259CEBF33A1E2F1E9D20C04117CC7303A5498BE1E`
- Original `E:\Video-OS-Studio` worktree and accepted M3 data root were preserved.
- Node `v24.19.0`; npm `11.6.2`.

The baseline retained real A-roll, styled Captions, four Motion clips (three Remotion and one accepted HyperFrames asset), B-roll, Audio, 20 Script segments, 10 Scenes, five tracks, Generated Video Brand, Motion/Caption Linked Styles, and both locale/theme paths.

### 30.2 Automatic gates

- `npm ci`: PASS
- `npm run lint`: PASS; two pre-existing `@next/next/no-img-element` warnings in the library panels, zero errors.
- `npm run typecheck`: PASS
- `npm test`: PASS — 28 test files, 89 tests.
- `npm run build`: PASS — Next.js `16.3.1`.
- LV targeted regression: `tests/filesystem.integration.test.ts` PASS — 3/3.

### 30.3 Canvas acceptance

- Canvas mode: PASS. Player controls disappear in Canvas Edit and return when disabled.
- Canvas selection: Video, B-roll, Remotion Motion, and HyperFrames Motion all selected from the visual Canvas; Timeline and Context Inspector followed the selected clip. Evidence: `01`, `03`, `04`, `15`.
- Live drag: Video revision `94 → 95`; B-roll revision `95 → 96`. During pointer-down the actual Preview media transform changed; pointer-up produced one durable command/revision per gesture. Evidence: `02`, `03`.
- Unlinked resize: B-roll started at scale `0.72`, live-resized, and persisted at `0.7670100565`; Inspector/Preview matched. Evidence: `03`, `07`.
- Linked Motion resize: revision `96 → 97`; Linked Style `style-motion-1787295119353` changed to scale `1.2776294918`, opacity `0.85`. Affected clips: `motion-big-number-6762ed69-1f38-43eb-9ae8-0e6e5714b473`, `motion-metric-focus-6488ee53-bed9-4e28-a590-37a0a583386d`, `motion-keyword-impact-f062be70-6912-437a-9c04-62357d5b5097`, `motion-hf-process-flow-d31e50f048a245f6-1787294258662`. Evidence: `04`, `05`.
- Rotation: live rotation was visible at `15°`; Inspector edit to `30°` updated Canvas/Preview, and final persisted Video Rotation is `30°`. Evidence: `06`, final frame `17`.
- Nudge: Arrow changed X by `1`; Shift+Arrow changed X by `10`; Canvas retained focus and Timeline did not scrub. Center returned X/Y to `0` through a command.
- Snap: Center guides appeared; Safe guide appeared with `canvas-guide x safe`; Object guides appeared on both X/Y alignment; Alt produced no guide and bypassed snap. Evidence: `23`, `24`.
- Layer order: B-roll Back/Front commands changed durable layer relative to Video; final B-roll layer is `1`, Video layer is `0`. Evidence: `07`.
- Inspector round-trip: Canvas transforms updated Inspector; Inspector Rotation updated Canvas/Preview.

### 30.4 Timeline, split, history, and waveform

- Timeline snap: Playhead target resolved to frame `180`; Caption edge target resolved to frame `150` (Caption 1 end); Scene boundary moved B-roll start to frame `482`; Marker target moved B-roll start to frame `550`; Alt bypass moved it without a guide. The final accepted B-roll start was restored to frame `500`. Evidence: `25`, `26`, `27`, `08`.
- Marker workflow: `marker-1787310502048` (`M1`, frame `550`) remained after adding, seeking, removing the second marker, save, stop, restart, and reopen.
- Shortcut matrix: Space Play/Pause; Arrow ±1; Shift+Arrow ±10; M Marker; S Split; Ctrl+D duplicate; Ctrl+Z undo; Ctrl+Shift+Z redo; Esc clear selection. Inspector input guard passed: Arrow in the X input did not move the Player frame.
- Multi-select: Shift+Click selected Caption 1 + Caption 2 and reported `SEL 字幕 · 4.0秒`; Scene Strip selection opened Scene Inspector and sought frame `30`.
- Video Split: left `script-video-1` is `f0+702`, right `script-video-1-split-1787310884670` is `f702+1573`, right `sourceStartFrame=702`.
- B-roll Split: left `m3-broll-clip` is `f500+202`, right `m3-broll-clip-split-1787310785260` is `f702+38`, right `sourceStartFrame=202`; left fade-out `0`, right fade-in `0`.
- Audio Split: left `m3-audio-clip` is `f0+702`, right `m3-audio-clip-split-1787310910242` is `f702+1572`, right `sourceStartFrame=702`; left fade-out `0`, right fade-in `0`.
- Undo/Redo: durable revisions advanced through marker add/undo/redo and duplicate/undo/redo sequences; project ID remained unchanged. A new edit after Undo cleared the obsolete Redo branch.
- Waveform: real FFmpeg API calls generated Video and Audio `192`-point caches. Files:
  - `E:\Video-OS-Data\v2-m4-validation-20260821-181100\projects\m2-script-scene-e19978c4\cache\waveforms\media-96b4871d-26c4-4085-b493-7f887c5d9c3c-192.json`
  - `E:\Video-OS-Data\v2-m4-validation-20260821-181100\projects\m2-script-scene-e19978c4\cache\waveforms\m3-audio-asset-192.json`
  Both contain matching asset IDs, `points=192`, `peaks.length=192`, numeric normalized peaks with observed min `0.02` and max `0.1111111111`. Evidence: `09`, `10`.

### 30.5 M2/M3, locale, restart, and render

- M2 Script word click seek: clicked `现在`, Player moved to frame `40`. Evidence: `14`.
- M3 Scene Inspector, Multi-select, Linked Motion, HyperFrames, five-track structure, and Caption styling remained available. Evidence: `13`, `15`, `16`.
- zh-CN/en-US and Dark/Light: both locale labels and both themes were exercised; Generated Video Brand was not mutated. Evidence: `12`.
- Save → stop server → restart with the same isolated root → Recent Project reopen: PASS. Reopen showed the durable project state, split structure, marker, linked style, and revision `140`.
- Final render job: `30b32598-4e3c-49c1-989d-aaaeba17068a`, status `completed · 100%`.
- Final MP4: `E:\Video-OS-Data\v2-m4-validation-20260821-181100\projects\m2-script-scene-e19978c4\render\final-30b32598-4e3c-49c1-989d-aaaeba17068a.mp4`
- ffprobe: H.264 video, AAC audio, `1080×1920`, `30/1` fps, `2275` frames, video duration `75.833333s`, format duration `75.882667s`, size `86462831` bytes.
- Final render props and reopened final project match on all visual/timing/source fields; only the project revision/timestamp advanced during the subsequent snap cleanup checks. Extracted frames are content-equivalent evidence: `17` rotated/caption, `18` Remotion Motion, `19` B-roll, `20` HyperFrames + split B-roll, `21` styled Caption.

### 30.6 M4 defect log

`V2-M4-LV-001` — concurrent local project persistence collision.

- Reproduction: during rapid successive real Canvas/Inspector command activity, the server logged a `400` and `ENOENT` while renaming the shared `project.json.tmp`.
- Expected: every accepted command persists without a filesystem race.
- Root cause: all `writeTextAtomic` calls used the same temporary path; on Windows concurrent `rename` calls also conflict when replacing an existing target.
- Fix: unique `randomUUID()` temp paths, per-target write chaining, and cleanup of each writer's temp file in `adapters/filesystem.ts`.
- Regression: concurrent real-filesystem writes are covered by `tests/filesystem.integration.test.ts`; targeted and full test gates pass.
- No M4 renderer rewrite was made. The known M3 `V2-M3-LV-001` HyperFrames alpha compatibility follow-up remains unchanged.

### 30.7 Final gates at local handoff

```text
CODE COMPLETE: PASS
CLOUD VERIFIED: PASS — final PR #7 head's GitHub Actions `verify` job succeeded; exact final run is reported in the handoff message
LOCAL VERIFIED: PASS
PRD ACCEPTED: PASS
RENDER VERIFIED: PASS
VISUAL ACCEPTED: PASS
```

The final pushed branch head and exact PR #7 CI run are reported in the handoff message. The `verify` job passed Install dependencies, Lint, Typecheck, Unit tests, and Build. PR #7 remains unmerged and M5 was not started.
