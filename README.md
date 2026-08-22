# Video OS Studio

Video OS Studio is a local-first AI-native universal video production workspace.

## Current product baseline

**Video OS Studio v2.1.0 is released and accepted.**

Milestone baseline:

```text
Product version: 2.1.0
Release commit: fcfb341367b6ff5e8911693483c14196386c5a93
Project Schema: 2.0.0
```

V2.1 completed the universal AI-first editor layer over the accepted V2 Core:

- universal landscape / portrait / square / ultrawide / custom Canvas;
- resizable Edit / AI / Script / Motion workspaces;
- deterministic rules-based AI Composer / Director;
- canvas-aware placement, density restraint and Safe Area;
- responsive effect capability metadata;
- Scenario Starter;
- universal media ingest with automatic local normalization for supported non-working formats;
- Export Profile with custom resolution / FPS / quality / audio;
- semantic Inspector taxonomy;
- Timeline V2 and Canvas direct manipulation;
- real Windows validation across eight required canvas classes.

V2.1 release closeout recorded 34 test files / 125 tests passing plus Windows durability, cross-aspect and real-final-render acceptance.

## Current development milestone

The repository is now in:

```text
V2.1.1 Engineering Hardening & Agent-Ready Foundation
```

Current state and active branch are defined only in:

[`PROJECT_STATUS.md`](PROJECT_STATUS.md)

The active hardening PRD is:

[`docs/prd/Video_OS_Studio_V2_1_1_Engineering_Hardening_Master_PRD.md`](docs/prd/Video_OS_Studio_V2_1_1_Engineering_Hardening_Master_PRD.md)

V2.1.1 does **not** expand the primary editor feature surface. It focuses on:

```text
zero silent data loss
project revision/concurrency safety
deterministic engine runtime
durable/cancellable jobs
streaming large-media IO
project/data integrity
automated Windows/cloud acceptance
safe GPT Web ↔ local Codex development handoff
```

A real external AI Provider and V2.2 Workflow Runtime remain blocked until V2.1.1 is accepted.

## Development model

Video OS Studio uses a two-environment development workflow.

### GPT Web + GitHub

Owns:

- architecture and PRDs;
- cloud-safe implementation;
- GitHub branches / PRs / CI;
- unit/API/contract tests;
- review of local changes;
- final merge decisions;
- current project status.

### Local Codex on Windows

Owns:

- real browser interaction;
- real media outside Git;
- FFmpeg / ffprobe;
- Remotion / Chrome runtime;
- HyperFrames;
- video-use / Python;
- memory/performance checks;
- local end-to-end acceptance and in-scope local defect fixes.

The environments hand work through exact GitHub branch/commit SHAs. They do not keep competing parallel implementations of the same workstream.

Read [`AGENTS.md`](AGENTS.md) before making changes.

## Product model

The primary editing abstraction is:

```text
Words → Meaning → Scenes → Visual Decisions → Clips → Render
```

A normal production flow is:

```text
New Project
→ Import source media
→ video-use transcript when needed
→ Script editing
→ Scenes
→ Captions
→ AI Director review/apply
→ Brand / Linked Style
→ Canvas refinement
→ Timeline refinement
→ B-roll / Audio
→ Export Profile
→ Final Render
→ Reopen / continue editing
```

## Core capabilities

### Project / durability

- Project Schema `2.0.0`
- V1→V2 migration
- validated Project Commands / Transactions
- bounded Undo / Redo history
- atomic save / reopen
- project-relative asset paths
- `VIDEO_OS_DATA_ROOT` runtime-media separation

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

### Universal Canvas / Timeline V2

- landscape / portrait / square / ultrawide / arbitrary custom Canvas
- direct select / drag / resize / rotate
- live Preview during pointer gesture
- nudge / snap / alignment guides
- layer ordering
- Markers
- source-aware Split
- real FFmpeg waveform cache
- Timeline shortcuts
- Undo / Redo
- Safe Area profiles

