# Video OS Studio

Video OS Studio is a local-first AI-native video production workspace.

## Release candidate

**Video OS Studio v2.3.0 is product-accepted and release-ready.**

```text
Product version: 2.3.0
Project Schema: 2.0.0
Accepted A7 main: 84e2826164ce6557cd99c4b42006ee703773c882
Release tag: v2.3.0 (pending release-finalization merge and tag verification)
```

V2.3 adds the production Real AI Director / AI Editing Agent above the accepted V2.2 Workflow Runtime. The Agent reads bounded Project / Script / Scene / Selection / Workflow context, calls allow-listed typed tools, creates validated Proposals, requires Review / Diff and explicit user confirmation, and then applies through existing Project / Workflow / Job services rather than bypassing them.

A7 acceptance passed on Windows / Node 24 with real `volcengine-agent-plan / ark-code-latest`, including:

- Talking Head compound Scene + Caption selection → real Agent → scoped Proposal → Review → Apply exactly once → reload/reopen;
- Product Ad real proof/number/CTA → real Agent visual → existing Workflow → final encoded H.264 MP4 at 1920×1080 / 30 fps with ffprobe and extracted-frame proof;
- manual edit → stale Proposal blocked → Re-plan latest → preserve manual edit → Apply exactly once;
- real server restart → Project/Session/history/Proposal state restored → fresh read-only Agent turn sees latest revision with no mutation;
- secret safety, idempotency, duplicate guards, process cleanup and repository integrity.

The live repository source of truth is:

[`PROJECT_STATUS.md`](PROJECT_STATUS.md)

## Product roadmap

```text
V2.1.0
Universal AI-first Editor
        ✅ RELEASED

V2.1.1
Engineering Hardening / Agent-ready Foundation
        ✅

V2.2.0
Workflow Runtime / Generate First Draft
        ✅ RELEASED

V2.3.0
Real AI Director / AI Editing Agent
        ✅ PRODUCT ACCEPTED / RELEASE FINALIZATION
```

## V2.3 delivery sequence

```text
R0 Repository / PRD / Runtime Truth Sync       ✅
A0 Agent Contracts + Provider Abstraction      ✅
A1 Context Builder + Allow-listed Tool Registry ✅
A2 Agent Session Store + Multi-turn Runner     ✅
A3 Production Real Provider Adapter            ✅
A4 AI Workspace Agent UX + Review / Apply      ✅
A5 Agent ↔ Workflow Integration                ✅
A6 Failure / Revision / Retry / Restart Hardening ✅
A7 End-to-End Real Provider Product Acceptance ✅
V2.3.0 Release Finalization                    ← CURRENT
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
→ bounded Project / Script / Scene / Selection / Workflow context
→ production provider / allow-listed tools
→ validated Proposal
→ Review / Diff
→ explicit Apply
→ existing Project / Workflow / Job services
→ latest Project revision
```

Important distinctions:

```text
Source Media != Project Canvas != Export Profile
Project != Workflow != Job
Agent Session != Project
```

## V2.3 accepted capabilities

### Project / durability

- Project Schema `2.0.0`;
- validated Project Commands / Transactions;
- revision/idempotency protection;
- bounded Undo / Redo;
- atomic save/reopen and migrations;
- project-relative asset paths;
- `VIDEO_OS_DATA_ROOT` runtime-data separation.

### Real AI Director / Agent

- provider-neutral Agent Runner with production Volcengine Agent Plan support;
- real provider model `ark-code-latest`;
- bounded Project / Script / Scene / Clip / Selection / Workflow context;
- compound Scene + Clip Studio selection;
- server-side selection propagation into deterministic Rules Director planning;
- allow-listed typed tools with schema validation;
- durable multi-turn Agent Sessions and restart recovery;
- validated visual and Workflow-action Proposals;
- Review / Diff before mutation;
- stale revision blocking and Re-plan latest;
- explicit Apply through existing command/service boundaries;
- cancel/retry and backup self-heal hardening;
- duplicate confirmation / Apply idempotency.

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

## Agent safety model

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
- Workflow actions execute only after explicit confirmation through existing Workflow Runtime;
- Project Schema remains `2.0.0`.

## Development model

Video OS Studio uses two coordinated execution environments with GitHub as the single code source of truth.

### GPT Web + GitHub

Owns:

- architecture / PRDs;
- cloud-safe implementation;
- Agent schemas/provider abstraction/context/tools/session runner;
- branches / PRs / CI;
- unit/API/contract/integration tests;
- cloud-safe browser automation;
- review/merge/current-state truth.

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

Codex pushes only explicitly scoped branch changes and never merges or tags release work unless the release procedure explicitly assigns that action.

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

Cloud CI does not prove live-provider, Windows process, real media, FFmpeg, video-use, HyperFrames, Remotion/Chrome, restart or final encoded-video behavior; those are covered by exact-SHA local acceptance gates.

## Read order before work

1. `PROJECT_STATUS.md`
2. `AGENTS.md`
3. `SYSTEM.md`
4. `docs/prd/Video_OS_Studio_V2_3_Real_AI_Director_Agent_Master_PRD.md`
5. `docs/prd/Video_OS_Studio_V2_3_Development_Plan.md`
6. active local validation contract when required

The `v2.2.0` tag remains immutable release evidence. `v2.3.0` must not be treated as released until the release-finalization PR is merged and the annotated tag is created and verified.