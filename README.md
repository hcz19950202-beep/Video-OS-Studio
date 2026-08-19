# Video OS Studio

Video OS Studio is a local-first video production workspace for talking-head videos.

The V1 architecture uses:

- Remotion for interactive preview and final master composition
- HyperFrames for parameterized complex motion assets
- video-use for media understanding, rough cuts, EDL, and QA
- FFmpeg/ffprobe for local media processing
- Project JSON as the durable project format

## Architecture rules

- `project.json` is the durable source format.
- UI and future AI agents mutate projects only through the validated Project Command module.
- Canonical timeline timing is frame-based; seconds are converted only at adapter boundaries.
- External engines are hidden behind small adapters.
- Project files store logical asset IDs and project-relative paths, never machine-specific absolute paths.
- Remotion is the master composition engine.

Read before implementation:

1. `GPT_WEB_HANDOFF.md`
2. `Video_OS_Studio_V1_Master_PRD.md`
3. `SYSTEM.md`
4. `GPT_WEB_START.md` (early Phase 0 background)

## Phase 0 development

Requirements:

- Node.js 24
- npm

Install and run:

```bash
npm install
npm run dev
```

Automated checks:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Copy `.env.example` to `.env.local` and set `VIDEO_OS_DATA_ROOT` to the machine's local data directory. Never commit `.env.local` or real media/project data.

## Verification gates

Report these independently:

- `CODE COMPLETE`
- `CLOUD VERIFIED`
- `LOCAL VERIFIED`
- `PRD ACCEPTED`
- `RENDER VERIFIED` when rendering is involved

Real Windows, browser interaction, FFmpeg, HyperFrames alpha, video-use, fonts, and render acceptance must be verified locally. CI success alone does not count as local or render verification.
