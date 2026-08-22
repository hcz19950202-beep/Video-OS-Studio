# Video OS Studio — Current Project Status

> This file is the single current-state source of truth for GPT Web, local Codex, and other development agents.
> Historical PRDs, validation reports, release notes, and handoff documents are evidence; they do not override this file.

## Current baseline

```yaml
product_version: 2.1.0
project_schema: 2.0.0
main_sha: fcfb341367b6ff5e8911693483c14196386c5a93
released_on: 2026-08-22
current_milestone: V2.1.1 Engineering Hardening
current_workstream: R0 Repository Truth / Agent Guardrails
active_branch: hardening/v2.1.1-r0-repository-truth
active_pr: 17
cloud_ci: use the latest PR #17 head/run; do not cache a branch HEAD in this file
windows_local_validation: not required for R0; required for later engine/media workstreams
next_allowed_workstream: H0 Correctness Hotfix after R0 merge
next_product_milestone: V2.2 Workflow Runtime only after V2.1.1 release
```

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
- keeping `PROJECT_STATUS.md` current.

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
→ create branch from current accepted main
→ implement cloud-safe scope
→ run/inspect GitHub CI
→ freeze an exact green SHA in the handoff message/PR
→ update this status with workstream state, not self-referential branch HEADs

Local Codex (only when local evidence is required)
→ git fetch
→ checkout the exact branch/SHA supplied by GPT Web
→ use an isolated VIDEO_OS_DATA_ROOT
→ run Windows/local acceptance
→ fix only defects inside the active workstream
→ add regression tests
→ commit and push to the same workstream branch
→ report commit SHA + evidence

GPT Web
→ review local commits/diff
→ confirm latest CI
→ confirm acceptance contract
→ merge
→ update PROJECT_STATUS.md
→ open the next workstream
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

- GitHub Issue #11: stale Caption Inspector save overwriting newer unrelated style fields — active and assigned to H0/H1.
- GitHub Issue #10: closed as completed by V2.1 universal MOV normalization.
- PR #13: closed as superseded by the released V2.1 path through PR #14/#15.

## Read order for agents

1. `PROJECT_STATUS.md`
2. `AGENTS.md`
3. `SYSTEM.md`
4. active milestone PRD under `docs/prd/`
5. active validation contract, if the workstream requires local validation

If another document conflicts with this current-state file, stop and resolve the conflict instead of guessing.
