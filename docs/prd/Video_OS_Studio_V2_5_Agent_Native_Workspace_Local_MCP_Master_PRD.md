# Video OS Studio V2.5 — Agent-Native Workspace + Local MCP Bridge Master PRD

> Status: APPROVED DIRECTION / DEVELOPMENT NOT STARTED
>
> Planning branch baseline: `main @ c528e2ce0fc1a64006f2fc76c5708cb808b37575`
>
> Product schema default: `2.0.0`
>
> This PRD defines the next major product direction after the current V2.4.x maintenance line. It does not authorize V2.5 feature coding by itself; implementation starts only after the development plan and branch sequence are accepted.

---

## 1. Product thesis

Video OS Studio V2.5 turns the product from an AI-enabled editor into an agent-native production workspace.

The target user experience is:

```text
User goal
↓
Precise @Context selection
↓
Agent reads accepted application state
↓
Visible tool / plan / proposal / mission / QA activity
↓
Application-owned approval and risk policy
↓
Real editable Project / Timeline mutation
↓
Viewer preview
↓
Undo / History
↓
Mission / QA / Render / Campaign continuation
```

The product should feel closer to:

```text
ChatCut interaction model
×
Cursor-style agent + MCP control
×
Premiere-style editable / undoable truth
×
Video OS Mission / QA / Campaign backend
```

It must not become a general Premiere clone, a chat-only video generator, or a generic computer-control agent.

---

## 2. Research synthesis

### 2.1 ChatCut

Current ChatCut documentation validates the primary interaction model for this PRD:

- AI panel normally lives on the left of the editor.
- Conversation, prompt composer and composer controls are distinct UI regions.
- Viewer and Timeline remain the editing truth surface.
- Workspace panels can be shown, hidden or reset.
- Selection Mode turns Timeline items, assets, Viewer regions, Timeline points and Transcript selections into precise `@` references.
- ChatCut Desktop can select local Codex CLI or Claude Code as the answering agent.
- External Codex / Claude desktop agents can keep the main conversation outside ChatCut and control the open Desktop project over a local MCP bridge.

References:

- https://chatcut.io/docs/editor-overview
- https://chatcut.io/docs/ai-panel-overview
- https://chatcut.io/docs/selection-mode
- https://chatcut.io/docs/desktop-agent-selection
- https://chatcut.io/docs/external-agents-and-mcp

### 2.2 OpenChatCut

OpenChatCut reinforces a critical architecture rule: local projects, multi-track Timeline, built-in agents and external MCP agents should act on the same real editable project model rather than produce a separate generated-video artifact.

Reference:

- https://github.com/Avalonbtc/openchatcut

### 2.3 OpenScene

OpenScene reinforces the approval model: the agent may inspect state, but project-changing operations and costly generation/export actions should be governed by explicit application policy and approval.

Reference:

- https://github.com/Theorvane/openscene

### 2.4 Cursor

Cursor's MCP productization provides the main reference for connection and permission UX:

- MCP server discovery and enable/disable UI.
- Tool catalog and per-tool approval.
- MCP logs.
- Run modes / allowlists.
- HTTP and stdio transports.
- Failure isolation between MCP servers.

References:

- https://prod.cursor.com/docs/mcp
- https://prod.cursor.com/docs/agent/security/run-modes

### 2.5 Claude Desktop

Claude Desktop's current Desktop Extensions model demonstrates that normal users should not be forced to hand-edit MCP JSON. Local MCP installation and management should eventually become a productized, one-click connection flow with secure local secret handling.

Reference:

- https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop

### 2.6 Premiere AI Assistant

Premiere provides the strongest editing-control principle:

- AI output remains a normal editable sequence.
- AI actions enter Undo / History.
- The assistant is dockable/resizable rather than replacing the editor.

Reference:

- https://helpx.adobe.com/premiere/desktop/premiere-ai-assistant/overview.html

### 2.7 Descript Underlord

Underlord reinforces the shift from many isolated AI buttons toward one assistant that interprets outcome-oriented requests and chooses the correct editing workflow.

Reference:

- https://www.descript.com/blog/article/descript-season-6-meet-underlord

### 2.8 Codex integration boundary

OpenAI's Codex App Server guidance distinguishes two integration goals:

