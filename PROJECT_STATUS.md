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

v2_3_r0_main: 34ebc73b8998854e3ee8a067dc547cc158d156b8
v2_3_a0_main: 64977b6b2fdf97224eefd0819c29fa2f0c8c52fd
v2_3_a1_main: a307756c0a43b02d6c6ab2b74d4ec37110017d96
v2_3_a2_main: 44c0bcc2d980feb1fece94cf9d1df3a98666824f
v2_3_a3_main: f102e8ac6ef87cfb4ca0579ee647d88e2b27e6a8
v2_3_a4_main: 6cac2deeef20d98b667fee3b2cea49bc54b1600c

current_milestone: V2.3 REAL AI DIRECTOR / AI EDITING AGENT
active_workstream: V2.3 A5 AGENT ↔ WORKFLOW INTEGRATION
active_branch: feature/v2.3-a5-agent-workflow
active_pr: 48
local_action_required: NONE DURING CLOUD-SAFE A5 IMPLEMENTATION
next_workstream: A6 Failure / Revision / Retry / Restart Hardening
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
```

## V2.3 delivery status

```text
R0 Repository / PRD / Runtime Truth Sync  → COMPLETE / PR #40
A0 Agent Contracts + Provider Abstraction → COMPLETE / PR #41
A1 Context Builder + Tool Registry        → COMPLETE / PR #44
A2 Session Store + Multi-turn Runner      → COMPLETE / PR #45
A3 Production Real Provider               → COMPLETE / PR #46
A4 AI Workspace Agent UX + Review / Apply → COMPLETE / PR #47
A5 Agent ↔ Workflow Integration           → ACTIVE / PR #48
A6 Failure / Revision / Restart Hardening → NOT STARTED
A7 End-to-End Product Acceptance          → NOT STARTED
```

## Release truth

The accepted V2.2.0 release commit is:

`0e813e5e1360318211e05c1c5fec5eb82be00224`

The annotated release tag is:

`v2.2.0`

Tag object:

`df1acb238838ed814b969e20fe85a49253a92861`

The annotated tag dereferences exactly to the accepted release commit above. The tag is the immutable V2.2.0 release boundary; later documentation-only main commits do not change the tagged release contents.

## W6 accepted release evidence

Exact tested product-code SHA:

`8b10a59496a21a4d34cb95b99d0bd496f82bfd92`

Formal local report:

`docs/validation/LOCAL_VALIDATION_V2_2_W6.md`

Report-only commit:

`b1c55f65bc37990242b215a3d015e8dae91ea835`

Report-only GitHub CI:

`32964002626` / #566 — Ubuntu, Windows, Browser smoke, Windows media smoke all PASS.

Accepted W6 main:

`d629249f9dbc877eadc68ce61f47c16f80a883b1`

W6 proved on real Windows/browser/media/engines:

- Talking Head / 9:16 — PASS;
- Product Ad / 16:9 — PASS;
- Restart Recovery / 1:1 — PASS;
- all 16 Workflow Stages — PASS;
- Content Review / Assembly Review — PASS;
- real video-use transcription — PASS;
- HyperFrames motion — PASS;
- Remotion Final Render — PASS;
- FFmpeg/ffprobe and actual encoded-frame inspection — PASS;
- revision/idempotency/no-duplicate checks — PASS;
- durable reload/reopen and restart recovery — PASS;
- residual-process/lock cleanup — PASS.

No W6 release-blocking product defect remained and no product-code/config/test/schema/pin change was required during formal acceptance.

## V2.2.0 release metadata evidence

`package.json`, the package-lock top-level version, and `packages[""]` are all `2.2.0`.

The package-lock sync commit:

`8bddb2c4a174da98cef9bad760ab93691bc4d0d0`

changed exactly the two Video OS Studio version metadata fields. Local Codex verified `npm ci` and `npm run typecheck` with no additional lockfile drift. Final release-candidate GitHub CI Run #571 passed Ubuntu, Windows, Browser Smoke and Windows Media Smoke before PR #38 was merged.

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

## V2.3 active boundary

V2.3 Real AI Director / AI Editing Agent is active under the authoritative documents:

- `docs/prd/Video_OS_Studio_V2_3_Real_AI_Director_Agent_Master_PRD.md`;
- `docs/prd/Video_OS_Studio_V2_3_Development_Plan.md`.

A0 is accepted on main after exact-head CI Run #578 passed Ubuntu, Windows, Browser Smoke and Windows Media Smoke. A1 is accepted on main at `a307756c0a43b02d6c6ab2b74d4ec37110017d96` after PR #44 exact-head CI passed. A2 is accepted on main at `44c0bcc2d980feb1fece94cf9d1df3a98666824f` after PR #45 exact-head CI Run #593 passed Ubuntu verify, Windows verify, Browser Smoke and Windows Media Smoke.

A3 is accepted on main at `f102e8ac6ef87cfb4ca0579ee647d88e2b27e6a8` after PR #46. Its exact frozen provider HEAD `d438a57108334e0e1c68bab7882e79e209ea8143` passed GitHub Actions Run #625 on Ubuntu verify, Windows verify, Browser Smoke and Windows Media Smoke, then passed mandatory Local Codex validation on Windows 10 / Node `v24.20.0` using the subscribed Volcengine Agent Plan route `ark-code-latest → DeepSeek-V4-Pro`. The live gate proved a real SSE read-only turn, one real `get_project_context` tool execution, exactly two provider round trips, Project revision `11 → 11`, no Project mutation, no secret persistence/leakage, clean worktree, and unchanged frozen SHA.

A4 is accepted on main at `6cac2deeef20d98b667fee3b2cea49bc54b1600c` after PR #47. Its final frozen HEAD `dbe322863bbeb3af2c33bf245e0d569f40f6075e` passed GitHub Actions Run #661 on Ubuntu verify, Windows verify, Browser Smoke and Windows Media Smoke, then passed mandatory Local Real Browser Validation RETEST 4 on Windows 10 / Node `v24.20.0` with real Volcengine Agent Plan. The gate proved `get_project_context → propose_visual_plan`, model-visible proposal arguments limited to `intent`, a real percentage / Remotion `metric-focus` Proposal, Project revision `2 → 2` before Apply, structured Review/Diff with no mutation, explicit Apply `2 → 3` exactly +1, one logical Undo, durable Session reload/reopen, stale Proposal blocking after revision change, and no API-key persistence/leakage.

A5 owns the bounded bridge from the accepted Agent runtime to the accepted V2.2 Workflow Runtime. The intended chain is `Agent read/proposal tool → workflow-action Proposal → Review → explicit Apply → existing WorkflowService / WorkflowRunner / Durable Jobs`. Provider and tool handlers have no direct Workflow mutation authority. Allowed A5 actions are bounded Workflow status/artifact inspection plus explicitly confirmed first-draft creation, paused Workflow resume, failed/interrupted Stage retry, and final render only through the active `ASSEMBLY_REVIEW` checkpoint and accepted `FINAL_RENDER` Stage. Direct Workflow JSON writes, arbitrary Stage construction/status spoofing, direct engine spawn, and a second Job/Workflow runtime remain forbidden.

A5 first-draft creation uses a stable Agent-derived WorkflowRun UUID through the existing WorkflowService so identical confirmed retries cannot create duplicate Workflow runs. Existing Workflow status/updatedAt/checkpoint state is captured in the Proposal and revalidated before Apply; changed Workflow state makes the Proposal stale instead of bypassing the Workflow state machine. Project Schema remains `2.0.0`.

The experimental branch `feature/v2.2-w55-workflow-template` was not part of the accepted V2.2 Master PRD release path and must not be merged into V2.3 implicitly. Re-evaluate any useful idea only under an explicit V2.3 workstream.
