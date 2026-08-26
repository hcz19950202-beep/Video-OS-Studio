# Video OS Studio — Current Project Status

> Current-state source of truth for GPT Web, Local Codex, and other development agents. Historical PRs and validation reports remain evidence; they do not override this file.

## Current checkpoint

```yaml
product_version_candidate: 2.2.0
project_schema: 2.0.0
released_baseline: v2.1.1
release_status: V2.2 FINALIZATION ACTIVE

v2_2_r0_main: 64c6ea3ece5770a2999a67dabec8d83837aa62d2
v2_2_w0_main: 9914b1e65d27a7d40e997295d94eeb5ce4c3deea
v2_2_w1_main: 5c98117a2ca30217ac8865e99eb87fe410ee7192
v2_2_w2_main: bfcc862aed29969e61c5c3723179585e6c583a07
v2_2_w3_main: 23193e537a2c403f8d3c82806db991603cb27dca
v2_2_w4_main: 6a443e56c10b4935efedd65293b6dbd5584cbda1
v2_2_w5_main: 2bdbe3aa229513e22da5bba51202609743a718b3
v2_2_w6_main: d629249f9dbc877eadc68ce61f47c16f80a883b1

current_milestone: V2.2 RELEASE FINALIZATION
active_workstream: V2.2.0 Release Finalization
active_branch: release/v2.2.0
active_pr: PENDING
local_action_required: PACKAGE-LOCK VERSION SYNC ONLY
next_after_release: V2.3 planning under a new approved PRD/workstream
```

## Accepted V2.2 delivery history

```text
R0 Repository / Roadmap Sync              → COMPLETE / PR #30
W0 Workflow Contract                      → COMPLETE / PR #31
W1 Workflow Runtime Core                  → COMPLETE / PR #32
W2 Existing Capability Stage Integration  → COMPLETE / PR #33
W3 Human Review + Invalidation            → COMPLETE / PR #34
W4 Workflow UI                            → COMPLETE / PR #35
W5 Failure / Retry / Restart Hardening    → COMPLETE / PR #36
W6 End-to-End Product Acceptance          → COMPLETE / PR #37 / main d629249f...
```

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
- FFmpeg/ffprobe — PASS;
- actual encoded MP4 frame inspection — PASS;
- revision/idempotency/no-duplicate checks — PASS;
- durable reload/reopen and restart recovery — PASS;
- residual-process/lock cleanup — PASS.

No W6 release-blocking product defect remained and no product-code/config/test/schema/pin change was required during formal acceptance.

## V2.2 release finalization scope

This workstream is release metadata only. It must not add product behavior.

Required finalization:

1. package version `2.1.1` → `2.2.0`;
2. package-lock root/package version synchronized by real npm tooling;
3. repository status/readme updated to V2.2 released truth;
4. GitHub CI green on the final release candidate;
5. merge release PR;
6. create tag `v2.2.0` on the accepted release-finalization main commit;
7. verify the tag resolves exactly to accepted main.

No additional real-media Local Codex acceptance is required because W6 already supplied the final exact-SHA Windows/browser/media/engine evidence. Local Codex is used in this workstream only to generate the npm lockfile version sync from the branch rather than hand-authoring lockfile contents.

## Hard boundaries

Do not introduce:

- Real AI Provider / OpenAI / Claude / Gemini runtime;
- multi-turn AI Editing Agent;
- Project Schema migration;
- engine pin changes;
- new Workflow or Job architecture;
- template/productization experiments;
- editor redesign;
- unrelated fixes/refactors.

The experimental `feature/v2.2-w55-workflow-template` branch remains outside the accepted V2.2 release and must not be merged into this release.

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

## Development ownership

```text
GPT Web + GitHub
→ release branch, package metadata, status/readme, PR, CI, review, merge, release truth

Local Codex
→ only the real npm-generated package-lock version sync on release/v2.2.0; no product changes, no merge
```

## Current stop rule

Do not start V2.3 before V2.2.0 release finalization is merged and tag `v2.2.0` is verified. Any unexpected product-code/config/test change invalidates this metadata-only release path and must be reviewed separately.
