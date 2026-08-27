# Video OS Studio — Current Project Status

> Current-state source of truth for GPT Web, Local Codex, and other development agents. Historical PRs and validation reports remain evidence; they do not override this file.

## Current checkpoint

```yaml
released_product_version: 2.3.0
hardening_candidate_version: 2.3.1
project_schema: 2.0.0
release_status: V2.3.0 RELEASE COMPLETE
release_tag: v2.3.0
release_tag_type: annotated
release_tag_object_sha: 24069497b1986348510ef0d904382f5c3f99855d
release_commit: 562ffb26d5a04bd2898513893258f857187a00b4
previous_release_tag: v2.2.0
previous_release_commit: 0e813e5e1360318211e05c1c5fec5eb82be00224

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
v2_3_a5_main: 4affcaf4c5c050b40c8b3a1f4b5920ac04a4c8ad
v2_3_a6_main: 05c331947b6d3704daa680e66d5e0cbe1d4982ed
v2_3_a7_main: 84e2826164ce6557cd99c4b42006ee703773c882
v2_3_release_main: 562ffb26d5a04bd2898513893258f857187a00b4
v2_3_post_release_docs_main: 7cb308a773bb910011c471e714182a5368a1d459

release_pr: 51
package_json_version: 2.3.0
package_lock_version: 2.3.0
package_lock_sync_commit: 3e511860a68570988344b48dcdbf28bcc9eee2d5
release_final_ci_run: 33098478140
release_final_ci_number: 706

active_development_workstream: V2.3.1 ENGINEERING HARDENING
active_hardening_stage: R0 HARDENING TRUTH / PRD SYNC
active_branch: planning/v2.3.1-engineering-hardening
local_action_required: NONE FOR R0
next_action: COMPLETE R0 CLOUD CI AND MERGE, THEN BEGIN H0 CORRECTNESS / RESOURCE HYGIENE
v2_4_status: NOT STARTED
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
A5 Agent ↔ Workflow Integration           → COMPLETE / PR #48
A6 Failure / Revision / Restart Hardening → COMPLETE / PR #49
A7 End-to-End Product Acceptance          → COMPLETE / PR #50
V2.3.0 Release Finalization               → COMPLETE / PR #51
Release tag v2.3.0                        → VERIFIED
Post-release truth sync                   → COMPLETE / PR #52
```

## V2.3.1 Engineering Hardening status

Authoritative documents:

- `docs/prd/Video_OS_Studio_V2_3_1_Engineering_Hardening_Master_PRD.md`
- `docs/prd/Video_OS_Studio_V2_3_1_Development_Plan.md`

Planned delivery sequence:

```text
R0 Hardening Truth / PRD Sync              → ACTIVE
H0 Correctness / Resource Hygiene          → NOT STARTED
H1 Editing Commit Boundary                 → NOT STARTED
H2 Playback / Timeline / Waveform          → NOT STARTED
H3 Durable Runtime I/O                     → NOT STARTED
H4 Local-First Security Boundary           → NOT STARTED
H5 End-to-End Patch Acceptance             → NOT STARTED
V2.3.1 Release Finalization                → NOT STARTED
```

V2.3.1 is a bounded patch/hardening release. It must preserve the accepted V2.3.0 architecture and must not silently become V2.4.

Admitted focus areas include:

- Remotion Player remount-safe event bridge;
- editing draft/commit boundaries so one user intent maps to one logical Project mutation;
- explicit Prettier dependency;
- provider/Agent iterator and HTTP resource cleanup;
- HyperFrames/Remotion temporary artifact cleanup;
- safe server error boundaries and Agent tool diagnostics;
- bounded provider response parsing;
- Timeline/Script frame-frequency rendering boundaries;
- Waveform request caching/deduplication;
- async current-project response guards and reduced recent-project refresh frequency;
- Workflow/Job I/O optimization without weakening durable truth;
- crash-safe operation-log compaction design;
- loopback/trusted-origin local security hardening.

