# Video OS Studio V2.1 — GPT Web + GitHub / Local Codex Execution Plan

> Basis: `Video_OS_Studio_V2_1_AI_First_Universal_UI_Redesign_Master_PRD_Rev2.md`  
> Baseline: Video OS Studio V2.0.0 (`main@64da5ec6539a787f4d2f3750b3c5cea0273255ce`)  
> Integration branch: `feature/v2.1-universal-ui`

## 0. Current execution status

Cloud implementation is complete and Windows local acceptance is the next gate.

```text
C0 Universal Contract                         PASS
C1 Resizable Universal Editor Shell          PASS
C2 IA / Inspector / Timeline Presentation    PASS
C3 AI Workspace / Script / Scene / Project   PASS
C4 Universal Media Ingest / Polish           PASS
Cloud CI                                     PASS

L1 Windows Workspace / Universal Canvas      PENDING
L2 Real Universal Media Ingest               PENDING
L3 Cross-Aspect Real Render Matrix           PENDING
L4 V2.1 End-to-End Acceptance                PENDING
```

The last fully verified cloud code + acceptance-contract baseline before final handoff documentation passed:

```text
Install       PASS
Lint          PASS — 0 errors, 2 existing <img> warnings
Typecheck     PASS
Test files    32
Tests         107 PASS
Build         PASS
CI            32549458297
```

The authoritative local contract is now:

```text
LOCAL_VALIDATION_V2_1.md
```

Because documentation updates create a newer branch head, Local Codex must use the latest PR #14 head only after its corresponding CI is successful.

---

## 1. Delivery model

V2.1 is developed in two layers.

### GPT Web + GitHub owns

- product contracts and architecture;
- React component implementation;
- workspace/layout state;
- universal canvas math;
- canvas presets/custom canvas UI;
- information architecture;
- icon rail/content panel grouping;
- inspector registry UI;
- timeline visual shell changes;
- AI Workspace / Composer UI over existing M5 engine;
- Script / Scene UI improvements that do not change the accepted semantic engine;
- New Project / Scenario Starter UI;
- universal ingest Adapter/API and deterministic normalization policy;
- i18n, keyboard/focus/a11y code;
- unit/integration tests;
- CI, PR review, code-level acceptance.

### Local Codex owns

- Windows browser interaction acceptance;
- panel resize feel and pointer behavior;
- real screen-size / DPI testing;
- real FFmpeg/ffprobe and MOV/MKV/etc normalization;
- real Remotion / Chromium media decoding;
- real cross-aspect final renders;
- screenshot and browser-recording visual acceptance;
- performance checks with real projects;
- only defects discovered by local acceptance.

Local Codex must not implement cloud-planned product scope before the cloud branch is code-complete.

---

## 2. Cloud package C0 — Universal contract and regression guardrails

### Status

**COMPLETE**

### Scope

- Commit V2.1 Rev.2 Master PRD.
- Freeze V2.0.0 business-engine baseline.
- Add V2.1 UI architecture docs.
- Add aspect helpers and canvas preset contracts.
- Add regression tests proving project canvas is not portrait-only.
- Add explicit `Source Media != Project Canvas != Export Profile` domain documentation.

### Deliverables

- `Video_OS_Studio_V2_1_AI_First_Universal_UI_Redesign_Master_PRD_Rev2.md`
- `V2_1_CLOUD_LOCAL_EXECUTION_PLAN.md`
- `docs/v2.1/UNIVERSAL_CANVAS_CONTRACT.md`
- pure aspect/canvas helpers + tests.

---

## 3. Cloud package C1 — Resizable universal editor shell

### Status

**COMPLETE**

### Delivered

- simplified V2.1 top bar;
- 48px icon rail;
- resizable left content panel;
- flex universal Viewer;
- resizable Context Inspector;
- resizable Timeline height;
- collapse/restore panel states;
- local workspace persistence outside Project JSON;
- official workspaces: Edit / AI / Script / Motion;
- Reset Workspace;
- pointer resize draft → pointer-up persistence;
- keyboard-accessible separators with ARIA values;
- no arbitrary docking engine;
- no Project Schema rewrite.

Automated tests cover layout normalization, limits, presets, persistence and universal Viewer fit.

---

## 4. Cloud package C2 — Information architecture + Inspector / Timeline presentation

### Status

**COMPLETE**

Primary destinations:

- Script
- Scenes
- AI
- Media
- Captions
- Effects
- Brand
- Project

Panel grouping:

- Media: Assets / Transcript / Library
- Effects continue to reuse accepted Remotion / HyperFrames libraries;
- Project exposes universal project/canvas workflow without duplicating Inspector state.

Inspector:

- registry/navigation shell driven by existing V2 selection/capabilities;
- accepted Context Inspector commands remain authoritative;
- Project Inspector adds staged Canvas Change Preview;
- Before / After + affected Caption / Motion / B-roll / Video counts;
- one explicit Apply uses existing `set-canvas` command.

Timeline:

- M4 engine is preserved;
- toolbar / tracks / Scene Strip / clips / marker / snap / waveform visual hierarchy redesigned only.

---

## 5. Cloud package C3 — AI-first workspace + Script / Scene UX + New Project

### Status

**COMPLETE**

AI Workspace:

