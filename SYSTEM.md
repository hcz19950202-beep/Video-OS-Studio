# Video OS Studio System Contract

## Product boundary

Video OS Studio is a local-first talking-head video production workspace evolving into an AI-native video editor. It is not a general-purpose Premiere/After Effects clone.

V1/V1.1 are accepted production baselines. V2 must extend them without replacing validated media, render, adapter, path-safety, or workstation foundations.

## V2 product abstraction

V1 primarily executes:

```text
Clip → Track → Timeline → Effect → Render
```

V2 adds a semantic layer above clips:

```text
Words
↓
Meaning
↓
Scene
↓
AI / Human Visual Decision
↓
Clip / Track execution
↓
Remotion Master Composition
↓
Render
```

`project.json` remains the durable project source of truth. V2 may expand its schema, but migrations must preserve existing V1/V1.1 projects.

## Durable mutation boundary

UI code, AI planning and future agents must not mutate durable Project state arbitrarily.

All durable changes flow through:

```text
UI / AI
↓
Validated Project Command or bounded Service
↓
Validation
↓
History Transaction when applicable
↓
Project State
↓
Persistence
```

AI batch changes must be reviewable and should apply as a single undoable transaction.

## Canonical timing

Internal project timing is frame-based.

- Script word timing: frames
- Scene boundaries: frames
- Marker positions: frames
- Timeline clip timing: frames
- External seconds/transcript/EDL timestamps: converted only at adapter seams

There must never be competing canonical second-based and frame-based timelines.

## V2 semantic layers

V2 introduces durable first-class structures for:

- Script / word-level transcript
- Scene semantic ranges
- Markers
- Generated-video Brand configuration
- Linked Styles
- Content-language configuration
- AI visual plan / suggestions

These layers inform Timeline execution but do not replace the five canonical media tracks.

## Engine responsibilities

- **Remotion** — interactive Player preview and final master composition. Remains the master renderer.
- **HyperFrames** — deterministic parameterized complex motion assets rendered through one adapter.
- **video-use** — transcription, rough-cut preparation, EDL and QA through one adapter.
- **FFmpeg / ffprobe** — local media probing and processing through one adapter.

UI components must never spawn engine CLIs directly.

## V1.1 UI baseline

The following are accepted baseline capabilities and must be reused:

- high-density workstation shell
- adaptive Preview
- resizable Preview/Timeline splitter
- zh-CN / en-US Studio UI locale
- dark/light Studio UI theme
- Assets / Effects / Captions / Project workspaces
- schema-driven Motion Inspector
- shared Motion transform: X/Y/Scale/Opacity/Anchor
- existing Preset Library and Inspector Preset workflow
- five-track Timeline

Studio UI theme/locale are local user preferences and are distinct from generated-video Brand configuration.

## Persistence and paths

Repository code and local video data remain separate. The data root is configured by `VIDEO_OS_DATA_ROOT`.

Project files store logical asset IDs and project-relative POSIX paths, never machine-specific absolute paths.

Project saves must validate first, write atomically and preserve a recoverable backup. Older project versions load through explicit migrations.

V2 migration must support the accepted V1/V1.1 `1.0.0` Project format before `CURRENT_PROJECT_VERSION` changes to `2.0.0`.

## Selection and history direction

V1.1 single selection is a baseline only. V2 will extend selection to support:

- multiple clips
- one selected Scene
- one selected Script range

V2 history must support command transactions so one AI Apply can be undone in one operation.

## AI safety / product behavior

AI Director must not directly commit destructive project changes.

Required flow:

```text
Analyze
↓
Suggest
↓
Explain / alternatives / confidence
↓
Change Preview
↓
User confirmation
↓
Validated command transaction
```

## Verification gates

Report independently:

1. `CODE COMPLETE`
2. `CLOUD VERIFIED`
3. `LOCAL VERIFIED`
4. `PRD ACCEPTED`
5. `RENDER VERIFIED` when rendering is involved
6. `VISUAL ACCEPTED` for major UI work
7. `MIGRATION VERIFIED` for project-version changes

GitHub CI is cloud evidence only. Browser UI, Windows paths, video-use, fonts, FFmpeg, HyperFrames, real MP4 and alpha WebM require local validation.
