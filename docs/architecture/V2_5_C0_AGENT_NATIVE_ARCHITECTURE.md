# Video OS Studio V2.5 C0 — Agent-native Architecture Foundation

Status: C0 architecture baseline for review  
Starting accepted main: `38582e59d0d56e1c4564535a2390871c2c2ed97f`  
Branch: `docs/v2.5-architecture-foundation`

Authoritative inputs:

- `docs/prd/Video_OS_Studio_V2_5_Agent_Native_Workspace_Local_MCP_Master_PRD.md`
- `docs/prd/Video_OS_Studio_V2_5_Development_Plan.md`
- `SYSTEM.md`
- `AGENTS.md`

## 1. C0 purpose

C0 freezes the engineering shape before C1 UI restructuring or C4/C5 MCP transport work.

C0 does not add a user-visible Agent workspace, does not start an MCP server, does not add an HTTP endpoint, does not change Project Schema, and does not introduce a second mutation or persistence path.

The V2.5 control-plane invariant is:

```text
Built-in Agent ─┐
                ├→ Shared Tool Registry → Application Services → durable truth
MCP Adapter ────┘
```

MCP is a transport adapter. It is not a second Agent runtime and it is not a second business-logic layer.

## 2. Permanent truth boundaries

V2.5 preserves the accepted boundaries:

```text
Source Media != Project Canvas != Export Profile
Project != Workflow != Job
Agent Session != Project
Mission != Project
Mission != Workflow
QA Report != Project
Campaign != shared mutable Project truth
```

Project JSON remains durable editing truth. Workflow, Job, Agent Session, Mission, QA and Campaign state remain separately owned.

All durable Project mutations continue through accepted application-owned Commands, Transactions or bounded Services with expected revision and idempotency semantics. One logical mutation remains one logical History entry where the accepted command model supports it.

## 3. Current Studio component inventory

| Component | Current ownership | V2.5 C0 decision |
| --- | --- | --- |
| `components/studio/StudioWorkspaceV21.tsx` | Main Studio composition root. Owns top bar/tool rail composition, mounts Viewer, Timeline, left content and Inspector surfaces, and delegates Project persistence to accepted runtime hooks. | Preserve as the current composition root. C1 may refactor information architecture but must not create duplicate Project state. |
| `components/studio/ResizableWorkspaceShell.tsx` | Resizable/collapsible workspace geometry. | Reuse. C1 changes slots/content, not resize semantics. |
| `components/studio/WorkspaceLayoutProvider.tsx` | Workspace layout/preset state and persistence. | Reuse as the single layout-state owner. |
| `components/studio/AIWorkspacePanel.tsx` | Current top-level `Mission / Agent / Composer / Workflow` mode router. Reads Selection Store and mounts specialized panels. | Primary C2 decomposition target. The mode router is not the future product navigation model. |
| `components/studio/AgentWorkspacePanel.tsx` | Built-in Agent conversation/session/tool/proposal UI. | Reuse/decompose into typed conversation items. It does not become durable Project truth. |
| `components/studio/ProductionMissionPanel.tsx` | Production Mission UI over Mission application truth. | Rehost in conversation/context surfaces; do not duplicate Mission state. |
| `components/studio/WorkflowPanel.tsx` | Workflow status/review/action UI over accepted Workflow runtime. | Rehost; Workflow remains separately durable. |
| `components/planner/VisualPlannerPanel.tsx` | Rules Director / visual proposal Review-Diff-Apply surface. | Preserve proposal and transaction semantics. C2 may render its proposal activity inside unified conversation. |
| `components/timeline/Timeline.tsx` / `TimelineV2.tsx` | Timeline editing surface and Project editing gestures. | Preserve editing semantics. C3 Selection Mode must produce references from accepted logical selection, not a parallel timeline model. |
| `components/player/StudioPreview.tsx` | Viewer/playback surface over accepted Project composition/player bridge. | Preserve. C3 may add Viewer-region selection overlay without changing render truth. |
| `components/inspector/*` | Context-sensitive Project/clip/effect inspection. | Rehost in Context Dock. No duplicate inspector state. |
| `store/selection-store.ts` | Ephemeral UI selection: clips, scene, script word range. | Remains UI selection truth. C3 converts selections into immutable per-turn `ContextReference` objects; it does not persist them into Project JSON. |
| `store/history-store.ts` | Bounded client History/Undo/Redo entries with Project revision guards. | Preserve. Agent-originated reversible Project mutations must enter the accepted History/transaction path where supported. |

