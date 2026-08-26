# Video OS Studio V2.3 — Real AI Director / AI Editing Agent Master PRD

> Status: authoritative planning contract for V2.3.
>
> Repository: `hcz19950202-beep/Video-OS-Studio`
>
> V2.2.0 immutable release tag: `v2.2.0`
>
> V2.2.0 release commit: `0e813e5e1360318211e05c1c5fec5eb82be00224`
>
> V2.3 planning baseline main: `85adebdac436b33b3a737536f32363bfc8e22465`
>
> Project Schema remains `2.0.0` unless a later explicit migration decision is approved.

---

# 1. Product Goal

V2.2 made Video OS Studio a durable, reviewable video-production workflow. V2.3 adds a production Real AI Director / multi-turn AI Editing Agent **above** that accepted editor/runtime instead of replacing it.

The target interaction is:

```text
User editing goal
→ Agent understands Project / Script / Scene / Selection / Workflow context
→ Agent reasons over allow-listed capabilities
→ Agent proposes edits or workflow actions
→ User can inspect explanation + diff
→ User confirms
→ Existing Commands / Transactions / Services execute
→ Project revision advances safely
→ Conversation continues against the latest Project truth
```

The user should be able to use natural language for editing tasks such as:

```text
“把开头 8 秒更有冲击力，但不要太花。”
“这段 15 天、30 天、4 个人的数据做得更像广告证据。”
“把当前 Scene 的字幕简化，B-roll 少一点。”
“重新规划这一段视觉，但保留我刚才手动调过的卡片。”
“解释你准备改什么，先不要应用。”
```

V2.3 is successful only if the AI becomes a safe editing control layer over the accepted semantic editor, Visual Planner, Workflow Runtime, Durable Jobs, media services and render pipeline.

---

# 2. Non-Goals

V2.3 does **not** build:

- a second Project model;
- a second Workflow engine;
- a second Durable Job system;
- an autonomous shell / filesystem coding agent;
- arbitrary command execution;
- direct AI writes to `project.json`;
- cloud collaboration;
- a generated-media marketplace;
- a Premiere / After Effects clone;
- a new Timeline truth;
- a Project Schema migration by default;
- replacement Remotion / HyperFrames / video-use / FFmpeg runtimes;
- hidden edits without Review / Apply semantics;
- a provider-specific architecture that cannot support another provider later.

The abandoned V2.2 experimental workflow-template branch is not part of V2.3 baseline and must not be merged by default.

---

# 3. Accepted Baseline to Reuse

V2.3 MUST reuse the V2.2.0 accepted architecture.

## 3.1 Semantic editing truth

```text
Words
→ Meaning
→ Scene
→ Visual Decision
→ Clip
→ Render
```

Existing first-class structures include:

- word-level Script;
- Scenes and semantic types;
- Markers;
- Generated Video Brand;
- Linked Styles;
- Canvas / Timeline V2;
- Project Commands / Transactions;
- revision / idempotency safeguards.

## 3.2 Existing Rules Director

The current `VisualPlanService` and `RulesVisualPlannerAdapter` are an accepted deterministic planning baseline.

Existing safety flow already expresses the correct mutation philosophy:

```text
Analyze
→ Suggest
→ Explain
→ Preview Diff
→ User Confirm
→ Command Transaction
```

V2.3 extends this pattern to a Real AI Provider and multi-turn editing, rather than bypassing it.

## 3.3 Workflow / Job runtime

V2.2 already provides:

```text
WorkflowRun
→ registered Stage
→ existing Durable Job / Service / Command / Transaction
```

V2.3 may request or inspect workflow operations through bounded application services, but does not redefine Workflow or Job durability.

## 3.4 Engines

Accepted engine roles remain:

- Remotion `4.0.513` — Player / master composition / final render;
- HyperFrames `0.8.10` — deterministic complex motion behind adapter/service;
- video-use — transcription / rough-cut / QA behind adapter/service;
- FFmpeg / ffprobe — media processing/probing behind adapter/service;
- Playwright `1.62.1` — browser acceptance.

---

# 4. Permanent Architecture Invariants

Always preserve:

```text
Source Media != Project Canvas != Export Profile
Project != Workflow != Job
```

And:

