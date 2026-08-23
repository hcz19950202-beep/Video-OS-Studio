# Video OS Studio — Current Project Status

> This file is the single current-state source of truth for GPT Web, local Codex, and other development agents.
> Conversation memory, old PR descriptions, historical PRDs, and prior validation reports are evidence; they do not override this file.

## Status semantics

When read from `main`, this file describes the accepted checkpoint and the next allowed workstream.

When read from a feature branch, status changes are proposed until the PR merges. Resolve live GitHub `main`, branch, PR, CI, and final handoff SHAs at runtime rather than making this file self-reference the SHA of the commit that contains it.

## Current H7 checkpoint

```yaml
product_version: 2.1.0
released_v2_1_sha: fcfb341367b6ff5e8911693483c14196386c5a93
project_schema: 2.0.0
current_milestone: V2.1.1 Engineering Hardening
accepted_h6_main: 11aafb2ab634ce06c5aa032382cc4263f9749f2d
last_completed_workstream: H6 Automated Acceptance
active_workstream: H7 Frontend Consolidation
h7_branch: hardening/v2.1.1-h7-frontend-consolidation
h7_pr: 26
h7_cloud_implementation: COMPLETE
h7_local_validation: PENDING
h7_cloud_code_gate_sha: 0ed249406297fd382d0aade311f8566a6f4d462d
h7_cloud_code_gate_ci: 32635740757 PASS
h7_cloud_tests: 56 passed files / 236 passed tests / 1 skipped file / 1 skipped test
next_gate: H7 isolated Windows/browser acceptance
v2_2_status: BLOCKED until V2.1.1 release acceptance
```

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
H7 Frontend Consolidation               → CLOUD COMPLETE / LOCAL PENDING
```

## H7 cloud checkpoint

Cloud implementation authority:

```text
PR #26 — Draft / unmerged
Base accepted H6 main: 11aafb2ab634ce06c5aa032382cc4263f9749f2d
Cloud code gate SHA: 0ed249406297fd382d0aade311f8566a6f4d462d
Cloud code gate CI: Run 32635740757 PASS
Validation authority: docs/validation/LOCAL_VALIDATION_V2_1_1_H7.md
```

All four H7 cloud gates passed:

```text
ubuntu-verify:       PASS
windows-verify:      PASS
browser-smoke:       PASS
windows-media-smoke: PASS
```

Cloud unit/build evidence:

```text
format-check: PASS
lint: PASS with exactly 2 pre-existing @next/next/no-img-element warnings
typecheck: PASS
unit: 56 passed files + 1 skipped / 236 passed tests + 1 skipped
build: PASS
```

H7 cloud implementation completed the release-critical frontend consolidation targets:

- shared typed API/error boundary and typed project/media/job/planner/render/HyperFrames/video-use clients;
- `StudioWorkspaceV21` network/mutation orchestration extracted to `useWorkspaceProjectRuntime`;
- consolidated target UI surfaces no longer use ad-hoc raw `fetch()` paths;
- Remotion Player frame/play state uses supported Player events instead of the previous 100 ms polling loop;
- only leaf consumers subscribe to live frame state; top-level Workspace reads playhead only at user action boundaries;
- Canvas pointer draft publishing is latest-value rAF-coalesced while durable mutation remains one commit at gesture completion;
- VisualPlanner uses the shared typed Studio dictionary rather than its own locale map;
- V2.1 shell CSS uses existing shared tokens incrementally without a visual/layout redesign.

The large historical CSS/i18n cleanup allowed to remain gradual by the Master PRD is not being expanded into a risky late-stage rewrite. H7 local Windows/browser acceptance must complete before PR #26 can merge.

## H6 accepted checkpoint

Accepted H6 merge/main SHA:

```text
11aafb2ab634ce06c5aa032382cc4263f9749f2d
```

H6 evidence:

```text
PR #25
Frozen local-validation input: c019689884877a12660e73e1ec8ba81aa9e76e69
Local validation final head: 53a2c5ca5323723ded1aa75feef73feef34cbd02
Final local-head CI: Run 32631619687 PASS
Final status checkpoint: a7274467b640548aaed5c846c392001a52535d7c
Final status-checkpoint CI: Run 32632395460 PASS
```

All four H6 final gates passed:

```text
ubuntu-verify:       PASS
windows-verify:      PASS
browser-smoke:       PASS
windows-media-smoke: PASS
```

H6 local Windows release acceptance passed real browser/media/Remotion/HyperFrames regression with no H6 product defect reproduced. Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H6.md`.

