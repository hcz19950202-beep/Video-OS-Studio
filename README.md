# Video OS Studio

Video OS Studio is a local-first AI-native universal video production workspace.

## Current product baseline

**Video OS Studio v2.2.0 has completed product acceptance and release finalization.**

Current release line:

```text
Product version: 2.2.0
Project Schema: 2.0.0
Release tag: v2.2.0
```

V2.2 connects the existing editor, durable Job runtime, media services and rendering engines into one durable, reviewable production Workflow with two human checkpoints and a final Remotion render.

The live repository source of truth is always:

[`PROJECT_STATUS.md`](PROJECT_STATUS.md)

## V2.2 accepted product flow

```text
Create Project
→ Import source media
→ Select Scenario
→ Generate First Draft
→ Media / Transcript / Script / Scenes / Captions / Visual Plan
→ Content Review
→ Motion / B-roll / Audio / Timeline Assembly
→ Preview
→ Assembly Review
→ Final Render
```

The V2.2 Workflow Runtime was accepted through R0, W0, W1, W2, W3, W4, W5 and W6. W6 final product acceptance proved real Talking Head 9:16, Product Ad 16:9 and Restart Recovery 1:1 flows on Windows with real browser/media execution, video-use, HyperFrames, Remotion, FFmpeg/ffprobe, encoded-frame inspection, revision/idempotency checks and cleanup.

Authoritative V2.2 documents:

- [`docs/prd/Video_OS_Studio_V2_2_Workflow_Runtime_Master_PRD.md`](docs/prd/Video_OS_Studio_V2_2_Workflow_Runtime_Master_PRD.md)
- [`docs/prd/Video_OS_Studio_V2_2_Development_Plan.md`](docs/prd/Video_OS_Studio_V2_2_Development_Plan.md)
- [`docs/validation/LOCAL_VALIDATION_V2_2_W6.md`](docs/validation/LOCAL_VALIDATION_V2_2_W6.md)

V2.2 deliberately does **not** introduce the production Real AI Provider / multi-turn Editing Agent. Those remain a future V2.3 workstream and require a separately approved PRD/scope.

## Product roadmap

```text
V2.1.0
Universal AI-first Editor
        ✅

V2.1.1
Engineering Hardening / Agent-ready Foundation
        ✅

V2.2.0
Workflow Runtime / Generate First Draft
        ✅

V2.3
Real AI Director / AI Editing Agent
        → future, not started
```

## Development model

Video OS Studio uses two coordinated execution environments with GitHub as the single code source of truth.

### GPT Web + GitHub

Owns:

- architecture and PRDs;
- cloud-safe implementation;
- GitHub branches / PRs / CI;
- unit/API/contract/integration tests;
- cloud/browser automation where supported;
- review of local changes;
- merge decisions;
- `PROJECT_STATUS.md` and handoff truth.

### Local Codex on Windows

Owns exact-SHA validation for behavior that cloud execution cannot prove:

- real browser interaction;
- real media outside Git;
- FFmpeg / ffprobe;
- Remotion / Chrome runtime;
- HyperFrames;
- video-use / Python;
- process interruption / restart recovery;
- real-media memory/performance;
- final encoded-video proof;
- bounded in-scope local defect fixes and regression tests.

GPT Web freezes an exact branch/SHA before Local Codex starts. Codex pushes accepted fixes back to the same branch. It does not independently merge the PR or start the next workstream.

Read [`GPT_WEB_HANDOFF.md`](GPT_WEB_HANDOFF.md) and [`AGENTS.md`](AGENTS.md) before making changes.

## Product model

The editing abstraction remains:

```text
Words → Meaning → Scenes → Visual Decisions → Clips → Render
```

V2.2 adds orchestration above the existing editor/runtime:

```text
User Goal
→ WorkflowRun
→ registered Stages
→ existing Durable Jobs / Services / Project Transactions
→ Human Review
→ editable Project
→ Remotion Final Render
```

Important distinction:

```text
Project != Workflow != Job
```

- Project represents the durable video-editing state.
- Job represents one concrete long-running execution task.
- Workflow represents the production stages/dependencies needed to reach an outcome.

## Core capabilities

### Project / durability

- Project Schema `2.0.0`;
- validated Project Commands / Transactions;
- revision/idempotency protection;
- bounded Undo / Redo;
- atomic save/reopen and migrations;
- project-relative asset paths;
- `VIDEO_OS_DATA_ROOT` runtime-data separation.

### Text-native / semantic editing

- word-level Script;
- Script ↔ Player synchronization;
- semantic Scenes;
- Captions;
- Markers;
- rules-based AI Director / Composer;
- Change Preview and one logical Apply transaction.

### Universal editor

- landscape / portrait / square / ultrawide / custom Canvas;
- Timeline V2;
- direct select / drag / resize / rotate;
- B-roll and Audio;
- Generated Video Brand and Linked Styles;
- Export Profiles separate from Project Canvas.

### Workflow Runtime

- durable `WorkflowRun` state;
- dependency-aware Stage execution;
- pause / resume / retry / cancel;
- two persisted human-review checkpoints;
- downstream invalidation after approved edits;
- restart recovery and idempotent Project mutations;
- visible stage progress and durable activity history;
- Final Render delivery through the existing renderer/runtime.

### Media and engines

- universal media ingest and normalization where required;
- **video-use** behind adapters/services for transcription/rough-cut/QA helpers;
- **HyperFrames 0.8.10** for deterministic complex-motion assets;
- **Remotion 4.0.513** for Player/master composition/final render;
- **FFmpeg / ffprobe** behind adapters/services for local media processing.

## Core architecture rules

Always preserve:

```text
Source Media != Project Canvas != Export Profile
Project != Workflow != Job
REUSE > MODIFY > CREATE
```

And:

- Project JSON is the durable Project source of truth;
- canonical timeline timing is frame-based;
- durable changes use validated Commands / Transactions / bounded services;
- UI and Workflow code do not spawn external CLIs directly;
- agents do not hand-edit runtime `project.json`;
- Remotion remains the master renderer;
- HyperFrames remains behind its adapter/service boundary;
- video-use and FFmpeg/ffprobe remain behind adapters/services;
- repository code and runtime media remain separated through `VIDEO_OS_DATA_ROOT`;
- Studio UI theme/locale remain separate from generated-video Brand;
- Project Schema and engine pins are not changed incidentally.

## Local requirements

Baseline:

- Node.js 24;
- npm;
- FFmpeg / ffprobe;
- Chromium/Chrome for browser/media/render validation;
- engine/runtime requirements listed in `.env.example` and active validation contracts.

Example local data root:

```env
VIDEO_OS_DATA_ROOT=E:\Video-OS-Data
```

Cloud baseline commands:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Use `npm run test:e2e` when a workstream changes browser flows.

## Verification discipline

Report separately as applicable:

```text
CODE COMPLETE
CLOUD VERIFIED
LOCAL VERIFIED
PRD ACCEPTED
RENDER VERIFIED
VISUAL ACCEPTED
MIGRATION VERIFIED
```

Cloud CI does not by itself prove Windows process behavior, real browser/media behavior, FFmpeg, video-use, HyperFrames, Remotion/Chrome, restart recovery or final encoded-video correctness. Those require the exact local acceptance contract defined by the relevant workstream.

## Read order before new work

1. `PROJECT_STATUS.md`
2. `AGENTS.md`
3. `SYSTEM.md`
4. the approved PRD for the active workstream
5. the active validation contract when required

Historical V2/V2.1/V2.1.1/V2.2 documents remain evidence, but they never override `PROJECT_STATUS.md` for current repository truth.