1. Project JSON remains durable editing truth.
2. Canonical internal time remains frames.
3. Agent state is not Project state.
4. Conversation/session persistence must not become a competing Project source of truth.
5. Durable Project changes flow through existing Commands / Transactions / bounded Services.
6. Agent code never hand-edits runtime `project.json`.
7. Agent / UI never spawns engine CLIs directly.
8. Long-running work captures a base Project revision, performs work, reloads latest Project, checks expected revision and applies the minimal validated mutation.
9. Operation IDs remain idempotent across retry/recovery.
10. Remotion remains the master renderer.
11. `REUSE > MODIFY > CREATE`.

---

# 5. V2.3 Core Architecture

V2.3 introduces six bounded layers:

```text
AI Workspace UI
      ↓
Agent Session Service
      ↓
Agent Runner
      ↓
Provider Adapter  ↔  Tool Registry
      ↓                 ↓
Model response       Existing app services
      ↓                 ↓
Validated Proposal / Tool Result
      ↓
Review / Diff / User Confirm
      ↓
Command Transaction / bounded Service
      ↓
Project / Workflow / Job truth
```

## 5.1 Provider Adapter

Core code MUST depend on a provider-neutral interface, not directly on one vendor SDK.

Conceptual contract:

```ts
type AIProviderRequest = {
  system: string;
  messages: AgentMessage[];
  tools: AgentToolDefinition[];
  model?: string;
  maxOutputTokens?: number;
};

type AIProviderEvent =
  | { type: "text-delta"; text: string }
  | { type: "tool-call"; call: AgentToolCall }
  | { type: "completed"; usage?: AgentUsage }
  | { type: "error"; error: AgentProviderError };

interface AIProvider {
  readonly id: string;
  run(request: AIProviderRequest, signal?: AbortSignal): AsyncIterable<AIProviderEvent>;
}
```

Requirements:

- typed tool calls;
- schema validation before execution;
- cancellation;
- timeout handling;
- normalized provider errors;
- no API key persisted into Project / session transcript / public logs;
- deterministic mock provider for unit/integration tests.

The first production provider may use a current tool-calling/structured-output API, but vendor-specific request/response details remain isolated inside its adapter.

## 5.2 Agent Context Builder

The Agent must receive a bounded, explicit context snapshot rather than arbitrary repository or filesystem access.

Context sources may include:

```text
Project metadata / revision
Canvas
Workflow scenario + starter prompt
Selected Scene
Selected Script range
Selected Clip(s)
Scene summaries / semantic types
Relevant Script words
Brand / Linked Style summary
Relevant Timeline clips
Visual Plan summary
Workflow status / review checkpoint status
Available local Project assets as metadata
```

Rules:

- context includes logical/project-relative identifiers, not machine-specific absolute paths;
- raw media bytes are not sent automatically;
- full Project JSON is not blindly sent when a bounded context is sufficient;
- context snapshot records `baseProjectRevision`;
- context size must be bounded and deterministic enough for tests;
- selection remains the existing Studio selection truth.

## 5.3 Tool Registry

The Agent receives an **allow-list**, not generic code execution.

Initial tool families:

### Read-only tools

- `get_project_context`
- `get_scene_context`
- `get_script_range`
- `get_selection_context`
- `get_visual_plan_summary`
- `get_workflow_status`

### Proposal tools

- `propose_visual_plan`
- `propose_script_edit`
- `propose_scene_edit`
- `propose_brand_or_style_change`
- `propose_clip_changes`

### Bounded orchestration tools

- `preview_proposal_diff`
- `request_workflow_action`
- `request_render` only through accepted render service/job path when explicitly user-confirmed or allowed by the active UX contract.

Forbidden tools:

- raw shell;
- raw PowerShell/bash;
- arbitrary filesystem read/write;
- arbitrary Git operations;
- arbitrary network fetch;
- raw Project JSON write;
- direct FFmpeg / Remotion / HyperFrames / video-use executable invocation.

Each tool definition MUST have:

```text
stable ID
input Zod schema
output Zod schema
read-only / proposal / mutating classification
revision requirements
idempotency behavior
human-confirmation requirement
error contract
```

## 5.4 Proposal Model

AI output that could change durable Project state must become a proposal before mutation.

Conceptual shape:

```ts
type AgentProposal = {
  id: string;
  sessionId: string;
  projectId: string;
  baseProjectRevision: number;
  title: string;
  summary: string;
  rationale: string[];
  operations: AgentProposedOperation[];
  warnings: string[];
  createdAt: string;
  status: "draft" | "reviewed" | "applied" | "rejected" | "stale";
};
```

A proposal MUST NOT contain arbitrary executable code.

Proposal operations resolve into existing Project Commands / Transactions or bounded service requests.