## H7 scope gate

H7 is **Frontend Consolidation** only.

Master PRD targets:

1. split `StudioWorkspaceV21` responsibilities;
2. create typed project/media/job/planner clients;
3. centralize API errors;
4. remove 100ms top-level frame polling where Remotion Player events support an event-driven path;
5. keep gesture drafts local and rAF-throttled;
6. gradually replace milestone CSS layers with token/component layers;
7. converge i18n to one typed dictionary mechanism.

H7 must not become a visual redesign.

H7 must also not absorb:

- V2.2 Workflow Runtime;
- real external AI provider;
- broad AI Command Bar;
- Project Schema changes;
- unrelated editor features;
- new engine/runtime architecture unrelated to frontend consolidation.

## H7 implementation rules

Preserve all H0–H6 accepted behavior and architecture boundaries.

Refactoring rules:

- behavior before structure: add/retain regression coverage before moving responsibility;
- prefer extracting typed boundaries over rewriting working product logic;
- UI modules may call typed clients/services but may not spawn external CLIs;
- Project mutations still use H1 Commands/Transactions and expectedRevision/idempotency semantics;
- job operations still go through H3 durable Job APIs;
- media still uses H4 streaming contracts;
- errors must preserve machine-readable API codes and sanitized user-facing messages;
- frame/time changes must preserve canonical frame-based Project timing;
- avoid broad CSS churn that would make behavior review difficult;
- `REUSE > MODIFY > CREATE`.

## H7 expected acceptance direction

Cloud acceptance must prove:

- typed clients preserve route contracts and structured errors;
- extracted workspace responsibilities preserve Create/Open/import/edit/save/render flows;
- no direct ad-hoc fetch duplication remains in the consolidated target areas;
- no new whole-project PUT editing path is introduced;
- frame synchronization no longer depends on unnecessary 100ms top-level polling where Player events are available;
- gesture drafts remain non-durable until commit boundaries;
- typed i18n dictionaries typecheck and preserve current locale behavior;
- Ubuntu/Windows H6 CI matrix remains green.

The cloud gate above satisfies these source/automation requirements. Local/browser acceptance remains required because H7 changes live Player events, gesture behavior, editor interaction timing, and visual token usage.

## Accepted prior foundations

### H5 — Project / Data Hardening

Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H5.md`.

Accepted behavior includes frozen historical schemas, explicit migrations, Project-wide referential integrity, bounded/revision-safe History, lightweight Recent Project summaries, compensating failed-import cleanup, and guarded orphan maintenance.

### H4 — Streaming Media Pipeline

Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H4.md`.

Accepted behavior includes streaming browser upload, Asset/output Range serving, and bounded large-media memory.

### H3 — Durable Job Runtime

Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H3.md`.

Accepted behavior includes durable file-backed Jobs, cancellation/retry/restart recovery/concurrency/logs/artifacts.

### H2 — Engine Process Runtime

Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H2.md`.

Exact accepted engine pins:

```text
remotion             4.0.513
@remotion/player     4.0.513
@remotion/cli        4.0.513
hyperframes          0.8.10
```

### H1 — Project Transaction Safety

Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H1.md`.

Accepted behavior includes per-Project serialization, `expectedRevision`, operation IDs, idempotency, and structured conflicts.

### H0 — Correctness Hotfix

Authority: `docs/validation/LOCAL_VALIDATION_V2_1_1_H0.md`.

Accepted behavior includes safe Script rebuild, minimal Inspector commits, style precedence, and Canvas error cleanup.

## Architecture invariants

Always preserve:

```text
Source Media != Project Canvas != Export Profile
```

And:

1. Project JSON is the durable Project source of truth.
2. Canonical timeline timing is frame-based.
3. Durable edits use validated Commands / Transactions / bounded services.
4. UI modules do not spawn FFmpeg, Remotion, HyperFrames, or video-use directly.
5. Agents do not directly hand-edit runtime `project.json`.
6. Remotion remains the master composition/render engine.
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
→ full CI green
→ checkpoint repository truth
→ full checkpoint CI green
→ freeze exact branch HEAD

Local Codex
→ isolated worktree/data root
→ checkout exact frozen handoff SHA
→ follow the active validation contract
→ fix only active-workstream defects
→ push code/docs commits to the same branch
→ return FINAL HEAD + evidence

GPT Web
→ review frozen→final diff
→ verify final CI
→ prepare accepted checkpoint
→ merge
→ resolve accepted main
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