- MCP is appropriate when another agent should call Video OS application tools.
- Codex App Server is the richer path when a future Video OS surface wants to embed the full Codex harness with thread/turn/item streaming, approvals and diffs.

V2.5 therefore implements `External Agent -> Video OS MCP`, not a fake embedded Codex conversation.

Reference:

- https://openai.com/index/unlocking-the-codex-harness/

---

## 3. Existing Video OS assets to preserve

V2.5 is an information-architecture and agent-control evolution over accepted foundations. It must reuse, not replace:

```text
ResizableWorkspaceShell
WorkspaceLayoutProvider
StudioPreview
Timeline
Inspector
Project Store
Selection Store
History Store
Agent Session / Turn / Proposal runtime
Protected Project mutation path
Workflow Runtime
Durable Jobs
Production Mission
QA / Repair
Campaign
Asset Intelligence / Skills where already accepted
```

Current `ResizableWorkspaceShell` already models left panel + Viewer + Inspector + Timeline with resizable/collapsible boundaries. V2.5 should repurpose those regions instead of creating a second editor shell.

Current Agent runtime already supports sessions, streaming, selected Clip / Scene / Transcript context, tool activity, proposals, selective review/apply, stale revision protection and History transactions. V2.5 should productize this capability rather than build a parallel agent stack.

---

## 4. Product goals

### G1 — Agent-native default workspace

Opening a Project should immediately present an Agent-oriented editing workspace without forcing the user to understand Mission / Agent / Composer / Workflow internals.

### G2 — Precise reference instead of ambiguous chat

Users must be able to attach concrete project context such as a Clip, Transcript range or Viewer region to a prompt.

### G3 — Visible execution

Agent work must render as typed product activity: Tool, Plan, Proposal, Approval, Mission, Job, QA, Error / Recovery.

### G4 — Real editable truth

Agent changes must land in the same Project / Timeline state the manual editor uses, with existing revision, transaction and Undo protections.

### G5 — Local MCP bridge

Codex, Claude Code/Desktop, Cursor or another supported MCP client should be able to operate the currently open Video OS project through bounded application tools.

### G6 — Shared application authority

Built-in Agent and external MCP clients must use the same Tool Registry / Application Services. There must not be a second mutation path for MCP.

### G7 — Preserve production systems

Mission, Workflow, Durable Job, QA and Campaign remain independent durable truth systems and surface into the UI as status/evidence, not copied state.

---

## 5. Non-goals

V2.5.0 will not:

- rewrite the Timeline engine;
- replace Remotion / FFmpeg / HyperFrames render architecture;
- make Electron or Tauri mandatory;
- expose generic shell / filesystem / Git / arbitrary network / computer-control tools;
- duplicate Codex or Claude conversation history inside Video OS for external-agent sessions;
- make every tool call require a modal approval;
- migrate Project Schema unless a separately reviewed requirement proves it is unavoidable;
- merge Campaign management into the single-Project editing surface;
- create a second MCP-specific project mutation implementation.

---

## 6. Primary information architecture

### 6.1 Application-level navigation

```text
Projects
Campaigns
Assets
Skills
Connections
Settings
```

