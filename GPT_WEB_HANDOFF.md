# Video OS Studio — GPT Web / Local Codex Handoff

> Updated: 2026-08-20 (Asia/Shanghai)
> This file is the current execution handoff. It supersedes old branch/PR instructions in `GPT_WEB_START.md` and historical V1 handoff sections.

## 1. Current truth

Video OS Studio **V1.1 is complete and merged to `main`**.

- Repository: `hcz19950202-beep/Video-OS-Studio`
- Visibility: PUBLIC
- Default branch: `main`
- V1 core PR #1: MERGED
- V1.1 workstation UI/i18n PR #2: MERGED
- V1.1 production baseline: `c3c026cd256d6ebfdced28b433112c1839347666`

Do not restart V1 Phase 0–10 and do not treat `feature/phase-0-foundation` as the current development branch.

## 2. Accepted V1/V1.1 gates

V1 acceptance and V1.1 UI polish have real Windows evidence.

```text
CODE COMPLETE: PASS
CLOUD VERIFIED: PASS
LOCAL VERIFIED: PASS
PRD ACCEPTED: PASS
RENDER VERIFIED: PASS
V1.1 LOCAL UI VERIFIED: PASS
MOTION TRANSFORM VERIFIED: PASS
PRESET VERIFIED: PASS
I18N VERIFIED: PASS
V1 REGRESSION SMOKE: PASS
USER VISUAL APPROVAL: PASS
```

Authoritative evidence:

- `LOCAL_VALIDATION_V1.md`
- `LOCAL_VALIDATION_V1_1_UI.md`
- `LOCAL_VALIDATION_V1_1_POLISH.md`

## 3. Baseline capabilities — preserve them

### Media / rendering

- MP4 import + ffprobe metadata
- frame-based five-track Timeline
- SRT/VTT captions
- Remotion Player + master composition
- final H.264/AAC MP4
- VP9 alpha WebM validated with Chromium checkerboard
- standard single Range asset responses for browser video playback
- A-roll uses `<OffthreadVideo trimBefore>`

### Engines

- video-use transcription / packed transcript / confirmed EDL boundary
- HyperFrames Process Flow / Map Route and transparent overlay cache
- Remotion Effect Registry
- review-before-apply Visual Planner

### V1.1 workstation

- high-density professional workstation shell
- Dark primary + Light UI theme
- persisted zh-CN / en-US switching
- adaptive 9:16 / 16:9 / 1:1 Preview
- resizable Preview / Timeline splitter
- left workspaces: Assets / Effects / Captions / Project
- top TIME / CARDS / DENSITY / PEAK / SEL metrics
- shared Motion transform for Remotion + HyperFrames: X / Y / Scale / Opacity / 9-point Anchor
- schema-driven Inspector
- Inspector Preset workflow using the existing local Asset/Preset Library
- Project JSON export

V2 must **REUSE / EXTEND**, never rebuild, this baseline.

## 4. Non-negotiable architecture rules

- Node 24 remains the runtime baseline.
- Project timing is canonical **frames**. Convert external seconds only at adapter seams.
- UI and AI do not directly mutate durable Project JSON.
- Durable changes go through validated Project Commands or bounded services.
- External engines remain behind adapters.
- Remotion remains the master composition engine.
- Repository code and `VIDEO_OS_DATA_ROOT` media/user data remain separate.
- Project files contain logical IDs/project-relative POSIX paths, not machine absolute paths.
- Project ID/path traversal protections must not regress.
- UI locale/theme are local preferences, distinct from generated-video Brand state.
- `REUSE > MODIFY > CREATE`.

## 5. Current next product line

The authoritative next PRD is:

`Video_OS_Studio_V2_AI_Native_Editor_Master_PRD_Rev2.md`

V2 changes the abstraction from:

```text
Clip → Track → Timeline → Effect
```

to:

```text
Words → Meaning → Scene → Visual Decision → Clip → Render
```

## 6. V2 milestone order

Do not skip the order.

### M0 — Baseline Freeze

Branch: `chore/v2-baseline`

- sync README / HANDOFF / SYSTEM with V1.1 reality
- commit V2 Rev.2 Master PRD
- no product code changes

### M1 — Project Schema 2.0 + Migration

Branch after M0 merge: `feature/v2-foundation`

Cloud/Web GPT owns initial implementation:

- Project version `2.0.0`
- Script / Transcript Word schema
- Scene schema
- Marker schema
- Brand schema
- Linked Style schema
- Content-language config
- real `1.0.0 → 2.0.0` migration
- multi-select-capable Selection foundation
- History Transaction foundation
- validated commands and unit/integration tests

Do **not** build Script UI, Scene UI, Canvas UI, Timeline V2 or AI Director during M1.

Local Codex then validates a real historical V1.1 project on Windows before merge.

### M2 — Text-native Editing

- Script Editor
- delete/restore text ↔ canonical video edit
- Player/Script/Timeline synchronization
- Scene System + Scene Strip

### M3 — Editor V2

- context-aware Inspector for all clip types / Scene
- multi-select common properties
- generated-video Brand
- Linked Styles

### M4 — Canvas + Timeline V2

- direct Canvas drag/resize/rotate/snap reusing existing Motion transform
- Timeline snap/marker/multi-select/shortcuts/waveform/Scene Strip

### M5 — AI Director V2

- Scene-aware recommendations
- reason / confidence / alternatives
- visual density
- Change Preview
- one undoable Apply transaction

## 7. GPT Web vs Local Codex ownership

### GPT Web + GitHub

Primary owner of:

- product architecture
- schema/migration
- React/TypeScript implementation
- commands/services
- cloud-safe integration tests
- PR creation
- GitHub Actions CI

### Local Codex

Primary owner of things cloud CI cannot prove:

- Windows paths/filesystem
- migration of real `E:\Video-OS-Data` projects
- real MP4/video-use/FFmpeg/Remotion/HyperFrames
- browser mouse/drag/keyboard interaction
- fonts/waveforms/media performance
- final MP4/alpha WebM regression

Local defects use milestone-scoped IDs such as:

```text
V2-M1-LV-001
V2-M2-LV-001
```

All local fixes must return to the same GitHub PR and pass CI again.

## 8. Phase ownership rule

Do not let GPT Web and Local Codex concurrently modify the same milestone branch.

```text
GPT Web development
→ CODE COMPLETE / CLOUD VERIFIED
→ handoff
→ Local Codex validation/fixes
→ push same PR
→ final CI/review
→ merge
```

## 9. Verification gates

Always report separately:

- `CODE COMPLETE`
- `CLOUD VERIFIED`
- `LOCAL VERIFIED`
- `PRD ACCEPTED`
- `RENDER VERIFIED` when rendering is involved
- `VISUAL ACCEPTED` for major UI work
- `MIGRATION VERIFIED` for project-version changes

Do not describe CI as proof of Windows/browser/render behavior.

## 10. Start-of-work reading order

Before V2 implementation, read:

1. `Video_OS_Studio_V2_AI_Native_Editor_Master_PRD_Rev2.md`
2. `SYSTEM.md`
3. `DESIGN.md`
4. this file
5. `LOCAL_VALIDATION_V1.md`
6. `LOCAL_VALIDATION_V1_1_POLISH.md`
7. relevant code/tests

## 11. Immediate execution state

At the time of this handoff update, the intended sequence is:

```text
main (accepted V1.1)
↓
chore/v2-baseline
↓
CI + merge
↓
feature/v2-foundation
↓
cloud M1 implementation
↓
CI
↓
Windows Local Codex M1 migration validation
```

Do not merge a V2 milestone until its required local gates are satisfied unless the user explicitly changes that policy.