- first-class AI workspace;
- accepted M5 AI Director reused;
- current Project Canvas context;
- Scene / Clip / Transcript selection references;
- Cards / Density / Peak inside AI context;
- existing Plan / Reason / Confidence / Alternatives / Diff / Apply flow preserved.

AI runtime remains:

```text
rules
```

No real provider and no broad command agent were introduced.

Script / Scene:

- Script search;
- current word and removed state preserved;
- semantic chips;
- Scene semantic labels;
- Scene visual count;
- Scene visual-intensity command UI;
- Rename / Split / Merge / Seek behavior preserved.

New Project:

- Scenario starters;
- scenario never forces orientation;
- universal canvas presets;
- arbitrary custom width/height;
- FPS presets and custom FPS;
- Match Source Dimensions.

Match Source rule:

```text
first imported video probe may set Width × Height
FPS remains explicit Project timebase
```

---

## 6. Cloud package C4 — Universal media ingest + polish

### Status

**COMPLETE**

User-facing video formats:

```text
MP4
MOV
M4V
WebM
MKV
AVI
```

Audio:

```text
MP3
WAV
M4A
AAC
FLAC
```

Images:

```text
PNG
JPEG
WebP
```

Subtitles:

```text
SRT
VTT
```

Architecture:

```text
Import
→ capability policy
→ native-compatible?
   ├─ yes → project working media / reusable asset
   └─ no  → preserve original
            → normalize through FfmpegAdapter
            → controlled working media
```

Video normalization:

```text
MOV/M4V/WebM/MKV/AVI
→ H.264 yuv420p + AAC MP4 working media
```

Audio normalization:

```text
AAC/FLAC
→ AAC/M4A working media
```

Delivered:

- format policy;
- normalization strategy;
- original-source identity fields;
- API import report;
- Uploading / Preparing / Ready UX;
- explicit Original Preserved state;
- retry/error UI;
- dependency-injected FFmpeg adapters/mocks;
- keyboard/focus/reduced-motion polish;
- zh-CN / en-US primary V2.1 surfaces.

Actual Windows FFmpeg codec compatibility remains L2, not a cloud claim.

---

# 7. Local package L1 — Windows Workspace / Universal Canvas

Execute exactly from `LOCAL_VALIDATION_V2_1.md`.

Minimum Viewer matrix:

- 1920×1080 (16:9)
- 1080×1920 (9:16)
- 1080×1080 (1:1)
- 2560×1080 (21:9)
- 1600×900 custom landscape
- 900×1600 custom portrait

Validate:

- pointer/keyboard resize;
- collapse / persistence;
- Edit / AI / Script / Motion presets;
- universal Viewer fit;
- Canvas interaction regression;
- Canvas Change Preview / Cancel / Apply revisions;
- no clipping / dead panels / portrait-first behavior.

---

# 8. Local package L2 — Real Universal Media Ingest

Use real Windows sources.

Validate:

- MP4 native path;
- MOV automatic working MP4;
- WebM or MKV automatic working MP4;
- AVI if available;
- MP3/WAV/M4A;
- FLAC or AAC automatic working M4A;
- PNG/JPEG/WebP;
- SRT/VTT;
- Match Source Dimensions;
- original source not modified;
- project-relative original/working paths;
- restart/reopen;
- no normal-user manual FFmpeg step.

---

# 9. Local package L3 — Real Cross-Aspect Render Matrix

Must really render at least:

1. landscape;
2. portrait;
3. square or materially nonstandard custom canvas.

Each should contain representative A-roll, Caption, Motion, B-roll, Audio, AI visual and Canvas transform where practical.

Validate with ffprobe and Preview ↔ Final comparison.

Theoretical support is not acceptance.

---

# 10. Local package L4 — V2.1 Final End-to-End

Use at least one brand-new real project and complete:

```text
New Project
→ Universal canvas / scenario
→ Import / auto-normalize
→ Transcript
→ Script
→ Scenes
→ Captions
→ AI Workspace
→ Brand / Linked Style
→ Canvas
→ Timeline
→ Final Render
→ Save / Stop / Restart / Reopen
→ Second Edit
→ Second Render
```

Collect usability timings and release blockers.

---

# 11. Branch / merge policy

Cloud integration branch:

```text
feature/v2.1-universal-ui
```

Current execution order:

```text
C0 PASS
→ C1 PASS
→ C2 PASS
→ C3 PASS
→ C4 PASS
→ final cloud CI PASS
→ L1 / L2 / L3 / L4
→ V2.1 local defect fixes on same branch
→ latest CI PASS
→ V2.1 final acceptance review
→ merge decision
```

Do not merge PR #14 before all local gates pass.

---

# 12. V2.1 Definition of Done

V2.1 is done only if:

- professional resizable shell works on Windows;
- AI Workspace is first-class;
- Viewer has no portrait/landscape special mode;
- custom canvas is first-class;
- common source formats enter one user flow;
- MOV no longer requires a user-run manual FFmpeg conversion;
- common unstable audio such as FLAC/AAC can create controlled working media;
- at least landscape + portrait + square/custom are actually rendered;
- V2.0 semantic/project/command/render behavior does not regress;
- no engineer-only Project JSON edits are required for normal workflow;
- all gates in `LOCAL_VALIDATION_V2_1.md` pass.
