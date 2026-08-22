# Video OS Studio V2.1 — GPT Web + GitHub / Local Codex Execution Plan

> Basis: `Video_OS_Studio_V2_1_AI_First_Universal_UI_Redesign_Master_PRD_Rev2.md`
> Baseline: Video OS Studio V2.0.0 (`main@64da5ec6539a787f4d2f3750b3c5cea0273255ce`)
> Integration branch: `feature/v2.1-universal-ui`

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

### Cloud gate

`lint / typecheck / test / build = PASS`

---

## 3. Cloud package C1 — Resizable universal editor shell

### Scope

Implement the OpenCut-inspired professional editor shell without rewriting V2 engines.

- top bar simplified;
- 48px icon rail;
- resizable left content panel;
- flex universal viewer region;
- resizable context inspector;
- resizable timeline height;
- collapse/restore panel states;
- workspace layout persistence in local preferences, not project.json;
- official workspace presets: Edit / AI / Script / Motion;
- Reset Workspace;
- viewer must fit any `canvas.width × canvas.height`.

### Explicit non-goals

- no arbitrary docking engine;
- no Project Schema version bump;
- no Timeline engine rewrite;
- no Canvas engine rewrite.

### Automated cloud acceptance

- layout reducer/store tests;
- clamp/min/max tests;
- workspace preset tests;
- local-preference serialization tests;
- universal viewer fit tests: landscape / portrait / square / ultrawide / custom.

---

## 4. Cloud package C2 — Information architecture + inspector/timeline shell redesign

### Scope

#### Left rail / content panel

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
- Effects: Remotion / HyperFrames / Presets
- Project: Canvas / Brand / Workspace / Settings

#### Inspector

Convert presentation to a registry/tab architecture driven by current V2 selection/capabilities.
Do not rewrite accepted commands.

#### Viewer toolbar

- timecode;
- play/pause;
- Canvas Edit;
- Safe Area;
- Guides;
- Fit / zoom;
- canvas dimension + ratio info;
- fullscreen.

#### Timeline visual redesign

Reuse M4 engine; redesign only:

- toolbar hierarchy;
- track headers;
- scene strip visual treatment;
- marker/snap/waveform states;
- zoom presentation;
- selection hierarchy.

### Cloud gate

All V2.0 tests plus new navigation/registry/layout tests pass.

---

## 5. Cloud package C3 — AI-first workspace + Script/Scene UX + New Project

### AI Workspace

Use existing M5 AI Director engine.

UI composition:

- Composer;
- Selection References;
- Plan/Reason/Confidence/Alternatives;
- Agent Activity presentation;
- Change Preview;
- Apply/Undo surfaces;
- AI metrics live inside AI Workspace instead of permanent top-bar metrics.

No real AI provider and no broad AI Command Bar in V2.1.

### Script / Scene UX

Presentation enhancements only unless explicitly covered by existing V2 commands:

- wider Script focus mode;
- current-word clarity;
- removed text clarity;
- semantic chips;
- AI reference affordance;
- Scene cards with semantic type, duration, density/AI state;
- Scene → AI entry.

### Home / New Project

- Recent Projects;
- Scenario Starter;
- Canvas step;
- Match Source;
- ratio presets;
- custom width/height;
- fps presets/custom;
- scenario must never force an orientation.

### Cloud gate

- new-project contract tests;
- scenario does not force canvas tests;
- AI workspace selection/diff/apply integration tests;
- i18n keys for all new surfaces.

---

## 6. Cloud package C4 — Universal media ingest + polish

### Universal media ingest code

User-facing target containers:

- MP4
- MOV
- M4V
- WebM
- MKV
- AVI

Audio:

- MP3
- WAV
- M4A
- AAC
- FLAC

Image:

- PNG
- JPEG
- WebP

Architecture:

```text
Import
→ probe
→ native-compatible?
   ├─ yes → working media = original/copied project media
   └─ no  → normalize via media adapter
            → project working media
→ preserve original identity
```

Cloud implementation must provide:

- format/capability policy;
- normalization plan;
- API response/status model;
- progress/error UI states where possible;
- dependency-injected normalization executor for tests;
- no direct UI shell command execution.

Actual Windows FFmpeg normalization is a Local Codex gate.

### Polish

- zh-CN / en-US complete;
- focus states;
- keyboard navigation;
- tooltip contracts;
- empty/loading/error states;
- layout persistence migrations;
- no fixed-aspect visible assumptions.

### Final cloud gate

- all tests pass;
- production build pass;
- PR remains unmerged pending local validation.

---

# 7. Local package L1 — Windows workspace / universal canvas interaction acceptance

Codex validates the final cloud branch on real Windows browser.

Canvas matrix minimum:

- 1920×1080 (16:9)
- 1080×1920 (9:16)
- 1080×1080 (1:1)
- 2560×1080 (21:9)
- 1600×900 custom landscape
- 900×1600 custom portrait

Check:

- resize/collapse/persistence;
- Edit / AI / Script / Motion workspace presets;
- universal viewer fit;
- Canvas selection/drag/resize/rotate/snap;
- Inspector round-trip;
- Timeline usability;
- DPI/browser-size behavior;
- no clipping/overlap/dead panels.

---

# 8. Local package L2 — Real universal media ingest

Use real Windows files.

At minimum:

- MOV video;
- MP4 video;
- WebM or MKV video if available;
- MP3/M4A/WAV audio;
- PNG/JPEG/WebP image.

Validate:

- ffprobe;
- native vs normalization decision;
- automatic working-media creation;
- original source not modified;
- project-relative paths;
- restart/reopen;
- no manual FFmpeg step required for normal user path.

---

# 9. Local package L3 — Real cross-aspect render matrix

Must really render at least:

1. landscape;
2. portrait;
3. square or nonstandard custom canvas.

Each must include representative:

- A-roll;
- Caption;
- Motion;
- B-roll;
- Audio;
- AI Director visual;
- Canvas transform.

Validate with ffprobe + visual comparison.

Do not claim theoretical support.

---

# 10. Local package L4 — V2.1 final end-to-end acceptance

Use at least one real new project and complete:

```text
New Project
→ Universal canvas selection
→ Import / auto-normalize
→ Transcript
→ Script
→ Scenes
→ Captions
→ AI Workspace
→ Brand / Linked Style
→ Canvas
→ Timeline
→ Final render
→ Stop/restart/reopen
→ second edit
→ second render
```

Capture usability timings and all release blockers.

---

# 11. Branch / merge policy

Cloud integration branch:

`feature/v2.1-universal-ui`

Recommended execution order:

```text
C0 → C1 → cloud CI
C2 → cloud CI
C3 → cloud CI
C4 → final cloud CI
↓
Local Codex L1 + L2 + L3 + L4
↓
local fixes on same branch
↓
final CI
↓
V2.1 acceptance review
↓
merge to main
```

Do not merge to `main` before local gates pass.

---

# 12. V2.1 definition of done

V2.1 is done only if:

- professional resizable shell works;
- AI Workspace is first-class;
- Viewer has no portrait/landscape special mode;
- custom canvas is first-class;
- common source formats enter one user flow;
- MOV no longer requires a user-run manual FFmpeg conversion;
- at least landscape + portrait + square/custom are actually rendered;
- V2.0 semantic/project/command/render behavior does not regress;
- no engineer-only Project JSON edits are required for normal workflow.
