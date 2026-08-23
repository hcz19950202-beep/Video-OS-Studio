# Video OS Studio — Current Project Status

> This file is the current-state source of truth for GPT Web, local Codex, and other development agents. Historical PRs and validation reports remain evidence; they do not override this file.
>
> When read from a release/finalization branch, this state is proposed until the branch merges into `main`.

## Current checkpoint

```yaml
product_version: 2.1.1
project_schema: 2.0.0
current_milestone: V2.1.1 Engineering Hardening COMPLETE
last_completed_workstream: H7 Frontend Consolidation
accepted_h7_main: 06481c1d78c93bcadfa4be7ec58dd4c250cc19c3
final_release_acceptance_pr: 27
final_release_acceptance_status: COMPLETE
accepted_release_acceptance_main: d4a55629b3f28b83fc71ef27ebb9acd8ec7bfcce
final_release_frozen_input: d0d85fe8ea0fe85956ffb50c70fe58b81f6681cf
final_release_validation_head: 6171ad92a6396a82582f893c90d15b283e09d7eb
final_release_ci: 32645693957 PASS
release_finalization_branch: release/v2.1.1
release_tag_target: v2.1.1
v2_2_status: NOT STARTED; blocked until release finalization is merged and v2.1.1 tag is created
```

## Release decision

V2.1.1 Final Release Acceptance is **PASS**.

Authority:

- `docs/prd/Video_OS_Studio_V2_1_1_Engineering_Hardening_Master_PRD.md`
- `docs/validation/LOCAL_VALIDATION_V2_1_1_FINAL_RELEASE.md`
- accepted H0–H7 validation reports
- PR #27 exact-head CI Run `32645693957`

The final acceptance established:

```text
REPOSITORY TRUTH: PASS
DATA CORRECTNESS: PASS
TRANSACTION SAFETY: PASS
ENGINE RUNTIME: PASS
DURABLE JOBS: PASS
STREAMING MEDIA: PASS
DATA HARDENING: PASS
AUTOMATED ACCEPTANCE: PASS
ZERO KNOWN SILENT DATA LOSS: PASS
ZERO UNBOUNDED RENDER CONCURRENCY: PASS
ZERO DEFAULT RUNTIME REMOTION DOWNLOAD: PASS
ZERO FULL-FILE RANGE BUFFERING: PASS
UBUNTU CI: PASS
WINDOWS CI: PASS
LOCAL WINDOWS MEDIA/ENGINE SMOKE: PASS
RESTART RECOVERY: PASS
V2.1 REGRESSION: PASS
```

Final local release evidence also passed:

- complete real-browser release flow;
- encoded Final Render proof that image B-roll is present in the exported MP4;
- Remotion Final Render on pinned `4.0.513`;
- HyperFrames on pinned `0.8.10`;
- real local video-use evidence;
- sanitized security/error boundaries.

Release acceptance found and fixed two release blockers before approval:

1. `V2.1.1-REL-001` — video-use now follows the active video clip on `video-main` when multiple video Assets exist.
2. `V2.1.1-REL-002` — image B-roll remains above same-layer video B-roll in final composition/render order.

Regression coverage exists in:

- `tests/video-use.test.ts`
- `tests/h7/master-composition-media.test.ts`

## Delivery history

```text
R0 Repository Truth / Agent Guardrails  → PR #17 COMPLETE
H0 Correctness Hotfix                   → PR #19 COMPLETE
H1 Project Transaction Safety           → PR #20 COMPLETE
H2 Engine Process Runtime               → PR #21 COMPLETE
H3 Durable Job Runtime                  → PR #22 COMPLETE
H4 Streaming Media Pipeline             → PR #23 COMPLETE
H5 Project / Data Hardening             → PR #24 COMPLETE
H6 Automated Acceptance                 → PR #25 COMPLETE
H7 Frontend Consolidation               → PR #26 COMPLETE
V2.1.1 Final Release Acceptance         → PR #27 COMPLETE
V2.1.1 Release Finalization             → ACTIVE on release/v2.1.1
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
```

And:

1. Project JSON is the durable Project source of truth.
2. Canonical internal timeline timing is frame-based.
3. Durable edits use validated Commands / Transactions / bounded services.
4. Agents do not directly hand-edit runtime `project.json`.
5. UI modules do not spawn FFmpeg, Remotion, HyperFrames, or video-use directly.
6. Remotion remains the master composition/render engine.
7. HyperFrames remains the deterministic complex-motion asset engine.
8. video-use and FFmpeg/ffprobe remain behind adapters/services.
9. `VIDEO_OS_DATA_ROOT` remains outside repository code by default.
10. Studio theme/locale remains separate from generated-video Brand.
11. `REUSE > MODIFY > CREATE`.

## Finalization gate

The only remaining V2.1.1 release-finalization actions are:

```text
release/v2.1.1 full CI PASS
→ merge release/v2.1.1 into main
→ create tag v2.1.1 on the accepted release commit
```

Do not start V2.2 implementation before those actions are complete.

After the tag exists, V2.2 may move from BLOCKED to planning/implementation under a new PRD/workstream; do not reuse V2.1.1 hardening branches for V2.2.

## Read order for agents

1. resolve live GitHub `main`, release branch, PR, CI, and tag state;
2. `PROJECT_STATUS.md`;
3. `AGENTS.md`;
4. `SYSTEM.md`;
5. `docs/validation/LOCAL_VALIDATION_V2_1_1_FINAL_RELEASE.md` for final release evidence;
6. accepted H0–H7 validation reports for historical gate details.

If live GitHub state conflicts with this file, stop and resolve the conflict rather than guessing.
