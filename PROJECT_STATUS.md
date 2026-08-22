# Video OS Studio — Current Project Status

> This file is the single current-state source of truth for GPT Web, local Codex, and other development agents.
> Historical PRDs, validation reports, release notes, old PR descriptions, and conversation memory are evidence; they do not override this file.

## Status semantics

When this file is read from `main`, it describes the **accepted checkpoint** and the **next allowed workstream**.

When this file is read from a feature branch, changes to status are **proposed until that branch is merged**. Do not treat a feature-branch status edit as accepted main state before the PR merges.

Do not hard-code the current `main` HEAD into this file: the merge that changes this file necessarily creates a newer main SHA. Before branching or local validation, resolve the current GitHub `main` SHA and the active PR HEAD directly from GitHub.

## Proposed accepted checkpoint after H1 / PR #20 merge

This section becomes the accepted `main` checkpoint only after PR #20 is merged.

```yaml
product_version: 2.1.0
released_v2_1_sha: fcfb341367b6ff5e8911693483c14196386c5a93
project_schema: 2.0.0
current_milestone: V2.1.1 Engineering Hardening
last_completed_workstream: H1 Project Transaction Safety
next_allowed_workstream: H2 Engine Process Runtime
active_workstream_on_main: none until an H2 branch/PR is opened
next_product_milestone: V2.2 Workflow Runtime only after V2.1.1 release
```

H1 acceptance evidence:

```text
PR: #20
Frozen cloud input: 5c2eede8db744464c2f0ccafaca9df024a8ebaec
Local validation final code/docs head: 400521924aa05362864d4de997d372782e2cd482
Local validation: PASS
GitHub CI on final local head: PASS
Test files: 38
Tests: 150
Final Render smoke: NOT REQUIRED because local Remotion CLI belongs to H2
```

Local H1 acceptance authority:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H1.md
```

Delivery history:

```text
R0 Repository Truth / Agent Guardrails  → PR #17 COMPLETE
H0 Correctness Hotfix                   → PR #19 COMPLETE
H1 Project Transaction Safety           → PR #20 COMPLETE after merge
```

## H1 accepted behavior after PR #20 merge

H1 establishes the no-silent-lost-update foundation:

- durable Project mutations carry `expectedRevision` plus stable command / transaction / operation IDs;
- one shared runtime `ProjectMutationCoordinator` serializes writes per Project without imposing a global mutex across different Projects;
- stale writers receive structured `409 PROJECT_REVISION_CONFLICT` instead of silently overwriting newer state;
- duplicate identical operations execute at most once and return `alreadyApplied` on retry;
- an operation ID remains bound to its original kind/payload, including after an aborted save;
- conflicting operation-ID reuse returns non-retryable `409 PROJECT_OPERATION_ID_REUSED`;
- durable `operations.jsonl` records provide pending/applied/aborted recovery and audit semantics;
- normal Studio Save no longer PUTs the complete browser Project; it waits for queued mutations and reloads the durable Project;
- whole-Project replacement is restricted to explicit restore/import/migration/maintenance envelopes;
- Script, Canvas, Timeline, Effect Inspector, Scene transactions, Media Import, video-use Prepare/EDL, HyperFrames, Visual Planner Apply, and Project-preset Apply use revision-safe mutation paths;
- Caption Issue #11 stale-field overwrite behavior is prevented by revision conflict detection plus minimal-patch retry;
- a long-running media import result based on a stale revision cannot attach over a newer Project mutation.

Windows acceptance proved the mandatory race:

```text
A expected=N
B expected=N
A -> N+1
B -> 409 PROJECT_REVISION_CONFLICT
```

It also proved idempotency, Caption interleaved stale-write handling, Save-without-whole-PUT, Canvas conflict recovery, real long-running media stale-result rejection, operations-log behavior, save/reopen, Undo/Redo, and preview playback.

One local H1 defect was found and fixed before acceptance: active Timeline / Effect Inspector / Scene transaction callers were still posting legacy raw mutations. Commit `eaef277d464d9a7e2a01f83625eab9b1c75d8963` routes them through H1 client helpers and adds regression coverage.

## H0 accepted behavior

H0 established these correctness boundaries before H1:

- Script editing no longer assumes the Video track ID is `video-main`;
- Script A-roll rebuild only proceeds when one canonical populated Video track can be proven;
- ambiguous/manual Video state is blocked rather than deleted;
- Script rebuild preserves supported A-roll presentation state including volume, muted, fit, transform, enabled and layer;
- a Script cut cannot remove every A-roll source range and silently lose presentation state;
- Caption Inspector numeric/style entry uses bounded commit behavior instead of durable mutation on every keystroke/spin;
- Caption commands remain minimal patches;
- Motion style resolution is explicitly Linked property → Clip property → Brand fallback;
- Caption style resolution remains Linked property → Clip property → Brand default;
- Canvas failed mutation promises are consumed, transient drafts are cleared, and visible error feedback is surfaced.

H1 now supplies the true concurrent stale-request protection that H0 intentionally deferred.

## Accepted V2.1 product state

V2.1.0 is released and accepted. It includes:

- universal landscape / portrait / square / ultrawide / custom canvas support;
- resizable Edit / AI / Script / Motion workspaces;
- deterministic rules-based AI Composer / Director with Review → Diff → Apply;
- canvas-aware placement, Safe Area profiles, responsive effect capability metadata;
- Scenario Starter;
- universal media ingest with local normalization for MOV / M4V / WebM / MKV / AVI and AAC / FLAC where required;
- Export Profile with custom width / height / FPS / quality / audio;
- semantic Inspector taxonomy;
- real Windows validation across eight required canvas classes.

Project Schema intentionally remains `2.0.0`.

## V2.1.1 objective

Do not expand the main editor feature surface. Harden the system so it is safe for long-running Agent-driven production.

Required workstreams:

```text
R0 Repository Truth / Agent Guardrails       COMPLETE after PR #17
H0 Correctness Hotfix                        COMPLETE after PR #19
H1 Project Transaction Safety                COMPLETE after PR #20
H2 Engine Process Runtime                    NEXT
H3 Durable Job Runtime
H4 Streaming Media Pipeline
H5 Project / Data Hardening
H6 Automated Acceptance
H7 Frontend Consolidation (after correctness/infrastructure)
```

## H2 scope gate

H2 may begin only after PR #20 is merged and the latest `main` SHA is resolved from GitHub.

H2 owns engine/process determinism, not new editor features. Its required direction from the Master PRD is:

- exact-pin compatible Remotion packages including local `@remotion/cli`;
- stop relying on runtime `npx` package downloads for normal Remotion rendering;
- pin/validate HyperFrames runtime version;
- introduce a shared process ToolRunner based on spawned argv rather than shell interpolation;
- timeout, AbortSignal/cancel, streaming stdout/stderr, PID/process metadata, and Windows process-tree termination;
- engine argv/quoting tests;
- local Windows proof for Remotion, HyperFrames and relevant video-use/FFmpeg process behavior.

H2 must not start H3 Durable Jobs or H4 Streaming Media as part of the same PR.

## Development split

### GPT Web + GitHub owns

- architecture and PRD decisions;
- cloud-safe code changes;
- GitHub branch / PR management;
- unit/API/contract tests that do not require the user's Windows machine;
- cloud CI analysis;
- review of local Codex fixes;
- final merge decisions;
- keeping `PROJECT_STATUS.md` current at accepted checkpoints.

### Local Codex owns

- Windows-only verification and fixes;
- real browser interaction;
- real media files outside the repository;
- FFmpeg / ffprobe behavior;
- Remotion local rendering and Chrome/runtime behavior;
- HyperFrames runtime behavior;
- video-use / Python behavior;
- large-file memory/performance validation;
- local end-to-end acceptance evidence.

Local Codex must work from an exact GPT Web-provided branch/SHA and return commits through GitHub. It must not keep an unpushed parallel implementation of the same workstream.

## Handoff protocol

For every workstream:

```text
GPT Web
→ resolve latest accepted main from GitHub
→ create one workstream branch
→ implement cloud-safe scope
→ run/inspect GitHub CI
→ freeze an exact green branch SHA in the PR/handoff message

