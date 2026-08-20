# Video OS Studio

Video OS Studio is a local-first AI-native video production workspace for talking-head videos.

## Current product baseline

**V1.1 is complete and merged to `main`.**

- PR #1 — V1 core workflow: MERGED
- PR #2 — V1.1 workstation UI / i18n: MERGED
- V1.1 merge baseline: `c3c026cd256d6ebfdced28b433112c1839347666`
- Default branch: `main`

The next product line is **Video OS Studio V2.0 — AI Native Video Editor**. Read `Video_OS_Studio_V2_AI_Native_Editor_Master_PRD_Rev2.md` before starting V2 work.

## Validated V1/V1.1 architecture

- **video-use** — word-level transcript preparation, packed transcript, confirmed EDL and QA helpers
- **HyperFrames** — deterministic parameterized complex motion assets rendered as reusable WebM overlays
- **Remotion** — interactive Player preview and final master composition
- **FFmpeg / ffprobe** — local media probing and processing
- **Project JSON** — durable project format

### V1.1 workstation baseline — do not rebuild

V1.1 already provides:

- high-density dark workstation UI + light theme
- persisted zh-CN / en-US UI switching
- adaptive Preview for 9:16 / 16:9 / 1:1
- resizable Preview / Timeline splitter
- Assets / Effects / Captions / Project workspaces
- searchable Remotion + HyperFrames effect library
- five-track frame-based Timeline
- shared Motion transform for Remotion and HyperFrames: X / Y / Scale / Opacity / 9-point Anchor
- schema-driven Inspector and Inspector Preset workflow
- video-use, Visual Planner and reusable local Preset Library
- final H.264/AAC MP4 and validated VP9 alpha WebM render paths

V2 must **REUSE / EXTEND**, not rewrite, these accepted capabilities.

## Core rules

- UI, AI planners and tools mutate durable project state only through validated Project Commands or bounded services.
- Canonical timeline timing is **frame-based**. Seconds are converted only at adapter seams.
- External engines remain behind adapters; UI components never spawn CLIs directly.
- Project JSON stores logical asset IDs and project-relative POSIX paths, never machine-specific absolute paths.
- Repository code and local media/user presets are separated through `VIDEO_OS_DATA_ROOT`.
- Remotion remains the master composition engine.
- Studio UI theme/locale are local preferences and must not contaminate generated-video brand state.
- `REUSE > MODIFY > CREATE`.

## V2 direction

V2 changes the editing abstraction from:

```text
Clip → Track → Timeline → Effect
```

to:

```text
Words → Meaning → Scene → Visual Decision → Clip → Render
```

Core milestones:

1. V2 baseline/document freeze
2. Project Schema 2.0 + V1→V2 migration
3. Script Editor + Scene System
4. Context Inspector + multi-select + Brand + Linked Style
5. Canvas direct manipulation + Timeline V2
6. AI Director V2 with explainable suggestions and change preview

## Local requirements

- Node.js 24
- npm
- FFmpeg / ffprobe
- Chromium/Chrome for media/render validation

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

## Verification gates

Always report independently:

- `CODE COMPLETE`
- `CLOUD VERIFIED`
- `LOCAL VERIFIED`
- `PRD ACCEPTED`
- `RENDER VERIFIED` when rendering is involved
- `VISUAL ACCEPTED` for UI milestones
- `MIGRATION VERIFIED` for schema migrations

GitHub CI does **not** prove Windows browser interaction, real MP4 playback, FFmpeg behavior, Remotion MP4/WebM output, HyperFrames alpha, video-use transcription, fonts or media performance.

## Read before continuing work

1. `GPT_WEB_HANDOFF.md`
2. `Video_OS_Studio_V2_AI_Native_Editor_Master_PRD_Rev2.md`
3. `SYSTEM.md`
4. `DESIGN.md`
5. `LOCAL_VALIDATION_V1.md`
6. `LOCAL_VALIDATION_V1_1_POLISH.md`