## 5.5 Review / Apply Boundary

Default mutation flow:

```text
Agent proposes
→ app computes validated preview/diff
→ user reviews
→ user applies selected/all changes
→ expectedRevision check
→ one logical Command Transaction where appropriate
→ latest Project saved
→ session receives resulting revision
```

The Agent may perform read-only reasoning and tool calls without confirmation.

Any durable edit requires explicit confirmation unless a future narrowly-scoped automation mode is separately approved. V2.3 Core does not silently enable autonomous writes.

If Project revision changes after proposal generation:

```text
proposal.baseProjectRevision != current revision
→ proposal becomes stale
→ do not apply
→ rebuild context / re-plan
```

No silent rebase of destructive edits.

## 5.6 Agent Sessions

A session is conversation/orchestration state, not Project state.

Persist sessions outside `project.json`, under runtime data owned by a dedicated repository/service, for example:

```text
VIDEO_OS_DATA_ROOT/
  projects/<projectId>/edit/agent/
    sessions/<sessionId>.json
```

The exact path may follow existing ProjectRepository conventions, but the semantic rule is fixed: **no Project Schema change is required for Agent chat history.**

Session data may persist:

- session ID;
- project ID;
- messages;
- bounded context references;
- provider/model metadata without secrets;
- tool calls/results;
- proposal references;
- usage summary;
- status;
- timestamps.

Session persistence must support reopen/reload and safe recovery from incomplete turns.

---

# 6. Agent Runtime Rules

## 6.1 Turn loop

A turn follows:

```text
capture latest Project revision + context
→ provider request
→ validate provider event
→ execute read-only/allowed tool call
→ append normalized result
→ continue provider turn
→ produce answer/proposal
→ persist session atomically
```

## 6.2 Budgets

Each turn must have bounded configuration for:

- max provider round trips;
- max tool calls;
- max wall-clock time;
- max context size;
- max output tokens where provider supports it;
- cancellation signal.

Budget exhaustion becomes a recoverable Agent error, not an infinite loop.

## 6.3 Failure behavior

Provider timeout/network/rate-limit/invalid-output failures must:

- leave Project unchanged;
- preserve a useful session error state;
- never persist API secrets;
- allow safe retry;
- avoid duplicate mutating operations.

## 6.4 Idempotency

Mutating tool execution must use a stable operation ID derived from the approved proposal/apply action, not a fresh ID on every retry.

Retry of the same confirmed Apply must not duplicate:

- captions;
- motion;
- B-roll;
- assets;
- styles;
- script edits;
- Project operations.

---

# 7. Real Provider Requirements

The production provider layer must support:

- tool/function calling;
- structured arguments or strict schema validation;
- streaming text/events where practical;
- abort/cancel;
- provider usage metadata when available;
- model configured through environment/runtime settings rather than Project JSON.

Secrets:

```text
.env.local only
→ runtime server-side adapter
→ never browser bundle
→ never Project JSON
→ never committed
```

`.env.example` may document variable names with empty values only.

The first live-provider workstream must verify the current provider API contract at implementation time rather than relying on stale examples.

---

# 8. AI Workspace UX

V2.3 MUST extend the accepted `AIWorkspacePanel` instead of replacing Studio.

Target modes:

```text
AI Workspace
├─ Agent
├─ Composer / Rules Director
└─ Workflow
```

The user can:

- start/reopen an Agent session for the current Project;
- type natural-language goals;
- see which context is attached (`@Scene`, `@Clip`, `@Transcript`, Project);
- see concise tool/action progress;
- receive explanations and proposed changes;
- inspect a structured Diff / Review surface;
- Apply / Apply Selected / Reject;
- continue conversation against the resulting revision;
- cancel an active turn;
- recover the session after reload.

The UI must distinguish:

```text
Thinking / reading context
Tool activity
Proposal ready
Waiting for user confirmation
Applying
Applied
Stale proposal
Provider error
Cancelled
```

Do not expose raw chain-of-thought. Show concise action rationale and tool/proposal summaries only.

---

# 9. Rules Director Coexistence

The existing deterministic Rules Director remains valuable for:

- fallback when no live provider is configured;
- deterministic tests;
- fast visual planning;
- an allow-listed Agent tool.

V2.3 should make the relationship explicit:

```text
Real Agent
→ may call existing Rules Director / VisualPlanService
→ may explain/refine/select its suggestions
→ still uses existing preview/apply safety chain
```

