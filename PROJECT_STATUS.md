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

v2_2_r0_main: 64c6ea3ece5770a2999a67dabec8d83837aa62d2
v2_2_w0_main: 9914b1e65d27a7d40e997295d94eeb5ce4c3deea
v2_2_w1_main: 5c98117a2ca30217ac8865e99eb87fe410ee7192
v2_2_w2_main: bfcc862aed29969e61c5c3723179585e6c583a07
v2_2_w3_main: 23193e537a2c403f8d3c82806db991603cb27dca
v2_2_w4_main: 6a443e56c10b4935efedd65293b6dbd5584cbda1
v2_2_w5_main: 2bdbe3aa229513e22da5bba51202609743a718b3
v2_2_w6_main: d629249f9dbc877eadc68ce61f47c16f80a883b1
v2_2_release_main: 0e813e5e1360318211e05c1c5fec5eb82be00224
v2_2_post_release_docs_main: 85adebdac436b33b3a737536f32363bfc8e22465

current_milestone: V2.3 REAL AI DIRECTOR / AI EDITING AGENT
active_workstream: V2.3 R0 REPOSITORY / PRD / RUNTIME TRUTH SYNC
active_branch: planning/v2.3-real-ai-agent
active_pr: PENDING
local_action_required: NONE
next_workstream: A0 Agent Contracts + Provider Abstraction
```

## V2.2 delivery status

```text
R0 Repository / Roadmap Sync              → COMPLETE / PR #30
W0 Workflow Contract                      → COMPLETE / PR #31
W1 Workflow Runtime Core                  → COMPLETE / PR #32
W2 Existing Capability Stage Integration  → COMPLETE / PR #33
W3 Human Review + Invalidation            → COMPLETE / PR #34
W4 Workflow UI                            → COMPLETE / PR #35
W5 Failure / Retry / Restart Hardening    → COMPLETE / PR #36
W6 End-to-End Product Acceptance          → COMPLETE / PR #37
V2.2.0 Release Finalization               → COMPLETE / PR #38
Release tag v2.2.0                        → VERIFIED
Post-release truth sync                   → COMPLETE / PR #39
```

## V2.3 authoritative documents

```text
docs/prd/Video_OS_Studio_V2_3_Real_AI_Director_Agent_Master_PRD.md
docs/prd/Video_OS_Studio_V2_3_Development_Plan.md
```

V2.3 delivery sequence:

```text
R0 Repository / PRD / Runtime Truth Sync
→ A0 Agent Contracts + Provider Abstraction
→ A1 Context Builder + Allow-listed Tool Registry
→ A2 Agent Session Store + Multi-turn Runner
→ A3 Production Real Provider Adapter
→ A4 AI Workspace Agent UX + Review / Apply
→ A5 Agent ↔ Workflow Integration
→ A6 Failure / Revision / Retry / Restart Hardening
→ A7 End-to-End Real Provider Product Acceptance
→ V2.3 Release
```

## V2.3 product direction

V2.3 adds a production Real AI Director / multi-turn AI Editing Agent **above** the accepted V2.2 editor/runtime.

Target safety path:

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

The Agent does not directly mutate Project state.

## Reuse baseline

V2.3 must reuse:

- existing `AIWorkspacePanel` instead of creating a parallel Studio;
- `VisualPlanService` and `RulesVisualPlannerAdapter` as the deterministic Rules Director baseline/fallback;
- existing selection/context truth;
- existing Project Commands / Transactions / `ProjectMutationCoordinator`;
- V2.2 Workflow Runtime rather than a second workflow system;
- Durable Jobs rather than a second execution runtime;
- accepted Remotion / HyperFrames / video-use / FFmpeg service boundaries.

## V2.3 durable-state decision

Default decision:

```text
Project Schema = 2.0.0
```

Agent conversations/sessions/provider metadata live outside `project.json` under runtime data owned by a dedicated service/repository. Agent state is not Project state.

A schema change requires a separately explicit migration decision and may not be introduced incidentally.

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
REUSE > MODIFY > CREATE
```

Additional V2.3 invariants:

- Agent state != Project state.
- No arbitrary shell/filesystem/Git/network tools for the Agent.
- No provider secret in Project JSON, browser bundle, committed files or persisted session transcript.
- Provider output/tool args are validated before use.
- Durable edits remain reviewable and revision-safe.
- Retry must not duplicate Project mutations.

## Development ownership

```text
GPT Web + GitHub
→ R0/A0/A1/A2 cloud-safe work continuously
→ A3 provider adapter + mocked contract tests
→ A4/A5/A6 cloud-safe implementation/tests
→ PR/CI/review/merge/status truth

Local Codex
→ only after an exact green SHA when live provider credentials/network, real Windows browser/media/engines, process restart or encoded-video proof becomes mandatory
```

Do not stop online development merely because a later Local Codex gate will exist.

## Current R0 gate

R0 is documentation/governance/runtime-truth only. It must not add product behavior.

Required before merge:

- V2.3 Master PRD present;
- V2.3 Development Plan present;
- `PROJECT_STATUS.md`, `AGENTS.md`, `SYSTEM.md`, `GPT_WEB_HANDOFF.md`, README aligned;
- stale accepted engine/config truth repaired if found;
- GitHub CI green;
- no Project Schema or dependency-pin change.

After R0 merges, immediately begin A0 on a fresh branch from accepted `main`.

## V2.2 immutable release boundary

V2.2.0 remains closed and immutable at tag `v2.2.0` → `0e813e5e1360318211e05c1c5fec5eb82be00224`.

The experimental `feature/v2.2-w55-workflow-template` branch was not part of V2.2 and must not be merged into V2.3 by default. Reuse only individual ideas if the V2.3 architecture independently requires them.