## 4. Existing Agent tool inventory

The current registry is `lib/ai/tools/registry.ts`. `createA1AgentToolRegistry()` composes current tools from application-owned readers/services.

Current canonical IDs remain stable during C0. C0 does not rename tools or invent transport-only aliases.

| Tool ID | Current semantic class | V2.5 risk class | Current handler boundary | C0 disposition |
| --- | --- | --- | --- | --- |
| `get_project_context` | read | R0 | bounded `AgentContextSnapshot` | Reuse |
| `search_asset_intelligence` | read/search | R0 today; future search policy may present as R1 | `AgentAssetIntelligenceReader` | Reuse |
| `search_video_skills` | read/search | R0 today; future UX may group as R1 | `VideoSkillRegistry` | Reuse |
| `inspect_latest_qa_report` | read | R0 | `AgentQAReportReader` | Reuse |
| `get_workflow_status` | read | R0 | `WorkflowService.get/list` reader boundary | Reuse |
| `propose_visual_plan` | proposal-only | R1 | existing `VisualPlanService.generate` | Reuse |
| `select_video_skill` | proposal/request-only | R1 | `VideoSkillRegistry.buildSelectionRequest` | Reuse |
| `request_workflow_action` | proposal-only | R1 | reads Workflow truth and creates bounded proposal; does not execute | Reuse |

Important: even `request_workflow_action(action="final_render")` is currently R1 because the tool only creates a proposal. The later Apply/Workflow execution path carries the higher risk. Risk belongs to what a tool actually does, not to words in its name.

## 5. Risk taxonomy

The application owns risk classification. Provider/model/client declarations are untrusted.

```text
R0 Read
  bounded reads over accepted application truth
  default approval: Auto

R1 Analyze / Plan
  analysis, search, planning, proposal creation
  default approval: Auto

R2 Reversible Project Mutation
  accepted command/service mutation with History support
  default approval under Review First: Ask
  may be eligible for application-owned safe session auto-apply

R3 Costly / Long-running Job
  render, generation, transcription, provider-paid or resource-heavy operation
  default approval: Ask
  dispatch returns durable operation identity; HTTP/tool call is not the durable truth

R4 Destructive / Protected
  delete/archive/overwrite protected human work or policy-protected action
  default approval: Always Ask or Deny
```

No model or MCP client may lower R2/R3/R4 to R0/R1.

## 6. Shared Tool Registry contract

### 6.1 Existing runtime remains the seed

`AgentToolRegistry` already provides:

- unique canonical tool IDs;
- application-owned definitions;
- input validation;
- output validation;
- fail-closed unknown tools;
- safe structured errors;
- internal-error redaction;
- handlers that delegate to accepted readers/services.

C0 therefore does **not** create a competing registry.

### 6.2 V2.5 metadata foundation

`lib/ai/tools/shared-contract.ts` freezes transport-neutral metadata required before MCP serialization:

```text
toolId
version
description
inputJsonSchema
outputJsonSchema
riskClass
requiredScopes
approval.defaultMode
approval.allowSessionOverride
revisionPolicy
idempotency
timeoutMs
cancellation
audit metadata
```

The schema is application metadata only. It does not expose a network endpoint and does not execute handlers.

### 6.3 C4 implementation rule

C4 must evolve/compose the current `AgentToolRegistry` so both Built-in Agent and MCP resolve the **same registered handler**. The MCP adapter may serialize definitions and normalize protocol errors, but must not copy handler logic.

Forbidden:

```text
Built-in tool handler A → Application Service
MCP-specific handler B   → raw Project/Workflow/Job store
```

Required:

```text
Built-in Agent ─┐
                ├→ one registered application tool → one accepted service boundary
MCP Adapter ────┘
```

## 7. Application Service boundary

Tool handlers are adapters over application capabilities, not business-logic owners.

Rules:

1. Read tools use bounded readers/services and return bounded path-safe data.
2. Proposal tools may calculate/validate a proposal but do not mutate Project truth.
3. R2 mutation tools must call existing command/transaction/bounded service paths; no raw `project.json` writes.
4. R3 tools request accepted Workflow/Job/engine services and return durable operation identity.
5. R4 tools must pass application-owned protection and approval policy before the accepted mutation service runs.
6. UI, Built-in Agent and MCP never spawn FFmpeg/Remotion/HyperFrames/video-use directly.
7. MCP never gains generic filesystem, shell, Git, arbitrary network or desktop-control tools from Video OS.

## 8. ContextReference contract

