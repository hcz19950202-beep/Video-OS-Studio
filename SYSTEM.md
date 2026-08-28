# Video OS Studio System Contract

## Product boundary

Video OS Studio is a local-first AI-native video production system focused on talking-head and product-ad creation. It is not a general-purpose Premiere/After Effects clone.

V2.3.1 is the immutable released baseline. V2.4 adds a Production Mission / Autonomous Production Agent layer above the accepted semantic editor, Real AI Director, Workflow Runtime, Durable Jobs and engine services.

V2.4 must extend the accepted system without replacing validated Project, Workflow, Job, Agent, media, render, path-safety, persistence or workstation foundations.

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

The accepted V2.3 Agent control layer remains:

```text
User Editing Goal
↓
Agent Session
↓
Bounded Context
↓
Provider + Allow-listed Tools
↓
Validated Proposal / Request
↓
Review / Autonomy Policy
↓
Command Transaction / bounded Service
↓
Project / Workflow / Job truth
```

V2.4 adds production orchestration above it:

```text
User Production Goal
↓
Production Mission
↓
Production Plan / Step Graph
↓
Agent + Asset Intelligence + Video Skills
↓
Workflow / Durable Jobs / Project Services
↓
Actual Rendered Output
↓
Self-QA
↓
Bounded Repair / Checkpoint
↓
Final Review / Complete
```

## Durable truth boundaries

Always preserve:

```text
Source Media != Project Canvas != Export Profile
Project != Workflow != Job
Agent Session != Project
Mission != Project
Mission != Workflow
QA Report != Project
```

- `project.json` is durable editing truth.
- Workflow durable state is orchestration truth outside Project JSON.
- Durable Job state represents concrete long-running execution.
- Agent Session is conversational/tool orchestration state.
- Production Mission is a production objective/state machine.
- Production Plan is intended execution order, not proof that execution occurred.
- QA Report is derived evaluation/evidence, not Project truth.
- Project Schema remains `2.0.0` by default in V2.4.

## Mission boundary

Mission persistence lives outside Project JSON in a dedicated repository/service under `VIDEO_OS_DATA_ROOT`.

Mission may reference:

- Project/revision;
- Agent Session/turn;
- Proposal/Apply operation;
- WorkflowRun;
- Durable Job;
- Asset analysis;
- Skill/version;
- QA Report.

Mission must not duplicate those systems' durable state.

Mission advancement requires accepted evidence. Model text alone cannot mark a Job, Workflow stage or Project mutation complete.

Cancellation must prevent future autonomous advancement.

## Production Plan boundary

Production Plan is schema-validated intent with explicit:

```text
step ID
step kind
dependencies
execution owner
risk
status
evidence references
base Project revision
```

Plans may be generated with provider reasoning, but normalized application schemas own valid step kinds and semantics.

Stale mutation-dependent plans fail closed or re-plan; they do not silently apply to newer Project truth.

## Durable mutation boundary

UI, Rules Director, Real Agent and Production Mission must not mutate durable Project state arbitrarily.

All durable Project changes flow through:

```text
UI / Agent / Mission
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

One logical Apply should remain one logical undoable transaction where the command model supports it.

## Controlled autonomy boundary

V2.4 may approve narrowly-scoped autonomous execution modes, but autonomy is policy—not generic computer access.

Even the highest autonomy mode follows:

```text
Mission/Agent decision
↓
application-owned risk policy
↓
typed allow-listed tool/service
↓
revision/idempotency check
↓
accepted Project / Workflow / Job path
```

Never:

```text
Mission/Agent
→ arbitrary shell/filesystem/network/Git
→ raw project.json / workflow JSON mutation
```

The model/provider cannot self-authorize unrestricted actions or downgrade application-owned risk classification.

Human-modified/locked/protected work must not be silently overwritten.

## Canonical timing

Internal Project timing remains frame-based.

- Script word timing: frames
- Scene boundaries: frames
- Marker positions: frames
- Timeline clip timing: frames
- Mission/Plan references to Project positions: logical IDs + frame-based Project truth
- external seconds/transcript timestamps: converted at adapter seams only

There must never be competing canonical second-based and frame-based timelines.

## Agent provider boundary

Core Agent runtime remains provider-neutral.

Provider-specific HTTP/SDK semantics, model IDs, authentication and error normalization remain inside adapters.

Secrets:

```text
.env.local / server runtime only
```

Never persist provider secrets in:

- Project JSON;
- Mission/Plan/QA persistence;
- Agent session transcripts;
- browser bundles;
- repository files;
- public logs/errors.

Provider output is untrusted until application schema validation succeeds.

## Agent context boundary

The Agent receives bounded application context assembled from accepted structures such as:

- Mission goal/current step;
- Project ID/revision/canvas;
- Script / selected Script range;
- Scene / selected Scene;
- selected Clip(s);
- Brand / Linked Style summary;
- visual plan summary;
- Workflow status/reviews;
- Project asset metadata/derived intelligence;
- available Skill summaries;
- latest QA findings when relevant.

Do not grant arbitrary filesystem/repository access. Do not automatically upload raw media. Prefer logical IDs/project-relative paths over machine-specific absolute paths.

## Agent tool boundary

Agent tools remain a typed allow-list.

V2.4 may add tools for:

```text
Mission/Plan read
Asset semantic search
Skill discovery
QA read/request
repair proposal
bounded Workflow/render request
```

Forbidden:

```text
raw shell / PowerShell / bash
arbitrary filesystem read/write
arbitrary Git operations
arbitrary unrestricted network fetch
raw project.json write
direct FFmpeg / Remotion / HyperFrames / video-use process spawn
```

Unknown tools and malformed arguments are rejected before execution.

## Asset Intelligence boundary

Asset Intelligence is derived metadata/indexing over accepted Project assets.

Derived metadata:

- may become stale;
- needs provenance/versioning;
- must invalidate when underlying asset identity/content changes;
- must not become a competing media source of truth;
- must not expose unnecessary local paths;
- must not imply automatic raw-media upload to remote providers.

## Video Skill boundary

Video Skills are typed, declarative, versioned reusable production recipes.

Skills may reference accepted application components/services/recipes but cannot contain arbitrary provider-generated executable code.

Skill usage should be auditable by stable Skill ID/version.

`REUSE > MODIFY > CREATE` applies to Skills, components and assets.

## Self-QA boundary

QA must use actual durable/rendered evidence where output correctness is claimed.

QA categories may include:

```text
technical
content
visual
brand
goal/marketing alignment
```

QA findings may produce bounded repair proposals/steps.

Repair still follows normal revision/autonomy/mutation rules and has explicit retry/repair budgets. QA cannot become a direct mutation shortcut or infinite self-repair loop.

## Workflow / Job responsibilities

Accepted runtime remains:

```text
WorkflowRun
→ registered Stage
→ existing Durable Job / Service / Command / Transaction
```

Mission says desired production outcome.
Plan says intended sequence.
Workflow says durable orchestration.
Job says concrete long-running execution.
Project says durable edit result.

Mission/Agent may inspect/request actions through bounded services but may not edit Workflow JSON, spoof Stage completion, bypass reviews, spawn engines or introduce a second Job runtime.

## Long-running work contract

Any long-running Mission/Agent/tool work that may lead to Project mutation follows:

```text
capture deterministic input + baseProjectRevision
→ run provider/external work
→ reload latest Project
→ expectedRevision check
→ apply minimal validated Command / Transaction
→ persist latest revision
```

Retry uses stable operation IDs and must not duplicate Project mutations, Job requests or Mission evidence.

## Mission execution / restart contract

Mission execution must be restart-safe:

- durable Mission/Plan step status;
- bounded retry counts;
- explicit active/waiting/blocked/completed states;
- evidence references;
- no re-execution of already-completed non-idempotent work;
- no autonomous continuation after cancellation;
- interrupted active Jobs use accepted Durable Job recovery semantics.

## Engine responsibilities

Accepted pins/roles remain:

- **Remotion 4.0.513** — Player and final master composition/render.
- **HyperFrames 0.8.10** — deterministic complex motion behind adapter/service.
- **video-use** — transcription, rough-cut preparation and QA behind adapter/service.
- **FFmpeg / ffprobe** — local media probing/processing behind adapter/service.
- **Playwright 1.62.1** — browser acceptance.

UI/Agent/Mission/Workflow components never spawn engine CLIs directly.

## Persistence and paths

Repository code and local runtime/video data remain separated by `VIDEO_OS_DATA_ROOT`.

Project files store logical asset IDs and project-relative POSIX paths, never machine-specific absolute paths.

Project/session/mission/plan/qa/workflow/job persistence uses validated safe paths and accepted atomic-write/recovery patterns appropriate to each repository.

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
9. `MISSION VERIFIED`
10. `QA / REPAIR VERIFIED`
11. `AUTONOMY POLICY VERIFIED`

GitHub CI proves cloud/repository behavior. Real provider, Windows browser/process behavior, real media/codecs, FFmpeg, video-use, HyperFrames, Remotion/Chromium, restart recovery and final encoded-video correctness require exact-SHA local evidence when named by the active workstream.

## Authoritative V2.4 docs

```text
docs/prd/Video_OS_Studio_V2_4_Autonomous_Production_Agent_Master_PRD.md
docs/prd/Video_OS_Studio_V2_4_Development_Plan.md
```

## Immutable release boundary

`v2.3.1` remains immutable:

```text
release commit: 6e07d1dbdd0ec4d64d022f7c821e133ddf207637
annotated tag object: b91d0c3adbaef09cd5c323481ec6bb04c516dd6e
```

V2.4 must not rewrite historical V2.3.1 acceptance/release truth.
