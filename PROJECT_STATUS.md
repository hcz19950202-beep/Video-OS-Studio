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

v2_3_r0_main: 34ebc73b8998854e3ee8a067dc547cc158d156b8
v2_3_a0_main: 64977b6b2fdf97224eefd0819c29fa2f0c8c52fd
v2_3_a1_main: a307756c0a43b02d6c6ab2b74d4ec37110017d96
v2_3_a2_main: 44c0bcc2d980feb1fece94cf9d1df3a98666824f

current_milestone: V2.3 REAL AI DIRECTOR / AI EDITING AGENT
active_workstream: V2.3 A3 PRODUCTION REAL PROVIDER
active_branch: feature/v2.3-a3-real-provider
active_pr: 46
local_action_required: NONE UNTIL NEW EXACT CLOUD-GREEN VOLCENGINE A3 SHA
next_workstream: A4 AI Workspace Agent UX + Review / Apply
```

## V2.3 delivery status

```text
R0 Repository / PRD / Runtime Truth Sync  → COMPLETE / PR #40
A0 Agent Contracts + Provider Abstraction → COMPLETE / PR #41
A1 Context Builder + Tool Registry        → COMPLETE / PR #44
A2 Session Store + Multi-turn Runner      → COMPLETE / PR #45
A3 Production Real Provider               → ACTIVE / PR #46
A4 AI Workspace Agent UX + Review / Apply → NOT STARTED
A5 Agent ↔ Workflow Integration           → NOT STARTED
A6 Failure / Revision / Restart Hardening → NOT STARTED
A7 End-to-End Product Acceptance          → NOT STARTED
```

## V2.3 active boundary

A3 keeps the core `AIProvider` contract provider-neutral and now includes three provider implementations at different validation levels:

- OpenAI Responses: cloud-tested; no live credential available.
- DeepSeek Chat Completions: cloud-tested; direct account balance is not available for the mandatory live gate.
- Volcengine Agent Plan: selected as the A3 live acceptance provider because a subscribed Agent Plan credential is available and an independent repository-neutral capability probe already passed basic chat, SSE streaming, function calling, tool-result continuation, revision recognition, and secret/repository safety.

The Volcengine production adapter uses the live-verified Agent Plan endpoint `https://ark.cn-beijing.volces.com/api/plan/v3/chat/completions` with runtime model `ark-code-latest`. Ordinary no-tool turns use SSE streaming. Tool-enabled turns use OpenAI-compatible non-stream Chat Completions so the already live-verified function-call and tool-result continuation path is deterministic across routed models. The adapter has no Project mutation authority and does not persist credentials or provider-private reasoning state.

The previous exact cloud-green SHA `5c9df5ecf158e73a21e9ab3dc02b5e6919895545` / Run #612 is historical evidence only and was intentionally invalidated when the A3 acceptance provider changed from DeepSeek Direct to Volcengine Agent Plan.

No local integrated Volcengine gate is allowed until the new implementation reaches a new exact cloud-green SHA. After that freeze, Local Codex may run only the controlled `npm run test:live-volcengine` gate on Node 24.x using `.env.local`, proving one real streaming read-only Agent turn and one real two-round `get_project_context` tool loop with Project revision unchanged and no key leakage. Any code/config/test fix after freeze invalidates that SHA and returns control to GPT Web + CI.

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

- Project JSON remains durable editing truth.
- Workflow durable state remains separate from Project Schema.
- Durable Job runtime remains concrete execution truth.
- Workflow Stages use registered services/jobs/transactions and do not directly spawn engines.
- Long-running mutation work preserves Project revision and operation idempotency contracts.