`lib/ai/context-reference.ts` freezes the C0 application schema.

Every reference contains:

```text
id
kind
projectId
baseProjectRevision
target
label
createdAt
```

Supported C0 kinds follow the Master PRD:

```text
project
scene
clip
asset
transcript-range
timeline-point
viewer-region
qa-finding
mission-step
```

### 8.1 Canonical target rules

- Project-derived identity uses logical IDs, never machine-specific absolute paths.
- Project timing remains frames.
- Transcript range identity uses accepted logical word IDs; frame timing is resolved from current Project truth rather than copied as a competing durable timeline.
- Viewer region uses `frame` plus normalized `x/y/width/height` constrained to the frame.
- Context references are bounded per Agent draft/turn; C0 sets a maximum of 32 attached references.

### 8.2 Resolution and stale behavior

Reference resolution is application-owned.

At use time:

```text
reference.projectId must equal active/request-authorized Project
↓
resolve target logical identity against current accepted truth
↓
classify resolved | stale | missing
```

If the target is deleted, replaced, invalid or belongs to another Project, fail closed. Do not silently substitute another Clip, Asset, Scene, QA finding or transcript range.

A read-only interaction may re-resolve a still-identical logical target against a newer Project revision. An R2/R3/R4 action must additionally satisfy that action's own expected-revision/idempotency contract; a `ContextReference` never authorizes mutation by itself.

## 9. Selection Store vs ContextReference

These are intentionally different concepts:

```text
Selection Store
  live ephemeral UI state
  may change as user clicks

ContextReference
  immutable attachment captured for an Agent draft/turn
  bound to Project + base revision + logical target
```

C3 must create references from Selection Store state. It must not teach the Agent to scrape component state directly or use DOM coordinates as durable identity.

## 10. History and Agent mutation

`store/history-store.ts` already guards Undo/Redo against unexpected Project revision drift.

V2.5 rule:

```text
Agent/MCP intent
→ approval/risk policy
→ accepted command/service
→ Project mutation transaction
→ History entry where supported
→ atomic persistence
→ audit event
```

MCP approval does not replace History. History does not replace expected-revision checks. Audit does not become Project truth.

## 11. MCP boundary frozen in C0

C4/C5 transport topology is fixed as:

```text
Codex / Claude / Cursor
          │
      Streamable HTTP
          │
   127.0.0.1 only + authenticated session
          │
    MCP transport adapter
          │
    Shared Tool Registry
          │
    Application Services
```

No default `0.0.0.0` bind. Remote access is outside V2.5.0.

C0 intentionally implements no listener, route or MCP package integration.

## 12. MCP is not embedded Codex UI

V2.5 MCP solves:

```text
external Agent → call Video OS application tools
```

It does not solve:

```text
Video OS → host full Codex Thread/Turn/stream/approval harness UI
```

If a future version embeds the full Codex harness, evaluate Codex App Server as a separate architecture. Do not simulate a full Codex client with MCP transcript mirroring.

## 13. Compatibility decisions

C0 freezes these compatibility rules:

1. Existing V2.4.x projects open without migration.
2. Project Schema stays `2.0.0`.
3. Existing canonical built-in tool IDs stay unchanged in C0.
4. Existing `AgentToolRegistry` behavior remains authoritative until a later stage deliberately composes the shared metadata into it.
5. Existing Selection Store and History Store remain single owners.
6. No engine/provider/dependency/version change is part of C0.
7. V2.4.x Mission/Workflow/Job/QA/Campaign semantics are preserved.

## 14. C1 entry criteria

C1 may start only after the C0 PR is accepted with cloud CI green and the following are frozen:

- current component ownership;
- current tool inventory and R0-R4 mapping;
- Shared Tool Registry metadata contract;
- ContextReference schema and stale rules;
- MCP threat model and local connection-auth design;
- explicit no-parallel-mutation-path invariant.

C1 may then change information architecture without changing editing semantics.

## 15. C0 acceptance checklist

- [x] Current component inventory documented.
- [x] Existing Agent tool inventory documented.
- [x] R0-R4 application risk model frozen.
- [x] Shared Tool Registry metadata schema added without a new runtime registry.
- [x] ContextReference schema/resolution states added without Project Schema change.
- [x] Selection Store and History ownership preserved.
- [x] MCP architecture boundary frozen; no endpoint added.
- [ ] MCP threat model / connection authentication document accepted.
- [ ] Exact-head cloud gates green.
- [ ] C0 PR accepted before C1 begins.