### 6.2 Project workspace

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Home  Project  Saved  Undo Redo  Versions  Workspace  Connection  Export│
├─────────────────┬──────────────────────────────┬────────────────────────┤
│ AGENT           │ VIEWER                       │ CONTEXT                │
│                 │                              │                       │
│ Conversation    │                              │ Inspector             │
│ Tool Activity   │                              │ Assets                │
│ Proposal        │                              │ Transcript            │
│ Mission / QA    │                              │ Mission               │
│                 │                              │ QA                    │
│ Composer        │                              │ History               │
├─────────────────┴──────────────────────────────┴────────────────────────┤
│ TIMELINE                                                               │
└────────────────────────────────────────────────────────────────────────┘
```

Recommended 1440×900 defaults:

```text
Agent panel:      380px, min 320, max 520
Context panel:    340px, min 280, max 480
Timeline height:  310px default, resizable
Viewer:           fills remaining area
```

V2.5 should preserve current shell resizing/collapse behavior and add workspace reset/presets where useful.

---

## 7. Top bar

Required project-level controls:

```text
Back / Projects
Project name
Save state
Undo
Redo
Versions / History entry
Workspace menu
Agent / MCP connection indicator
Export
```

Connection indicator examples:

```text
● Video OS Agent
● Codex
○ No external client
```

Clicking the connection indicator opens a compact connection popover, not the full settings page.

---

## 8. Left Agent Workspace

### 8.1 Remove top-level mode complexity

Current user-facing mode switch:

```text
Mission | Agent | Composer | Workflow
```

must no longer be the primary navigation model.

Those capabilities become internal Agent tools/status surfaces. The user should normally start from a goal in one conversation.

### 8.2 Typed conversation items

The conversation surface must support at least:

```text
UserMessage
AssistantMessage
ToolActivity
PlanCard
ProposalCard
ApprovalCard
MissionProgressCard
QAFindingCard
GenerationJobCard
RenderJobCard
ErrorRecoveryCard
ExternalAgentActivityCard
```

### 8.3 Proposal behavior

Proposal cards must display:

```text
proposal title
summary
base Project revision
operations / selectable changes
warnings
risk / approval requirement
stale state
Review / Apply / Reject
```

Apply must continue to use existing expected-revision and transaction boundaries. One logical Apply should remain one logical undoable History entry where supported.

### 8.4 Tool activity

Tool activity must expose application-level names and states:

```text
Read Project          success
Read Transcript       success
Search Assets         success
Propose Edit          running
Render                waiting approval
```

Do not expose chain-of-thought. Show concise plan/action/evidence suitable for user review.

---

## 9. Prompt Composer

Required composer controls:

```text
Attach
Selection Mode
@ Context chips
Skill
Built-in Agent / Model when applicable
Execution Mode
Send / Stop
```

Example:

```text
@Clip Hook-01
@Transcript 00:12–00:19

把这部分压缩到 5 秒以内，但不要删最后一句。

+   @Select   Skill ▾   GPT-5.x ▾   Review First ▾    Send
```

External-agent sessions do not expose a Video OS model selector; model choice belongs to the external client.

---

## 10. Execution modes

Application-owned execution mode is a UX policy input. It never downgrades system risk classification.

### 10.1 Review First — default

Agent may automatically:

```text
read
analyze
search
plan
create proposal
```

Project mutation, generation and render require policy review / approval.

### 10.2 Apply Safe Edits

Low-risk, reversible application-approved Project mutations may auto-apply within the current session. High-risk, protected, destructive or costly operations still require approval.

### 10.3 Plan Only

No Project mutation or costly Job execution.

---

## 11. Selection Mode and Context References

Selection Mode is a V2.5 core feature, not polish.

Supported reference kinds:

```text
@Project
@Scene
@Clip
@Asset
@TranscriptRange
@TimelinePoint
@ViewerRegion
@QAFinding
@MissionStep
```

Multiple references may be attached to one draft.

### 11.1 Viewer Region

A Viewer-region reference records normalized geometry plus frame/time context, for example:

```text
kind: viewer-region
frame: 247
x: 0.10
y: 0.06
width: 0.38
height: 0.25
```

### 11.2 Reference durability boundary

Context references are Agent-turn/application context, not Project editing truth.

Reference schema should contain at least:

```text
id
kind
projectId
baseProjectRevision
target logical IDs / frame data
label
createdAt
```

References must avoid machine-specific absolute paths.

### 11.3 Stale references

If a referenced target is deleted, replaced or cannot be resolved against current Project truth, fail closed and ask the user to reselect. Never silently substitute another Clip/Asset/Transcript range.

---

## 12. Right Context Dock

Tabs:

```text
Inspector
Assets
Transcript
Mission
QA
History
```

The dock should switch contextually but remain user-controllable.

### 12.1 Mission

Mission view shows derived current production state without copying Mission truth into Project:

```text
goal
progress
current step
completed steps
waiting review
blocker
final readiness
```

### 12.2 QA

QA view shows:

```text
overall state / score when available
finding category
severity
timeline location
explanation
evidence
Select
Ask Agent
Repair
```

`Ask Agent` attaches the QA finding as a ContextReference.

### 12.3 History

History should unify human and application-originated changes:

```text
Human — Trim Clip
Agent — Applied 7 changes
Mission — Added B-roll
Agent — QA Repair
Human — Caption edit
```

History remains grounded in accepted Project transaction/history semantics.

---

## 13. Campaign boundary

Campaign remains a separate application surface.

Campaign page should summarize:

```text
Mission counts by state
bounded Mission concurrency
render resource utilization
per-Mission Project link
QA / readiness
retry / cancel / inspect
```

Selecting a Campaign Mission opens the corresponding isolated Project workspace. Campaign must not become shared mutable Project truth.

---

## 14. Local MCP Bridge

### 14.1 Product goal

Allow supported external agents on the same computer to call Video OS application tools against the currently open project while preserving Video OS approval, revision and security policies.

Primary V2.5 topology:

```text
Codex / Claude / Cursor
          │
          │ MCP
          ▼