Local Codex (only when local evidence is required)
→ git fetch
→ checkout the exact branch/SHA supplied by GPT Web
→ verify HEAD matches
→ use an isolated VIDEO_OS_DATA_ROOT
→ run Windows/local acceptance
→ fix only defects inside the active workstream
→ add regression tests
→ commit and push to the same workstream branch
→ report final SHA + evidence

GPT Web
→ review local commits/diff
→ confirm latest CI
→ confirm acceptance contract
→ prepare PROJECT_STATUS as the post-merge checkpoint
→ merge
→ only then open the next workstream
```

## Architecture invariants

Always preserve:

```text
Source Media != Project Canvas != Export Profile
```

And:

1. Project JSON is the durable project source of truth.
2. Canonical timeline timing is frame-based.
3. Durable changes use validated Project Commands / Transactions / bounded services.
4. UI modules do not spawn FFmpeg, Remotion, HyperFrames, or video-use directly.
5. Agents do not directly hand-edit runtime `project.json`.
6. Remotion remains the master composition engine.
7. HyperFrames remains a deterministic complex-motion asset engine.
8. `VIDEO_OS_DATA_ROOT` remains outside repository code by default.
9. Studio UI theme/locale are separate from generated-video Brand.
10. `REUSE > MODIFY > CREATE`.

## Blocked until V2.1.1 is complete

Do not start:

- real external AI Provider;
- broad AI Command Bar;
- V2.2 Workflow Runtime implementation;
- multi-timeline;
- arbitrary docking;
- full Crop / Mask engine;
- transition suite;
- generated-media marketplace;
- cloud collaboration;
- HDR / advanced color pipeline;
- desktop packaging work;
- large UI rewrite unrelated to active hardening defects.

## Current known follow-ups

- GitHub Issue #11: H1 local acceptance proved the stale Caption overwrite fix end to end. Close the issue after PR #20 merges.
- H1 local acceptance left two orphan media pairs after deliberately stale imports; cleanup belongs to H5 Project / Data Hardening, not H1.
- local Node 25.2.1 produces an expected warning against the repository Node `24.x` declaration; do not treat that as an H1 failure.
- two existing `@next/next/no-img-element` lint warnings remain non-blocking.
- GitHub Issue #10 is closed as completed by V2.1 universal MOV normalization.
- PR #13 is closed as superseded by the released V2.1 path through PR #14/#15.

## Read order for agents

1. `PROJECT_STATUS.md`
2. `AGENTS.md`
3. `SYSTEM.md`
4. `docs/prd/Video_OS_Studio_V2_1_1_Engineering_Hardening_Master_PRD.md`
5. the active validation contract when a workstream requires local validation
6. current GitHub main/PR state before branching or claiming a frozen SHA

For H1 evidence, read `docs/validation/LOCAL_VALIDATION_V2_1_1_H1.md`.

If another document conflicts with this current-state file, stop and resolve the conflict instead of guessing.
