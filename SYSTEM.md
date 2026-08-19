# Video OS Studio System Contract

## Product boundary

Video OS Studio is a local-first talking-head video production workspace. It is not a general-purpose NLE and must not attempt to reproduce Premiere-level editing in V1.

## Source of truth

`project.json` is the durable project format. UI code, AI planning, and future agents must not mutate it arbitrarily. Changes pass through a validated Project Command module so validation, revision tracking, undo/redo, migration, and autosave share one implementation.

Internal timeline timing is frame-based. External seconds, transcript timestamps, and EDL timestamps are converted at adapter seams.

## Engine responsibilities

- Remotion: interactive Player preview and final master composition.
- HyperFrames: deterministic parameterized motion assets rendered through one adapter; V1 consumes rendered media rather than depending on HyperFrames internals.
- video-use: probing, transcription, rough cut, EDL, and final QA through one adapter.
- FFmpeg/ffprobe: local media processing through one adapter.

## Persistence and paths

Repository code and local video data are separate. The data root is configured by `VIDEO_OS_DATA_ROOT`. Project files store logical asset IDs and project-relative paths, not machine-specific absolute paths.

Project saves must validate first, write atomically, and preserve a recoverable backup. Older project versions load through explicit migrations.

## Verification gates

Report these independently:

1. `CODE COMPLETE`
2. `CLOUD VERIFIED`
3. `LOCAL VERIFIED`
4. `PRD ACCEPTED`
5. `RENDER VERIFIED` when rendering is involved

Browser UI requires real interaction verification. Render features require real output plus ffprobe and visual frame inspection.

