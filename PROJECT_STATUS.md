# Video OS Studio — Current Project Status

> Current-state source of truth for GPT Web, Local Codex, and other development agents. Historical PRs and validation reports remain evidence; they do not override this file.

## Current checkpoint

```yaml
product_version: 2.1.1
project_schema: 2.0.0
released_baseline: v2.1.1
release_status: COMPLETE
release_tag: v2.1.1
release_tag_sha: 223b66799baf5b5faf1d1321a671d3fb5c6a0930

v2_2_r0_main: 64c6ea3ece5770a2999a67dabec8d83837aa62d2
v2_2_w0_main: 9914b1e65d27a7d40e997295d94eeb5ce4c3deea
v2_2_w1_main: 5c98117a2ca30217ac8865e99eb87fe410ee7192
v2_2_w2_main: bfcc862aed29969e61c5c3723179585e6c583a07
v2_2_w3_main: 23193e537a2c403f8d3c82806db991603cb27dca
v2_2_w4_main: 6a443e56c10b4935efedd65293b6dbd5584cbda1
v2_2_w5_main: 2bdbe3aa229513e22da5bba51202609743a718b3

current_milestone: V2.2 WORKFLOW RUNTIME
v2_2_status: W6 END-TO-END PRODUCT ACCEPTANCE ACTIVE
active_workstream: V2.2-W6 End-to-End Product Acceptance
active_branch: release/v2.2-final-acceptance
active_pr: PENDING
local_validation_required: YES after cloud-green exact head
local_validation_contract: docs/validation/LOCAL_VALIDATION_V2_2_W6_CONTRACT.md
next_after_w6: V2.2 release finalization
future_milestone: V2.3 Real AI Director / AI Editing Agent
```

## Accepted delivery history

```text
V2.1.1 Engineering Hardening / Final Release  → COMPLETE
V2.1.1 tag v2.1.1                            → COMPLETE
V2.2 R0 Repository / Roadmap Sync             → PR #30 COMPLETE
V2.2 W0 Workflow Contract                     → PR #31 COMPLETE
V2.2 W1 Workflow Runtime Core                 → PR #32 COMPLETE
V2.2 W2 Existing Capability Stage Integration → PR #33 COMPLETE
V2.2 W3 Human Review + Invalidation            → PR #34 COMPLETE
V2.2 W4 Workflow UI                            → PR #35 COMPLETE
V2.2 W5 Failure / Retry / Restart Hardening    → PR #36 COMPLETE / main 2bdbe3aa...
V2.2 W6 End-to-End Product Acceptance          → ACTIVE
```

## W5 accepted evidence

W5 exact tested product-code SHA:

`b1cf950fe1fc7802a2e05c35a3ad0b00f16f1abc`

Local Windows chaos acceptance:

`docs/validation/LOCAL_VALIDATION_V2_2_W5.md`

Final report-only head:

`64f9243ff6de0ef4336f20906905275ccae75b14`

Final CI:

`32843034099` — PASS.

Accepted W5 main:

`2bdbe3aa229513e22da5bba51202609743a718b3`

The accepted W5 evidence includes real Windows browser/media/video-use/HyperFrames/Remotion/FFmpeg execution, C1-C6 chaos cases, exact revision/idempotency checks, final encoded MP4 proof, and zero W5-scoped residual processes.

## W6 authority and scope

W6 is the Master PRD's **End-to-End Product Acceptance** workstream. It is a release gate, not a new Workflow engine or a new large UI workstream.

W6 must prove the released product flow on fresh isolated `VIDEO_OS_DATA_ROOT` roots:

```text
Open Video OS
→ Create Project
→ Import real source media
→ Select Scenario
→ Generate First Draft
→ observe durable Workflow progress
→ Content Review
→ approve / continue
→ Assembly Review
→ approve / continue
→ Final Render
→ download/reopen/verify durable result
```

Required real cases:

```text
Case A — Talking Head — 9:16
Case B — Product Ad — 16:9
Case C — Restart Recovery — 1:1
```

Final encoded output must be verified with `ffprobe` and extracted frames. Product Ad acceptance must include Brand, available B-roll, HyperFrames motion, Audio, proof/number treatment and CTA evidence in the final Project/output. Restart acceptance must prove no duplicate Caption/Motion/B-roll, no Project corruption and no lost completed Stage state.

## W6 development model

```text
GPT Web + GitHub
→ W6 branch / acceptance contract / cloud-safe checks / PR / CI / review / bounded fixes / merge / PROJECT_STATUS

Local Codex on Windows
→ exact-SHA real browser / real media / FFmpeg / video-use / HyperFrames / Remotion / forced restart / final MP4 proof
```

Sequence:

```text
1. GPT Web prepares W6 release-acceptance branch and contract.
2. GitHub CI must be green on an exact W6 head.
3. Freeze that exact SHA.
4. Local Codex executes the W6 contract on Windows using isolated data roots.
5. Any demonstrated W6 release-blocker fix is pushed to this same branch with regression coverage.
6. GPT Web reviews the new head and CI; affected local acceptance is rerun on the new exact SHA.
7. When all W6 gates pass, commit the formal validation report, run final CI, merge W6, then perform V2.2 release finalization.
```

## W6 hard boundaries

Do not introduce during W6 unless a demonstrated release blocker requires a bounded fix:

- Real OpenAI / Claude / Gemini provider;
- multi-turn AI Editing Agent;
- a second Workflow or Job system;
- Project Schema migration;
- large navigation/editor redesign;
- arbitrary plugin/tool execution;
- generated image/video provider;
- unrelated template/productization architecture.

The experimental branch `feature/v2.2-w55-workflow-template` is **not part of the authoritative V2.2 Master PRD W6 path and must not be merged into W6**. Re-evaluate it only after V2.2 release under a separately approved scope.

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
- Workflow durable state remains under `VIDEO_OS_DATA_ROOT/workflows`.
- Durable Job runtime remains concrete execution truth.
- Workflow Stages use registered services/jobs/transactions and do not directly spawn engines.
- Long-running mutation work preserves Project revision and operation idempotency contracts.
- Workflow state does not enter Project Schema.

## Current stop rule

Continue GPT Web + GitHub preparation until the W6 branch has a cloud-green exact SHA. Only then hand that exact SHA to Local Codex. Local Codex must not merge the PR, start V2.3, or redesign architecture.

## Read order for agents

1. resolve live GitHub `main`, W6 branch/PR and CI state;
2. this `PROJECT_STATUS.md`;
3. `AGENTS.md`;
4. `SYSTEM.md`;
5. `docs/prd/Video_OS_Studio_V2_2_Workflow_Runtime_Master_PRD.md`;
6. `docs/prd/Video_OS_Studio_V2_2_Development_Plan.md`;
7. `docs/validation/LOCAL_VALIDATION_V2_2_W6_CONTRACT.md` once the exact cloud-green SHA is frozen.
