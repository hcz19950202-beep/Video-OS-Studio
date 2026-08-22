# Video OS Studio V2.1 — PRD Completion Plan

Basis: `Video_OS_Studio_V2_1_AI_First_Universal_UI_Redesign_Master_PRD_Rev2.md`

Baseline: `main@8e4c863ae94d24d88df923b256cc2c3b5f4503ee` after PR #14.

Goal: close the remaining literal gaps between the implemented V2.1 product and the Rev.2 Master PRD without starting V2.2/Post-V2.1 scope.

## Completion gaps

### G1 — AI Composer UX
Deliver the PRD-facing Composer surface over the existing accepted M5 AI Director engine:
- prompt/intention field for rule-guided planning context;
- selected references;
- explicit Plan section;
- Activity/status log for Analyze → Review → Diff → Apply;
- existing Reason / Confidence / Alternatives / Diff / Apply remain authoritative;
- no real AI Provider and no broad command agent.

### G2 — Canvas-aware AI layout
Extend deterministic planning context and recommendations with:
- canvas width / height / aspect / orientation;
- safe-area profile;
- existing visual occupancy;
- normalized placement guidance;
- responsive x/y/scale/layout props where supported.

The existing transaction/apply path remains unchanged.

### G3 — Effect capability metadata
Add an explicit capability contract to existing effect metadata:
- layout mode: relative / responsive / fixed;
- recommended aspect families;
- unsupported aspect families where applicable;
- pre-apply/pre-add compatibility evaluation and UI warning.

Do not create a new effect engine.

### G4 — Universal Safe Area system
Add normalized safe-area profiles and UI:
- Generic;
- YouTube;
- TikTok;
- Instagram Reels;
- Instagram Feed;
- Facebook;
- Custom.

Safe-area selection must not change Project Canvas. Project-coordinate behavior remains authoritative.

### G5 — Scenario Starter initialization
Scenario cards must initialize workflow guidance rather than only label project intent:
- starter AI prompt/intention;
- recommended scene taxonomy;
- recommended caption style hint;
- recommended visual density/intensity;
- no forced canvas orientation.

### G6 — Export Profile UI
Add an export surface connected to the existing Render Job path:
- Use Project Canvas / Custom Output;
- resolution;
- FPS;
- container/codec choices limited to actually supported renderer settings;
- quality;
- audio settings;
- warning when output aspect differs from Project Canvas;
- no smart reframe.

## Secondary completion

### G7 — Inspector taxonomy completion
Complete navigation for Project Canvas / Brand / Workspace / Render plus semantic Caption Typography and Motion Animation navigation without duplicating inspector state.

### G8 — Full Canvas acceptance matrix
Cloud tests and local validation contract must cover:
- 1920×1080 16:9;
- 1080×1920 9:16;
- 1080×1080 1:1;
- 1080×1350 4:5;
- 1440×1080 4:3;
- 2560×1080 21:9;
- 1600×900 custom landscape;
- 900×1600 custom portrait.

Local acceptance must explicitly exercise Viewer Fit, Canvas Select/Drag/Resize/Rotate/Snap, Caption, Motion, B-roll, AI Visual, Preview and representative real final renders.

## Delivery order

1. P0 Contract + tests skeleton
2. P1 Safe Area + Effect Capability foundation (G4/G3)
3. P2 Canvas-aware AI + Composer UX (G2/G1)
4. P3 Scenario Starter (G5)
5. P4 Export Profile (G6)
6. P5 Inspector taxonomy + i18n/a11y polish (G7)
7. P6 Full Canvas matrix tests + Windows acceptance contract (G8)
8. Cloud CI PASS
9. Local Codex validation
10. Final GPT Web review
11. Merge completion PR
12. Only then prepare `v2.1.0` release closeout

## Non-goals

Do not add:
- real AI Provider;
- broad AI Command Bar;
- multi-timeline;
- arbitrary docking;
- Crop/Mask full engine;
- transition suite;
- generated-media provider marketplace;
- cloud collaboration;
- HDR / professional color;
- Project Schema rewrite unless a strictly backward-compatible optional field is unavoidable. Prefer non-schema UI/preferences metadata when possible.

## Final gate

The completion PR can merge only when:

```text
REV2 PRD LITERAL COMPLETION: PASS
CODE COMPLETE: PASS
CLOUD VERIFIED: PASS
WINDOWS VERIFIED: PASS
FULL CANVAS MATRIX VERIFIED: PASS
VISUAL ACCEPTED: PASS
USABILITY ACCEPTED: PASS
REGRESSION ACCEPTED: PASS
```
