# Video OS Studio — Current Project Status

> This file is the single current-state source of truth for GPT Web, local Codex, and other development agents.
> Conversation memory, old PR descriptions, historical PRDs, and prior validation reports are evidence; they do not override this file.

## Status semantics

When read from `main`, this file describes the accepted checkpoint and the next allowed workstream.

When read from a feature branch, status changes are proposed until the PR merges. Resolve live GitHub `main`, branch, PR, and CI SHAs at runtime rather than making this file self-reference its own commit SHA.

## Proposed accepted checkpoint after H4 / PR #23 merge

```yaml
product_version: 2.1.0
released_v2_1_sha: fcfb341367b6ff5e8911693483c14196386c5a93
project_schema: 2.0.0
current_milestone: V2.1.1 Engineering Hardening
last_completed_workstream: H4 Streaming Media Pipeline
next_allowed_workstream: H5 Project / Data Hardening
active_workstream_on_main: none until H5 branch/PR is opened
next_product_milestone: V2.2 Workflow Runtime only after V2.1.1 release
```

Delivery history:

```text
R0 Repository Truth / Agent Guardrails  → PR #17 COMPLETE
H0 Correctness Hotfix                   → PR #19 COMPLETE
H1 Project Transaction Safety           → PR #20 COMPLETE
H2 Engine Process Runtime               → PR #21 COMPLETE
H3 Durable Job Runtime                  → PR #22 COMPLETE
H4 Streaming Media Pipeline             → PR #23 COMPLETE after merge
H5 Project / Data Hardening             → NEXT
H6 Automated Acceptance                 → BLOCKED
H7 Frontend Consolidation               → BLOCKED
```

## H4 acceptance evidence

```text
PR: #23
Base accepted H3 main: 0abaa07d715087631644f62e7e6d6c075125a1b3
Frozen cloud input: eb308a9752af911b0d1e3d2d1ebce9607389df15
Local validation final head: bd956893c32a49ed8a80d15d3eeee34ed6e55fad
Local validation: PASS
Final GitHub verify: Run 32618434045 PASS
Final local test baseline: 43 files / 179 tests
```

Acceptance authority:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H4.md
```

H4 local Windows/large-media acceptance proved:

- normal Studio media import uses raw browser `File` body rather than multipart `FormData`;
- server receives `request.body` as a stream and stages progressively under Project `.uploads/`;
- a 379.86 MB real upload produced only 15.22 MB Next-server RSS delta (`0.0401×` file size);
- validation helper upload RSS/file ratio was `0.1786`, heap/file ratio `0.0000`;
- aborted upload cleans partial `.part`, does not mutate Project state, and later upload recovers;
- declared >2 GB request returns 413 / `MEDIA_UPLOAD_TOO_LARGE` with no retained temp file or Project mutation;
- native MP4 and MOV → normalized MP4 paths both pass;
- stale upload commit returns `PROJECT_REVISION_CONFLICT` and preserves the newer Project revision;
- Asset GET/HEAD uses streaming semantics and full Range matrix passes with exact bytes;
- large Asset server RSS/file ratio was `0.0267`; helper RSS/file ratio `0.1883`, heap/file ratio `0.0078`;
- browser playback/seek generated real Range requests and 206 responses;
- durable Final Render output GET/HEAD/Range passes without deleting H3 artifacts;
- canonical MIME and `X-Content-Type-Options: nosniff` pass;
- no H4 `.part` files, file handles, owned Node/FFmpeg/curl processes, or blocking failures remained;
- representative H0/H1/H2/H3 application behavior remained healthy.

Non-blocking H4 notes:

- local validation used Node 25.2.1 while repository declares Node `24.x`;
- two pre-existing `@next/next/no-img-element` lint warnings remain;
- one early transient `Controller is already closed` abort diagnostic was not reproduced in the final production abort rerun; server cleanup/recovery remained healthy;
- stale revision/import tests can leave already-moved/normalized media before mutation conflict; cleanup remains H5 scope by design.

## H4 accepted behavior

H4 establishes bounded large-media IO for the local-first workstation pipeline:

```text
Upload:
browser File body
→ request.body stream
→ .uploads/<uuid>.part
→ byte-limit enforcement
→ staged MediaImportService
→ probe / optional normalize
→ H1-safe Project registration

