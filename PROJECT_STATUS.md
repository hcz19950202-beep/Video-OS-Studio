# Video OS Studio — Current Project Status

> This file is the single current-state source of truth for GPT Web, local Codex, and other development agents.
> Historical PRDs, validation reports, release notes, old PR descriptions, and conversation memory are evidence; they do not override this file.

## Status semantics

When this file is read from `main`, it describes the **accepted checkpoint** and the **next allowed workstream**.

When this file is read from a feature branch, changes to status are **proposed until that branch is merged**. Do not treat a feature-branch status edit as accepted main state before the PR merges.

Do not hard-code the current `main` HEAD into this file: the merge that changes this file necessarily creates a newer main SHA. Before branching or local validation, resolve the current GitHub `main` SHA and the active PR HEAD directly from GitHub.

## Accepted checkpoint after R0 merge

```yaml
product_version: 2.1.0
released_v2_1_sha: fcfb341367b6ff5e8911693483c14196386c5a93
project_schema: 2.0.0
current_milestone: V2.1.1 Engineering Hardening
last_completed_workstream: R0 Repository Truth / Agent Guardrails
next_allowed_workstream: H0 Correctness Hotfix
active_workstream_on_main: none until an H0 branch/PR is opened
next_product_milestone: V2.2 Workflow Runtime only after V2.1.1 release
```

R0 delivery PR: **#17**.

Before starting H0, the agent must verify that PR #17 is merged and resolve the latest `main` SHA from GitHub. If PR #17 is still open, R0 is not yet accepted.

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
- real Windows validation across eight required canvas classes;
- 34 test files / 125 tests at V2.1 release closeout.

Project Schema intentionally remains `2.0.0`.

## V2.1.1 objective

Do not expand the main editor feature surface. Harden the system so it is safe for long-running Agent-driven production.

Required workstreams:

```text
R0 Repository Truth / Agent Guardrails
H0 Correctness Hotfix
H1 Project Transaction Safety
H2 Engine Process Runtime
H3 Durable Job Runtime
H4 Streaming Media Pipeline
H5 Project / Data Hardening
H6 Automated Acceptance
H7 Frontend Consolidation (after correctness/infrastructure)
```

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

This design intentionally avoids trying to store a branch's ever-changing current HEAD inside the same file that creates new HEADs.

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

- GitHub Issue #11: stale Caption Inspector save overwriting newer unrelated style fields — active and assigned to H0/H1.
- GitHub Issue #10: closed as completed by V2.1 universal MOV normalization.
- PR #13: closed as superseded by the released V2.1 path through PR #14/#15.

## Read order for agents

1. `PROJECT_STATUS.md`
2. `AGENTS.md`
3. `SYSTEM.md`
4. `docs/prd/Video_OS_Studio_V2_1_1_Engineering_Hardening_Master_PRD.md`
5. active validation contract if the workstream requires local validation
6. current GitHub main/PR state before branching or claiming a frozen SHA

If another document conflicts with this current-state file, stop and resolve the conflict instead of guessing.
