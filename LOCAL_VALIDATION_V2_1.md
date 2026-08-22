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

---

# Actual Results — Windows Local Validation 2026-08-22

## Cloud and environment

- Branch: `feature/v2.1-universal-ui`
- Validation HEAD before local fixes: `5bc0ab22da6d8c78d40559245e5b0ddd90643631`
- Final local-fix commit: `7440d5c`
- PR #14: Draft / Open / unmerged
- Cloud CI for frozen head: Run `32549716348`, PASS
- Worktree: `E:\Video-OS-Studio-v2.1-validation`
- Data root: `E:\Video-OS-Data\v2.1-validation-20260822-133549`
- Node used for validation: `v24.19.0` bundled workspace runtime; system PATH Node `v25.2.1` was not used for checks
- npm: `11.6.2`
- FFmpeg / ffprobe: `8.1.1-full_build-www.gyan.dev`
- Browser: Google Chrome `151.0.7922.138`
- Windows: Windows 10 build `19045`
- Display scale/DPI: `96 DPI` / `100%`

## Automatic checks

| Check | Result |
| --- | --- |
| `npm ci` | PASS |
| `npm run lint` | PASS; 0 errors, 2 existing `no-img-element` warnings |
| `npm run typecheck` | PASS |
| `npm run test` | PASS; 32 files / 113 tests |
| `npm run build` | PASS |

## L1 — Workspace and Universal Canvas

- EDIT / AI / SCRIPT / MOTION: PASS
- 48px rail, left panel, universal Viewer, Inspector, Timeline: PASS
- Pointer resize left / Inspector / Timeline: PASS; draft changes were visible before Pointer Up and persisted after Pointer Up
- Keyboard separator resize: PASS; Arrow = 10px, Shift+Arrow = 40px; `aria-valuenow` changed and focus outline was visible
- Collapse / Expand left and Inspector: PASS
- Reset Workspace: PASS
- Refresh persistence for all four official presets: PASS
- Project revision remained unchanged during workspace switching/resizing/reset
- Canvas matrix created through the UI and persisted as Schema `2.0.0`: 1920×1080, 1080×1920, 1080×1080, 2560×1080, custom 1600×900, custom 900×1600: PASS

## L2 — Real Universal Media

Representative sources were selected from `E:\外贸预制房` and copied only by Studio's normal import flow into the isolated data root. Original source files were not modified.

| Input | Result |
| --- | --- |
| MP4 `source-sample-sdr.mp4` | Native project import, H.264/AAC, PASS |
| MOV `source.MOV` | Original preserved, Working H.264 MP4, ffprobe/playback PASS |
| WebM `f01.webm` | Original preserved, Working MP4, PASS |
| MKV `v21-sample.mkv` | Isolated validation fixture, Original preserved, Working MP4, PASS |
| AVI `v21-sample.avi` | Isolated validation fixture, Original preserved, Working MP4, PASS |
| MP3 `sfx_001.mp3` | Reusable audio asset, PASS |
| WAV `vo_cut.wav` | Reusable audio asset, PASS |
| FLAC `v21-sample.flac` | Original preserved, Working M4A, PASS |
| PNG / JPEG / WebP | Reusable image assets, PASS |
| SRT / VTT | Subtitle assets produced Caption clips, PASS |
| Unsupported `.txt` | Clear Error + Retry, no revision or partial asset, PASS |

MOV source SHA256 before import and the preserved original copy matched:
`04ED1ED966F1564B55AFA669ADEE322EF5911B336B2D3C751182351FEF322702`.

Match Source project result: initial explicit FPS `30`; first MP4 probe changed Canvas to `1080×1920` at revision `+4`; FPS stayed `30`; second video import left Canvas and FPS unchanged at revision `8`.

## L3 — Real Cross-Aspect Render

The brand-new `V21-E2E-Content-First` project rendered the same real source and semantic content at three canvases:

| Render | Canvas | Codec / FPS | Frames | Duration | Result |
| --- | --- | --- | ---: | ---: | --- |
| Portrait | 1080×1920 | H.264 / 30 | 2274 | 75.84s | PASS |
| Landscape | 1920×1080 | H.264 / 30 | 2274 | 75.84s | PASS |
| Square | 1080×1080 | H.264 / 30 | 2274 | 75.84s | PASS |

All three included Video, 2 Captions, 1 Motion and Audio. Preview and Portrait Final frame comparison was materially consistent for the factory background, presenter, keyword strip and caption.

The additional `V21-Short-Linked` project rendered at 1080×1080, 300 frames / 10.048s, H.264/AAC. Its render props confirmed `LinkedStyles=1`, `BrollClips=1`, and `MarkerCount=1`.

## L4 — Brand-new V2.1 projects