Do not fork a second visual planning truth.

---

# 10. Workflow Integration

The Agent may interact with V2.2 Workflow Runtime only through bounded services.

Examples:

- inspect current WorkflowRun;
- explain failed/current Stage;
- propose a review decision;
- request retry/resume only when user intent and permissions permit;
- request a new first-draft workflow through existing create/run API;
- inspect artifacts.

The Agent must not:

- manually edit Workflow JSON;
- invent Stage IDs;
- execute Stage CLIs;
- replace Durable Jobs;
- mark Stages complete without their accepted executor path.

---

# 11. Security / Privacy Boundary

V2.3 must assume Projects may contain private media and transcripts.

Minimum requirements:

1. Provider requests send only the context required for the current task.
2. No arbitrary traversal outside the configured data root.
3. No API key in client JS or persisted logs.
4. Tool arguments/results are schema validated.
5. Unknown tool IDs are rejected.
6. Provider-generated paths are never trusted directly.
7. User content is not automatically uploaded as raw media just because an Agent session exists.
8. Error messages redact secrets and avoid exposing unnecessary absolute machine paths.

---

# 12. Observability

For each turn, retain structured operational metadata sufficient to debug without retaining hidden model reasoning:

```text
sessionId
turnId
projectId
baseProjectRevision
providerId
model
startedAt / completedAt
status
tool call IDs + tool names + normalized result status
proposal IDs
apply operation IDs
usage summary if available
error category
```

Do not store private chain-of-thought.

---

# 13. V2.3 Delivery Sequence

```text
R0  Repository / PRD / Runtime Truth Sync
↓
A0  Agent Contracts + Provider Abstraction
↓
A1  Context Builder + Allow-listed Tool Registry
↓
A2  Agent Session Store + Multi-turn Runner
↓
A3  Production Real Provider Adapter
↓
A4  AI Workspace Agent UX + Review / Apply
↓
A5  Agent ↔ Workflow Integration
↓
A6  Failure / Revision / Retry / Restart Hardening
↓
A7  End-to-End Real Provider Product Acceptance
↓
V2.3 Release
```

---

# 14. Workstream Acceptance Gates

## R0 — Repository / PRD Sync

Deliver:

- this Master PRD;
- V2.3 development plan;
- current status/handoff/system docs aligned to V2.3;
- no product behavior change.

Gate:

```text
DOC COMPLETE
CLOUD CI PASS
PRD ACCEPTED
```

No Local Codex required.

## A0 — Agent Contracts + Provider Abstraction

Deliver:

- Zod schemas for messages/events/tool calls/tool results/proposals/provider errors;
- provider interface;
- deterministic mock provider;
- unit tests;
- no live provider/network dependency.

Gate:

```text
CODE COMPLETE
TYPE SAFE
UNIT / CONTRACT TESTS PASS
CLOUD CI PASS
```

No Local Codex required.

## A1 — Context + Tool Registry

Deliver:

- bounded context builder using existing Project/selection/workflow structures;
- typed allow-listed registry;
- read-only tools;
- proposal tools that produce validated proposal data, not direct Project mutation;
- denial tests for unknown/raw shell/filesystem behavior.

Gate:

```text
CONTEXT BOUNDARY VERIFIED
TOOL ALLOW-LIST VERIFIED
NO DIRECT PROJECT MUTATION
CLOUD CI PASS
```

No Local Codex required.

## A2 — Session Store + Agent Runner

Deliver:

- runtime session repository outside Project Schema;
- atomic session persistence;
- turn loop;
- cancellation/timeouts/budgets;
- deterministic multi-turn tests;
- stale proposal/revision behavior.

Gate:

```text
MULTI-TURN CONTRACT PASS
SESSION REOPEN PASS
RETRY / IDEMPOTENCY TESTS PASS
PROJECT SCHEMA STILL 2.0.0
CLOUD CI PASS
```

Local Codex not normally required; true process-restart evidence may be deferred to A6.

## A3 — Production Real Provider

Deliver:

- first production provider adapter behind the provider interface;
- server-side secret/config loading;
- current tool-calling / structured-output contract;
- normalized errors/retry hints;
- mock HTTP/provider contract tests;
- `.env.example` variable names only.

Cloud gate first.

A live provider/API-key smoke test becomes a Local Codex gate because secrets and real network/provider behavior are not CI truth.

## A4 — Agent UX + Review / Apply

Deliver:

