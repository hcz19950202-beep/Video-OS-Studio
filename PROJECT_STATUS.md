# Video OS Studio — Current Project Status

> This file is the current-state source of truth for GPT Web, local Codex, and other development agents. Historical PRs and validation reports remain evidence; they do not override this file.

## Current checkpoint

```yaml
product_version: 2.1.1
project_schema: 2.0.0
released_baseline: v2.1.1
release_status: COMPLETE
release_main_sha: 223b66799baf5b5faf1d1321a671d3fb5c6a0930
release_tag: v2.1.1
release_tag_sha: 223b66799baf5b5faf1d1321a671d3fb5c6a0930
accepted_main_at_v2_2_start: 6f0487f6b5b65d85083c96bc54e14bca37fb5704
current_milestone: V2.2 WORKFLOW RUNTIME
v2_2_status: PLANNING / R0 REPOSITORY ROADMAP SYNC ACTIVE
active_workstream: V2.2-R0 Repository / Roadmap Sync
active_branch: planning/v2.2-workflow-runtime
active_pr: 30
local_validation_required: NO for R0
next_workstream_after_r0: W0 Workflow Contract
future_milestone: V2.3 Real AI Director / AI Editing Agent
```

## V2.1.1 release truth

Video OS Studio **V2.1.1 is released and accepted**.

The release tag `v2.1.1` resolves to:

```text
223b66799baf5b5faf1d1321a671d3fb5c6a0930
```

V2.1.1 Final Release Acceptance established:

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

Final local release evidence also passed complete browser flow, real encoded image B-roll proof, Remotion `4.0.513`, HyperFrames `0.8.10`, real video-use and sanitized runtime/security boundaries.

Historical authority:

- `docs/prd/Video_OS_Studio_V2_1_1_Engineering_Hardening_Master_PRD.md`
- `docs/validation/LOCAL_VALIDATION_V2_1_1_FINAL_RELEASE.md`
- accepted H0–H7 validation reports
- PR #27 final release acceptance
- PR #28 release finalization
- tag `v2.1.1`

## V2.2 product decision

V2.2 is now the active planned milestone.

The V2.2 objective is:

> Connect the existing Video OS capabilities into a durable, visible, reviewable and retryable production Workflow so a user can import a real video and generate an editable first draft without manually triggering every subsystem.

Target flow:

```text
Create Project
→ Import source video
→ Select Scenario
→ Generate First Draft
→ Media / Transcript / Script / Scenes / Captions / Visual Plan
→ Human Review
→ Motion / B-roll / Audio / Timeline Assembly
→ Preview
→ Human Review
→ Final Render
```

V2.2 deliberately keeps the existing deterministic/rules Director as the planning source where applicable. A production Real AI Provider / multi-turn AI Editing Agent is **not V2.2 scope** and remains V2.3.

## Active V2.2 documents

Authoritative V2.2 documents:

```text
docs/prd/Video_OS_Studio_V2_2_Workflow_Runtime_Master_PRD.md
docs/prd/Video_OS_Studio_V2_2_Development_Plan.md
```

The first workstream is documentation/governance only:

```text
V2.2-R0 Repository / Roadmap Sync
```

R0 must not add product code and does not require local Codex validation.

## V2.2 delivery sequence

```text
R0 Repository / Roadmap Sync
→ W0 Workflow Contract
→ W1 Workflow Runtime Core
→ W2 Existing Capability Stage Integration
→ W3 Human Review + Invalidation
→ W4 Workflow UI
→ W5 Failure / Retry / Restart Hardening
→ W6 End-to-End Release Acceptance
→ V2.2 Release Finalization
```

Local validation policy:

```text
R0: NO
W0: NO
W1: normally NO; real process recovery is proven later in W5
W2: YES for FFmpeg/video-use/HyperFrames/Remotion/real media
W3: conditional; otherwise covered with W4/W5
W4: YES for real Windows browser/media flow
W5: YES and release-blocking
W6: YES and release-blocking
```

## Development ownership

```text
GPT Web + GitHub
→ PRD / architecture / cloud-safe code / tests / branch / PR / CI / review / merge / status

Local Codex on Windows
→ exact-SHA real browser/media/engine/restart acceptance + in-scope fixes + evidence
```

GitHub is the single code source of truth. Local Codex validates the exact active branch/SHA supplied by GPT Web and pushes fixes back to that same branch. It does not start a parallel implementation, merge, or start the next workstream.

## Delivery history

```text
V2.1.1 R0 Repository Truth / Agent Guardrails  → PR #17 COMPLETE
V2.1.1 H0 Correctness Hotfix                   → PR #19 COMPLETE
V2.1.1 H1 Project Transaction Safety           → PR #20 COMPLETE
V2.1.1 H2 Engine Process Runtime               → PR #21 COMPLETE
V2.1.1 H3 Durable Job Runtime                  → PR #22 COMPLETE
V2.1.1 H4 Streaming Media Pipeline             → PR #23 COMPLETE
V2.1.1 H5 Project / Data Hardening             → PR #24 COMPLETE
V2.1.1 H6 Automated Acceptance                 → PR #25 COMPLETE
V2.1.1 H7 Frontend Consolidation               → PR #26 COMPLETE
V2.1.1 Final Release Acceptance                → PR #27 COMPLETE
V2.1.1 Release Finalization                    → PR #28 COMPLETE
V2.1.1 Tag                                     → v2.1.1 COMPLETE
V2.1.1 released-status repository sync         → COMPLETE on main 6f0487f...
V2.2 R0 Repository / Roadmap Sync              → PR #30 ACTIVE
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
```

And:

1. Project JSON is the durable Project source of truth.
2. Canonical internal timeline timing is frame-based.
3. Durable edits use validated Commands / Transactions / bounded services.
4. Workflow orchestrates existing capabilities; it does not become a second Job system.
5. Agents do not directly hand-edit runtime `project.json`.
6. UI/Workflow modules do not spawn FFmpeg, Remotion, HyperFrames or video-use directly.
7. Remotion remains the master composition/render engine.
8. HyperFrames remains the deterministic complex-motion asset engine.
9. video-use and FFmpeg/ffprobe remain behind adapters/services.
10. `VIDEO_OS_DATA_ROOT` remains outside repository code by default.
11. Studio theme/locale remains separate from generated-video Brand.
12. Project Schema and engine pins are not changed incidentally.
13. `REUSE > MODIFY > CREATE`.

## PR #18 disposition

PR #18 is not an implementation base for V2.2. Its useful selection-aware Agent / Tool Registry / Plan-Diff-Confirm / Real Provider concepts are retained as **future V2.3 architecture input**.

Do not merge PR #18 into V2.2 and do not branch V2.2 work from it.

## Next allowed phase

While R0 is active:

- documentation/governance changes only;
- no Workflow product implementation yet;
- no Real AI Provider;
- no Project Schema or engine-pin changes.

After R0 is reviewed and merged, create W0 from the new accepted `main` and implement only the Workflow Contract defined by the active V2.2 PRD.

## Read order for agents

1. resolve live GitHub `main`, active branch/PR and CI state;
2. `PROJECT_STATUS.md`;
3. `AGENTS.md`;
4. `SYSTEM.md`;
5. `docs/prd/Video_OS_Studio_V2_2_Workflow_Runtime_Master_PRD.md`;
6. `docs/prd/Video_OS_Studio_V2_2_Development_Plan.md`;
7. active local validation contract only when the workstream requires local evidence.

If live GitHub state conflicts with this file, stop and resolve the conflict rather than guessing.