Explicitly forbidden shortcuts include removing accepted Windows durability locks merely for performance, replacing durable truth with in-memory-only events, weakening unknown-tool fail-closed behavior, enabling arbitrary model strings, or bypassing Agent Proposal/Review/Confirm boundaries.

## Release truth

The accepted immutable V2.3.0 release commit is:

`562ffb26d5a04bd2898513893258f857187a00b4`

The annotated release tag is:

`v2.3.0`

Tag object:

`24069497b1986348510ef0d904382f5c3f99855d`

The annotated tag dereferences exactly to the accepted release commit above. The tag is the immutable V2.3.0 release boundary; later documentation-only or V2.3.1 development commits do not change the tagged release contents.

Previous immutable release evidence remains:

- tag: `v2.2.0`;
- release commit: `0e813e5e1360318211e05c1c5fec5eb82be00224`;
- annotated tag object: `df1acb238838ed814b969e20fe85a49253a92861`.

## V2.3 A7 accepted evidence

Frozen exact tested A7 head:

`ae33d177ccefda1a66cf28bb266c48282ca99930`

Cloud CI:

Run #701 / `33091281417` — Ubuntu Verify, Windows Verify, Browser Smoke and Windows Media Smoke all PASS.

Accepted A7 main:

`84e2826164ce6557cd99c4b42006ee703773c882`

Formal local acceptance used Windows / Node `v24.20.0` with real `volcengine-agent-plan / ark-code-latest`.

### Case A — Talking Head selected-context Agent edit

PASS.

- real Talking Head Project stopped before Motion Generation;
- normal Studio compound Scene + Caption selection persisted simultaneously;
- real `propose_visual_plan` kept model input bounded to `intent` while server-side selection matched Studio context;
- scoped actionable Remotion proposal;
- Proposal and Review produced no mutation;
- Apply mutated Project exactly +1;
- no duplicate visual/operation;
- Session / Proposal / applied visual survived reload/reopen.

### Case B — Product Ad / real encoded MP4

PASS.

- real 1920×1080 / 30 fps Product Ad source with proof/number/CTA;
- real Agent scoped proof Proposal and explicit Apply exactly +1;
- accepted Agent visual survived the existing Workflow Runtime;
- FINAL_RENDER completed on attempt 1;
- real final MP4 verified as H.264 / 1920×1080 / 30 fps / AAC;
- extracted frames from the encoded MP4 visually proved the accepted Agent treatment was present;
- no duplicate motion/B-roll/CTA/assets or duplicate Apply operation.

### Case C — stale / Re-plan latest

PASS.

- real durable Session reused across turns;
- P1 created at revision N without mutation;
- normal manual Project command moved N → N+1;
- P1 Apply Selected and Apply All blocked with `AGENT_PROPOSAL_STALE`;
- Re-plan latest created P2 at N+1 with latest manual edit in Project truth;
- P2 Review remained non-mutating;
- Apply moved exactly N+1 → N+2;
- manual edit preserved and no duplicate mutation/visual/operation.

### Case D — restart / recovery

PASS.

- server stopped cleanly and restarted on the same exact SHA/data root;
- same Project and same Agent Session rediscovered;
- user/assistant history and Proposal statuses restored;
- manual edit and both accepted Agent visuals restored;
- fresh real read-only `get_project_context` turn observed latest revision and did not mutate it;
- no duplicate operation, stale lock or orphan process.

Security gates across A7 passed: no API-key/Authorization persistence or exposure, no provider secret tracking, no unsafe local path exposure to the model, no raw media upload to the LLM provider, clean repository and unchanged exact SHA.

## V2.3 release metadata evidence

Release package version:

`2.3.0`

`package.json`, the package-lock top-level version, and `packages[""]` are all `2.3.0`.

The package-lock sync commit is:

`3e511860a68570988344b48dcdbf28bcc9eee2d5`

Local Codex on Windows / Node `v24.20.0` / npm `11.19.0` generated the real lockfile metadata using `npm install --package-lock-only --ignore-scripts --no-audit --no-fund`.