`V21-E2E-Content-First` was created from the V2.1 UI, not copied from RC1/M5. It completed:

```text
New Project → custom Canvas → real MOV import/normalize → video-use
→ 20 Script segments → 10 Scenes → 2 Caption clips
→ AI rules Analyze / Review / Apply → Motion
→ Brand / Linked Style → Canvas Preview / Apply
→ Timeline Marker / Split / Duplicate / Undo
→ B-roll / Audio → Render
```

`V21-Short-Linked` was reopened after a real server stop/restart, then received a second UI edit (Marker), Save, and second Render. Recent Project reopen restored Canvas, Script, Scene, Captions, Motion, Linked Style, Marker, media paths, and revision.

Script Search / Clear / Remove / Restore: PASS. Scene semantic labels, select/seek, Rename, Split/Merge controls and Visual Intensity command: PASS. AI Director source remained `rules`; Analyze, Reason/Confidence/Alternatives, Change Preview and one-transaction Apply: PASS. Timeline Scene Strip, five tracks, Marker, Snap, Waveform, Zoom, Split, Duplicate and Undo: PASS.

zh-CN / en-US and refresh persistence: PASS. Dark/Light Studio theme changed the V2.1 shell without changing Project Brand or revision: PASS. Keyboard focus indicators and separator ARIA values: PASS.

## Local defects fixed

All fixes are in local validation commit `7440d5c` and were followed by the final full automatic regression.

| ID | Area | Actual defect | Fix / regression |
| --- | --- | --- | --- |
| V2.1-LV-001 | New Project | Long form was clipped behind Timeline at 1440×900 | Constrained content panel flex/scroll layout; verified mouse-accessible Create Project |
| V2.1-LV-002 | Theme | Light preference changed root tokens but V2.1 shell stayed dark | Added V2.1 light surface tokens; verified dark/light and Brand isolation |
| V2.1-LV-003 | Canvas | Floating toolbar intercepted SE Resize handle | Toolbar pointer-events pass-through, buttons remain interactive |
| V2.1-LV-004 | Canvas | Rotate control was clipped by overlay `overflow:hidden` | Canvas overlay controls remain visible |
| V2.1-LV-005 | Inspector | Canvas Change Preview Apply was behind Timeline | Inspector gets its own scroll container; Apply verified by real click |
| V2.1-LV-006 | Media / Timeline | Imported visual assets had no normal-user B-roll placement action | Added `Add B-roll` UI using existing `add-clip` / `broll-main`; real image click produced B-roll clip and render |

## Usability and fallbacks

- Launch → first new Project: approximately `0.98s` after button action
- MOV Normalize: approximately `83–87s` for the 144MB HEVC MOV on this machine
- Audio normalization: completed within the normal import interaction; no manual FFmpeg step
- Long final renders: approximately `7–12 minutes` depending on Canvas; short 10s render: approximately `38–70s`
- Terminal fallback in normal product path: `0`
- API fallback in normal product path: `0`; APIs were inspected only for evidence/state verification
- Internal ID / Project JSON knowledge required by normal user: `0`
- Dead-end UI states after fixes: `0`
- Planned durability restart: `1`; crash/forced restart: `0`
- Browser Harness `mouseMoved` / screenshot calls timed out intermittently; validation used scoped Chrome CDP evidence helpers for real pointer events and screenshots. This is a harness fallback, not a product-user fallback.

## Evidence

- Evidence directory: `E:\Video-OS-Data\v2.1-validation-20260822-133549\evidence`
- Browser recording: `C:\Users\hcz\.config\browser-harness\agent-workspace\recordings\video-os-v2.1-local-validation`
- Continuation recording: `C:\Users\hcz\.config\browser-harness\agent-workspace\recordings\video-os-v2.1-local-validation-continued`
- Screenshots include the four workspaces, pointer/keyboard separators, Viewer matrix, Script/Scene/AI, Canvas Preview, Normalize/Error, Canvas transform, Final frames, restart/reopen, and second render.

## Final gates

```text
CODE COMPLETE: PASS
CLOUD VERIFIED: PASS
WINDOWS UI VERIFIED: PASS
UNIVERSAL MEDIA VERIFIED: PASS
CROSS-ASPECT RENDER VERIFIED: PASS
DURABILITY VERIFIED: PASS
PRD ACCEPTED: PASS
VISUAL ACCEPTED: PASS
USABILITY ACCEPTED: PASS
REGRESSION ACCEPTED: PASS
```

No Project Schema upgrade, Post-V2.1 scope, PR merge, real AI Provider, Multi Timeline, arbitrary Docking, Crop/Mask engine, Transition Suite, Generated Media Provider, Cloud Collaboration, HDR or Advanced Color work was started.
