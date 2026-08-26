# Video OS Studio

Video OS Studio is a local-first AI-native video production workspace.

## Released baseline

**Video OS Studio v2.2.0 is released and accepted.**

```text
Product version: 2.2.0
Project Schema: 2.0.0
Release tag: v2.2.0
Release commit: 0e813e5e1360318211e05c1c5fec5eb82be00224
```

V2.2 connects the semantic editor, Durable Jobs, media services and rendering engines into a durable Workflow Runtime with two human review checkpoints and final Remotion render.

W6 acceptance proved real Talking Head 9:16, Product Ad 16:9 and Restart Recovery 1:1 flows on Windows with real browser/media execution, video-use, HyperFrames, Remotion, FFmpeg/ffprobe, encoded-frame inspection, revision/idempotency and cleanup.

The live repository source of truth is:

[`PROJECT_STATUS.md`](PROJECT_STATUS.md)

## Current development milestone

The repository is now entering:

```text
V2.3 — Real AI Director / AI Editing Agent
```

V2.3 adds a production Real AI Provider and multi-turn editing Agent **above** the accepted V2.2 editor/runtime.

Target interaction:

```text
User editing goal
→ bounded Project / Script / Scene / Selection / Workflow context
→ provider-neutral Agent Runner
→ allow-listed typed tools
→ explanation + validated proposal
→ Review / Diff
→ user confirmation
→ existing Command Transaction / bounded Service
→ latest Project revision
```

The Agent is not allowed to directly edit `project.json`, execute arbitrary shell/filesystem/Git commands, or replace Workflow/Job architecture.

Authoritative V2.3 documents:

- [`docs/prd/Video_OS_Studio_V2_3_Real_AI_Director_Agent_Master_PRD.md`](docs/prd/Video_OS_Studio_V2_3_Real_AI_Director_Agent_Master_PRD.md)
- [`docs/prd/Video_OS_Studio_V2_3_Development_Plan.md`](docs/prd/Video_OS_Studio_V2_3_Development_Plan.md)

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
        ✅ RELEASED

V2.3
Real AI Director / AI Editing Agent
        ← CURRENT WORKSTREAM
```

## V2.3 delivery sequence

```text
R0 Repository / PRD / Runtime Truth Sync
→ A0 Agent Contracts + Provider Abstraction
→ A1 Context Builder + Allow-listed Tool Registry
→ A2 Agent Session Store + Multi-turn Runner
→ A3 Production Real Provider Adapter
→ A4 AI Workspace Agent UX + Review / Apply
→ A5 Agent ↔ Workflow Integration
→ A6 Failure / Revision / Retry / Restart Hardening
→ A7 End-to-End Real Provider Product Acceptance
→ V2.3 Release
```

## Accepted product model

```text
Words
→ Meaning
→ Scenes
→ Visual Decisions
→ Clips
→ Render
```

V2.2 orchestration:

```text
User Goal
→ WorkflowRun
→ registered Stages
→ existing Durable Jobs / Services / Project Transactions
→ Human Review
→ editable Project
→ Remotion Final Render
```

V2.3 conversational control:

```text
User Goal
→ Agent Session
→ bounded context
→ provider / tools
→ proposal
→ Review / Apply
→ existing Project / Workflow / Job services
```

Important distinctions:

```text
Source Media != Project Canvas != Export Profile
Project != Workflow != Job
Agent Session != Project
```

## Existing capabilities V2.3 reuses

### Project / durability

- Project Schema `2.0.0`;
- validated Project Commands / Transactions;
- revision/idempotency protection;
- bounded Undo / Redo;
- atomic save/reopen and migrations;
- project-relative asset paths;
- `VIDEO_OS_DATA_ROOT` runtime-data separation.

### Semantic editor

- word-level Script;
- Script ↔ Player synchronization;
- semantic Scenes;
- Captions / Markers;
- Generated Video Brand / Linked Styles;
- Canvas / Timeline V2;
- deterministic Rules Director / Visual Planner;
- Change Preview and one logical Apply transaction.

### Workflow / engines

- durable V2.2 Workflow Runtime;
- Durable Jobs;
- **video-use** behind adapters/services;
- **HyperFrames 0.8.10** behind adapter/service;
- **Remotion 4.0.513** as Player/master composition/final renderer;
- **FFmpeg / ffprobe** behind adapters/services;
- **Playwright 1.62.1** for browser acceptance.

## V2.3 Agent safety model

Required mutation path:

```text
Analyze / read context
→ Suggest / Explain
→ validated Proposal
→ Change Preview / Diff
→ User Confirm
→ validated Command Transaction / bounded Service
```

Rules:

- no direct model-to-Project mutation;
- no raw shell/filesystem/Git/network Agent tools;
- tool calls and outputs are schema validated;
- provider secrets remain server-side in `.env.local`;
- Agent sessions live outside Project JSON;
- stale proposals cannot silently apply after a Project revision change;
- retry uses idempotency and must not duplicate edits;
- existing Rules Director remains deterministic fallback/baseline/tool;
- Project Schema stays `2.0.0` by default.

## Development model

Video OS Studio uses two coordinated execution environments with GitHub as the single code source of truth.

### GPT Web + GitHub

Owns:

- architecture / PRDs;
- cloud-safe implementation;
- Agent schemas/provider abstraction/context/tools/session runner;
- mocked provider contracts;
- branches / PRs / CI;
- unit/API/contract/integration tests;
- cloud-safe browser automation;
- review/merge/current-state truth.

Online development continues until the next requirement genuinely depends on local/live evidence.

### Local Codex on Windows

Owns exact-SHA validation for behavior cloud CI cannot prove:

- live provider credentials/network behavior;
- real browser interaction;
- real media/codecs;
- FFmpeg / ffprobe;
- Remotion / Chrome;
- HyperFrames;
- video-use / Python;
- process interruption/restart recovery;
- final encoded-video proof.

Codex pushes in-scope fixes to the same active branch and never merges or starts the next workstream.

## Local requirements

Baseline:

- Node.js 24;
- npm;
- FFmpeg / ffprobe;
- Chromium/Chrome when browser/render validation is required;
- runtime requirements in `.env.example`.

Example local data root:

```env
VIDEO_OS_DATA_ROOT=E:\Video-OS-Data
```

Real provider secrets belong only in `.env.local`; they must never be committed.

## Cloud verification baseline

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Add:

```bash
npm run test:e2e
```

when browser flows change.

Cloud CI does not prove live-provider, Windows process, real media, FFmpeg, video-use, HyperFrames, Remotion/Chrome, restart or final encoded-video behavior.

## Read order before work

1. `PROJECT_STATUS.md`
2. `AGENTS.md`
3. `SYSTEM.md`
4. `docs/prd/Video_OS_Studio_V2_3_Real_AI_Director_Agent_Master_PRD.md`
5. `docs/prd/Video_OS_Studio_V2_3_Development_Plan.md`
6. active local validation contract when required

The V2.2.0 tag is immutable release evidence. Historical documents remain evidence but do not override current-state truth.
