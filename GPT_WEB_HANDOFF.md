# Video OS Studio — GPT Web / Local Codex Handoff

> Updated: 2026-08-22 (Asia/Shanghai)  
> Current execution handoff: **V2.1 AI-First Universal UI — Windows Local Validation**.

## 1. Current truth

Repository:

```text
hcz19950202-beep/Video-OS-Studio
```

Stable released baseline:

```text
Video OS Studio v2.0.0
main: 64da5ec6539a787f4d2f3750b3c5cea0273255ce
tag: v2.0.0
```

V2.1 integration branch:

```text
feature/v2.1-universal-ui
```

Draft PR:

```text
#14 — feat: V2.1 universal AI-first editor workspace
```

PR #14 must remain **Draft / OPEN / unmerged** until Windows local acceptance passes.

The authoritative cloud/local contracts are:

1. `Video_OS_Studio_V2_1_AI_First_Universal_UI_Redesign_Master_PRD_Rev2.md`
2. `V2_1_CLOUD_LOCAL_EXECUTION_PLAN.md`
3. `LOCAL_VALIDATION_V2_1.md`
4. this handoff.

If a SHA or CI number in conversation history differs from GitHub, use the **latest PR #14 head with its latest successful CI**.

## 2. V2.1 product definition

V2.1 is not a portrait-only editor and is not a 9:16 product mode.

Product definition:

> **AI-First Universal Video Workspace**

Three domains remain separate:

```text
Source Media
!=
Project Canvas
!=
Export Profile
```

Project canvas truth remains:

```text
canvas.width
canvas.height
canvas.fps
```

Aspect presets are shortcuts only. Arbitrary custom width × height is first-class.

No code or acceptance path may assume portrait is the primary or full-feature mode.

## 3. V2.0 Core remains accepted and must not be rewritten

The following accepted V2.0 engines remain the foundation:

- Project Schema / Commands / Transactions;
- Script word-level text editing;
- Scenes / Scene Strip;
- Context Inspector;
- Generated Video Brand / Linked Styles;
- Canvas drag / resize / rotate / snap / layer;
- Timeline Marker / Snap / Split / Waveform / Undo / Redo;
- AI Director Analyze / Suggest / Reason / Confidence / Alternatives / Density Hold / Diff / transactional Apply;
- Remotion Master Composition;
- HyperFrames / video-use / FFmpeg adapters;
- local-first project/media separation through `VIDEO_OS_DATA_ROOT`.

Project Schema remains:

```text
2.0.0
```

V2.1 is primarily a universal UI / ingest / workspace upgrade, not a V2 Core rewrite.

## 4. Cloud package status

### C0 — Universal contract and guardrails

**COMPLETE**

Delivered:

- Rev.2 V2.1 Master PRD;
- cloud/local execution plan;
- Universal Canvas contract;
- aspect/orientation/preset helpers;
- arbitrary custom canvas tests;
- Viewer fit tests for landscape / portrait / square / ultrawide / custom.

### C1 — Resizable Universal Editor Shell

**COMPLETE**

Delivered:

- 48px icon rail;
- resizable left content panel;
- universal flex Viewer;
- resizable Inspector;
- resizable Timeline;
- collapse/expand states;
- workspace presets: EDIT / AI / SCRIPT / MOTION;
- local-only workspace persistence;
- Reset Workspace;
- pointer resize uses ephemeral draft and persists on pointer-up;
- keyboard-accessible separators with ARIA values and Arrow / Shift+Arrow resizing;
- workspace changes do not write Project JSON.

### C2 — Information architecture / Inspector / Timeline presentation

**COMPLETE**

Primary destinations:

```text
Script
Scenes
AI
Media
Captions
Effects
Brand
Project
```

Media grouping:

```text
Assets
Transcript
Library
```

Delivered:

- Selection-aware Inspector Registry shell over accepted inspectors;
- Project Inspector Canvas section;
- staged Canvas Change Preview before high-impact aspect changes;
- affected Caption / Motion / B-roll / Video counts;
- Cancel / Apply flow using existing `set-canvas` command;
- Universal Viewer canvas metadata;
- Timeline visual redesign while preserving M4 Timeline engine;
- Scene Strip / Track / Clip / Marker / Snap / Waveform hierarchy polish.

### C3 — AI Workspace / Script / Scene / New Project

**COMPLETE**

Delivered:

- AI as first-class workspace;
- existing accepted M5 AI Director reused rather than rewritten;
- Project Canvas context inside AI Workspace;
- Scene / Clip / Transcript references from current selection;
- Cards / Density / Peak moved into AI context;
- Script search;
- Scene semantic chips in Script;
- Scene semantic labels / visual count / visual intensity UI;
- Scenario Starter cards;
- canvas presets plus arbitrary custom Width × Height;
- FPS presets plus custom FPS;
- Match Source Dimensions flow for the first imported video.

Important Match Source rule:

```text
first video probe -> Width × Height may update through one Project Command
Project FPS remains the explicit project timebase selected by the user
```

Scenario starters never force orientation.

### C4 — Universal media ingest / polish

**COMPLETE**

User-facing video target:

```text
MP4
MOV
M4V
WebM
MKV
AVI
```

Audio target:

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

Working-media behavior:

```text
MP4 -> native project media
MOV/M4V/WebM/MKV/AVI -> original preserved + working H.264/AAC MP4
MP3/WAV/M4A -> reusable audio asset
AAC/FLAC -> original preserved + working AAC/M4A
```

The user-facing principle is:

```text
broad input compatibility
+
controlled internal working formats
```

The UI exposes Import / Preparing / Ready state and explicitly shows when the original source was preserved.

Actual Windows FFmpeg compatibility and timing remain a local gate.

Polish delivered:

- zh-CN / en-US surfaces for new primary flows;
- focus-visible states;
- reduced-motion states;
- keyboard-resizable workspace separators;
- error/retry import UI;
- no fixed portrait Viewer mode.

## 5. Latest cloud verification before local handoff

The complete V2.1 code + local-validation-contract head passed GitHub CI before this handoff update.

Verified cloud baseline included:

```text
Install dependencies: PASS
Lint: PASS (0 errors; 2 accepted existing <img> warnings)
Typecheck: PASS
Unit tests: PASS
Test files: 32
Tests: 107
Production build: PASS
```

The latest successful run before handoff documentation was:

```text
CI Run 32549458297
```

Because this handoff update creates a newer documentation head, **do not start local validation until the latest PR #14 head also has a successful CI**. GPT Web will provide that frozen head and run ID to Local Codex.

## 6. AI boundary remains unchanged

V2.1 does **not** add a real AI provider.

AI Director runtime may remain:

```text
rules
```

V2.1 does not add a broad general-purpose AI Command Bar.

Do not claim provider-backed AI was added during V2.1.

## 7. Windows local work now permitted only after final cloud freeze

Local execution is exactly:

```text
L1 Windows Workspace + Universal Canvas
L2 Real Universal Media Ingest / FFmpeg normalization
L3 Real Cross-Aspect Render Matrix
L4 V2.1 Full End-to-End Acceptance
```

Detailed acceptance is in:

```text
LOCAL_VALIDATION_V2_1.md
```

Local Codex may only fix defects discovered by that contract and must number them:

```text
V2.1-LV-001
V2.1-LV-002
...
```

Any local fix must add regression evidence where appropriate and must be pushed back to:

```text
feature/v2.1-universal-ui
```

Then PR #14 latest CI must return green.

## 8. Required real local evidence

Local acceptance must prove, not assume:

### Universal Viewer / UI

At minimum:

```text
1920×1080
1080×1920
1080×1080
2560×1080
1600×900 custom
900×1600 custom
```

### Real media

At minimum where files are available:

- MP4;
- MOV;
- WebM or MKV;
- MP3/WAV/M4A;
- FLAC or AAC;
- PNG/JPEG/WebP;
- SRT or VTT.

No normal supported source should require a user-run manual FFmpeg command.

### Real renders

Must really render at least:

```text
one landscape
one portrait
one square or materially nonstandard custom canvas
```

Preview and Final frames must be compared visually, and ffprobe evidence must be recorded.

## 9. Final V2.1 local gates

Local report must return:

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

PR #14 must not merge until all required gates pass.

## 10. Explicit non-goals for Local Codex

Do not use local validation as an excuse to develop:

- real AI Provider;
- broad AI Command Bar;
- Project Schema V3;
- multi-timeline;
- arbitrary docking;
- Crop/Mask full engine;
- transition suite;
- generated-media provider marketplace;
- cloud/collaboration;
- HDR / advanced color.

Stop after V2.1 validation and necessary V2.1 defect fixes. Return results to GPT Web for final review and merge decision.
