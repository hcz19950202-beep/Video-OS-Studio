# Video OS Studio — Current Project Status

> This file is the single current-state source of truth for GPT Web, local Codex, and other development agents.
> Conversation memory, old PR descriptions, historical PRDs, and prior validation reports are evidence; they do not override this file.

## Status semantics

When read from `main`, this file describes the accepted checkpoint and the next allowed workstream.

When read from a feature branch, status changes are proposed until the PR merges. Resolve live `main`, branch, PR, and CI SHAs from GitHub rather than trying to make this file self-reference its own commit SHA.

## Accepted main checkpoint

```yaml
product_version: 2.1.0
released_v2_1_sha: fcfb341367b6ff5e8911693483c14196386c5a93
project_schema: 2.0.0
accepted_main_after_h1: 32b419d2a8010f34ed48664a9e87278eec3b36ff
current_milestone: V2.1.1 Engineering Hardening
last_completed_workstream: H1 Project Transaction Safety
active_workstream: H2 Engine Process Runtime
next_allowed_after_h2_acceptance: H3 Durable Job Runtime
next_product_milestone: V2.2 Workflow Runtime only after V2.1.1 release
```

Delivery history:

```text
R0 Repository Truth / Agent Guardrails  → PR #17 COMPLETE
H0 Correctness Hotfix                   → PR #19 COMPLETE
H1 Project Transaction Safety           → PR #20 COMPLETE
H2 Engine Process Runtime               → PR #21 ACTIVE
```

GitHub Issue #11 is closed as completed by H0 + H1 after real Windows stale-Caption conflict acceptance.

## H2 active workstream

```yaml
branch: hardening/v2.1.1-h2-engine-runtime
pull_request: 21
base_main_sha: 32b419d2a8010f34ed48664a9e87278eec3b36ff
cloud_implementation: complete for planned H2 process architecture
cloud_code_checks: green before final docs/status checkpoint
cloud_test_baseline: 40 test files / 161 tests
local_dependency_lock: pending
windows_engine_validation: pending
merge_status: blocked until local acceptance and final CI
h3_status: blocked
```

Cloud H2 implementation now includes:

- one shared `NodeToolRunner` using `spawn(command, argv)` with `shell:false`;
- literal argv execution with difficult-path coverage;
- PID, exit-code/signal, duration metadata;
- `AbortSignal` cancellation and explicit `TOOL_ABORTED`;
- bounded timeout and explicit `TOOL_TIMEOUT`;
- streaming stdout/stderr callbacks plus bounded diagnostic capture;
- binary stdout mode for FFmpeg waveform extraction;
- Windows owned-process-tree termination through `taskkill /PID <pid> /T /F`;
- Unix owned process-group TERM → KILL fallback;
- Remotion, HyperFrames, FFmpeg/ffprobe, and video-use/Python routed through the shared process lifecycle;
- no Remotion runtime `npx --package` fallback;
- no product-runtime `npx hyperframes` shell execution;
- npm package bin resolution through the package's real JavaScript entry, launched with Node rather than Windows `.cmd` shell wrappers;
- Remotion runtime compatibility fixed in code to the currently resolved `4.0.513` family;
- engine argv and ToolRunner lifecycle regression tests.

The latest fully completed cloud code CI before this status/validation documentation checkpoint passed:

```text
Lint: PASS
Typecheck: PASS
Tests: 40 files / 161 tests PASS
Build: PASS
```

The final branch SHA must be re-verified green after this status commit before GPT Web freezes H2 for local Codex.

## H2 dependency-lock boundary

The cloud implementation intentionally does **not** hand-edit npm dependency trees.

Before H2 can merge, local Codex must generate and validate the real dependency lock on Windows:

```text
remotion             = 4.0.513 exact
@remotion/player     = 4.0.513 exact
@remotion/cli        = 4.0.513 exact
hyperframes          = one exact locally validated version
```

For Remotion, local Codex must use real npm to install the exact aligned packages and regenerate `package-lock.json`.

For HyperFrames, local Codex must select an exact candidate using real local `doctor/check/render` evidence, then save that exact version into the project and regenerate the lock. Do not accept `latest`, an unversioned runtime `npx`, or a hand-written lockfile as the final H2 state.

This package/lock update is expected H2 local work and may be committed to the same H2 branch.

## H2 local validation authority

