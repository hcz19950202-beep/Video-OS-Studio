<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Video OS Studio Agent Constitution

This repository is developed through two coordinated execution environments:

```text
GPT Web + GitHub
  architecture / cloud-safe code / tests / PR / CI / review / merge

Local Codex on Windows
  real provider credentials / browser / real media / FFmpeg / Remotion / HyperFrames / video-use / restart acceptance
```

GitHub branches and exact commit SHAs are the handoff boundary. Never maintain competing implementations.

## 1. Mandatory boot sequence

Before editing anything, read in order:

1. live GitHub `main`, active branch/PR and CI;
2. `PROJECT_STATUS.md`;
3. this `AGENTS.md`;
4. `SYSTEM.md`;
5. the active Master PRD;
6. the active Development Plan / local validation contract.

For V2.3 the authoritative documents are:

```text
docs/prd/Video_OS_Studio_V2_3_Real_AI_Director_Agent_Master_PRD.md
docs/prd/Video_OS_Studio_V2_3_Development_Plan.md
```

Historical V2.2 documents remain release evidence but do not override current status.

## 2. Architecture invariants

Always preserve:

```text
Source Media != Project Canvas != Export Profile
Project != Workflow != Job
Agent Session != Project
```

And:

- canonical timeline time is frames;
- Project JSON is durable editing truth;
- Workflow state is separate orchestration truth;
- Durable Job state is concrete execution truth;
- Agent session/conversation state is separate orchestration/context state;
- durable Project changes use validated Commands / Transactions / bounded services;
- UI, Agent and Workflow code do not spawn external CLIs directly;
- Agent/Workflow code never hand-edits runtime `project.json`;
- long-running work captures base revision, does external work, reloads latest Project, checks expected revision and applies the minimal validated mutation;
- revision and idempotency contracts are mandatory;
- Remotion is the master renderer;
- HyperFrames remains behind its adapter/service;
- video-use and FFmpeg/ffprobe remain behind adapters/services;
- runtime media/user data remains under `VIDEO_OS_DATA_ROOT`;
- Studio theme/locale remains separate from generated-video Brand;
- Project Schema `2.0.0` and engine pins do not change incidentally;
- `REUSE > MODIFY > CREATE`.

## 3. V2.3 AI safety boundary

The Real AI Director / Editing Agent is an application control layer, not a raw computer agent.

Required mutation path:

```text
User goal
→ bounded context
→ provider + allow-listed typed tools
→ explanation / validated proposal
→ Preview Diff
→ user confirmation
→ existing Command Transaction / bounded service
```

Rules:

- no direct Project mutation from model output;
- no arbitrary shell / PowerShell / bash tool;
- no arbitrary filesystem tool;
- no arbitrary Git tool;
- no arbitrary network-fetch tool;
- no direct engine executable tool;
- provider-generated tool args are untrusted until Zod/schema validation succeeds;
- unknown tools are rejected;
- durable edits require confirmation in V2.3 Core;
- stale proposals cannot silently apply after Project revision changes;
- retry must not duplicate mutations;
- do not expose or persist hidden model chain-of-thought; store/show concise rationale and structured tool/proposal metadata only.

## 4. Provider / secret rules

Core Agent runtime depends on a provider-neutral interface.

Provider-specific API/SDK details stay inside the provider adapter.

API keys/secrets:

```text
.env.local / server runtime only
```

Never put them in:

- Project JSON;
- Agent session JSON;
- browser/client bundle;
- repository files;
- test snapshots;
- logs/errors returned to users.

Provider/model settings are runtime/user configuration, not durable generated-video Project semantics.

## 5. Agent context rules

Use a bounded Context Builder over existing truth:

- Project ID/revision/canvas;
- Script/selected Script range;
- Scene/selected Scene;
- selected Clip(s);
- Brand/Linked Styles;
- visual-plan summary;
- Workflow status/reviews;
- Project asset metadata.

Do not send arbitrary repository/filesystem content. Do not automatically send raw media bytes. Prefer logical IDs and project-relative paths over machine-specific absolute paths.

## 6. Agent tool registry

Tool Registry is an allow-list with stable IDs and Zod input/output schemas.

Tool classes:

```text
read
proposal
mutating-request
```

Proposal tools produce validated proposals, not direct durable mutation.

Mutating requests use accepted application services and explicit confirmation/revision/idempotency rules.

The existing Rules Director (`VisualPlanService` / `RulesVisualPlannerAdapter`) is reused as deterministic baseline/fallback/tool; do not fork another visual planning truth.

