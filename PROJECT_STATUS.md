# Video OS Studio — Current Project Status

> This file is the single current-state source of truth for GPT Web, local Codex, and other development agents.
> Conversation memory, old PR descriptions, historical PRDs, and prior validation reports are evidence; they do not override this file.

## Status semantics

When read from `main`, this file describes the accepted checkpoint and the next allowed workstream.

When read from a feature branch, status changes are proposed until the PR merges. Resolve live GitHub `main`, branch, PR, and CI SHAs at runtime rather than making this file self-reference its own commit SHA.

## Proposed accepted checkpoint after H5 / PR #24 merge

```yaml
product_version: 2.1.0
released_v2_1_sha: fcfb341367b6ff5e8911693483c14196386c5a93
project_schema: 2.0.0
current_milestone: V2.1.1 Engineering Hardening
accepted_main_before_h5: e1808e80cf7313fc067fe4b4ada6d3e299a45543
last_completed_workstream: H5 Project / Data Hardening
next_allowed_workstream: H6 Automated Acceptance
h7_status: BLOCKED until H6 acceptance
next_product_milestone: V2.2 Workflow Runtime only after V2.1.1 release
```

Delivery history:

```text
R0 Repository Truth / Agent Guardrails  → PR #17 COMPLETE
H0 Correctness Hotfix                   → PR #19 COMPLETE
H1 Project Transaction Safety           → PR #20 COMPLETE
H2 Engine Process Runtime               → PR #21 COMPLETE
H3 Durable Job Runtime                  → PR #22 COMPLETE
H4 Streaming Media Pipeline             → PR #23 COMPLETE
H5 Project / Data Hardening             → PR #24 ACCEPTED PENDING MERGE
H6 Automated Acceptance                 → NEXT AFTER PR #24 MERGES
H7 Frontend Consolidation               → BLOCKED
```

## H5 acceptance evidence

```text
PR: #24
Branch: hardening/v2.1.1-h5-project-data-hardening
Base accepted H4 main: e1808e80cf7313fc067fe4b4ada6d3e299a45543
Frozen cloud input: 43969af857f63f9fe6268d148dc3f76ab40ad6e1
Cloud freeze CI: Run 32620743837 PASS
Cloud freeze tests: 48 files / 206 tests
Local validation final head: 68f7459c5ad422441b9e55ee1a5120d8d7c10552
Local validation: PASS
Final local test baseline: 49 files / 208 tests
Final GitHub verify: Run 32622990083 PASS
```

