# Video OS Studio V2.5 — Development Plan

> Status: APPROVED PLANNING / FEATURE DEVELOPMENT NOT STARTED
>
> Master PRD: `docs/prd/Video_OS_Studio_V2_5_Agent_Native_Workspace_Local_MCP_Master_PRD.md`
>
> Planning branch baseline: `main @ c528e2ce0fc1a64006f2fc76c5708cb808b37575`

---

## 1. Development operating model

V2.5 continues the accepted engineering workflow:

```text
GPT Web + GitHub
= primary developer
= reads repository
= designs implementation
= changes code
= writes tests
= runs Cloud CI
= fixes failures
= owns PR progression

GitHub
= code/status source of truth
= exact SHA source of truth
= PR / CI / release evidence

Local Codex
= independent Windows verifier
= VERIFY ONLY after cloud candidate freezes
= does not develop or patch accepted candidate
```

Do not hand feature development to Local Codex before the cloud development lane has completed everything possible online.

---

## 2. Global invariants

Every V2.5 stage must preserve:

```text
Project JSON remains editing truth.
Project != Workflow != Job != Agent Session != Mission != QA != Campaign.
Project Schema remains 2.0.0 unless separately approved.
All Project mutations use accepted command/service/revision boundaries.
Built-in Agent and MCP do not gain generic computer authority.
MCP does not create a parallel persistence/mutation path.
Current V2.4.x render / Mission / Campaign acceptance remains green.
```

No stage may silently weaken security/approval rules to simplify UI integration.

---

## 3. Branch / PR structure

Recommended sequence:

```text
C0 docs/v2.5-architecture-foundation
C1 feature/v2.5-c1-agent-native-shell
C2 feature/v2.5-c2-unified-agent-conversation
C3 feature/v2.5-c3-context-selection
C4 feature/v2.5-c4-shared-tools-mcp-read
C5 feature/v2.5-c5-mcp-approval-mutation
C6 feature/v2.5-c6-production-surfaces
C7 release/v2.5-acceptance-hardening
```

Each feature branch starts from the accepted resulting `main` of the previous stage, never from an unaccepted sibling branch.

Each PR remains Draft until its stage-level cloud gates are green and scope review is complete.

---

# 4. C0 — Architecture and contract foundation

## Goal

Freeze the engineering shape before UI/MCP coding.

## Required work

### C0.1 Current component inventory

Document actual ownership for:

```text
StudioWorkspaceV21
ResizableWorkspaceShell
WorkspaceLayoutProvider
AIWorkspacePanel
AgentWorkspacePanel
ProductionMissionPanel
WorkflowPanel
VisualPlannerPanel
Timeline
StudioPreview
Inspector
Selection Store
History Store
```

### C0.2 Current Agent tool inventory

Inventory current built-in Agent tool definitions/handlers and identify which can become shared registry entries without semantic change.

Classify each current/future tool:

```text
R0 read
R1 analyze/plan
R2 reversible mutation
R3 costly job
R4 destructive/protected
```

### C0.3 MCP threat model

Explicitly model:

```text
untrusted local process
malicious/buggy MCP client
stale/replayed request
cross-project request
credential leak
loopback CSRF / browser-origin confusion
port discovery
client disconnect
server restart
long-running Job disconnect
oversized tool payload
prompt injection from project/transcript content
```

### C0.4 Connection authentication design

Decide:

```text
pairing / bearer credential format
credential storage boundary
rotation
session identity
heartbeat/lastSeen semantics
cross-origin rules
HTTP request limits
```

### C0.5 Shared Tool Registry contract

Define application-facing registry interface before transport adapter.

### C0.6 ContextReference contract

Define reference schemas/resolution/stale rules before Selection UI.

## C0 non-goals

No user-visible feature behavior.
No Project Schema change.
No MCP endpoint yet.

## C0 acceptance

- architecture doc accepted;
- threat model accepted;
- Tool Registry contract accepted;
- ContextReference contract accepted;
- no product code mutation unless required for type-only foundation;
- existing CI green.

---

# 5. C1 — Agent-native Workspace Shell

## Goal

Change information architecture without changing editing semantics.

## Product result

Project opens as:

```text
Agent | Viewer | Context
      Timeline
```

## Required work

### C1.1 Top bar

Add/normalize:

```text
Projects/back
Project name
save state
Undo / Redo
Versions/History entry
Workspace menu
Connection placeholder/status
Export
```

### C1.2 Left region

Left panel becomes dedicated Agent Workspace container rather than general tool library.

### C1.3 Right Context Dock

Add tab shell:

```text
Inspector
Assets
Transcript
Mission
QA
History
```

Initially existing components may be hosted with adapters; do not duplicate state.

### C1.4 Timeline / Viewer preservation

