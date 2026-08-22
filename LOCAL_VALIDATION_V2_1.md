# Video OS Studio V2.1 — Windows Local Validation Contract

> Branch: `feature/v2.1-universal-ui`  
> PR: #14  
> Basis: `Video_OS_Studio_V2_1_AI_First_Universal_UI_Redesign_Master_PRD_Rev2.md`  
> Execute only after GPT Web marks the latest cloud head `CODE COMPLETE / CLOUD VERIFIED`.

## 1. Scope and stop rules

This is a Windows/local acceptance contract, not a new product-development phase.

Local Codex may:

- validate the final cloud branch on real Windows;
- fix V2.1 defects discovered by this contract;
- add regression tests for those defects;
- update this document with Actual Results and evidence.

Local Codex must not add:

- real AI Provider;
- broad AI Command Bar;
- multi-timeline;
- Crop/Mask engine;
- transition suite;
- generated-media provider marketplace;
- cloud/collaboration;
- arbitrary docking engine;
- Project Schema rewrite.

PR #14 stays open/unmerged until all local gates pass.

---

## 2. Environment isolation

Use a dedicated worktree, recommended:

```text
E:\Video-OS-Studio-v2.1-validation
```

Use a dedicated runtime root, recommended:

```text
E:\Video-OS-Data\v2.1-validation-YYYYMMDD-HHMMSS
```

Do not modify accepted V2.0 / RC1 validation roots or unrelated local changes.

Record:

- branch;
- actual HEAD;
- worktree path;
- `VIDEO_OS_DATA_ROOT`;
- Node / npm;
- FFmpeg / ffprobe versions;
- browser version;
- Windows display scale / DPI for representative tests.

Run before UI validation:

```text
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

All must pass.

---

# L1 — Windows Workspace + Universal Canvas

## 3. Resizable Shell

Validate the real browser UI:

- 48px icon rail;
- left content panel;
- universal viewer;
- right inspector;
- timeline.

Pointer resize:

- left panel;
- inspector;
- timeline height.

Keyboard resize:

- focus each separator with Tab;
- Left/Right for side panels;
- Up/Down for timeline;
- Shift + Arrow = larger step.

Validate limits are clamped and no panel can destroy the Viewer.

Validate:

- collapse / expand left panel;
- collapse / expand inspector;
- double-click separator behavior where available;
- Reset Workspace.

## 4. Workspace persistence

For each preset:

```text
EDIT
AI
SCRIPT
MOTION
```

1. select preset;
2. resize at least one panel;
3. refresh browser;
4. verify persisted local workspace layout;
5. verify `project.json` revision and Project content did not change only because Workspace changed.

## 5. Universal Viewer matrix

Create/open projects for at least:

```text
1920×1080  16:9
1080×1920  9:16
1080×1080  1:1
2560×1080  21:9
1600×900   custom landscape
900×1600   custom portrait
```

For every project verify:

- same Editor Shell;
- Viewer automatically fits available region;
- no portrait-only or landscape-only degraded mode;
- canvas metadata displays actual width/height/ratio;
- resize panels and confirm Viewer refits correctly.

## 6. Existing Canvas interaction regression

On representative landscape, portrait and square/custom projects verify:

- select Video / B-roll / Remotion / HyperFrames where available;
- drag;
- resize;
- rotate;
- Arrow nudge;
- Shift+Arrow nudge;
- center snap;
- safe-area snap;
- object snap;
- Alt bypass;
- layer ordering;
- Canvas ↔ Inspector round-trip.

One gesture must still persist as one durable command/revision, not many pointer-move revisions.

## 7. Canvas Change Preview

Use Project Inspector to change one project from one aspect to a materially different aspect, e.g.:

```text
1080×1920 → 1920×1080
```

Before Apply verify:

- Project revision unchanged;
- Before/After canvas shown;
- affected Caption count;
- affected Motion count;
- affected B-roll count;
- affected Video count;
- aspect-change warning;
- Cancel restores the staged values without changing Project.

Then stage again and Apply once.

Expected:

- one validated `set-canvas` command;
- revision +1;
- existing transforms remain durable;
- user is able to inspect/reposition content after aspect change.

Do not implement smart reframe in this milestone.

---

# L2 — Real Universal Media Ingest

## 8. Required real media

Use real Windows files where available:

Video minimum:

- MP4;
- MOV;
- at least one WebM or MKV;
- AVI if a safe sample exists.

Audio minimum:

- MP3;
- WAV or M4A;
- FLAC or raw AAC.

Image minimum:

- PNG;
- JPEG;
- WebP.

Subtitle:

- SRT or VTT.

Record source path, size, extension and SHA256 for representative files.

## 9. Video import / normalization

### MP4

Expected:

- native project media path;
- no unnecessary FFmpeg transcode;
- ffprobe metadata attached;
- project canvas is not silently changed unless Match Source is explicitly active.

### MOV / M4V / WebM / MKV / AVI

Expected user path:

```text
Import
→ preparing status
→ original preserved
→ internal working MP4
→ ffprobe
→ normal Studio playback/editing
```

No manual user-run FFmpeg command is allowed.

Validate on disk:

```text
original/<asset-id>-<original-file>
input/<asset-id>-<name>-working.mp4
```

Validate Project Asset:

- `originalRelativePath` points to original copy;
- `relativePath` points to working media;
- original file is not modified;
- restart/reopen still resolves working media.

## 10. Match Source Dimensions

Create a new project with `Match Source Dimensions` active.

Choose an explicit project FPS.

Import the first real video.

Expected:

- first imported video probe supplies Width × Height;
- one follow-up Project Command changes canvas dimensions if needed;
- Project FPS remains the explicit selected project timebase;
- Match Source disarms after first video;
- subsequent B-roll/media imports do not silently change canvas.

Record revisions around import and match-source command.

## 11. Audio normalization

MP3/WAV/M4A may remain native project assets.

For FLAC / raw AAC expected path:

```text
Import
→ original preserved
→ internal M4A/AAC working media
```

Validate:

- `originalRelativePath` exists;
- working `.m4a` exists;
- MIME/work path are correct;
- ffprobe can read working audio;
- waveform can be generated;
- actual playback works when used as Audio Clip.

## 12. Images and subtitles

Validate PNG/JPEG/WebP import as reusable assets.

Validate SRT/VTT parsing still works and does not regress Caption timeline behavior.

## 13. Error and retry UX

Use one safe unsupported extension or intentionally invalid media copy.

Expected:

- clear error;
- retry surface where applicable;
- no half-created corrupt Project state;
- no silent app crash.

---

# L3 — Real Cross-Aspect Render Matrix

## 14. Required final renders

Must really render at least three materially different canvases:

### Landscape

Recommended:

```text
1920×1080
```

### Portrait

Recommended:

```text
1080×1920
```

### Square or nonstandard

Recommended:

```text
1080×1080
```

or a custom canvas such as:

```text
1600×900
900×1600
2560×1080
```

The three renders must not all reuse one theoretical fixture without visual inspection.

## 15. Representative content per render

Each render should contain, where practical:

- A-roll / Video;
- Caption;
- Motion;
- B-roll;
- Audio;
- AI Director visual;
- Canvas transform.

At least one render should include Linked Style.

## 16. Preview = Render

For every required aspect capture representative Preview and Final frames.

Check:

- canvas dimensions;
- Caption location/width;
- Motion position/scale;
- B-roll crop/fit;
- Brand;
- rotation/transform;
- layer ordering.

No element may be accepted merely because the render command completed.

## 17. ffprobe

For every Final MP4 record:

- Video codec;
- Audio codec;
- Width;
- Height;
- FPS;
- Frames;
- Duration;
- File size.

Expected default output remains H.264 + AAC unless existing accepted render settings explicitly differ.

---

# L4 — V2.1 End-to-End Acceptance

## 18. Brand-new real project

Create at least one new Project through V2.1 UI.

Do not copy the accepted RC1 project and call it V2.1 acceptance.

Use a real source not used as the sole basis for prior milestone acceptance where practical.

Complete:

```text
New Project / Scenario
→ Canvas preset or custom canvas
→ Import / auto-normalize if needed
→ video-use transcript
→ Script
→ Scenes
→ Captions
→ AI Workspace / AI Director
→ Review / Deselect / Apply
→ Brand / Linked Style
→ Canvas fine edit
→ Timeline fine edit
→ B-roll
→ Audio
→ Final Render
→ Save / Stop / Restart
→ Recent Project Reopen
→ Second Edit
→ Second Final Render
```

## 19. New UI information architecture

Validate first-class destinations:

- Script;
- Scenes;
- AI;
- Media;
- Captions;
- Effects;
- Brand;
- Project.

Media panel:

- Assets;
- Transcript;
- Library.

Validate no essential core tool becomes unreachable in any official workspace preset.

## 20. Script / Scene UX

Script:

- search works;
- current word remains clear;
- removed state remains clear;
- semantic tags still work;
- Scene semantic chip appears where linked;
- clicking word still seeks/selects transcript reference.

Scenes:

- semantic labels are localized;
- Visual count is meaningful;
- visual intensity can be edited through supported command path;
- Scene click seeks and selects;
- Split/Merge/Rename regressions pass.

## 21. AI Workspace

Validate:

- AI is a first-class workspace;
- Project Canvas context reflects actual arbitrary canvas;
- Scene/Clip/Transcript references appear from current selection;
- Cards/Density/Peak metrics live in AI workspace;
- existing M5 Analyze / Reason / Confidence / Alternatives / Density Hold / Change Preview / Apply remain functional;
- one Apply remains one transaction/Undo.

No real Provider is required in V2.1; source may remain `rules`.

## 22. Timeline presentation + M4 regression

Validate visual hierarchy plus real behavior:

- Scene Strip;
- five track headers;
- Marker;
- Snap;
- Waveform;
- Zoom;
- multi-select;
- Split;
- Duplicate/Delete;
- Undo/Redo;
- keyboard shortcuts;
- source continuity.

## 23. i18n / theme / accessibility

### zh-CN / en-US

Check all V2.1 surfaces:

- top bar;
- rail;
- Media tabs;
- Project / New Project;
- Match Source;
- Canvas Change Preview;
- Script search;
- Scene semantic/intensity;
- AI Workspace;
- Inspector registry;
- import/normalize state.

### Dark / Light

Theme must not mutate Project Brand or revision.

### Keyboard/focus

Validate:

- rail controls reachable;
- workspace preset controls reachable;
- panel separators reachable and adjustable by keyboard;
- inspector navigation reachable;
- inputs do not trigger destructive Timeline shortcuts;
- focus indicators are visible.

## 24. Durability

After meaningful V2.1 edits:

```text
Save
→ stop dev server
→ restart
→ Recent Project reopen
```

Verify:

- Project content durable;
- original/working media paths durable;
- canvas durable;
- Script/Scenes/Captions durable;
- AI-applied visuals durable;
- Brand/Linked Style durable;
- Timeline markers/splits durable;
- local Workspace preference also restores independently.

## 25. Usability observations

Record:

- time from launch to first new Project;
- time from media selection to usable imported media;
- time for MOV normalization;
- time for FLAC/AAC normalization if tested;
- time to switch workspace and locate major tools;
- first-render time;
- second-render time.

Count:

- Terminal fallbacks required for normal user path;
- API-only fallbacks required;
- internal ID knowledge required;
- Project JSON knowledge required;
- dead-end UI states;
- forced restarts.

Normal user path should not require manual FFmpeg for supported import formats.

---

# Defect policy

Number local defects:

```text
V2.1-LV-001
V2.1-LV-002
...
```

For each record:

- area / workflow step;
- reproduction;
- expected;
- actual;
- root cause;
- fix;
- commit;
- evidence;
- regression test.

After each fix batch run:

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

Push fixes to `feature/v2.1-universal-ui` and wait for PR #14 latest CI.

Do not merge PR #14 locally.

---

# Evidence minimum

Save screenshots for at least:

1. Edit workspace;
2. AI workspace;
3. Script workspace;
4. Motion workspace;
5. landscape Viewer;
6. portrait Viewer;
7. square/custom Viewer;
8. Canvas Change Preview;
9. MOV normalization state;
10. Original + working media evidence;
11. Script search / semantic chip;
12. Scene semantic + intensity;
13. Timeline redesigned surface;
14. keyboard-focused separator;
15. landscape Final frame;
16. portrait Final frame;
17. square/custom Final frame;
18. restart/reopen;
19. second edit;
20. second Final render.

If Browser Harness is available, record a complete `video-os-v2.1-local-validation` session.

---

# Final report contract

Return all of the following to GPT Web:

- Final Commit SHA;
- Final GitHub CI Run ID;
- worktree path;
- `VIDEO_OS_DATA_ROOT`;
- Node/npm/FFmpeg/ffprobe/browser;
- final tests: files/tests;
- L1 Workspace results;
- all aspect Viewer results;
- Canvas Change Preview results + revisions;
- Match Source results + revisions;
- real video import matrix;
- real audio import matrix;
- image/subtitle results;
- normalization source/working paths;
- Script/Scene UX results;
- AI Workspace results;
- Timeline results;
- zh-CN/en-US;
- Dark/Light vs Brand;
- keyboard/a11y results;
- durability results;
- Landscape Final MP4 + ffprobe;
- Portrait Final MP4 + ffprobe;
- Square/Custom Final MP4 + ffprobe;
- Preview vs Final comparisons;
- V2.0 focused regression;
- all `V2.1-LV-xxx`;
- Remaining Failed Items;
- evidence directory;
- browser recording path;
- usability timings and fallback counts.

Final gates:

```text
CODE COMPLETE: PASS / FAIL
CLOUD VERIFIED: PASS / FAIL
WINDOWS UI VERIFIED: PASS / FAIL
UNIVERSAL MEDIA VERIFIED: PASS / FAIL
CROSS-ASPECT RENDER VERIFIED: PASS / FAIL
DURABILITY VERIFIED: PASS / FAIL
PRD ACCEPTED: PASS / FAIL
VISUAL ACCEPTED: PASS / FAIL
USABILITY ACCEPTED: PASS / FAIL
REGRESSION ACCEPTED: PASS / FAIL
```

Stop after V2.1 validation and necessary V2.1 defect fixes. Do not start post-V2.1 product scope.