Video OS Local MCP Adapter
          │
          ▼
Shared Tool Registry
          │
          ▼
Application Services
          │
Project / Mission / Workflow / Job / QA
```

### 14.2 Transport

Preferred primary transport:

```text
Streamable HTTP
127.0.0.1 only
```

Suggested logical endpoint:

```text
http://127.0.0.1:<ephemeral-or-configured-port>/api/mcp
```

A future stdio shim may be added for client compatibility, but it must delegate to the same Tool Registry.

### 14.3 No public bind by default

MCP must never bind `0.0.0.0` by default. Remote access is outside V2.5.0 scope.

### 14.4 Authentication

Localhost is not treated as sufficient authentication.

V2.5 must define a local connection credential / pairing token with:

```text
random high entropy
not persisted in Project
not written to Agent transcript
not emitted in public logs
rotatable
scoped to local bridge
```

A connection handshake must validate client/session identity before tool discovery/execution.

### 14.5 Connection states

```text
stopped
starting
ready
connected
degraded
disconnected
error
```

Connected status must be based on actual heartbeat/session state, not stale UI memory.

---

## 15. Shared Tool Registry

The most important V2.5 engineering invariant:

```text
Built-in Agent ─┐
                ├→ Shared Tool Registry → Application Services
MCP Adapter ────┘
```

Each tool definition should own:

```text
toolId
version
description
input schema
output schema
risk class
required scope
approval rule
idempotency / revision semantics
timeout / cancellation semantics
audit metadata
handler
```

The MCP adapter serializes shared tools into MCP definitions. It must not reimplement Project mutation logic.

---

## 16. MCP tool scope

### 16.1 Initial read tools

C4 must support bounded tools such as:

```text
read_project_summary
read_timeline
read_transcript
read_selection
list_assets
search_assets
read_mission
read_qa
read_campaign_mission_reference
```

### 16.2 Planning / proposal tools

```text
create_edit_proposal
review_proposal
read_proposal
```

### 16.3 Mutation / execution tools

Only after permission/approval work is accepted:

```text
apply_proposal
start_or_advance_mission
request_render
request_generation
request_qa
request_repair
cancel_owned_operation
```

### 16.4 Explicitly forbidden tools

Never expose generic:

```text
shell
filesystem
Git
arbitrary HTTP/network
computer/desktop control
raw secret read
raw Project JSON write
raw Workflow/Job persistence write
```

External agents may have their own computer authority outside Video OS, but the Video OS MCP server itself grants only application-owned video-production authority.

---

## 17. Permission and approval model

Risk classes:

### R0 — Read

Examples: Project/Timeline/Transcript/Asset/Mission/QA reads.

Default: Auto.

### R1 — Analyze / Plan

Examples: search, analysis, create proposal.

Default: Auto.

### R2 — Reversible Project Mutation

Examples: trim/move/add clip/caption edit through approved command/service paths.

Default: Ask under Review First; eligible for app-owned safe auto-apply under Apply Safe Edits.

### R3 — Costly / Long-running Job

Examples: generation, transcription, render, provider-paid jobs.

Default: Ask. UI should show provider/job/cost information when knowable.

### R4 — Destructive / Protected

Examples: delete/archive/overwrite protected human work.

Default: Always Ask or deny if current policy forbids.

The model and external MCP client cannot self-declare a lower risk class.

---

## 18. Connection Center UX

Application navigation adds `Connections`.

Required content:

```text
LOCAL MCP BRIDGE
● Running
Address: 127.0.0.1:<port>
Authentication: enabled
Tool contract version

CONNECTED CLIENTS
● Codex
● Cursor
○ Claude Code