Timeline and Viewer behavior must remain unchanged aside from layout integration.

### C1.5 Legacy capability access

Effects/Brand/Project creation/etc. must remain reachable through Context/Workspace menus or existing routes until intentionally redesigned.

## C1 tests

- layout component tests;
- panel collapse/resize keyboard tests;
- browser tests for project open / Timeline / Viewer / Inspector;
- Undo/Redo unaffected;
- workspace persistence/reset.

## C1 acceptance

No core editing capability lost.
No Project Schema change.
No MCP yet.

---

# 6. C2 — Unified Agent Conversation

## Goal

Replace the Mission / Agent / Composer / Workflow top-level mode choice with one user conversation surface while retaining all underlying capabilities.

## Required work

### C2.1 Decompose AgentWorkspacePanel

Extract reusable pieces:

```text
Conversation list
Message item
Streaming assistant item
Tool activity item
Proposal item
Composer
Session selector
Error/recovery state
```

### C2.2 Typed activity model

UI-level activity items must be derived from durable/application state, not model prose.

### C2.3 Mission card integration

Conversation can show Mission progress/readiness without duplicating Mission truth.

### C2.4 QA card integration

Conversation can show QA findings/actions.

### C2.5 Execution Mode UI

Add:

```text
Review First
Apply Safe Edits
Plan Only
```

Mode is passed as policy intent and cannot override application risk class.

### C2.6 Advanced detail access

Workflow/Composer details remain accessible through Context/advanced disclosure rather than deleted.

## C2 tests

- session switching;
- streaming;
- tool-call/result rendering;
- Proposal review/selective apply/reject;
- stale proposal;
- History entry on Apply;
- cancellation;
- Mission/QA card state derives correctly;
- execution mode cannot auto-run forbidden classes.

## C2 acceptance

A normal user can perform an accepted Agent edit without choosing Mission/Agent/Composer/Workflow first.

---

# 7. C3 — Selection Mode and Context References

## Goal

Make agent commands precisely grounded in project objects.

## Required reference kinds

Minimum accepted C3 set:

```text
Project
Scene
Clip
Asset
TranscriptRange
TimelinePoint
ViewerRegion
QAFinding
MissionStep
```

## Required work

### C3.1 ContextReference repository/service or session state

Define creation/resolution/validation.

### C3.2 Selection Mode controller

Separate normal editor selection from “attach this selection to current Agent draft”.

### C3.3 Timeline selection

Click Clip/item while Selection Mode is active → Context chip.

### C3.4 Asset selection

Project Asset → Context chip.

### C3.5 Transcript range

Existing Script/Transcript range semantics → Context chip.

### C3.6 Timeline point

Timeline ruler position → frame-based ContextReference.

### C3.7 Viewer region

Drag region on Viewer → normalized geometry + frame reference.

### C3.8 QA / Mission

Context Dock findings/steps can be attached directly.

### C3.9 Composer chip UX

Support multiple chips, remove, keyboard operation and stale-state rendering.

### C3.10 Stale fail-closed

Any unresolved/stale logical target must not be silently substituted.

## C3 tests

- each reference kind creation;
- serialization/bounded context;
- multi-reference prompt;
- stale Project revision;
- deleted Clip/Asset;
- Viewer geometry bounds;
- frame canonical timing;
- no machine absolute path leakage.

## C3 browser acceptance

At minimum:

```text
Select Timeline Clip → chip
Select Transcript range → chip
Select Viewer region → chip
Send Agent turn → selection snapshot received
Modify/delete referenced target → stale behavior visible
```

---

# 8. C4 — Shared Tool Registry + MCP Read Path

## Goal

Introduce external-agent connectivity without mutation authority first.

## Required work

### C4.1 Shared Tool Registry

Refactor suitable current Agent tools into transport-neutral application definitions.

Built-in Agent must use the same handlers after refactor.

### C4.2 MCP runtime

Server-side only.

Requirements:

```text
127.0.0.1 bind only
Streamable HTTP-compatible MCP transport
bounded request size
bounded concurrency
cancellation support
safe errors
no secret logging
```

### C4.3 Pairing/auth

Implement accepted C0 credential/session design.

### C4.4 Initial tool set — read only

Minimum:

```text
read_project_summary
read_timeline
read_transcript
read_selection
list_assets / search_assets
read_mission
read_qa
```

### C4.5 Connection Center first slice

Display:

```text
bridge running/stopped
address without secret
connected client(s)
last activity
tool contract version
read tool catalog
logs/activity with redaction
```

### C4.6 External-client proof

Use at least one real MCP client in development validation when possible; Cloud tests use protocol clients without requiring user credentials.

## C4 security tests

- external bind denied/default absent;
- missing/invalid auth denied;
- token absent from logs/tool output;
- oversized request rejected;
- unknown tool rejected;
- read tool cannot smuggle mutation fields;
- cross-project authority rejected;
- stale/disconnected session handled;
- no raw path/secret leakage.

