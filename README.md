# Video OS Studio

Video OS Studio is a local-first video production workspace for talking-head videos.

## V1 architecture

- **video-use** — word-level transcript preparation, packed transcript, confirmed EDL and QA helpers
- **HyperFrames** — deterministic parameterized complex motion assets rendered as reusable WebM overlays
- **Remotion** — interactive Player preview and final master composition
- **FFmpeg / ffprobe** — local media probing and processing
- **Project JSON** — durable project format

## Core rules

- UI, AI planners and tools mutate durable project state only through validated Project Commands or bounded services.
- Canonical timeline timing is **frame-based**. Seconds are converted only at adapter seams.
- External engines remain behind adapters; UI components never spawn CLIs directly.
- Project JSON stores logical asset IDs and project-relative POSIX paths, never machine-specific absolute paths.
- Repository code and local media/user presets are separated through `VIDEO_OS_DATA_ROOT`.
- Remotion is the master composition engine.
- `REUSE > MODIFY > CREATE`.

## Current feature branch

Development currently lives on:

```text
feature/phase-0-foundation
```

PR #1 remains open and must not be merged until Windows local validation is complete.

### Implemented V1 phases

1. Project UI, MP4/SRT import, ffprobe and real Player media
2. Five-track frame-based Timeline
3. Remotion Effect Registry
4. Schema-driven Effect Inspector
5. SRT/VTT caption parsing, presets and emphasis
6. Final MP4 / transparent overlay Render Jobs
7. HyperFrames Process Flow / Map Route pipeline and cache
8. video-use transcript preparation + confirmed EDL integration
9. Reviewable Visual Planner + selected-slot apply
10. Local reusable Preset / Asset Library with cross-project reuse

Built-in code assets are documented in `ASSET_REGISTRY.md`. Runtime user presets live under `VIDEO_OS_DATA_ROOT/library/` and are not committed to Git.

## Local requirements

Baseline:

- Node.js 24
- npm
- FFmpeg / ffprobe
- Chromium/Chrome available for media/render workflows

Copy `.env.example` to `.env.local` and set at least:

```env
VIDEO_OS_DATA_ROOT=E:\Video-OS-Data
```

Optional external engine overrides are documented in `.env.example`.

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

Phase 0 already has historical Windows validation in `LOCAL_VALIDATION.md`. Phase 1–10 Windows acceptance is tracked separately in `LOCAL_VALIDATION_V1.md`.

Cloud CI does **not** prove Windows browser interaction, real MP4 playback, FFmpeg behavior, Remotion MP4/WebM output, HyperFrames alpha, video-use transcription, fonts or media performance.

Read before continuing work:

1. `GPT_WEB_HANDOFF.md`
2. `Video_OS_Studio_V1_Master_PRD.md`
3. `SYSTEM.md`
4. `LOCAL_VALIDATION_V1.md`
