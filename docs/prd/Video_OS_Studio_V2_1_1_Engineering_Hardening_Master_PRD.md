# Video OS Studio V2.1.1 Engineering Hardening & Agent-Ready Foundation — Master PRD

> Version: Rev.1  
> Date: 2026-08-22  
> Base product: Video OS Studio `2.1.0`  
> Base main SHA at milestone start: `fcfb341367b6ff5e8911693483c14196386c5a93`  
> Project Schema: `2.0.0` unless explicitly changed by an approved migration decision

## 1. Product decision

V2.1 already completed the product-surface expansion required for the AI-first universal editor. V2.1.1 is **not a new feature release**. It is a hardening milestone that makes the editor safe for long-running Agent-driven production.

The milestone must turn this:

```text
working AI-first editor
```

into this:

```text
working editor
+ no silent lost updates
+ deterministic external engines
+ durable/cancellable jobs
+ streaming large-media IO
+ stronger project integrity
+ automated Windows/cloud acceptance
+ safe GPT Web ↔ local Codex development handoff
```

V2.1.1 must finish before V2.2 Workflow Runtime or a real external AI provider begins.

## 2. Development model

Video OS Studio is developed in two coordinated environments.

### GPT Web + GitHub — development control plane

Owns:

- product/architecture decisions;
- PRD and contract changes;
- cloud-safe implementation;
- GitHub branches and PRs;
- unit/API/contract tests;
- GitHub CI review;
- reviewing local Codex commits;
- merge decisions;
- current repository truth.

GPT Web does **not** claim successful Windows, real-browser, FFmpeg, Remotion, HyperFrames, video-use or large-media validation without evidence produced locally.

### Local Codex on Windows — runtime validation plane

Owns:

- Windows-specific behavior;
- real browser interaction;
- real media stored outside Git;
- FFmpeg / ffprobe;
- Remotion local render / Chrome behavior;
- HyperFrames;
- video-use / Python;
- performance and memory checks;
- real-media end-to-end acceptance;
- defect fixes discovered during those gates.

Codex works only from an exact GitHub branch/SHA frozen by GPT Web and pushes fixes back to the same workstream branch.

## 3. Handoff protocol

Every workstream uses this loop:

```text
GPT Web
→ create branch from accepted main
→ implement cloud-safe portion
→ run/inspect CI
→ freeze exact green SHA
→ update PROJECT_STATUS

Local Codex (only if required)
→ fetch exact branch/SHA
→ isolated worktree + isolated VIDEO_OS_DATA_ROOT
→ local/Windows/real-media acceptance
→ fix only active-scope defects
→ regression tests
→ push commits to same branch
→ return evidence + exact SHA

GPT Web
→ inspect diff
→ verify latest CI
→ judge acceptance gates
→ merge
→ update PROJECT_STATUS
→ open next branch
```

No parallel unpushed implementations of the same workstream.

## 4. Architecture invariants

Always preserve:

```text
Source Media != Project Canvas != Export Profile
```

Also preserve:

1. canonical internal timeline unit = frames;
2. Project JSON = durable project truth;
3. durable mutations = validated Project Commands / Transactions / bounded services;
4. Agent must not hand-edit runtime `project.json`;
5. UI must not spawn external CLIs;
6. Remotion = master composition/render engine;
7. HyperFrames = deterministic complex-motion asset engine;
8. video-use / FFmpeg remain behind adapters/services;
9. runtime media remains outside repository through `VIDEO_OS_DATA_ROOT`;
10. Studio theme/locale remains separate from Generated Video Brand;
11. `REUSE > MODIFY > CREATE`.

## 5. Explicit non-goals

Do not add in V2.1.1:

- real external AI provider;
- broad AI Command Bar;
- V2.2 Workflow Runtime implementation;
- multi-timeline;
- arbitrary docking;
- full Crop / Mask engine;
- transition suite;
- generated-media provider marketplace;
- cloud collaboration;
- HDR/pro color;
- desktop packaging;
- template marketplace;
- multi-user auth/RBAC;
- full event-sourced Undo rewrite;
- unrelated large UI redesign.

## 6. Workstreams

```text
R0 Repository Truth / Agent Guardrails
H0 Correctness Hotfix
H1 Project Transaction Safety
H2 Engine Process Runtime
H3 Durable Job Runtime
H4 Streaming Media Pipeline
H5 Project / Data Hardening
H6 Automated Acceptance
H7 Frontend Consolidation
```

### R0 — Repository Truth / Agent Guardrails

Goals:

- `PROJECT_STATUS.md` becomes current-state truth;
- `AGENTS.md` becomes the operating constitution;
- README/Handoff/Start files stop referring to superseded release/PR state;
- active PRD lives under `docs/prd/`;
- old validation/release documents remain historical evidence;
- obsolete PRs/issues are closed with explanation;
- local runtime directories are safely ignored.

Acceptance:

- a new GPT/Codex session can determine current version, active branch, active workstream and next allowed work without chat history;
- stale documents cannot override current status;
- no current document says merged PR #14/#15 must remain open;
- Issue #10 is reconciled with V2.1 MOV normalization;
- superseded PR #13 is closed.