## C4 acceptance

External MCP can safely read the open Project and production state, but cannot mutate anything.

---

# 9. C5 — MCP Proposal, Approval and Mutation

## Goal

Allow external agents to cause real edits only through the same proposal/revision/risk path used by Video OS.

## Required work

### C5.1 Proposal tools

```text
create_edit_proposal
read/review proposal
```

### C5.2 Video OS approval surface

External-origin Proposal appears in Video OS with:

```text
client identity
base revision
changes
warnings
risk class
Approve / Apply / Reject
```

### C5.3 Apply path

MCP must not directly apply raw mutations.

Accepted path:

```text
external agent
→ shared proposal tool
→ Video OS proposal state
→ application approval policy / user approval
→ existing Project mutation service
→ expected revision
→ one History transaction
```

### C5.4 Costly Jobs

Add bounded request tools for approved operations such as:

```text
request_render
request_qa
request_generation where already supported
start/advance mission where policy allows
```

Return durable operation IDs and state-reading tools.

### C5.5 Permission Center

Per risk/tool display and approval mode.

### C5.6 Audit

Record safe application audit metadata:

```text
client ID/label
tool ID
time
project ID
operation identity
approval result
status
```

Never record secrets/raw sensitive payloads unnecessarily.

## C5 adversarial tests

- bypass proposal attempt;
- stale base revision;
- replay apply;
- approval for wrong client/project;
- Protected Edit conflict;
- model-declared risk downgrade;
- cancellation race;
- duplicate Job request;
- disconnect during running Job;
- malformed MCP input;
- request Host/origin trust confusion.

## C5 acceptance

A real external client can create a Proposal, the user can approve it in Video OS, and the real Timeline changes through the accepted Project path with Undo support.

---

# 10. C6 — Production Surfaces Integration

## Goal

Expose V2.4 production power through the new V2.5 information architecture.

## Required work

### C6.1 Mission Context tab

Production step graph/status/evidence/readiness.

### C6.2 QA Context tab

Findings, timeline locations, `Ask Agent`, repair requests.

### C6.3 History unification

Clearly identify Human / Built-in Agent / External Agent / Mission-originated logical transactions where evidence supports attribution.

### C6.4 Campaign navigation

Projects/Campaigns top-level navigation; Campaign remains separate from Project workspace.

### C6.5 Campaign → Project handoff

Open Mission Project with correct context, without copying Campaign state into Project.

### C6.6 Connection/activity visibility

External client tool activity and application approvals remain visible while Mission/Job progresses.

## C6 tests

- Mission reload;
- QA finding → ContextReference → Agent;
- repair path;
- Campaign isolation;
- Campaign cancel/retry regression;
- durable Job status after external disconnect;
- no duplicate Mission/QA truth in Project.

---

# 11. C7 — Hardening, compatibility and final acceptance

## Goal

Prove V2.5 as a production-grade local agent workspace rather than a demo MCP integration.

## C7 cloud gates

At minimum retain all currently required repository gates, including:

```text
format
lint
typecheck
unit
build
browser smoke / E2E
Windows media smoke
B6 core acceptance
B7 Campaign acceptance
```

Add V2.5-specific gates for:

```text
Agent workspace browser flows
ContextReference/stale flows
MCP protocol/auth/security
MCP proposal/approval/apply
reconnect/restart
shared-tool equivalence
```

## C7 local Windows gate — mandatory

Only after exact candidate SHA is frozen.

Use isolated worktree and isolated `VIDEO_OS_DATA_ROOT`.

Must preserve primary worktree status byte-for-byte.

### Required real scenarios

1. Open a real local video Project.
2. Built-in Agent reads selected context.
3. Create/apply a real reviewable edit.
4. Undo works.
5. Real external MCP client connects.
6. MCP reads current Project/Timeline/Transcript.
7. External client creates a Proposal.
8. Video OS approval applies it.
9. Result appears in Timeline/Viewer.
10. Start/observe at least one accepted long-running Job path if in final MCP scope.
11. Restart/reconnect bridge and prove truthful state.
12. Render real output.
13. Confirm no credential leak.
14. Confirm no `.props.json`/`.hf-work`/stale lock/tmp residue beyond accepted behavior.
15. Confirm no attributable orphan Node/Chrome/FFmpeg/MCP listener.
16. Confirm primary worktree unchanged.

Local Codex is VERIFY ONLY. Any real defect returns to GPT Web development lane.

---

# 12. Shared Tool Registry acceptance strategy

Because shared authority is the core architectural risk, tests must prove equivalence rather than merely test two UIs separately.

For representative tools:

```text
Built-in Agent invocation
MCP invocation
```

