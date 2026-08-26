# Video OS Studio — Current Project Status

> Current-state source of truth for GPT Web, Local Codex, and other development agents. Historical PRs and validation reports remain evidence; they do not override this file.

## Current checkpoint

```yaml
released_product_version: 2.2.0
project_schema: 2.0.0
release_status: V2.2.0 RELEASE COMPLETE
release_tag: v2.2.0
release_tag_type: annotated
release_tag_object_sha: df1acb238838ed814b969e20fe85a49253a92861
release_commit: 0e813e5e1360318211e05c1c5fec5eb82be00224

v2_2_release_main: 0e813e5e1360318211e05c1c5fec5eb82be00224
v2_2_post_release_docs_main: 85adebdac436b33b3a737536f32363bfc8e22465
v2_3_r0_main: 34ebc73b8998854e3ee8a067dc547cc158d156b8

current_milestone: V2.3 REAL AI DIRECTOR / AI EDITING AGENT
active_workstream: V2.3 A0 AGENT CONTRACTS + PROVIDER ABSTRACTION
active_branch: feature/v2.3-a0-agent-contracts
active_pr: 41
local_action_required: NONE
next_workstream: A1 Context Builder + Allow-listed Tool Registry
```

## V2.3 delivery status

```text
R0 Repository / PRD / Runtime Truth Sync          → COMPLETE / PR #40 / main 34ebc73b...
A0 Agent Contracts + Provider Abstraction         → ACTIVE / PR #41
A1 Context Builder + Allow-listed Tool Registry   → NOT STARTED
A2 Agent Session Store + Multi-turn Runner        → NOT STARTED
A3 Production Real Provider Adapter               → NOT STARTED
A4 AI Workspace Agent UX + Review / Apply         → NOT STARTED
A5 Agent ↔ Workflow Integration                   → NOT STARTED
A6 Failure / Revision / Retry / Restart Hardening → NOT STARTED
A7 End-to-End Real Provider Product Acceptance    → NOT STARTED
```

## V2.3 authoritative documents

```text
docs/prd/Video_OS_Studio_V2_3_Real_AI_Director_Agent_Master_PRD.md
docs/prd/Video_OS_Studio_V2_3_Development_Plan.md
```

## A0 scope

A0 establishes domain/provider contracts only:

- Agent message/session-facing IDs and normalized messages;
- typed allow-listed tool definition/call/result contracts;
- proposal contract with `baseProjectRevision`;
- provider event/usage/error/request schemas;
- provider-neutral async-stream interface;
- deterministic mock provider;
- cancellation/error normalization;
- unit/contract tests.

A0 explicitly does not add a live provider, network calls, secrets, UI, Workflow tools or Project mutation paths.

## Core V2.3 safety path

```text
User goal
→ bounded Project / Script / Scene / Selection / Workflow context
→ provider-neutral Agent Runner
→ allow-listed typed tools
→ explanation + validated proposal
→ Preview Diff
→ User Confirm
→ existing Command Transaction / bounded Service
→ latest Project revision
```

The Agent never directly mutates Project state.

## Reuse baseline

V2.3 reuses:

- existing `AIWorkspacePanel`;
- `VisualPlanService` / `RulesVisualPlannerAdapter`;
- existing Studio selection truth;
- Project Commands / Transactions / `ProjectMutationCoordinator`;
- V2.2 Workflow Runtime;
- Durable Jobs;
- Remotion / HyperFrames / video-use / FFmpeg service boundaries.

## Durable-state decision

```text
Project Schema = 2.0.0
Agent Session != Project
```

Agent conversation/session/provider metadata will live outside `project.json` in a dedicated runtime repository/service. Any Project Schema change requires a separately explicit migration decision.

## Accepted invariants

```text
Project Schema:       2.0.0
remotion:             4.0.513
@remotion/player:     4.0.513
@remotion/cli:        4.0.513
hyperframes:          0.8.10
@playwright/test:     1.62.1

Source Media != Project Canvas != Export Profile
Project != Workflow != Job
Agent Session != Project
REUSE > MODIFY > CREATE
```

Additional rules:

- no arbitrary Agent shell/filesystem/Git/network tools;
- provider output/tool args are untrusted until schema validation;
- provider secrets never enter Project/session/browser/repository truth;
- durable edits remain proposal/review/confirmation based;
- stale proposals cannot silently apply across Project revision changes;
- retry must not duplicate Project mutations.

## Development ownership

GPT Web + GitHub continues A0/A1/A2 and the cloud-safe portion of A3 without stopping. Local Codex is first expected when a live real-provider API key/network smoke becomes mandatory after A3 cloud CI is green.

## V2.2 immutable release boundary

V2.2.0 remains closed at tag `v2.2.0` → `0e813e5e1360318211e05c1c5fec5eb82be00224`.