TOOL PERMISSIONS
Read Project       Auto
Create Proposal    Auto
Apply Edit         Ask
Render             Ask
Delete             Always Ask

Tool Catalog
Activity / Audit
MCP Logs
Rotate credential
Stop / Restart bridge
```

Do not expose secrets in the UI after initial pairing unless explicitly designed as a one-time copy action.

---

## 19. External-agent UI behavior

When the conversation remains in Codex/Claude/Cursor, Video OS must not duplicate that full chat transcript.

Video OS may show:

```text
External Agent: Codex
Connected
Last activity
Tool calls
Application proposals
Approval requests
Mission / Job state
```

Proposal, Job and Mission state belongs to Video OS and can therefore appear normally in Video OS UI.

Future embedding of a full Codex harness should evaluate Codex App Server separately; it is not part of V2.5.0 MCP scope.

---

## 20. Built-in Agent selector

Built-in Agent composer may expose:

```text
Agent profile
Provider / Model
Skill
Execution mode
```

Existing provider-neutral application boundary remains. Current provider adapters such as OpenAI, DeepSeek and Volcengine remain server-side implementation details.

External-agent mode must not show a Video OS model selector for a model controlled by the external client.

---

## 21. Skills UX

Skills should be user-oriented workflows rather than low-level tool lists.

Examples:

```text
Long → Short
Talking Head Cleanup
Ad Hook
B-roll Enrichment
Caption Polish
Self-QA Repair
Product Ad
```

A Skill may preconfigure context requirements and application tools but cannot bypass risk policy.

---

## 22. Persistence boundaries

Do not modify Project JSON merely to store UI/MCP infrastructure state.

Suggested separate V2.5 application state under `VIDEO_OS_DATA_ROOT`:

### ContextReference draft/session state

```text
id
kind
projectId
baseProjectRevision
target
label
createdAt
```

### MCP Connection

```text
connectionId
clientType
clientLabel
transport
status
connectedAt
lastSeenAt
toolContractVersion
```

### Tool Permission / User policy

```text
toolId / risk class
approval mode
scope
updatedAt
```

Secrets/credentials require a separate protected local secret boundary and must not be copied into ordinary durable JSON if the accepted workstation architecture provides a safer store.

Project Schema stays `2.0.0` by default.

---

## 23. Security requirements

V2.5 fails acceptance if any of these are violated:

1. MCP can mutate Project outside approved Project command/service paths.
2. MCP can bypass expected revision / stale proposal protection.
3. MCP can bypass Protected Edit or application risk policy.
4. MCP exposes generic shell/filesystem/Git/network/computer authority.
5. Pairing/auth tokens appear in Project JSON, Agent transcript or public logs.
6. MCP binds externally by default.
7. Stale external client is still shown as connected indefinitely.
8. One client can apply a proposal scoped to another project/session without explicit valid authority.
9. Cancellation is not propagated to long-running external-triggered operations where the underlying application supports cancellation.
10. MCP server failure corrupts Project/Workflow/Job/Mission truth.

---

## 24. Reliability requirements

- MCP server restart must not corrupt application state.
- Reconnect must revalidate current Project and revision.
- Duplicate/retried requests require application idempotency where the underlying operation is idempotent/claimed.
- Long-running Job tools should return durable operation identity rather than hold one fragile HTTP request open for the entire render.
- Tool responses must use bounded payloads; large Transcript/Asset sets require pagination/search/summary semantics.
- External disconnect must not silently mark a durable Job complete or failed; durable application evidence remains authoritative.

---

## 25. Performance and UX budgets

Initial targets, subject to measurement during C7:

```text
Workspace usable after Project load:           no material regression vs V2.4.x
Context chip creation:                         <100ms UI response for local selection
MCP local read tool overhead excluding work:   target <150ms p50
Connection state update after disconnect:      target <5s
Panel resize / Timeline interaction:           60fps target on accepted workstation
Conversation stream:                           incremental, no full-list rerender requirement
```

Large projects must not serialize entire Project/Transcript into every external tool response.

---

## 26. Accessibility and keyboard requirements

- Existing resizers remain keyboard operable.
- Selection Mode has an explicit shortcut and visible on/off state.
- Context chips are keyboard removable/reorderable where practical.
- Approval controls are reachable without mouse.
- Status is not communicated by color alone.
- Agent streaming does not steal focus from Timeline/Transcript editing.

---

## 27. Migration strategy

V2.5 must preserve V2.4.x projects without migration by default.

UI migration sequence:

```text
existing StudioWorkspaceV21
↓
new information architecture behind existing stores/services
↓
old Agent / Mission / Composer / Workflow panels reused or decomposed
↓
legacy top-level mode switch removed only after replacement paths are accepted
```

No accepted capability may disappear merely because the navigation changed.

---

## 28. Engineering component map

Preserve / reuse:

```text
components/studio/ResizableWorkspaceShell.tsx
components/studio/WorkspaceLayoutProvider.tsx
components/player/*
components/timeline/*
components/inspector/*
store/project-store
store/selection-store
store/history-store
lib/ai/*
lib/production/*
lib/workflow/*
lib/jobs/*
```

Likely V2.5 refactor targets:

```text
StudioWorkspaceV21
AIWorkspacePanel
AgentWorkspacePanel
ProductionMissionPanel
WorkflowPanel
VisualPlannerPanel
```

Likely new modules:

```text
AgentConversationPanel
AgentComposer
ContextReferenceStore / Service
ContextDock
ConnectionPopover
ConnectionsPage
McpBridgeRuntime
McpHttpTransport
SharedAgentToolRegistry
ToolPermissionService
McpConnectionRepository / activity view
```

Names remain implementation proposals until C0 architecture review.

---

## 29. Mandatory product acceptance

V2.5.0 is not complete unless all of the following are proven:

1. Project workspace is Agent-left / Viewer-center / Context-right / Timeline-bottom.
2. Mission / Agent / Composer / Workflow are no longer four primary user modes.
3. Conversation renders Tool / Proposal / Mission / QA states.
4. Multi-reference `@Context` works.
5. `@Clip`, `@Asset`, `@TranscriptRange` work.
6. `@TimelinePoint` works.
7. `@ViewerRegion` works.
8. `@QAFinding` and/or `@MissionStep` work where state exists.
9. Stale reference fails closed.
10. Built-in Agent proposal apply still uses existing Project mutation protection.
11. Agent changes remain Undo/History compatible.
12. Project Schema remains `2.0.0` unless separately approved.
13. Local MCP defaults to loopback only.
14. Local MCP requires bounded authentication/pairing.
15. At least one real external client connects through the supported V2.5 MCP path.
16. MCP can read the current Project/Timeline/Transcript/Assets/Mission/QA through bounded tools.
17. MCP can create a reviewable Proposal.
18. User can approve/apply the MCP-originated Proposal in Video OS.
19. Applied edit appears in real Timeline/Viewer.
20. Built-in Agent and MCP use the same application Tool Registry / handlers.
21. MCP cannot bypass revision protection.
22. MCP cannot bypass protected-edit/risk policy.
23. MCP exposes no generic computer authority.
24. Secrets do not leak into normal durable state/logs.
25. Restart/reconnect is truthful and does not create ghost connected state.
26. Campaign isolation remains intact.
27. B6/B7 production acceptance does not regress.
28. Browser workflow acceptance passes.
29. Windows real-media acceptance passes.
30. No attributable orphan process/listener remains after accepted Local Windows validation.

---

## 30. Product decisions approved by owner

The following direction is approved for planning:

```text
V2.5.0 is the next major product direction.
Main UI follows Agent left / Viewer center / Context right / Timeline bottom.
Mission / Agent / Composer / Workflow stop being equal top-level modes.
Selection Mode / @Context is a core capability.
Local MCP is a core capability.
Built-in Agent and external MCP share application tool authority.
Review First is the default execution mode.
External-agent chat remains in the external client.
V2.5.0 does not require Electron/Tauri.
Project Schema stays 2.0.0 by default.
Campaign remains a separate production surface.
```

---

## 31. Final product definition

V2.5 should be judged by this behavioral change:

Before:

```text
User learns Video OS internal modules
→ picks Mission / Agent / Composer / Workflow
→ manually coordinates AI functions
```

After:

```text
User states outcome
→ points at exact project context
→ Agent selects accepted application capabilities
→ UI exposes progress / proposal / approval / QA
→ real editable Timeline changes
```

That is the product boundary for Video OS Studio V2.5.