must reach the same registered handler/service contract and therefore share:

```text
input validation
risk class
expected revision semantics
idempotency
safe error mapping
cancellation
audit metadata
```

A transport-specific adapter may translate protocol data, but it cannot own business rules.

---

# 13. ContextReference acceptance matrix

| Reference | Create | Resolve | Multi | Stale | No abs path | Browser |
| --- | --- | --- | --- | --- | --- | --- |
| Project | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Scene | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Clip | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Asset | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| TranscriptRange | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| TimelinePoint | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ViewerRegion | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| QAFinding | ✓ | ✓ | ✓ | ✓ | ✓ | target |
| MissionStep | ✓ | ✓ | ✓ | ✓ | ✓ | target |

---

# 14. MCP permission acceptance matrix

| Operation | Default | Safe auto mode | Must remain blocked/ask |
| --- | --- | --- | --- |
| Read Project | Auto | Auto | — |
| Read Transcript | Auto | Auto | — |
| Search Assets | Auto | Auto | — |
| Create Proposal | Auto | Auto | — |
| Apply reversible edit | Ask | App policy eligible | stale/protected conflicts |
| Start generation | Ask | only separately allowed | provider/cost policy |
| Render | Ask | only separately allowed | invalid/stale project |
| Delete/archive | Always Ask | Never silently auto | protected/high risk |
| Shell/filesystem/Git | Not exposed | Not exposed | Always forbidden |

---

# 15. Observability requirements

V2.5 must provide enough evidence to debug MCP/Agent behavior without leaking secrets.

Server/application logs should distinguish:

```text
connection lifecycle
tool discovery
tool invocation identity
approval wait/result
durable operation ID
safe terminal status
protocol error
application error code
```

Do not log full authorization headers, pairing tokens, provider keys, raw media or unnecessary Transcript bodies.

---

# 16. Versioning and compatibility

### Tool contract version

MCP server advertises a Video OS tool contract version independent of Project Schema.

Breaking tool schema changes require explicit version strategy; do not silently change semantics under the same tool name if external clients may persist assumptions.

### Project compatibility

V2.4.x Project files must open normally.

### External client compatibility

C4 initially guarantees one accepted MCP protocol surface; client-specific convenience setup is additive.

---

# 17. Release boundary

Do not tag/release `v2.5.0` merely because MCP connects.

Release requires:

```text
C1 shell accepted
C2 conversation accepted
C3 context accepted
C4 read MCP accepted
C5 mutation/approval accepted
C6 production surfaces accepted
C7 Cloud accepted
C7 Local Windows accepted
release metadata exact-head CI accepted
exact-main CI accepted
annotated immutable tag verified
post-release truth sync accepted
```

Reuse the repository's established immutable release process.

---

# 18. Suggested implementation order inside each stage

For each C-stage:

```text
1. inspect current accepted main
2. define contract/tests first where risk is high
3. implement smallest end-to-end slice
4. add route/service/UI integration
5. add negative/security cases
6. run focused tests
7. run full cloud CI
8. audit scope/diff
9. freeze exact SHA only after green
10. Local verification only when stage explicitly requires real Windows evidence
11. merge with expected-head protection
12. verify resulting main CI
```

---

# 19. Stop conditions

Stop and return to design/development if any stage reveals:

```text
Project Schema migration unexpectedly required
MCP requires generic filesystem/shell authority
existing Project mutation API cannot support safe external proposals
connection auth cannot be made local and bounded
UI refactor causes Timeline/Viewer semantic divergence
B6/B7 regression
primary worktree must be modified to run acceptance
```

Do not work around these by weakening tests or policy.

---

# 20. Owner review checkpoints

Owner approval should occur at these boundaries:

### Checkpoint A — after C0

Approve architecture/security/tool contract before UI/MCP coding.

### Checkpoint B — after C3

Approve Agent Workspace + Selection Mode user experience before external mutation authority.

### Checkpoint C — after C4

Approve real MCP read-only connection UX/security before enabling mutation.

### Checkpoint D — after C5

Approve external Proposal/Approval/Mutation behavior before full production integration.

### Checkpoint E — final C7

Approve Local Windows evidence before release finalization.

---

# 21. Definition of done

V2.5 is done when a user can:

```text
Open a real Project
↓
Select exact video/transcript context
↓
Tell the built-in Agent what outcome they want
↓
Review visible application activity and proposal
↓
Apply a real undoable Timeline change
↓
Connect an external Codex/Claude/Cursor-style MCP client
↓
Let that client read Video OS state and create a bounded proposal
↓
Approve the external proposal inside Video OS
↓
Continue through Mission / QA / Render
↓
Keep the Project fully editable and durable
```

while Video OS continues to enforce its own Project truth, revision protection, risk policy, durable Job evidence and security boundaries.