- Agent mode in existing AI Workspace;
- streaming/status UI;
- context chips;
- proposal cards;
- Diff/Review/Apply/Reject;
- stale proposal UI;
- session reopen/reload;
- browser tests.

Cloud browser automation first. Local Codex required for real browser + real provider + real Project interaction before acceptance.

## A5 — Agent ↔ Workflow

Deliver bounded Agent tools/services for existing Workflow Runtime without redefining Workflow/Job architecture.

Acceptance must prove Agent actions resolve through existing Workflow APIs/services and normal Job execution.

## A6 — Hardening

Chaos/recovery cases include:

- provider timeout during turn;
- browser reload during streaming turn;
- app restart with persisted session;
- Project revision changed after proposal;
- duplicate Apply retry;
- provider emits invalid tool args;
- unknown tool requested;
- cancellation during tool call;
- Workflow/Job failure observed by Agent.

Windows/process/restart cases require Local Codex exact-SHA evidence.

## A7 — End-to-End Product Acceptance

Must use real Project/media, real provider and accepted engines.

At minimum:

### Case A — Conversational Visual Edit

```text
Talking Head Project
→ ask Agent to improve hook
→ Agent reads selected Scene/Script context
→ proposal + explanation
→ Preview Diff
→ user Apply
→ Project revision advances
→ Preview/Final Render proves applied result
```

### Case B — Data/Proof Product Ad

```text
Product Ad Project
→ ask Agent to emphasize concrete proof/numbers and CTA
→ Agent uses existing visual planning / Remotion / HyperFrames / B-roll boundaries
→ review/apply
→ final 16:9 encoded MP4 visibly contains accepted changes
```

### Case C — Multi-turn Manual Edit Conflict

```text
Agent proposal
→ user manually edits Project before Apply
→ Project revision changes
→ stale proposal rejected
→ Agent re-reads latest context
→ new proposal preserves manual work
→ Apply once
→ no duplicate mutation
```

### Case D — Restart / Session Recovery

```text
active Agent session
→ app restart
→ session reopens
→ Project remains intact
→ next turn uses latest revision
```

Final acceptance requires browser evidence, real provider evidence, revision/idempotency evidence and final encoded-video evidence where the Agent changes visuals.

---

# 15. Cloud vs Local Development Split

## GPT Web + GitHub owns

- PRD / architecture;
- schemas/contracts;
- provider abstraction;
- context/tool registry;
- deterministic runner/session implementation;
- APIs and cloud-safe UI;
- unit/contract/integration/browser tests supported in CI;
- PR review/CI/merge/status truth.

## Local Codex owns only when required

- real provider credential smoke;
- real Windows browser behavior;
- real media/project interaction;
- FFmpeg / video-use / HyperFrames / Remotion integration evidence;
- process restart/chaos;
- final encoded output proof;
- in-scope local defect fixes pushed to the same branch.

Do not stop an online workstream early merely because Local Codex will eventually be needed. Freeze and hand off only after the cloud-safe portion is complete and CI is green.

---

# 16. Project Schema Decision

V2.3 default decision:

```text
Project Schema = 2.0.0
```

Agent sessions, provider metadata and conversation history live outside Project JSON.

If a future feature genuinely requires new durable editing semantics in Project, that becomes an explicit schema/migration decision with its own acceptance gate. It may not be smuggled into a provider or UI PR.

---

# 17. Provider / Model Configuration

Provider and model settings are runtime/user configuration, not generated-video Brand and not Project content truth.

Recommended conceptual settings:

```text
provider ID
model ID
API key from server-side environment
request timeout
max turns
max tool calls
optional token/output budget
```

Do not hard-code one model name as a durable Project requirement.

---

# 18. Definition of Done for V2.3

V2.3 is release-ready only when a user can:

```text
open a real V2.2-compatible Project
→ start an Agent conversation
→ reference current Scene / Script / Clips naturally
→ receive a real-provider response
→ let the Agent use only allow-listed tools
→ inspect proposed video edits
→ reject or apply them safely
→ continue multi-turn editing on the latest revision
→ survive reload/restart
→ interact with existing Workflow when needed
→ render the accepted Project through existing engine boundaries
```

And the repository proves:

```text
No second Project truth
No second Workflow/Job system
No direct project.json mutation
No arbitrary shell/filesystem Agent tools
No secret leakage
Revision conflicts are safe
Retry is idempotent
Rules Director remains reusable
Project Schema remains 2.0.0 unless explicitly migrated
Cloud + required exact-SHA local acceptance PASS
```