Verified metadata:

- package.json version `2.3.0`;
- package-lock root version `2.3.0`;
- `packages[""]` version `2.3.0`;
- dependency version drift: none;
- engine pin drift: none;
- `npm ci`: PASS;
- `npm run typecheck`: PASS;
- `git diff --check`: PASS;
- clean tree after push.

Final exact-head release CI on `5d18c20b0586c9c997eb05572fb80565c3da4079` passed GitHub Actions Run #706 / `33098478140` across Ubuntu Verify, Windows Verify, Browser Smoke and Windows Media Smoke. PR #51 then merged to main as release commit `562ffb26d5a04bd2898513893258f857187a00b4`. Annotated tag `v2.3.0` was created and independently verified to dereference exactly to that release commit.

## Accepted invariants

```text
Project Schema:       2.0.0
Node:                 24.x
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

- Project JSON remains durable editing truth.
- Workflow durable state remains separate from Project Schema.
- Durable Job runtime remains concrete execution truth.
- Workflow Stages use registered services/jobs/transactions and do not directly spawn engines.
- Long-running mutation work preserves Project revision and operation idempotency contracts.
- Agent/provider/tool execution has no direct Project or Workflow mutation authority.
- Agent mutation requires a validated Proposal plus explicit Review/Apply/Confirm boundary.
- stale Project/Workflow state fails closed.
- server-side Studio selection is authoritative; model-facing tools cannot invent selection IDs.

## Accepted V2.3 architecture

```text
User editing goal
→ durable Agent Session
→ bounded Project / Script / Scene / Clip / Selection / Workflow context
→ provider-neutral Agent Runner
→ production provider + allow-listed typed tools
→ validated Proposal
→ Review / Diff
→ explicit user confirmation
→ existing Project Command / WorkflowService / WorkflowRunner / Durable Jobs
→ latest durable Project truth
→ Remotion final render when Workflow reaches FINAL_RENDER
```

Production real-provider route accepted in V2.3:

`volcengine-agent-plan / ark-code-latest`

Existing provider abstraction also contains OpenAI Responses and DeepSeek Chat Completions adapters, but release acceptance used the Volcengine Agent Plan route above.

## V2.3 milestone evidence

A3 accepted production real-provider behavior with a real tool loop and no mutation/secret leakage.

A4 accepted Agent Workspace, durable Sessions, real visual Proposal → Review/Diff → explicit Apply/Undo, stale blocking and reload/reopen.

A5 accepted Agent ↔ Workflow proposal-only integration, dedicated Workflow Action Review, no mutation before confirmation, and execution through existing Workflow Runtime.

A6 accepted backup self-heal, restart/recovery, provider cancel→fresh retry, stale conflicts, concurrent duplicate Apply idempotency, safe error handling and Windows media regression.

A7 accepted the complete real product path and final encoded-video proof described above.

## Release completion boundary

PR #51 was metadata/finalization only. It changed release metadata and repository release truth without changing product code, Project Schema, engine pins, tests, provider behavior, Agent/Workflow/Job architecture, or accepted A7 behavior.

The completed V2.3.0 release sequence is:

1. A7 product acceptance completed and merged;
2. package and lockfile metadata synchronized to `2.3.0`;
3. final exact-head GitHub CI #706 passed all four jobs;
4. PR #51 merged as `562ffb26d5a04bd2898513893258f857187a00b4`;
5. annotated tag `v2.3.0` was created;
6. tag object `24069497b1986348510ef0d904382f5c3f99855d` was verified to target that exact release commit;
7. post-release documentation PR #52 merged as `7cb308a773bb910011c471e714182a5368a1d459`.

V2.3.1 Engineering Hardening is now the only active development workstream. V2.4 is not active and must not begin implicitly inside hardening work.

The experimental branch `feature/v2.2-w55-workflow-template` remains outside the accepted release path and must not be merged implicitly.