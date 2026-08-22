# Video OS Studio V2.1 Rev.2 PRD Completion — Windows Local Validation Contract

> Branch: `feature/v2.1-prd-completion`  
> PR: #15  
> Basis: `Video_OS_Studio_V2_1_AI_First_Universal_UI_Redesign_Master_PRD_Rev2.md`  
> Purpose: close the remaining literal Rev.2 PRD gaps after PR #14. This is still V2.1, not V2.2/Post-V2.1.

## 0. Entry gate

Run this contract only after GPT Web freezes a cloud-green PR #15 head.

Record:

- exact branch HEAD;
- PR #15 head SHA;
- GitHub CI run ID / URL;
- worktree path;
- isolated `VIDEO_OS_DATA_ROOT`;
- Node / npm;
- FFmpeg / ffprobe;
- Chrome / browser harness;
- Windows build and DPI.

Recommended isolation:

```text
Worktree: E:\Video-OS-Studio-v2.1-prd-completion
Data root: E:\Video-OS-Data\v2.1-prd-completion-YYYYMMDD-HHMMSS
```

Do not modify the released V2.0 baseline, the accepted PR #14 validation root, or unrelated local changes.

Before UI validation:

```powershell
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

All must pass.

## 1. Hard scope / stop rules

Local Codex may:

- validate this frozen completion head on real Windows;
- fix only defects required by this contract / Rev.2 PRD;
- add regression tests for those defects;
- update this validation document with Actual Results;
- commit and push fixes only to `feature/v2.1-prd-completion`;
- wait for the latest PR #15 CI after every fix batch.

Local Codex must not add:

- real AI Provider;
- broad AI Command Bar;
- multi-timeline;
- arbitrary docking engine;
- Crop/Mask full engine;
- transition suite;
- generated-media provider marketplace;
- cloud collaboration;
- HDR / advanced color;
- Project Package;
- multi-language content tracks;
- V2.2/Post-V2.1 features.

Do not merge PR #15 locally.

---

# C1 — AI Composer literal completion

Use a real or safe short talking-head project with Script, Scenes and timed Captions.

Validate the AI workspace shows, without opening developer tools for normal interaction:

```text
Prompt / Director Intent
References
Plan
Activity
Reason
Confidence
Alternatives
Diff
Apply
```

Validate References from at least:

- selected Scene;
- selected Clip/Timeline item;
- selected Transcript range where available.

Validate Workflow Starter intent is visible. If the Prompt field is left blank, Analyze must still use the Project Workflow Starter intent automatically; the user must not need to retype it.

Analyze requirements:

- no Project revision before Apply;
- Plan source remains the existing rules engine;
- Plan shows actionable vs density-hold suggestions;
- Activity visibly progresses through context/analyze/plan/review;
- Reason / Confidence / Alternatives are visible per suggestion;
- deselect at least one suggestion and confirm Diff recalculates without mutation;
- Apply selected suggestions as exactly one transaction / one Project revision;
- one Undo removes the batch;
- one Redo restores it.

Record plan source, suggestion count, selected count, transaction ID and revisions.

---

# C2 — Canvas-aware AI Director

Use the same semantic proof line, e.g. a real numerical proof caption, on at least:

```text
1920×1080
1080×1920
```

Validate the generated recommendation is not merely an `effectId` decision. It must include durable placement guidance equivalent to:

```text
what
where
how large
how dense
```

Record for each canvas:

- width / height;
- aspect / orientation;
- Safe Area profile;
- selected effect / engine;
- normalized placement x / y / scale / anchor;
- density result.

Expected:

- landscape and portrait placement materially differ for the same semantic content where rules require it;
- placement remains inside the selected safe-area bounds;
- Apply converts normalized planning placement into real Project Canvas transform;
- Canvas / Inspector / Preview agree after Apply.

Occupancy test:

1. place an existing Motion visual in one side/region at the target time;
2. Analyze another visual at overlapping time;
3. confirm planning context reads existing visual occupancy;
4. confirm the recommendation moves away where applicable, or Density Guard explicitly holds the new visual.

No mutation before Apply.

---

# C3 — Effect capability / universal motion

Open Effects in representative:

```text
16:9
9:16
1:1
21:9
4:5
4:3
```

For every existing Remotion effect verify the UI exposes compatibility state derived from metadata, including:

```text
layout mode
canvas family
recommended / supported / unsupported state
```

If an effect is ever `unsupported`, the UI must prevent normal insertion before render and explain why. Do not create a fake unsupported production effect only to satisfy the test.

Visually validate all current Remotion effects use composition dimensions responsively; no effect may assume 1080×1920 or overflow solely because the canvas is landscape, square, 4:5, 4:3, ultrawide or custom.

At minimum visually inspect:

- Big Number;
- Metric Focus;
- Keyword Impact;
- Lower Third.

Record screenshots across materially different canvases.

---

# C4 — Safe Area profiles

Validate the Viewer Safe Area control provides:

```text
Generic
YouTube
TikTok
Instagram Reels
Instagram Feed
Facebook
Custom
```

Requirements:

- insets are percentage/normalized, not fixed portrait pixels;
- changing Safe Area never changes Project Canvas width/height;
- changing Safe Area alone does not change Project revision;
- selected profile persists for that Project after browser refresh;
- another Project can retain a different project-scoped Safe Area preference;
- Custom top/right/bottom/left works and remains clamped to valid bounds;
- Viewer guide updates immediately.

AI integration:

Use a deliberately restrictive Custom Safe Area to force a placement clamp. Analyze and verify AI placement stays inside it.

Record before/after revision and inset values.

---

# C5 — Scenario Starter real workflow

Create at least these projects through normal New Project UI:

```text
Talking Head
Product Ad
Explainer or Educational
Blank
```

For every created Project verify the selected Scenario does not force a Canvas ratio.

Mandatory proof case:

```text
Scenario: Talking Head or Product Ad
Canvas: 2560×1080 (21:9)
```

It must create/open/edit normally.

Verify Workflow Starter persists across save/restart/reopen and contains real initialization for:

```text
AI starter prompt
Scene taxonomy
recommended caption style/hint
recommended visual density/intensity
```

Verify the AI workspace displays this starter context.

Default-density behavior:

- with no custom Prompt, Scenario `visualIntensity` must feed the existing rules Director default density behavior;
- a user-entered Prompt must take precedence over the Scenario default;
- no Project mutation occurs merely from selecting/reading Scenario guidance.

Verify common Canvas options remain recommendations/shortcuts only; the user can choose any custom size.

---

# C6 — Export Profile

Validate Top Bar Export opens a real Export Profile instead of immediately starting a blind render.

Default mode:

```text
Use Project Canvas
MP4
H.264
Project FPS
AAC
High
```

Verify default output dimensions equal Project Canvas.

Custom mode must allow:

- custom width;
- custom height;
- custom FPS;
- quality;
- AAC / muted audio option.

Aspect mismatch:

Use a 16:9 Project and set a 1:1 custom output. Before render, the UI must visibly warn that output aspect differs and may crop/letterbox / require layout review. V2.1 must not pretend to Smart Reframe.

Non-destructive requirement:

- opening/changing Export Profile must not mutate Project Canvas;
- must not increment Project revision;
- custom FPS must preserve timeline duration in seconds by using a render-only transformed clone;
- source Project frames/timing remain unchanged after render.

Real custom render requirement:

Render at least one custom output whose dimensions differ from Project Canvas, recommended:

```text
Project: 1920×1080 @ 30
Custom Export: 1080×1080 @ 60
```

Use ffprobe to record codec, dimensions, FPS, frames and duration. Duration in seconds must match the source Project within normal encode tolerance.

---

# C7 — Inspector capability taxonomy

Validate selection-aware Inspector navigation for:

```text
Project
Video
Caption
Motion
B-roll
Audio
Scene
Multi-select
```

Project semantic sections:

```text
Canvas
Brand
Linked
Workspace
Render / Export
```

Caption semantic sections:

```text
Content
Typography
Style
Transform/Layout
Timing
Linked
```

Motion semantic sections:

```text
Content
Style
Transform
Animation
Timing
Linked
```

Click each visible registry tab and verify it scrolls to the correct real capability section; no stale `sectionIndex` misrouting is allowed for semantic sections.

Validate selection changes update registry context without React errors or stale active tabs.

---

# C8 — Literal 8-Canvas Rev.2 matrix

This section is mandatory because Rev.2 section 34 says **all** listed canvases must validate the full operation matrix, including Final Render.

Use exactly or materially equivalently:

| Ratio | Canvas |
| --- | --- |
| 16:9 | 1920×1080 |
| 9:16 | 1080×1920 |
| 1:1 | 1080×1080 |
| 4:5 | 1080×1350 |
| 4:3 | 1440×1080 |
| 21:9 | 2560×1080 |
| Custom Landscape | 1600×900 |
| Custom Portrait | 900×1600 |

For **every one of the eight** validate through normal product UI:

```text
Viewer Fit
Canvas Selection
Drag
Resize
Rotate
Snap
Caption
Motion
B-roll
AI Visual
Preview
Final Render
```

Do not mark an aspect PASS only because a unit test classifies it.

To control runtime, use a short 5–10 second real-media fixture for this matrix, but every canvas must still contain where practical:

- Video/A-roll;
- Caption;
- Remotion Motion;
- B-roll;
- AI-applied visual;
- at least one Canvas transform.

At least one matrix project should also include HyperFrames, Audio and Linked Style as regression coverage.

For all 8 Final MP4s record with ffprobe:

- width;
- height;
- codec;
- audio codec when present;
- FPS;
- frame count;
- duration;
- file size.

For each canvas capture one representative Preview frame and one matching Final frame. Confirm placement, caption width/location, B-roll fit/crop, Motion scale/location, rotation, layering and Brand are visually consistent.

---

# C9 — Regression / durability

Use one representative completion project and perform:

```text
Save
Stop dev server
Restart dev server
Recent Project reopen
Second edit
Second save
Second render
```

Verify persistence of:

- Canvas;
- Workflow Starter;
- Script;
- Scenes;
- Captions;
- Motion placement;
- Linked Style;
- B-roll;
- Audio;
- Marker;
- media paths;
- project-scoped Safe Area preference in the same browser profile;
- Workspace preference separately from Project revision.

Run focused V2.0/V2.1 regressions:

- Script delete/restore;
- Scene split/merge;
- Canvas Change Preview Cancel/Apply;
- Timeline snap/marker/split/undo/redo;
- AI Apply one transaction + undo/redo;
- MOV auto normalize;
- Light/Dark vs Generated Video Brand isolation;
- zh-CN / en-US;
- keyboard focus / separator resize.

---

# Defect handling

For each new completion defect use:

```text
V2.1-COMP-LV-001
V2.1-COMP-LV-002
...
```

Record:

- reproduction;
- expected;
- actual;
- root cause;
- fix;
- regression test;
- commit;
- evidence.

After each fix batch:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

Push to `feature/v2.1-prd-completion` and wait for latest PR #15 CI PASS.

---

# Evidence minimum

Save screenshots/evidence for at least:

1. AI Composer Prompt / References / Plan / Activity;
2. Reason / Confidence / Alternatives;
3. Diff before Apply;
4. AI Apply transaction + Undo/Redo;
5. landscape AI placement;
6. portrait AI placement;
7. occupancy/density hold or relocated placement;
8. Safe Area preset selector;
9. restrictive Custom Safe Area + AI result;
10. Scenario Starter details;
11. 21:9 Scenario project;
12. Effect compatibility cards;
13. four Remotion effects on multiple aspect families;
14. Export Profile default;
15. Export aspect mismatch warning;
16. custom export ffprobe;
17. Project Inspector registry;
18. Caption Inspector registry;
19. Motion Inspector registry;
20–27. one Viewer/Preview screenshot for each of 8 canvases;
28–35. one corresponding Final frame for each of 8 canvases;
36. restart/reopen state.

Record a browser session if the harness is available.

---

# Final report contract

Return to GPT Web:

- final branch HEAD;
- final GitHub CI run ID / URL;
- worktree and isolated data root;
- environment versions;
- automatic check results and total test count;
- C1 AI Composer results;
- C2 Canvas-aware AI placement results;
- C3 Effect compatibility/responsiveness results;
- C4 Safe Area persistence + revision results;
- C5 Scenario Starter persistence/behavior results;
- C6 Export Profile + real custom render results;
- C7 Inspector taxonomy results;
- C8 full eight-canvas operation matrix;
- paths + ffprobe for all 8 Final MP4s;
- Preview-vs-Final visual comparison results for all 8;
- C9 durability/regression results;
- all `V2.1-COMP-LV-xxx` defects and fixes;
- Remaining Failed Items or `NONE`;
- evidence directory / recording path;
- sensitive scan result;
- worktree clean status.

Final gates:

```text
CODE COMPLETE: PASS / FAIL
CLOUD VERIFIED: PASS / FAIL
AI COMPOSER VERIFIED: PASS / FAIL
CANVAS-AWARE AI VERIFIED: PASS / FAIL
EFFECT CAPABILITY VERIFIED: PASS / FAIL
SAFE AREA VERIFIED: PASS / FAIL
SCENARIO STARTER VERIFIED: PASS / FAIL
EXPORT PROFILE VERIFIED: PASS / FAIL
INSPECTOR TAXONOMY VERIFIED: PASS / FAIL
EIGHT-CANVAS MATRIX VERIFIED: PASS / FAIL
DURABILITY VERIFIED: PASS / FAIL
PRD LITERAL COMPLETION: PASS / FAIL
VISUAL ACCEPTED: PASS / FAIL
USABILITY ACCEPTED: PASS / FAIL
REGRESSION ACCEPTED: PASS / FAIL
```

Only when every gate is PASS and Remaining Failed Items is `NONE` may GPT Web mark:

```text
Video_OS_Studio_V2_1_AI_First_Universal_UI_Redesign_Master_PRD_Rev2
IMPLEMENTED: 100%
VERIFIED: 100%
```

Stop there. Do not merge PR #15 and do not start V2.1.0 release or Post-V2.1 work locally.

---

# Local Completion Addendum — 2026-08-22

Validation worktree: `E:\Video-OS-Studio-v2.1-prd-completion`

Isolated data root: `E:\Video-OS-Data\v2.1-prd-completion-20260822-173247`

## Defect Record

### V2.1-COMP-LV-001 — Imported audio had no normal-user placement action

- Root cause: the V2.1 media asset list exposed `Add B-roll` for visual assets but did not expose a placement action for `audio` assets.
- Fix: `StudioWorkspaceV21` now exposes `Add Audio` / `加入音频`, creates an `audio-main` clip with `type: "audio"`, preserves the source asset, and assigns the default `sfx` role.
- Regression: `tests/workspace-v2.1.test.ts` asserts the user-facing Audio action, `audio-main` track, and `audio` clip type.
- Windows UI evidence: imported `sfx_001.mp3`, clicked `加入音频`, observed the Audio timeline row, selected the clip, and verified the Audio Inspector with role, timing, volume, mute, fade-in, and fade-out controls.
- Durability evidence: the Audio clip remained in `project.json` after stop/restart/reopen and was included in the subsequent 900×1600 render.

No other completion defect was found during the C1–C9 run. No business feature or Project Schema change was made.