### H0 — Correctness Hotfix

Release blocker.

#### Script editing

Current Script rebuild must not delete arbitrary Video clips or lose presentation state.

Required behavior:

- resolve the real A-roll/video track instead of hard-coding `video-main`;
- only rebuild clips proven to be managed by canonical Script/A-roll editing;
- if the track contains ambiguous user-managed Video clips, block the Script rebuild instead of deleting them;
- preserve applicable `volume`, `muted`, `fit`, `transform`, `enabled`, and `layer` state;
- unsafe failure must not increment revision.

Regression matrix:

```text
remove
restore
custom fit
muted
transform
non-script video protected
non-canonical track ID
migrated V1 project
unsafe rebuild = no mutation
```

#### Stale Inspector edits

Issue #11 becomes an H0/H1 correctness requirement.

Inspector saves must send minimal patches. A stale edit to `fontSize` must not overwrite a newer `fontFamily`.

#### Draft/commit

High-frequency fields use:

```text
onChange → local draft / preview
onBlur / Enter / pointerUp / bounded debounce → one durable command
```

#### Canvas mutation errors

Every async Canvas mutation must surface errors and clean draft state. No unhandled rejected Promise and no false-success UI.

#### Style resolution

Preserve live Linked Style semantics. Define precedence with tests before changing implementation:

```text
Linked property if present
→ explicit Clip property
→ Brand default
→ effect default
```

Brand must not overwrite an explicit Clip accent when no Linked accent exists.

### H1 — Project Transaction Safety

Release blocker.

Introduce a real mutation envelope:

```ts
{
  expectedRevision,
  commandId,
  command
}
```

Transactions add `transactionId` and `expectedRevision`.

Server mutation flow:

```text
acquire per-project mutex
→ load latest Project
→ compare expectedRevision
→ mismatch = 409 PROJECT_REVISION_CONFLICT
→ validate/apply
→ validate final Project
→ atomic save
→ append lightweight operation/audit record
→ release mutex
```

Requirements:

- same Project mutation is serialized;
- different Projects may mutate concurrently;
- duplicate commandId must not execute twice;
- normal editing no longer depends on whole-project PUT;
- whole-project replacement is restricted to explicit restore/import/migration/maintenance paths;
- long-running tasks attach results to a reloaded latest Project via minimal Commands/Transactions.

Mandatory race test:

```text
A expected=20
B expected=20
A → revision 21
B → 409
```

No silent lost update is permitted.

### H2 — Engine Process Runtime

Release blocker.

#### Remotion

Pin exact matching versions for:

```text
remotion
@remotion/player
@remotion/cli
```

Default render must use the installed local CLI. Runtime network download must not be the normal deterministic path.

#### HyperFrames

Record/pin the validated HyperFrames package version. Do not run an unversioned `npx hyperframes` deterministic path.

#### ToolRunner

Introduce a unified process layer with:

- argv-safe execution;
- stdout/stderr streaming;
- PID;
- timeout;
- AbortSignal cancel;
- Windows process-tree termination;
- log files;
- sanitized public error;
- exit-code metadata.

Long-running engines should not rely on `execFile` + large `maxBuffer` as the primary model.

Local acceptance requires installed-dependency/offline Remotion render, cancellation and timeout proof on Windows.

### H3 — Durable Job Runtime

Release blocker.

Job status:

```text
queued
preparing
running
completed
failed
cancelled
interrupted
```

Minimum Job types:

```text
render-final
render-overlay
hyperframes-render
media-normalize
video-use-transcribe
```

Persist to `VIDEO_OS_DATA_ROOT/jobs/<jobId>/` using atomic JSON plus logs/artifacts. A large database is not required for V2.1.1.

Requirements:

- bounded per-type concurrency;
- queryable stage/progress;
- cancel;
- retry;
- restart recovery;
- running/preparing jobs become `interrupted` after unclean restart and may be safely retried;
- Final Render output is not deleted by metadata cleanup.

Old render routes may remain as compatibility wrappers but must delegate to Job Runtime.

### H4 — Streaming Media Pipeline

Release blocker for the hardening release.

Current large-file buffering must be removed.

Upload target:

```text
browser File stream
→ temp file
→ byte-limit enforcement
→ probe
→ optional normalize Job
→ Asset registration
```

Do not use `File.arrayBuffer()` for GB-scale media.

Asset/output response target:

```text
stat
→ parse Range
→ createReadStream(start,end)
→ 206
```

Do not read the complete asset before slicing a Range.

Support GET/HEAD, 206/416, Content-Length/Content-Range, canonical server MIME and `X-Content-Type-Options: nosniff`.

Large-media acceptance records Node heap/RSS and demonstrates memory does not grow approximately 1:1 with media size.

### H5 — Project / Data Hardening

#### Freeze historical schemas

`project-v1.ts` must not import current mutable `ClipSchema`/`AssetSchema` as its historical input contract.

#### Chain migrations

Use version-to-version migration registration rather than special-casing old versions directly to `CURRENT_PROJECT_VERSION`.

#### Referential integrity

Project final validation adds:

- unique Asset IDs;
- unique Track IDs;
- globally unique Clip IDs;
- asset-backed clip references exist;
- linkedStyle references exist and target matches;
- scene style references exist;
- clip timeline bounds;
- source bounds where source metadata is available.

#### Transaction efficiency

Transaction path should parse/clone at transaction boundaries rather than doing full-project validation/cloning N times for N commands.

#### History

Do not rewrite Undo into event sourcing in V2.1.1. Instead:

- lower/bound entry count as needed;
- add memory/byte budget;
- remove redundant clones;
- add revision guards;
- preserve correct redo invalidation.

#### Recent Project index

Avoid full parse of every Project for every Recent refresh. Maintain lightweight current summary metadata/index.

### H6 — Automated Acceptance

Cloud CI:

```text
Ubuntu: install / format-check / lint / typecheck / unit / build
Windows: install / format-check / lint / typecheck / unit
```

Add workflow concurrency to cancel obsolete runs for the same branch/PR.

Add formatter as a formatting-only commit before mixing large logic diffs.

Minimum route tests:

```text
commands
transactions
media
asset Range
jobs/renders
project load/save
```

Minimum engine argv tests:

```text
Remotion final
Remotion overlay
custom export
muted
HyperFrames
FFmpeg normalize
Windows launcher
```

Playwright smoke:

```text
Create Project
Open
Import tiny fixture
Caption edit
Canvas change
AI rules Analyze/Apply
Undo/Redo
Save/Reopen
```

Windows media smoke validates tiny MP4, MOV, image, audio, subtitle, normalize/probe/Range and a short Final Render.

### H7 — Frontend Consolidation

Do after correctness/infrastructure unless a specific frontend fix is required by H0/H1.

Targets:

- split `StudioWorkspaceV21` responsibilities;
- create typed project/media/job/planner clients;
- centralize API errors;
- remove 100ms top-level frame polling where supported by Remotion Player events;
- keep gesture drafts local/rAF-throttled;
- gradually replace milestone CSS layers with token/component layers;
- converge i18n to one typed dictionary mechanism.

Do not turn H7 into a visual redesign.

## 7. Error contract

Use machine-readable errors:

```json
{
  "code": "PROJECT_REVISION_CONFLICT",
  "message": "Project changed. Reload the latest revision and retry this edit.",
  "retryable": true,
  "details": {
    "expectedRevision": 32,
    "currentRevision": 33
  },
  "requestId": "..."
}
```

Use meaningful HTTP status codes for bad request, not found, conflict, payload-too-large, range-not-satisfiable, validation failure, engine unavailable and internal error.

Do not expose raw absolute paths, full stderr or stacks in user-facing responses. Keep detailed diagnostics in server/job logs.

## 8. Local security boundary

The product remains a local-first single-user workstation. V2.1.1 does not add OAuth/RBAC.

Enforce the local assumption:

- safe local origin/binding guidance;
- same-origin mutation protection;
- canonical MIME server-side;
- `nosniff`;
- configured internal render origin instead of blindly trusting Host;
- no user-controlled shell command concatenation.

## 9. Recommended PR sequence

```text
PR-A R0 Repository Truth
PR-B H0 Correctness Hotfix
PR-C H1 Project Transaction Safety
PR-D H2 Engine Runtime
PR-E H3 Durable Job Runtime
PR-F H4 Streaming Media
PR-G H5 Data Hardening
PR-H H6 Automated Acceptance
PR-I H7 Frontend Consolidation
```

Each PR has its own branch. Do not bundle unrelated workstreams.

## 10. Validation split by workstream

### Cloud-only is sufficient for

- R0 documentation/governance;
- pure schema/command logic that is completely covered by tests;
- pure argv builders and API contract tests.

### Local Codex evidence is mandatory for

- Remotion / Chrome behavior;
- HyperFrames;
- video-use;
- FFmpeg / ffprobe;
- Windows process cancellation;
- real media normalization;
- large-file memory behavior;
- browser interaction where cloud tests do not reproduce Windows runtime;
- final release smoke.

GPT Web must explicitly freeze a branch/SHA before handing these gates to Codex.

## 11. Final Definition of Done

V2.1.1 may release only when:

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

H7 cosmetic/debt cleanup may partially continue after 2.1.1 only if all correctness/performance-critical H7 items have already passed.

## 12. Next milestone after release

Only after V2.1.1 is accepted:

```text
V2.2 Workflow Runtime
```

Expected architecture:

```text
WorkflowRun
→ Import
→ Probe
→ Transcribe
→ Script Analysis
→ Scene Detection
→ Visual Plan
→ Human Review
→ Generate Motion
→ Captions
→ Timeline Assembly
→ Preview
→ Final Render
```

Workflow Runtime must use the durable Job and Project Transaction foundations built in V2.1.1.

Then:

```text
V2.3 Real AI Director
```

Provider direction:

```text
VisualPlannerProvider
├─ RulesProvider
├─ LLMProvider
└─ HybridProvider
```

Rules remain responsible for deterministic constraints such as Safe Area, density, collisions, canvas/effect compatibility; LLM handles semantics/creative planning; Commands/Transactions remain the only durable execution boundary.
