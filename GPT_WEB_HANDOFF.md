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

Authoritative documents:

1. `Video_OS_Studio_V2_1_AI_First_Universal_UI_Redesign_Master_PRD_Rev2.md`
2. `V2_1_CLOUD_LOCAL_EXECUTION_PLAN.md`
3. `LOCAL_VALIDATION_V2_1.md`
4. this handoff.

For exact execution, Local Codex must use the **latest PR #14 head whose corresponding GitHub CI is successful**. Conversation-era SHAs are not allowed to override the latest green PR head.

## 2. Product definition and invariant

V2.1 is:

> **AI-First Universal Video Workspace**

It is not portrait-first, landscape-first or 9:16-first.

Always preserve:

```text
Source Media != Project Canvas != Export Profile
```

Project canvas remains:

```text
canvas.width
canvas.height
canvas.fps
```

Aspect presets are shortcuts. Arbitrary custom width × height is first-class.

## 3. Accepted V2.0 Core remains untouched

V2.1 reuses the accepted V2.0 engines:

- Project Schema / Commands / Transactions;
- Script word editing / Remove / Restore;
- Scenes / Scene Strip;
- Context Inspector;
- Generated Video Brand / Linked Styles;
- Canvas live drag / resize / rotate / snap / layer;
- Timeline Marker / Snap / Split / Waveform / Undo / Redo;
- AI Director Analyze / Suggest / Reason / Confidence / Alternatives / Density Hold / Diff / transactional Apply;
- Remotion Master Composition;
- HyperFrames / video-use / FFmpeg adapters;
- `VIDEO_OS_DATA_ROOT` runtime-media separation.

Project Schema remains `2.0.0`.

## 4. Cloud implementation status

All cloud packages are code-complete:

```text
C0 Universal Contract                         PASS
C1 Resizable Universal Editor Shell          PASS
C2 IA / Inspector / Timeline Presentation    PASS
C3 AI Workspace / Script / Scene / Project   PASS
C4 Universal Media Ingest / Polish           PASS
```

### C0

Delivered:

- Rev.2 Master PRD;
- Universal Canvas contract;
- landscape / portrait / square / ultrawide / custom canvas math;
- canvas presets as shortcuts, not whitelist;
- universal Viewer-fit tests.

### C1

Delivered:

- 48px icon rail;
- resizable left content panel;
- Universal Viewer;
- resizable Inspector;
- resizable Timeline;
- Edit / AI / Script / Motion presets;
- collapse / restore;
- workspace persistence outside Project JSON;
- pointer draft → pointer-up persistence;
- keyboard separators with ARIA value/min/max and Arrow / Shift+Arrow resizing.

### C2

Delivered:

- primary IA: Script / Scenes / AI / Media / Captions / Effects / Brand / Project;
- Media tabs: Assets / Transcript / Library;
- Inspector Registry navigation over existing accepted inspectors;
- Project Inspector Canvas controls;
- staged Canvas Change Preview with Before/After and affected Caption / Motion / B-roll / Video counts;
- explicit Cancel / Apply using existing `set-canvas` command;
- Timeline visual redesign without changing M4 Timeline engine.

### C3

Delivered:

- AI as first-class workspace over accepted M5 AI Director;
- current Canvas metadata in AI context;
- Scene / Clip / Transcript references;
- Cards / Density / Peak in AI workspace;
- Script search and Scene semantic chips;
- Scene semantic labels, visual count and visual intensity editing;
- Scenario Starter cards;
- universal presets + arbitrary custom Width × Height;
- FPS presets + custom FPS;
- Match Source Dimensions.

Match Source rule:

```text
first imported video probe may set Width × Height
Project FPS remains explicit user-selected timebase
```

Scenario starters do not force orientation.

### C4

Delivered user-facing ingest policy:

```text
Video: MP4 / MOV / M4V / WebM / MKV / AVI
Audio: MP3 / WAV / M4A / AAC / FLAC
Image: PNG / JPEG / WebP
Subtitle: SRT / VTT
```

Working-media behavior:

```text
MP4
→ native project media

MOV / M4V / WebM / MKV / AVI
→ original preserved
→ H.264 yuv420p + AAC MP4 working media

MP3 / WAV / M4A
→ reusable audio asset

AAC / FLAC
→ original preserved
→ AAC/M4A working media
```

UI states:

```text
Uploading
→ Preparing editable media
→ Ready
→ Original preserved / Working media shown
```

Actual Windows codec compatibility and performance are local claims only.

## 5. Cloud verification

The complete V2.1 code plus Windows acceptance contract has already passed:

```text
Install       PASS
Lint          PASS — 0 errors; 2 accepted existing <img> warnings
Typecheck     PASS
Test files    32
Tests         107 PASS
Build         PASS
```

Verified CI baseline:

```text
32549458297
```

Subsequent commits after that baseline are documentation-only handoff/status updates. Do not begin local validation until the **latest PR #14 head itself** has a successful CI. GPT Web will provide the exact frozen head/run.

## 6. AI boundary

V2.1 does not add a real AI Provider.

AI Director runtime may remain:

```text
rules
```

No broad general-purpose AI Command Bar was added.

## 7. Local execution is now L1–L4 only

Read and execute:

```text
LOCAL_VALIDATION_V2_1.md
```

Exactly these local packages are permitted:

```text
L1 Windows Workspace / Universal Canvas
L2 Real Universal Media Ingest / FFmpeg normalization
L3 Real Cross-Aspect Render Matrix
L4 V2.1 Full End-to-End Acceptance
```

Defects discovered locally are numbered:

```text
V2.1-LV-001
V2.1-LV-002
...
```

Only V2.1 acceptance defects may be fixed on:

```text
feature/v2.1-universal-ui
```

Every fix batch must rerun lint / typecheck / test / build and latest PR #14 CI must return green.

## 8. Real local evidence required

Universal Viewer matrix minimum:

```text
1920×1080
1080×1920
1080×1080
2560×1080
1600×900 custom
900×1600 custom
```

Real media minimum where available:

- MP4;
- MOV;
- WebM or MKV;
- MP3 / WAV / M4A;
- FLAC or AAC;
- PNG / JPEG / WebP;
- SRT or VTT.

Real final renders minimum:

```text
one landscape
one portrait
one square or materially nonstandard custom canvas
```

Preview ↔ Final must be compared visually and all required outputs must have ffprobe evidence.

## 9. Local final gates

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

PR #14 cannot merge before all required gates pass.

## 10. Explicit local non-goals

Do not add during V2.1 acceptance:

- real AI Provider;
- broad AI Command Bar;
- Project Schema rewrite;
- multi-timeline;
- arbitrary docking;
- Crop/Mask full engine;
- transition suite;
- generated-media provider marketplace;
- cloud/collaboration;
- HDR / advanced color.

Stop after V2.1 local validation and necessary V2.1 defect fixes. Return the complete result to GPT Web for final review and merge decision.