### AI Director / Composer

- Scene-grounded visual suggestions
- selected Scene / Clip / transcript references
- Spoken Text grounding
- Recommendation / Reason / Confidence / Alternatives
- Density Hold / restraint
- canvas-aware placement guidance
- Change Preview before Apply
- per-suggestion deselection
- one Apply = one validated Project Transaction
- whole-batch Undo / Redo
- idempotent re-apply behavior

Current Director runtime source intentionally remains:

```text
rules
```

A real external LLM provider is future work.

### Universal media ingest

User-facing inputs include:

```text
Video: MP4 / MOV / M4V / WebM / MKV / AVI
Audio: MP3 / WAV / M4A / AAC / FLAC
Image: PNG / JPEG / WebP
Subtitle: SRT / VTT
```

Non-working video/audio formats are normalized through the local media layer where required while preserving source semantics.

### Export Profile

- Project Canvas is the default output;
- custom width / height / FPS;
- quality selection;
- audio / muted output;
- aspect mismatch warning;
- export settings do not mutate the Project Canvas;
- render-only FPS conversion preserves timeline duration in seconds.

## Engines

- **video-use** — transcription / rough-cut / QA helpers behind adapters/services
- **HyperFrames** — deterministic parameterized complex-motion assets
- **Remotion** — embedded Player preview and master composition/render
- **FFmpeg / ffprobe** — local media probing, waveform, normalization and processing
- **Project JSON** — durable project source of truth

## Core architecture rules

Always preserve:

```text
Source Media != Project Canvas != Export Profile
```

And:

- UI and AI mutate durable project state only through validated Project Commands / Transactions / bounded services.
- Canonical timeline timing is frame-based.
- External engines remain behind adapters; UI components never spawn CLIs directly.
- Agents do not hand-edit runtime `project.json`.
- Project JSON stores logical asset IDs and project-relative POSIX paths, not machine-specific absolute paths.
- Repository code and runtime media/user data are separated through `VIDEO_OS_DATA_ROOT`.
- Remotion remains the master composition engine.
- Studio UI theme/locale are local preferences and remain separate from generated-video Brand.
- `REUSE > MODIFY > CREATE`.

## Local requirements

Baseline:

- Node.js 24
- npm
- FFmpeg / ffprobe
- Chromium/Chrome for browser/media/render validation
- additional engine/runtime requirements as listed in `.env.example` and the active validation contract

Copy `.env.example` to `.env.local` and set a data root outside the repository, for example:

```env
VIDEO_OS_DATA_ROOT=E:\Video-OS-Data
```

Install and verify:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run dev
```

## Verification discipline

Cloud CI proves repository code health, not Windows runtime/media behavior.

Windows/local acceptance separately verifies the workstreams that require:

- real browser interaction;
- media codecs and normalization;
- FFmpeg / ffprobe;
- Remotion rendering and Chrome behavior;
- HyperFrames;
- video-use;
- persistence / restart recovery;
- real-media memory/performance.

GPT Web freezes an exact branch/SHA before local Codex starts such validation. Local Codex pushes fixes back to that branch; GPT Web reviews and merges after evidence and CI are accepted.

## Product documents

Read before new work:

1. `PROJECT_STATUS.md`
2. `AGENTS.md`
3. `SYSTEM.md`
4. `docs/prd/Video_OS_Studio_V2_1_1_Engineering_Hardening_Master_PRD.md`
5. active validation contract if required

Historical release/validation evidence includes:

- `RELEASE_NOTES_V2_1_0.md`
- `Video_OS_Studio_V2_1_AI_First_Universal_UI_Redesign_Master_PRD_Rev2.md`
- `LOCAL_VALIDATION_V2_1.md`
- `LOCAL_VALIDATION_V2_1_PRD_COMPLETION.md`

Historical documents do not override `PROJECT_STATUS.md` for current branch/milestone state.