Acceptance authority:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H5.md
```

H5 local Windows/data acceptance proved:

- frozen historical V1 schema remains independent from mutable current Asset/Clip schemas;
- explicit migration chain works, unknown versions fail, and duplicate source-version registration is rejected;
- Project-wide referential integrity rejects duplicate IDs, missing Assets, invalid Linked/scene styles, and invalid timeline/source bounds;
- multi-command transactions preserve H1 revision/idempotency semantics and advance revision exactly once;
- History uses bounded entry/byte budgets, correct redo invalidation, and revision guards;
- stale Timeline Undo conflict reloads latest Project without an unhandled Promise rejection;
- Recent Projects use lightweight summaries, repair missing summaries from durable `project.json`, and remove ghost summaries when `project.json` is absent;
- real Windows MOV normalization followed by stale mutation conflict removes only the failed import's original/working candidates and preserves the newer Project edit;
- failed normalization removes its original/partial working candidates without mutating Project revision or deleting unrelated files;
- orphan maintenance dry-run reports only owned `media-*` candidates;
- cleanup requires explicit idle confirmation, current expectedRevision, and no active durable Project jobs;
- cleanup protects current Project Asset/original paths, H3 durable job artifacts, unrelated files, and Project JSON;
- four controlled orphans were removed and the second dry-run was empty;
- no H5 `.tmp/.part/.partial` residue or H5-owned Node/FFmpeg process remained;
- representative Create/Open, MP4/MOV/SRT import, Caption, Canvas, Timeline, Save/Reopen, Undo/Redo, playback/seek and HyperFrames regression passed.

H5 local defect fixed:

```text
V2.1.1-H5-LV-001
stale Timeline Undo correctly reloaded latest Project after 409,
but the void Promise escaped as an unhandled rejection.
Fix: contain expected PROJECT_REVISION_CONFLICT at the History action boundary,
while preserving unexpected failures.
Regression: tests/history-actions-h5.test.ts
Commit: 717d9f5f9e2a172de32bb128e5df2a07144acf27
```

Non-blocking H5 notes:

- local validation used Node 25.2.1 while repository declares Node `24.x`;
- two pre-existing `@next/next/no-img-element` lint warnings remain;
- expected stale-writer 409 responses are part of the accepted H1/H5 safety behavior.

## H5 accepted behavior

### Historical schemas and migrations

- historical V1 input contracts are physically frozen from mutable current Asset/Clip schemas;
- migrations register explicit source → target steps;
- duplicate registration for one source version is rejected;
- final current Project still validates through `ProjectSchema`;
- Project Schema remains `2.0.0` in V2.1.1.

### Project integrity

Final Project validation includes:

- unique Asset IDs;
- unique Track IDs;
- globally unique Clip IDs;
- asset-backed Clip references;
- Linked Style existence/type compatibility;
- scene style references;
- Clip timeline bounds;
- source bounds when source duration metadata exists.

### Transactions and History

- transactions validate/clone at transaction boundaries instead of performing full Project validation/cloning once per command;
- H1 expectedRevision/idempotency remains authoritative;
- History remains snapshot-based for V2.1.1, with bounded count/byte budgets and revision-safe Undo/Redo;
- no event-sourcing rewrite was introduced.

### Recent Projects

- `project.json` remains durable Project truth;
- `project.summary.json` is a rebuildable cache only;
- normal Recent refresh can use summaries without parsing every full Project;
- missing summaries repair from durable Project JSON;
- summaries without durable Project JSON do not create ghost Recent entries.

### Media/data cleanup

- failed imports compensate only their own known candidate paths after re-checking latest Project references;
- explicit maintenance scans only MediaImport-owned `media-*` files under `input/assets/original/captions`;
- current Project media and durable job artifacts are protected;
- destructive cleanup requires current revision, explicit idle confirmation, and no active Project jobs;
- maintenance is explicit/dry-run-first, not an automatic startup cleaner.

## H6 next scope gate

H6 owns **Automated Acceptance** and may begin only after PR #24 merges and the new accepted `main` SHA is resolved from GitHub.

Master PRD target:

```text
Cloud CI:
Ubuntu: install / format-check / lint / typecheck / unit / build
Windows: install / format-check / lint / typecheck / unit
```

Required H6 direction:

1. add workflow concurrency so obsolete runs for the same branch/PR are cancelled;
2. introduce formatter/format-check in a formatting-only commit before mixing broad formatting with logic changes;
3. add/strengthen minimum route tests for commands, transactions, media, asset Range, jobs/renders, project load/save;
4. add/strengthen engine argv tests for Remotion final/overlay/custom export/muted, HyperFrames, FFmpeg normalize, Windows launcher;
5. add Playwright smoke for Create/Open, tiny import, Caption edit, Canvas change, AI rules Analyze/Apply, Undo/Redo, Save/Reopen;
6. add Windows media smoke for tiny MP4, MOV, image, audio, subtitle, normalize/probe/Range and a short Final Render;
7. retain the local-first security boundary and do not turn H6 into product/UI feature work.

H6 must not absorb:

- H7 frontend consolidation;
- V2.2 Workflow Runtime;
- real external AI Provider;
- Project Schema version changes;
- unrelated editor/UI redesign.

## Accepted prior foundations

- H4: streaming browser upload, Asset/output Range serving, bounded large-media memory. Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H4.md`.
- H3: durable file-backed Jobs, cancellation/retry/restart recovery/concurrency/logs/artifacts. Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H3.md`.
- H2: deterministic ToolRunner and exact engine pins: Remotion `4.0.513`, HyperFrames `0.8.10`. Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H2.md`.
- H1: per-Project serialization, expectedRevision, operation IDs, idempotency, structured conflicts. Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H1.md`.
- H0: safe Script rebuild, minimal Inspector commits, style precedence and Canvas error cleanup. Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H0.md`.

## Architecture invariants

Always preserve:

```text
Source Media != Project Canvas != Export Profile
```

And:

1. Project JSON is the durable project source of truth.
2. Canonical timeline timing is frame-based.
3. Durable edits use validated Commands / Transactions / bounded services.
4. UI modules do not spawn FFmpeg, Remotion, HyperFrames, or video-use directly.
5. Agents do not directly hand-edit runtime `project.json`.
6. Remotion remains the master composition engine.
7. HyperFrames remains the deterministic complex-motion asset engine.
8. `VIDEO_OS_DATA_ROOT` remains outside repository code by default.
9. Studio UI theme/locale are separate from generated-video Brand.
10. `REUSE > MODIFY > CREATE`.

## Development split

### GPT Web + GitHub owns

- architecture and PRD decisions;
- cloud-safe implementation;
- branch/PR/CI/review/merge;
- cloud unit/API/contract/automation tests;
- review of local Codex fixes;
- accepted checkpoint maintenance.

### Local Codex owns

- Windows-specific runtime acceptance;
- real browser/media/engine behavior;
- filesystem/process/performance evidence;
- Windows media/render smoke and active-workstream defect fixes.

## Handoff protocol

```text
GPT Web
→ resolve accepted main
→ create one workstream branch
→ implement cloud-safe scope
→ CI green
→ write local validation contract when needed
→ freeze exact green SHA

Local Codex
→ isolated worktree/data root
→ checkout exact frozen SHA
→ follow the active validation contract
→ fix only active-workstream defects
→ push exact code/docs commits to the same branch
→ return FINAL HEAD + evidence

GPT Web
→ review frozen→final diff
→ verify final CI
→ prepare accepted checkpoint
→ merge
→ only then open the next workstream
```

## Blocked until V2.1.1 is complete

Do not start:

- real external AI Provider;
- broad AI Command Bar;
- V2.2 Workflow Runtime implementation;
- unrelated major editor features;
- Project Schema migration without an approved migration decision.

## Read order for agents

1. resolve current GitHub `main`, branch, PR, and CI state;
2. `PROJECT_STATUS.md`;
3. `AGENTS.md`;
4. `SYSTEM.md`;
5. `docs/prd/Video_OS_Studio_V2_1_1_Engineering_Hardening_Master_PRD.md`;
6. active validation contract when one exists;
7. active PR diff/CI.

If another document conflicts with this file, stop and resolve the conflict instead of guessing.
