# Video OS Studio — Current Project Status

> Current-state source of truth for GPT Web, Local Codex, and other development agents. Historical PRs/validation reports are evidence; they do not override this file.

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
current_milestone: V2.2 WORKFLOW RUNTIME
v2_2_status: W5 FAILURE / RETRY / RESTART HARDENING ACTIVE
active_workstream: V2.2-W5 Failure / Retry / Restart Hardening
active_branch: feature/v2.2-w5-failure-retry-restart
active_pr: PENDING
local_validation_required: YES after cloud-green exact head
local_validation_contract: docs/validation/LOCAL_VALIDATION_V2_2_W5_CONTRACT.md
next_workstream_after_w5: W6 End-to-End Release Acceptance
future_milestone: V2.3 Real AI Director / AI Editing Agent
```

## Accepted delivery history

```text
V2.1.1 Engineering Hardening / Final Release  → COMPLETE
V2.1.1 tag v2.1.1                            → COMPLETE
V2.2 R0 Repository / Roadmap Sync             → PR #30 COMPLETE
V2.2 W0 Workflow Contract                     → PR #31 COMPLETE
V2.2 W1 Workflow Runtime Core                 → PR #32 COMPLETE
V2.2 W2 Existing Capability Stage Integration → PR #33 COMPLETE / main bfcc862a...
V2.2 W3 Human Review + Invalidation            → PR #34 COMPLETE / main 23193e53...
V2.2 W4 Workflow UI                            → PR #35 COMPLETE / main 6a443e56...
V2.2 W5 Failure / Retry / Restart Hardening    → ACTIVE
```

W2 exact-SHA Local Codex evidence: `docs/validation/LOCAL_VALIDATION_V2_2_W2.md`.

W4 exact-SHA Windows browser/media acceptance is complete. Tested code SHA `99a4476613e77563861601eaa07ecb3881bc6219`; formal report `docs/validation/LOCAL_VALIDATION_V2_2_W4.md`; PR-head report commit `fa018c32364d713a73279ade69926611720b4bf0`; PR #35 merged as accepted main `6a443e56c10b4935efedd65293b6dbd5584cbda1` after final cloud CI passed.

## Delivery sequence

```text
R0 Repository / Roadmap Sync              → COMPLETE
W0 Workflow Contract                      → COMPLETE
W1 Workflow Runtime Core                  → COMPLETE
W2 Existing Capability Stage Integration  → COMPLETE
W3 Human Review + Invalidation            → COMPLETE
W4 Workflow UI                            → COMPLETE
W5 Failure / Retry / Restart Hardening    → ACTIVE
W6 End-to-End Release Acceptance          → NEXT AFTER W5
```

## W5 scope contract

W5 hardens the accepted W4 product flow under process interruption, stale Project revisions, commit gaps, retry, and restart.

Required safety properties:

1. `WorkflowService` automatically recovers persisted running Workflows on process startup; normal reads do not require a manual recovery action.
2. Durable Job ownership remains Job truth. Active Jobs from a dead runtime are recovered as interrupted/terminal truth rather than guessed successful.
3. Project operation-log state is queryable so a mutation Stage can detect that an earlier Workflow attempt already committed its Project transaction.
4. Retry preserves historical Workflow operation IDs and skips an already-applied Project mutation instead of duplicating Caption/Motion/B-roll/Timeline output.
5. A Job that failed because its `expectedRevision` became stale remains non-retryable with the same Job input, while the Workflow can start a fresh Job using the latest Project revision.
6. Workflow retry refreshes `lastKnownProjectRevision` before a new Stage attempt.
7. Final Render records `sourceProjectRevision`; a completed MP4 produced from an older revision is rejected as stale and a retry creates a fresh render Job.
8. Existing W4 UI/API/Workflow behavior, Project Schema `2.0.0`, and engine pins remain unchanged.
9. No Real AI Provider / V2.3 Agent work enters W5.

## W5 cloud gate

```text
format / lint / typecheck / unit / build
existing Workflow runtime/recovery tests
new startup-recovery tests
Project operation-state/idempotency tests
commit-gap retry test proving no duplicate Project mutation
stale Project Job → fresh Workflow Job semantics
stale Final Render rejection + fresh render retry
existing H6/W4 browser regression
Windows media regression smoke
```

## Mandatory W5 Local Codex gate before merge

GPT Web must first produce a fully cloud-green exact W5 SHA. Local Codex then follows:

`docs/validation/LOCAL_VALIDATION_V2_2_W5_CONTRACT.md`

Mandatory Windows chaos matrix:

```text
C1 kill during transcription
C2 Project Transaction committed but Workflow Stage completion not persisted
C3 kill/fail during HyperFrames
C4 kill during Final Render
C5 edit Project while a long mutation Stage is running
C6 retry failed mutation Stage and prove no duplicate output
```

Also prove startup auto-recovery, stale Final Render rejection, one final clean healthy run, valid MP4/ffprobe, durable reload/reopen state, no Workflow-linked non-terminal Jobs, and no W5-scoped residual processes.

Any code/config/test fix from Local Codex must be pushed to the same W5 branch and returned to GPT Web for code review + CI. Do not merge or start W6 locally.

## Active V2.2 documents

```text
docs/prd/Video_OS_Studio_V2_2_Workflow_Runtime_Master_PRD.md
docs/prd/Video_OS_Studio_V2_2_Development_Plan.md
docs/validation/LOCAL_VALIDATION_V2_2_W2.md
docs/validation/LOCAL_VALIDATION_V2_2_W4.md
docs/validation/LOCAL_VALIDATION_V2_2_W5_CONTRACT.md
```

## Accepted engine / schema invariants

```text
Project Schema:       2.0.0
remotion:             4.0.513
@remotion/player:     4.0.513
@remotion/cli:        4.0.513
hyperframes:          0.8.10
@playwright/test:     1.62.1
```

Always preserve:

```text
Source Media != Project Canvas != Export Profile
Project != Workflow != Job
REUSE > MODIFY > CREATE
```

- Project JSON is durable video-editing truth.
- Project operation log is durable Project mutation idempotency truth.
- Workflow state remains under `VIDEO_OS_DATA_ROOT/workflows`.
- Durable Jobs remain concrete execution truth.
- Workflow Stage code never directly spawns FFmpeg, Remotion, HyperFrames, or video-use.
- Long-running mutation work preserves revision/idempotency contracts.

## PR #18 disposition

PR #18 remains closed/unmerged and is future V2.3 Agent architecture input only.

## Next allowed phase

Continue W5 online through code review, tests, PR, and CI until an exact cloud-green W5 SHA is frozen. Only then stop for Local Codex. Do not merge W5 before exact-SHA Windows chaos acceptance. Do not begin W6 before W5 merge.

## Read order for agents

1. resolve live GitHub `main`, active branch/PR and CI state;
2. `PROJECT_STATUS.md`;
3. `AGENTS.md`;
4. `SYSTEM.md`;
5. `docs/prd/Video_OS_Studio_V2_2_Workflow_Runtime_Master_PRD.md`;
6. `docs/prd/Video_OS_Studio_V2_2_Development_Plan.md`;
7. `docs/validation/LOCAL_VALIDATION_V2_2_W5_CONTRACT.md` only after GPT Web supplies an exact cloud-green SHA.
