# Video OS Studio — GPT Web / Local Codex Handoff

> Updated: 2026-08-21 (Asia/Shanghai)  
> Current execution handoff: **V2 M4 Windows Local Validation**.

## 1. Current truth

Repository: `hcz19950202-beep/Video-OS-Studio`

Accepted and merged:

- V1 core PR #1
- V1.1 workstation UI/i18n PR #2
- V2 M0 baseline PR #3
- V2 M1 Project 2.0/migration PR #4
- V2 M2 Script + Scene PR #5
- V2 M3 Editor Core PR #6

Accepted M3 merge commit on `main`:

```text
b93f4774100404aa6a4626e62d049f734de3924b
```

M3 passed real Windows local/render/visual acceptance before merge.

Current active milestone:

```text
M4 — Canvas + Timeline V2
branch: feature/v2-canvas-timeline
PR: #7
```

Do not restart earlier milestones and do not start M5 while M4 validation is in progress.

## 2. Non-negotiable architecture

- Node 24 baseline.
- Project version `2.0.0`.
- Canonical internal time = frames.
- Durable Project changes use validated Commands / Transactions / bounded services.
- Canvas pointer-move draft is ephemeral Preview state; durable mutation happens at the command boundary.
- UI/AI do not hand-edit Project JSON.
- Remotion remains Master Composition engine.
- HyperFrames / video-use / FFmpeg remain behind adapters/services.
- repository code and `VIDEO_OS_DATA_ROOT` runtime data stay separate.
- Studio UI theme/locale remain local preferences and are distinct from Generated Video Brand.
- preserve accepted M1–M3 and V1.1 behavior.
- `REUSE > MODIFY > CREATE`.

Authoritative PRD:

`Video_OS_Studio_V2_AI_Native_Editor_Master_PRD_Rev2.md`

Product abstraction:

```text
Words → Meaning → Scenes → Visual Decisions → Clips → Render
```

## 3. Accepted M3 baseline

M3 provides the editor core that M4 extends:

- Context Inspector for Project / Video / Caption / Motion / HyperFrames / B-roll / Audio / Scene / Multi-select;
- Generated Video Brand separate from Studio Theme;
- Motion Speed / Effect Scale;
- Motion + Caption Linked Styles;
- Scene style fallback with direct clip precedence;
- Shift+Click / Shift+drag multi-select;
- one bulk action = one transaction = one revision;
- B-roll / Audio rendering;
- zh-CN / en-US;
- save/restart/reopen persistence.

Known accepted follow-up from M3:

`V2-M3-LV-001` — a freshly generated HyperFrames VP9 alpha WebM can fail the Windows Remotion compositor with `No frame found`. M3 final render passed with the previously accepted real alpha WebM. M4 does not silently rewrite this renderer path; the accepted alpha asset may be reused for M4 final render.

## 4. M4 cloud implementation

PR #7 upgrades the accepted M3 editor with direct visual manipulation and Timeline V2.

### Canvas Edit

Canvas supports active Video / B-roll / Remotion Motion / HyperFrames Motion objects:

- direct selection;
- live Drag;
- uniform Resize;
- Rotate;
- Arrow nudge;
- Shift+Arrow 10-unit nudge;
- Center action;
- Layer Forward / Backward;
- Center / Safe-zone / other-object alignment snap;
- visible alignment guides;
- Alt bypass for Canvas snap.

Canvas Edit temporarily disables normal Player controls so pointer gestures do not fight Remotion Player controls.

### Live Preview and durable mutation

Canvas interaction is deliberately split:

```text
pointer move
→ ephemeral Canvas draft
→ actual Remotion Preview follows live

pointer up
→ validated Project Command
→ one durable revision
```

The selection frame and actual video content move/resize/rotate together during the gesture.

### Rotation and layout

`MotionTransform` was additively extended with optional `rotation`.

Preview and Final Render consume rotation for:

- Video;
- B-roll;
- Remotion Motion;
- HyperFrames Motion.

Video/B-roll/Motion Inspectors expose Rotation, preserving Canvas ↔ Inspector round-trip.

### Linked Motion behavior

M3 Linked Style remains a live reference.

For Motion:

- X / Y / Anchor / Rotation are clip-local layout;
- shared Linked Style Scale / Opacity remain live-reference style values;
- Brand Motion Scale still multiplies resolved Motion scale.

When a linked Motion is resized in Canvas, M4 updates the resolved Linked Style scale path instead of writing a hidden per-clip Scale that would be ignored by the resolver.

### Layer ordering

Master Composition now uses one cross-type visual ordering rule for Video / B-roll / Motion / Caption based on durable `layer`, with deterministic type rank for ties.

Canvas hit-order for transformable objects follows the same visual intent.

### Timeline V2

Timeline keeps the accepted five tracks, M2 Scene Strip and M3 multi-select while adding high-frequency editing controls.

Snap targets:

- Playhead;
- Clip start;
- Clip end;
- Scene boundary;
- Marker;
- Caption boundary.

Alt bypasses Timeline snap.

Markers:

- `M` creates at current frame;
- click seeks;
- current UI supports context/right-click removal;
- markers persist in Project 2.0.

Shortcuts:

