# Video OS Studio System Contract

## Product boundary

Video OS Studio is a local-first AI-native video editor focused on talking-head and product-ad production. It is not a general-purpose Premiere/After Effects clone.

V2.2.0 is the accepted released baseline. V2.3 adds a Real AI Director / multi-turn AI Editing Agent above the accepted semantic editor, Workflow Runtime, Durable Jobs and engine services. It must extend the baseline without replacing validated media, render, adapter, path-safety, persistence or workstation foundations.

## Product abstraction

The accepted editing abstraction remains:

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

V2.3 adds conversational orchestration above it:

```text
User Goal
↓
Agent Session
↓
Bounded Context
↓
Provider + Allow-listed Tools
↓
Explanation / Proposal
↓
Review / Diff / User Confirm
↓
Validated Command Transaction / bounded Service
↓
Project / Workflow / Job truth
```

## Durable truth boundaries

Always preserve:

```text
Source Media != Project Canvas != Export Profile
Project != Workflow != Job
Agent Session != Project
```

- `project.json` is the durable Project editing source of truth.
- Workflow durable state is orchestration state outside Project JSON.
- Durable Job state represents concrete long-running execution tasks.
- Agent session/conversation state is orchestration/context history and does not become Project state.
- Project Schema remains `2.0.0` by default in V2.3.

## Durable mutation boundary

UI, Rules Director and Real Agent must not mutate durable Project state arbitrarily.

All durable Project changes flow through:

```text
UI / AI
↓
Validated Project Command or bounded Service
↓
Validation
↓
History Transaction when applicable
↓
Expected revision / idempotency guard
↓
Project State
↓
Atomic persistence
```

AI batch changes must be reviewable. One logical Apply should become one logical undoable transaction where the existing command model supports it.

If a proposal was generated against revision N and the Project is now revision N+1, the proposal is stale and must not silently apply.

## Canonical timing

Internal project timing is frame-based.

- Script word timing: frames
- Scene boundaries: frames
- Marker positions: frames
- Timeline clip timing: frames
- Workflow stage/project snapshots: Project revision + frame-based Project truth
- external seconds/transcript/EDL timestamps: converted only at adapter seams

There must never be competing canonical second-based and frame-based timelines.

## Agent provider boundary

Core Agent runtime depends on a provider-neutral adapter.

Provider-specific HTTP/SDK semantics, model identifiers, authentication and error mapping stay inside the provider adapter.

Secrets:

```text
.env.local / server runtime only
```

Never persist provider API keys in:

- Project JSON;
- Agent session transcripts;
- browser bundles;
- repository files;
- public logs/errors.

Provider output is untrusted until validated by application schemas.

## Agent context boundary

The Agent receives bounded application context assembled from accepted structures such as:

- Project ID/revision/canvas;
- Script / selected Script range;
- Scene / selected Scene;
- selected Clip(s);
- Brand / Linked Style summary;
- existing visual plan summary;
- Workflow status/reviews;
- Project asset metadata.

Do not grant arbitrary filesystem access. Do not automatically upload raw media bytes. Do not expose machine-specific absolute paths when logical/project-relative identifiers are sufficient.

## Agent tool boundary

Agent tools are a typed allow-list.

Allowed categories:

```text
read context
produce validated proposals
preview diff
request bounded application/workflow actions
```

Forbidden:

```text
raw shell / PowerShell / bash
arbitrary filesystem read/write
arbitrary Git operations
arbitrary network fetch
raw project.json write
direct FFmpeg / Remotion / HyperFrames / video-use process spawn
```

Unknown tool IDs and malformed arguments are rejected before execution.

## AI safety / product behavior

The accepted Rules Director principle remains mandatory for the Real Agent:

```text
Analyze
↓
Suggest / Explain
↓
Validated Proposal
↓
Change Preview / Diff
↓
User confirmation
↓
Validated Command Transaction / bounded Service
```

Read-only reasoning/tool calls may execute without confirmation. Durable edits require confirmation in V2.3 Core unless a later narrowly-scoped automation mode is separately approved.

Do not expose hidden chain-of-thought. The UI may show concise rationale, action summaries, tool status and structured evidence.

## Rules Director reuse

`VisualPlanService` and `RulesVisualPlannerAdapter` remain the deterministic visual-planning baseline and fallback.

The Real Agent may invoke/reason over that existing service through a bounded tool, but V2.3 must not create a second visual-planning truth.

## Workflow / Job responsibilities

The V2.2 runtime remains:

```text
WorkflowRun
→ registered Stage
→ existing Durable Job / Service / Command / Transaction
```

The Agent may inspect or request Workflow actions through accepted application services. It must not edit Workflow JSON, invent Stage completion, bypass review checkpoints, spawn engines directly or introduce a second Job system.

## Long-running work contract

Any long-running Agent/tool work that may lead to a Project mutation follows:

```text
capture deterministic input + baseProjectRevision
→ run provider/external work
→ reload latest Project
→ expectedRevision check
→ apply minimal validated Command / Transaction
→ persist latest revision
```

Retry uses stable operation IDs and must not duplicate captions, motion, B-roll, assets, script edits, styles or other mutations.

## Session persistence

Agent sessions persist outside Project JSON using a dedicated runtime repository/service under `VIDEO_OS_DATA_ROOT` and existing path-safety/atomic-write patterns.

Session persistence may contain normalized messages, tool calls/results, proposals, provider/model metadata without secrets, usage summaries and errors. It must not persist hidden model reasoning.

## Engine responsibilities

Accepted pins/roles remain:

- **Remotion 4.0.513** — interactive Player and final master composition/render.
- **HyperFrames 0.8.10** — deterministic parameterized complex motion behind adapter/service.
- **video-use** — transcription, rough-cut preparation and QA behind adapter/service.
- **FFmpeg / ffprobe** — local media probing/processing behind adapter/service.
- **Playwright 1.62.1** — browser acceptance.

UI/Agent/Workflow components never spawn engine CLIs directly.

## Persistence and paths

Repository code and local runtime/video data remain separated by `VIDEO_OS_DATA_ROOT`.

Project files store logical asset IDs and project-relative POSIX paths, never machine-specific absolute paths.

Project/session/workflow/job persistence must use validated safe paths and atomic-write/recovery patterns appropriate to their existing repositories.

## Verification gates

Report independently as applicable:

1. `CODE COMPLETE`
2. `CLOUD VERIFIED`
3. `LOCAL VERIFIED`
4. `PRD ACCEPTED`
5. `LIVE PROVIDER VERIFIED`
6. `RENDER VERIFIED`
7. `VISUAL ACCEPTED`
8. `RESTART / RECOVERY VERIFIED`

GitHub CI proves cloud/repository behavior. Real provider credentials/network, Windows browser/process behavior, real media/codecs, FFmpeg, video-use, HyperFrames, Remotion/Chrome, restart recovery and final encoded-video correctness require exact-SHA local evidence when named by the active workstream.

## Authoritative V2.3 docs

```text
docs/prd/Video_OS_Studio_V2_3_Real_AI_Director_Agent_Master_PRD.md
docs/prd/Video_OS_Studio_V2_3_Development_Plan.md
```