Asset/output serving:
stat
→ parse single Range
→ createReadStream(start,end)
→ Web stream
→ 200 / 206 / 416
```

Accepted constraints:

- no normal large upload path uses `File.arrayBuffer()` / whole-file `Uint8Array` buffering;
- one byte range is supported; multipart/byteranges is not required;
- GET/HEAD include correct `Content-Length`, Range metadata, canonical server MIME, and `nosniff`;
- H3 durable render outputs remain durable while being streamed;
- H4 does not solve orphan cleanup or historical schema integrity.

## H5 next scope gate

H5 owns **Project / Data Hardening**. It may begin only after PR #23 merges and the new accepted `main` SHA is resolved from GitHub.

Required direction from the Master PRD:

### 1. Freeze historical schemas

`project-v1.ts` must not import mutable current `ClipSchema` / `AssetSchema` as its historical input contract.

Historical input contracts must be frozen so future current-schema changes cannot silently change what V1 migration accepts.

### 2. Chain migrations

Replace direct special-casing of old versions to `CURRENT_PROJECT_VERSION` with explicit version-to-version migration registration.

Target shape:

```text
V1
→ V2
→ V3 ...
```

Each migration step owns one source contract and one target contract.

### 3. Referential integrity

Final Project validation must cover at least:

- unique Asset IDs;
- unique Track IDs;
- globally unique Clip IDs;
- asset-backed Clip references exist;
- `linkedStyle` references exist and target type matches;
- scene style references exist;
- Clip timeline bounds;
- source bounds where source metadata is available.

Invalid references must be rejected before durable save rather than discovered later by the UI/render path.

### 4. Transaction efficiency

Avoid full-project parse/clone/validation N times for an N-command transaction.

Target behavior:

```text
validate/clone at transaction boundary
→ apply bounded command sequence
→ validate final Project once
```

Correctness from H1 must remain unchanged.

### 5. History hardening

Do **not** rewrite Undo/Redo into event sourcing in V2.1.1.

Instead:

- lower/bound entry count when needed;
- add memory/byte budget;
- remove redundant clones;
- add revision guards;
- preserve correct redo invalidation.

### 6. Recent Project index

Avoid parsing every full Project JSON on every Recent Project refresh.

Maintain lightweight current summary metadata/index sufficient for Recent Project listing while keeping `project.json` as durable project truth.

### 7. Orphan media/data cleanup

H5 owns the orphan media created by failed/stale imports after files were already staged/moved/normalized.

Cleanup must be conservative and must never delete media still referenced by the current Project or durable artifacts.

## H5 acceptance direction

Cloud-safe correctness tests should cover:

```text
frozen V1 fixture remains accepted by V1 contract
current schema changes cannot alter V1 input contract
migration chain executes step-by-step
invalid duplicate IDs rejected
missing Asset references rejected
invalid Linked/scene style references rejected
invalid timeline/source bounds rejected
multi-command transaction preserves H1 revision/idempotency semantics
history budget/revision/redo invalidation behavior
Recent Project listing avoids full Project parse path
orphan cleanup preserves referenced media and removes only provably unreferenced owned media
```

Local Codex is required only for H5 checks that depend on real Windows filesystem behavior, real historical local Project folders, or safe cleanup semantics not fully reproducible in cloud tests. GPT Web must explicitly freeze a green H5 SHA before any local H5 validation.

H5 must **not** absorb:

- H6 broad Windows CI / Playwright matrix;
- H7 frontend consolidation;
- Project Schema version change unless an approved migration decision explicitly requires it;
- real external AI Provider;
- V2.2 Workflow Runtime;
- unrelated editor feature work.

## H3 accepted behavior

Acceptance authority:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H3.md
```

H3 established durable file-backed jobs, cancellation/retry/restart recovery, bounded concurrency, durable logs/artifacts, real engine jobs, and H1-safe long-job Project attachment.

## H2 accepted behavior

Acceptance authority:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H2.md
```

H2 established deterministic shared ToolRunner execution and exact runtime pins:

```text
remotion             4.0.513
@remotion/player     4.0.513
@remotion/cli        4.0.513
hyperframes          0.8.10
```

## H1 accepted behavior

Acceptance authority:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H1.md
```

H1 established per-Project serialization, `expectedRevision`, stable operation IDs, idempotency, structured revision conflicts, and revision-safe long-task attachment.

## H0 accepted behavior

Acceptance authority:

```text
docs/validation/LOCAL_VALIDATION_V2_1_1_H0.md
```

H0 established safe Script A-roll rebuild boundaries, bounded/minimal Caption commits, Linked → Clip → Brand style resolution, and Canvas mutation error/draft cleanup.

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
- review of local Codex fixes;
- accepted checkpoint maintenance.

### Local Codex owns

- Windows-only verification and active-workstream fixes;
- real browser/media/engine behavior;
- filesystem/process/performance evidence;
- real local-data cleanup validation where cloud evidence is insufficient.

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

## Current known follow-ups

- H5 owns conservative cleanup of stale-import/orphan media created after files were already staged/moved/normalized but before a failed mutation commit.
- H5 owns frozen historical Project schemas, chained migrations, stronger referential integrity, transaction efficiency, history budget/revision guards, and Recent Project indexing.
- two existing `@next/next/no-img-element` lint warnings remain non-blocking.
- repository runtime engine declaration remains Node `24.x`.
- Issue #10 is closed by V2.1 MOV normalization.
- Issue #11 is closed by H0 + H1 stale Caption protection.
- PR #13 is closed as superseded by the V2.1 release path.

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