```text
Space               Play/Pause
Left / Right        ±1 frame
Shift+Left/Right    ±10 frames
M                   Marker
S                   Split selected clip
Delete/Backspace    Delete selected clip(s)
Ctrl/Cmd + D        Duplicate
Ctrl/Cmd + Z        Undo
Ctrl/Cmd+Shift+Z    Redo
Esc                 Clear selection
```

Global Timeline shortcuts ignore text/number/select/textarea/contenteditable input contexts.

### Source-aware Split

Split preserves source continuity:

- Video right side advances `sourceStartFrame`;
- Audio right side advances `sourceStartFrame`;
- B-roll now has additive optional `sourceStartFrame`, Inspector exposure and Remotion `trimBefore` support;
- B-roll right side advances source offset.

For Audio/B-roll with fades, Split preserves only the outer clip fades:

```text
left  keeps original Fade In, internal Fade Out = 0
right internal Fade In = 0, keeps original Fade Out
```

This avoids introducing an artificial dip/flash at the internal split boundary.

### Undo / Redo

M4 adds bounded client-session history backed by validated server snapshot restore.

Rules:

- Project ID cannot change during restore;
- successful Undo/Redo creates a new durable revision rather than rewinding revision numbers;
- failed restore rolls history-stack movement back;
- a new normal edit after Undo clears obsolete Redo history;
- history itself is session-bounded and is not required to survive a browser/dev-server restart; Project state is durable.

### Real Waveform

Waveform is not decorative/random UI.

```text
real Video / Audio asset
→ FFmpeg mono analysis
→ normalized peaks
→ project cache
→ Timeline bars
```

Cache:

```text
cache/waveforms/<assetId>-<points>.json
```

Waveform request size is bounded to 32–512 points; invalid/non-finite requests fall back safely.

No-audio Video does not crash Timeline.

## 5. Cloud verification

Final M4 code baseline before this handoff-document commit:

```text
551df4dcc6f516312507d5a626fd16b2c4571a4e
```

GitHub Actions:

```text
32467767792 — SUCCESS
```

Cloud checks:

```text
Install dependencies  PASS
Lint                  PASS — 0 errors, two pre-existing <img> warnings
Typecheck              PASS
Unit tests             PASS — 28 files / 88 tests
Production build       PASS — Next.js 16.3.1
```

This handoff documentation commit advances the PR head. Local Codex must use the **newest PR #7 head whose CI is successful**, not the older code-baseline SHA above.

## 6. Windows validation contract

Authoritative local acceptance file:

`LOCAL_VALIDATION_V2_M4.md`

Use an isolated worktree and data root.

Accepted M3 project to copy, not modify in place:

```text
Project ID:
m2-script-scene-e19978c4

Source project path:
E:\Video-OS-Data\v2-m3-validation-20260821-142900\projects\m2-script-scene-e19978c4
```

Recommended M4 worktree:

```text
E:\Video-OS-Studio-v2-m4-validation
```

Recommended isolated data root:

```text
E:\Video-OS-Data\v2-m4-validation-YYYYMMDD-HHMMSS
```

The entire M3 project directory must be copied so project-relative assets remain valid.

## 7. Local Codex ownership now

Local Codex now owns **M4 Windows acceptance and M4-only fixes** on:

```text
feature/v2-canvas-timeline
PR #7
```

Required proof is defined in `LOCAL_VALIDATION_V2_M4.md`, including:

- Canvas Video/B-roll/Remotion/HyperFrames direct selection;
- actual live Preview during Drag/Resize/Rotate;
- pointer-up = one durable mutation/revision;
- Canvas ↔ Inspector round-trip;
- linked Motion Canvas Resize preserving live Linked Style semantics;
- Nudge 1/10;
- Center/Safe/Object snap + Alt bypass;
- real Layer Forward/Backward render ordering;
- Timeline snap target classes;
- Marker workflow;
- shortcut matrix;
- M3 multi-select regression;
- Video/B-roll source-aware Split continuity;
- Audio/B-roll internal split has no artificial fade seam;
- Undo/Redo revision behavior;
- real Video/Audio FFmpeg waveform + cache;
- Scene Strip regression;
- Save/Stop/Restart/Reopen;
- real H.264/AAC final render;
- Preview/final evidence;
- zh-CN/en-US and Dark/Light regression;
- focused M2/M3 regression smoke.

Local defects:

```text
V2-M4-LV-001
V2-M4-LV-002
...
```

Fix only M4 defects on the same branch, push to PR #7, and rerun:

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

## 8. Current gates

```text
CODE COMPLETE: PASS for M4 cloud scope
CLOUD VERIFIED: PASS for code baseline; final docs head must also be green
LOCAL VERIFIED: PENDING Local Codex
PRD ACCEPTED: PENDING Local Codex
RENDER VERIFIED: PENDING real Windows final render
VISUAL ACCEPTED: PENDING browser acceptance
```

PR #7 must remain unmerged.

M5 AI Director must not start.

## 9. Phase ownership

```text
GPT Web M4 development       ✅
Cloud code CI                ✅
Final handoff-doc CI         ← verify newest head
Windows Local Codex M4       ← NEXT
M4-only local fixes to PR #7
Final CI
GPT Web review
Merge PR #7 only after all six M4 gates PASS
M5 starts only after M4 merge
```
