# Video OS Studio

Video OS Studio is a local-first AI-native video production workspace for talking-head videos.

## Current product baseline

**Video OS Studio V2.0 Core is complete and accepted.**

Accepted delivery sequence:

- PR #1 — V1 core workflow: MERGED
- PR #2 — V1.1 workstation UI / i18n: MERGED
- PR #3 — V2 baseline/document freeze: MERGED
- PR #4 — Project Schema 2.0 + V1→V2 migration: MERGED
- PR #5 — Script Editor + Scene System: MERGED
- PR #6 — Context Inspector + multi-select + Brand + Linked Style: MERGED
- PR #7 — Canvas direct manipulation + Timeline V2: MERGED
- PR #8 — AI Director V2: MERGED
- PR #9 — V2 Core Final Acceptance / RC1: MERGED

Accepted RC1 merge baseline:

```text
d1f45777d8e70f366f665a4dae7ba534096dda9e
```

Release metadata target:

```text
2.0.0
```

V2 was accepted through both milestone-level validation and a final end-to-end RC1 run on a brand-new Project created from a new real talking-head source.

## V2 product model

V2 changes the primary editing abstraction from:

```text
Clip → Track → Timeline → Effect
```

to:

```text
Words → Meaning → Scenes → Visual Decisions → Clips → Render
```

A normal production flow is:

```text
New Project
→ Import talking-head video
→ video-use transcript
→ Script editing
→ Scenes
→ Captions
→ AI Director review/apply
→ Brand / Linked Style
→ Canvas refinement
→ Timeline refinement
→ B-roll / Audio
→ Final Render
→ Reopen / continue editing
```

## V2 Core capabilities

### Project / durability

- Project Schema `2.0.0`
- V1→V2 migration
- validated Project Commands / Transactions
- bounded Undo / Redo history
- atomic save / reopen
- project-relative asset paths

### Text-native editing

- word-level Script
- Script ↔ Player synchronization
- Remove / Restore sentence
- canonical A-roll rebuild
- semantic tags
- Scene generation / Scene Strip / Scene Inspector

### Editor Core

- Context Inspector for Project / Video / Caption / Motion / HyperFrames / B-roll / Audio / Scene / Multi-select
- Generated Video Brand separate from Studio Theme
- Motion / Caption Linked Styles
- multi-select + common-property editing
- B-roll and Audio media paths

### Canvas / Timeline V2

- direct select / drag / resize / rotate
- live Preview during pointer gesture
- nudge / snap / alignment guides
- layer ordering
- Markers
- source-aware Split
- real FFmpeg waveform cache
- Timeline shortcuts
- Undo / Redo

### AI Director V2

- Scene-grounded visual suggestions
- Spoken Text grounding
- Recommendation / Reason / Confidence / Alternatives
- Density Hold / restraint
- Change Preview before Apply
- per-suggestion deselection
- one Apply = one validated Project Transaction
- whole-batch Undo / Redo
- idempotent re-apply

Current Director runtime source is intentionally reported as:

```text
rules
```

The adapter/schema boundary is ready for a future provider integration, but V2.0 does not claim a cloud LLM provider is already connected.

## Engines

- **video-use** — transcript preparation, packed transcript, confirmed EDL and QA helpers
- **HyperFrames** — deterministic parameterized complex motion assets
- **Remotion** — interactive Player preview and master composition/render
- **FFmpeg / ffprobe** — local media probing, waveform analysis and processing
- **Project JSON** — durable source of truth

## Core architecture rules

- UI and AI mutate durable project state only through validated Project Commands / Transactions / bounded services.
- Canonical timeline timing is frame-based.
- External engines remain behind adapters; UI components never spawn CLIs directly.
- Project JSON stores logical asset IDs and project-relative POSIX paths, not machine-specific absolute paths.
- Repository code and runtime media/user data are separated through `VIDEO_OS_DATA_ROOT`.
- Remotion remains the master composition engine.
- Studio UI theme/locale are local preferences and are separate from generated-video Brand.
- `REUSE > MODIFY > CREATE`.

## RC1 acceptance

The V2 Core release candidate was validated end to end on a new real project:

- real raw talking-head source
- real video-use transcription
- Script cut + Restore + final cut
- 10 Scenes
- 38 Captions
- AI Director Analyze / Review / Deselect / Apply
- Generated Video Brand
- Linked Style shared across Motion clips
- Canvas editing
- real B-roll
- real BGM
- Timeline Marker / Split / Undo / Redo / Waveform
- Save / Stop / Restart / Recent Project reopen
- first final render
- second edit after reopen
- second final render

Final RC output passed H.264/AAC, 1080×1920, 30fps, full video/audio decode, visual comparison and regression acceptance.

Known non-blocking polish observations are tracked separately from the V2.0 Core release.

## Local requirements

- Node.js 24
- npm
- FFmpeg / ffprobe
- Chromium/Chrome for browser/media/render validation

Copy `.env.example` to `.env.local` and set at least:

```env
VIDEO_OS_DATA_ROOT=E:\Video-OS-Data
```

Install and run:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run dev
```

## Verification discipline

Cloud CI proves repository code health, not local media behavior.

Windows release acceptance separately verifies real browser interaction, MP4 playback, FFmpeg behavior, Remotion rendering, HyperFrames media, video-use transcription, fonts, persistence and real-media performance.

## Product documents

Read before starting follow-up work:

1. `GPT_WEB_HANDOFF.md`
2. `RELEASE_NOTES_V2.0.0.md`
3. `Video_OS_Studio_V2_AI_Native_Editor_Master_PRD_Rev2.md`
4. `LOCAL_VALIDATION_V2_CORE_RC1.md`
5. `SYSTEM.md`
6. `DESIGN.md`

Post-Core work must be opened deliberately as a new milestone rather than mixed into the V2.0 release branch.
