# Video OS Studio

Video OS Studio is a local-first AI-native video production workspace.

## Current release

**Video OS Studio v2.3.0 is released.**

```text
Product version: 2.3.0
Project Schema: 2.0.0
Accepted A7 main: 84e2826164ce6557cd99c4b42006ee703773c882
Release commit: 562ffb26d5a04bd2898513893258f857187a00b4
Release tag: v2.3.0 (annotated, verified)
Tag object: 24069497b1986348510ef0d904382f5c3f99855d
```

V2.3 adds the production Real AI Director / AI Editing Agent above the accepted V2.2 Workflow Runtime. The Agent reads bounded Project / Script / Scene / Selection / Workflow context, calls allow-listed typed tools, creates validated Proposals, requires Review / Diff and explicit user confirmation, and then applies through existing Project / Workflow / Job services rather than bypassing them.

A7 acceptance passed on Windows / Node 24 with real `volcengine-agent-plan / ark-code-latest`, including:

- Talking Head compound Scene + Caption selection → real Agent → scoped Proposal → Review → Apply exactly once → reload/reopen;
- Product Ad real proof/number/CTA → real Agent visual → existing Workflow → final encoded H.264 MP4 at 1920×1080 / 30 fps with ffprobe and extracted-frame proof;
- manual edit → stale Proposal blocked → Re-plan latest → preserve manual edit → Apply exactly once;
- real server restart → Project/Session/history/Proposal state restored → fresh read-only Agent turn sees latest revision with no mutation;
- secret safety, idempotency, duplicate guards, process cleanup and repository integrity.

The final release candidate passed GitHub Actions Run #706 / `33098478140` across Ubuntu Verify, Windows Verify, Browser Smoke and Windows Media Smoke before PR #51 merged. The annotated `v2.3.0` tag dereferences exactly to the release commit above.

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
        ✅ RELEASED
```

## V2.3 delivery sequence

```text
R0 Repository / PRD / Runtime Truth Sync        ✅
A0 Agent Contracts + Provider Abstraction       ✅
A1 Context Builder + Allow-listed Tool Registry ✅
A2 Agent Session Store + Multi-turn Runner      ✅
A3 Production Real Provider Adapter             ✅
A4 AI Workspace Agent UX + Review / Apply       ✅
A5 Agent ↔ Workflow Integration                 ✅
A6 Failure / Revision / Retry / Restart Hardening ✅
A7 End-to-End Real Provider Product Acceptance  ✅
V2.3.0 Release Finalization                     ✅
Release tag v2.3.0                              ✅ VERIFIED
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

Local serving is loopback-only by default:

```bash
npm run dev
npm run start
```

Both commands bind `127.0.0.1`. Network exposure is explicit:

```bash
npm run dev:remote
npm run start:remote
```

The remote entrypoints bind `0.0.0.0` and should only be used on a trusted network. Remotion and Workflow asset fetches use `VIDEO_OS_ASSET_BASE_URL`; non-loopback asset origins additionally require the explicit `VIDEO_OS_ALLOW_REMOTE_ASSET_ORIGIN=1` opt-in.

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
4. active approved PRD / development plan for the next workstream
5. active local validation contract when required

The `v2.3.0` annotated tag is the immutable current release boundary. The `v2.2.0` tag remains immutable previous-release evidence. No V2.4 workstream is active until a new approved PRD/workstream is opened from the released V2.3.0 baseline.