Local Codex must follow:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H2.md
```

Required Windows proof includes:

- clean npm dependency lock and `npm ci` reproducibility;
- difficult-path literal argv;
- timeout terminating parent + child process tree;
- AbortSignal terminating parent + child process tree;
- bounded live logs;
- real 2–5 second Remotion render and real render cancellation;
- exact local HyperFrames CLI health/check/render and cancellation/timeout;
- FFmpeg/ffprobe probe/waveform/normalization and cancellation/timeout;
- representative video-use/Python execution and process cleanup;
- no residual owned child processes;
- representative application regression including final Remotion render and validated HyperFrames effect.

If local validation finds an H2 defect, fix only H2 scope, add regression coverage, push to PR #21, and return the exact new HEAD. GPT Web must re-review and re-freeze after CI.

## H2 explicit non-goals

Do not implement in PR #21:

- H3 persistent Job Store;
- durable queued/preparing/running/completed state machine;
- retry scheduling;
- restart recovery;
- persistent per-job stdout/stderr files;
- job concurrency slots;
- H4 streaming uploads/range rewrite;
- H5 orphan media cleanup;
- Project Schema migration;
- real external AI Provider;
- unrelated editor/UI redesign.

## H1 accepted behavior

H1 established the no-silent-lost-update foundation:

- all durable Project writers use `expectedRevision` and stable operation identifiers;
- per-Project mutation serialization without a global cross-Project lock;
- stale writes return structured `409 PROJECT_REVISION_CONFLICT`;
- duplicate identical operations apply at most once;
- operation IDs remain bound to their original payload;
- `operations.jsonl` records pending/applied/aborted audit semantics;
- normal Save does not whole-project PUT;
- Script, Canvas, Timeline, Effect Inspector, Scene transactions, Media Import, video-use, HyperFrames, Visual Planner Apply, and Project-preset Apply use revision-safe paths;
- Caption Issue #11 was proven fixed with real interleaved stale-write Windows acceptance.

H1 acceptance authority:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H1.md
```

## H0 accepted behavior

H0 established safe Script A-roll rebuild boundaries, bounded/minimal Caption commits, explicit Linked → Clip → Brand style resolution, and Canvas mutation error/draft cleanup.

H0 acceptance authority:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H0.md
```

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
- cloud unit/contract tests;
- review of local Codex fixes and dependency locks;
- accepted checkpoint maintenance.

### Local Codex owns

- Windows-only verification and H2 local dependency lock generation;
- real Remotion/HyperFrames/FFmpeg/video-use processes;
- Chrome/browser behavior;
- real media and render artifacts;
- process-tree, timeout, cancellation, and residual-process evidence;
- H2 local defect fixes on the same branch.

## Handoff protocol

```text
GPT Web
→ resolve accepted main
→ implement cloud-safe workstream scope
→ CI green
→ write local validation contract
→ final branch CI green
→ freeze exact SHA

Local Codex
→ new isolated worktree/data root
→ checkout exact frozen SHA
→ follow the workstream validation contract
→ fix only active-workstream defects
→ push exact dependency/code/docs commits to the same branch
→ return FINAL HEAD + evidence

GPT Web
→ review frozen→final diff
→ verify final CI
→ prepare accepted checkpoint
→ merge
→ only then open next workstream
```

## Current known follow-ups

- H1 deliberate stale imports left orphan media pairs; cleanup remains H5 scope.
- two existing `@next/next/no-img-element` lint warnings remain non-blocking.
- repository engine is Node `24.x`; previous local validation used Node 25.2.1 and recorded the warning. H2 should prefer Node 24 when practical and must record the actual environment.
- Issue #10 is closed by V2.1 MOV normalization.
- Issue #11 is closed by H0 + H1 stale Caption protection.
- PR #13 is closed as superseded by the V2.1 release path.

## Read order for agents

1. `PROJECT_STATUS.md`
2. `AGENTS.md`
3. `SYSTEM.md`
4. `docs/prd/Video_OS_Studio_V2_1_1_Engineering_Hardening_Master_PRD.md`
5. active validation contract
6. current GitHub main / PR / CI state

For active H2, read `docs/validation/LOCAL_VALIDATION_V2_1_1_H2.md` before changing dependencies or running engine acceptance.

If another document conflicts with this file, stop and resolve the conflict instead of guessing.