## 7. Session persistence

Agent sessions persist outside `project.json` using a dedicated runtime repository/service under `VIDEO_OS_DATA_ROOT` and accepted path-safety/atomic-write patterns.

Session data may include normalized messages, tool calls/results, proposal refs, provider/model metadata without secrets, usage summary, status and errors.

Project Schema remains `2.0.0` by default. Any schema change requires an explicit migration decision/workstream.

## 8. Workflow runtime rules

The accepted Workflow architecture remains:

```text
WorkflowRun
→ registered Stage
→ existing Job / Service / Command / Transaction
```

The Agent may inspect/request Workflow actions through bounded services. It may not edit Workflow JSON, invent Stage completion, bypass reviews, spawn engines, or implement a second Job system.

## 9. Development ownership

### GPT Web + GitHub

May and should continue without stopping through all cloud-safe work:

- PRD/architecture;
- schemas/contracts;
- provider abstraction;
- context/tool registry;
- deterministic session/runner implementation;
- provider adapter mocked tests;
- APIs/UI/browser automation supported by CI;
- unit/contract/integration tests;
- PR/CI review/fixes/merge;
- current-state documentation.

Do not claim local/live-provider/Windows/media/engine evidence without exact-SHA proof.

### Local Codex on Windows

Is used only when correctness genuinely depends on:

- live provider API key/network behavior;
- real browser interaction;
- real media/codecs;
- FFmpeg/ffprobe;
- video-use/Python;
- HyperFrames;
- Remotion/Chrome;
- Windows process/restart behavior;
- final encoded-video evidence.

Codex works on the same active branch, pushes in-scope fixes, never merges, and never begins the next workstream.

## 10. Branch / PR discipline

One workstream = one branch/PR.

V2.3 sequence/examples:

```text
planning/v2.3-real-ai-agent
feature/v2.3-a0-agent-contracts
feature/v2.3-a1-context-tools
feature/v2.3-a2-agent-runtime
feature/v2.3-a3-real-provider
feature/v2.3-a4-agent-workspace
feature/v2.3-a5-agent-workflow
feature/v2.3-a6-agent-hardening
release/v2.3-final-acceptance
```

Rules:

- branch from currently accepted `main`;
- no product development directly on `main`;
- do not mix workstreams;
- after every pushed fix batch, verify CI for exact HEAD;
- merge only after cloud and required local gates pass;
- update `PROJECT_STATUS.md` before the next workstream starts.

The experimental `feature/v2.2-w55-workflow-template` is not an implementation base for V2.3.

## 11. Project mutation rules

Never introduce a whole-Project mutation shortcut.

Long-running mutation-capable work:

```text
capture deterministic input + baseProjectRevision
→ run provider/external work
→ reload latest Project
→ expectedRevision check
→ apply minimal validated Command / Transaction
→ save latest revision
```

Same confirmed operation retry uses a stable operation ID.

No duplicate captions/motion/B-roll/assets/styles/script edits/operations.

## 12. Testing rules

Cloud baseline:

```text
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

When browser flows change:

```text
npm run test:e2e
```

Every reasonably testable bug fix needs a regression test.

Provider work requires deterministic/mock contract tests before live-provider validation.

## 13. V2.3 workstream gates

```text
R0  docs/runtime truth only — online
A0  contracts/provider abstraction — online
A1  context/tools — online
A2  session/multi-turn runner — online first
A3  real provider — cloud mocked tests, then live-provider Codex gate
A4  Agent UX/review/apply — cloud browser first, then real browser/provider Codex gate
A5  Agent↔Workflow — online first; local only when real runtime evidence required
A6  hardening/restart — online chaos first + mandatory local restart cases
A7  final product acceptance — mandatory local real provider/browser/media/encoded output
```

Online work does not pause before the first genuinely mandatory Codex gate.

## 14. Handoff contract

Every GPT Web → Codex handoff includes:

```text
Repository
Branch
Exact SHA
Active workstream
Goal
Allowed files/areas
Forbidden scope
Setup / isolated VIDEO_OS_DATA_ROOT
Commands
Real-provider/media fixtures
Manual steps
Acceptance gates
Evidence
Stop rule after any pushed fix
Expected return format
```

If Codex pushes code/config/test/runtime changes, the frozen SHA is invalid. GPT Web must review the new HEAD and CI before local validation continues.

## 15. Release boundary

V2.2.0 tag `v2.2.0` is immutable and must never move.

Do not bump a V2.3 package release version until the final acceptance/release workstream explicitly begins.
