# Video OS Studio v2.1.0 Release Notes

Release date: 2026-08-22

## Release identity

- Product version: **2.1.0**
- Project Schema: **2.0.0** (unchanged; no migration required)
- Base release: `v2.0.0`
- V2.1 UI merge: PR #14
- Rev.2 PRD completion merge: PR #15
- Final V2.1 implementation baseline before release closeout: `db25031139c6f8b37eb4465bde3d11a3e5b9ad96`

## What changed

### Universal Canvas

Video OS Studio no longer assumes portrait/9:16 as the primary editing mode. The same editor shell supports landscape, portrait, square, ultrawide and custom canvases. Canvas presets are shortcuts only; `canvas.width`, `canvas.height` and `canvas.fps` remain the project truth.

Validated canvases include:

- 1920×1080 (16:9)
- 1080×1920 (9:16)
- 1080×1080 (1:1)
- 1080×1350 (4:5)
- 1440×1080 (4:3)
- 2560×1080 (21:9)
- 1600×900 (custom landscape)
- 900×1600 (custom portrait)

All eight were validated on Windows through Viewer Fit, Canvas editing, Caption, Motion, B-roll, AI Visual, Preview and real Final Render.

### AI-first professional workspace

- Resizable Edit / AI / Script / Motion workspaces
- Persistent workspace layout without mutating project revision
- AI Composer with Director Intent, References, Plan, Activity, Reason, Confidence, Alternatives, Diff and Apply
- Existing M5 safety chain preserved: Review → Diff → Apply → one Transaction → Undo/Redo
- Canvas-aware deterministic AI placement using orientation, Safe Area and existing visual occupancy

The shipped AI Director still uses the deterministic `rules` provider. A real external AI provider remains Post-V2.1 scope.

### Safe Area and responsive effects

- Generic, YouTube, TikTok, Instagram Reels, Instagram Feed, Facebook and Custom Safe Area profiles
- Normalized/percentage-based safe-area coordinates
- Project-scoped Studio preferences for Safe Area
- Effect capability metadata for relative/responsive/fixed layouts
- Aspect compatibility shown before insertion
- Current Remotion effects use responsive composition sizing rather than a fixed 1080×1920 assumption

### Scenario Starter

New projects can start from Talking Head, Product Ad, Explainer, Educational, Motion Video, Long → Short or Blank without forcing a canvas orientation. Scenario starters persist workflow guidance including:

- starter director prompt
- Scene taxonomy
- Caption guidance
- visual intensity

### Universal media ingest

Broad user-facing import with controlled internal working media:

- Video: MP4, MOV, M4V, WebM, MKV, AVI
- Audio: MP3, WAV, M4A, AAC, FLAC
- Image: PNG, JPEG, WebP
- Subtitle: SRT, VTT

Unsupported direct-edit video/audio formats are normalized automatically while preserving the original source. No manual FFmpeg step is required in the normal user workflow.

### Export Profile

- Project Canvas remains the default output
- Custom width / height / FPS / quality / audio options
- Non-destructive render clone; export settings do not mutate the Project
- Aspect mismatch warning before render
- FPS conversion preserves timeline duration in seconds

### Inspector and Timeline

- Semantic capability-based Inspector navigation
- Project / Video / Caption / Motion / B-roll / Audio / Scene / Multi-select contexts
- Completed Project Canvas / Brand / Linked / Workspace / Render sections
- Caption Typography and Motion Animation capabilities separated semantically
- Existing V2 Timeline engine preserved while presentation was redesigned

## Validation

### Cloud

Final PR #15 validation head:

`51679ea89e267b4ce4a6d70aaa19cf3d2783590d`

GitHub Actions Run:

`32570403313`

Results:

- npm ci: PASS
- lint: PASS (0 errors; 2 existing `<img>` warnings)
- typecheck: PASS
- tests: PASS — 34 files / 125 tests
- production build: PASS

### Windows local acceptance

- AI Composer: PASS
- Canvas-aware AI: PASS
- Effect Capability: PASS
- Safe Area: PASS
- Scenario Starter: PASS
- Export Profile: PASS
- Inspector Taxonomy: PASS
- Eight-Canvas Matrix: PASS
- Durability / Regression: PASS
- Remaining Failed Items: **NONE**

Final status:

```text
CODE COMPLETE: PASS
CLOUD VERIFIED: PASS
AI COMPOSER VERIFIED: PASS
CANVAS-AWARE AI VERIFIED: PASS
EFFECT CAPABILITY VERIFIED: PASS
SAFE AREA VERIFIED: PASS
SCENARIO STARTER VERIFIED: PASS
EXPORT PROFILE VERIFIED: PASS
INSPECTOR TAXONOMY VERIFIED: PASS
EIGHT-CANVAS MATRIX VERIFIED: PASS
DURABILITY VERIFIED: PASS
PRD LITERAL COMPLETION: PASS
VISUAL ACCEPTED: PASS
USABILITY ACCEPTED: PASS
REGRESSION ACCEPTED: PASS

V2.1 REV.2 IMPLEMENTED: 100%
V2.1 REV.2 VERIFIED: 100%
```

## Explicitly not included

The following remain future/Post-V2.1 work and are not implied by this release:

- real AI Provider integration
- broad AI command/agent tool surface
- multi-timeline
- arbitrary docking engine
- full Crop / Mask engine
- transition suite
- generated media provider marketplace
- cloud collaboration
- HDR / advanced color
- Project Package
- multi-language content tracks
