# Video OS Studio V2.1.1 — Final Local Windows Release Acceptance

> Phase: V2.1.1 Final Release Acceptance  
> Branch: `release/v2.1.1-final-acceptance`  
> Accepted H7/main base: `06481c1d78c93bcadfa4be7ec58dd4c250cc19c3`  
> Product version during acceptance: `2.1.0`  
> Project Schema: `2.0.0`  
> Frozen handoff SHA: **resolve from the final green release-acceptance branch HEAD supplied by GPT Web.**

## 1. Purpose

This is the final release gate for Video OS Studio V2.1.1.

It is not H8 and it is not a feature workstream. It exists to prove that the accepted R0 and H0–H7 hardening workstreams compose correctly on the current release candidate and satisfy the Master PRD Final Definition of Done.

Local Codex validates an exact GitHub SHA frozen by GPT Web. It may fix only demonstrated V2.1.1 release blockers and must add regression coverage for any code fix.

Do not start V2.2 Workflow Runtime, a real external AI provider, a broad AI Command Bar, a Project Schema migration, an unrelated UI redesign, or opportunistic refactoring.

## 2. Release authority and precedence

Read in this order:

1. live GitHub `main`, release branch, PR, and CI state;
2. `PROJECT_STATUS.md`;
3. `AGENTS.md`;
4. `SYSTEM.md`;
5. `docs/prd/Video_OS_Studio_V2_1_1_Engineering_Hardening_Master_PRD.md`;
6. this document;
7. prior accepted validation reports when reconciling specific release gates.

If the supplied frozen SHA, live branch HEAD, repository truth, or validation contract disagree, stop and report the mismatch. Do not choose a newer SHA, rebase, merge, or infer the intended state.

The exact release candidate is the frozen handoff SHA supplied by GPT Web after this contract and repository-truth checkpoint have passed the full CI matrix.

## 3. Master PRD Final Definition of Done

V2.1.1 may release only when every gate below is explicitly supported by accepted evidence and current-candidate release smoke:

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

A release recommendation of YES requires all of these gates to be PASS.

## 4. Prior accepted evidence matrix

Final release acceptance must reconcile, not blindly repeat, the accepted workstream evidence.

### R0 — Repository Truth / Agent Guardrails

Authority:

- PR #17;
- current `PROJECT_STATUS.md`;
- `AGENTS.md`;
- `SYSTEM.md`.

Release use:

- verify a fresh agent can identify current version, accepted main, active release branch, release contract, and V2.2 block without chat history;
- verify no current authoritative document directs work back to obsolete PRs/workstreams.

### H0 — Correctness Hotfix

Authority:

`docs/validation/LOCAL_VALIDATION_V2_1_1_H0.md`

Release use:

- reconcile Script rebuild safety, minimal Inspector patches, style precedence, and Canvas error cleanup;
- current-candidate browser smoke must cover representative edit/commit/error behavior.

### H1 — Project Transaction Safety

Authority:

`docs/validation/LOCAL_VALIDATION_V2_1_1_H1.md`

Release use:

- reconcile per-Project serialization, `expectedRevision`, operation IDs, idempotency, atomic save, and structured conflict behavior;
- current candidate must re-run a deterministic stale-revision conflict and prove no silent lost update.

### H2 — Engine Process Runtime

Authority:

`docs/validation/LOCAL_VALIDATION_V2_1_1_H2.md`

Accepted pins:

```text
remotion             4.0.513
@remotion/player     4.0.513
@remotion/cli        4.0.513
hyperframes          0.8.10
```

Release use:

- verify pins remain exact;
- verify current candidate performs installed-dependency Remotion render and representative HyperFrames work without default runtime package download;
- accepted H2 Windows timeout/cancel/process-tree evidence may be cited unless release-branch code changes that process path.

### H3 — Durable Job Runtime

Authority:

`docs/validation/LOCAL_VALIDATION_V2_1_1_H3.md`

Release use:

- reconcile bounded concurrency, queryable progress, cancel, retry, logs/artifacts, and restart recovery;
- current candidate must exercise at least one durable Final Render job and one restart/recovery scenario or the existing automated recovery test plus a targeted local restart smoke;
- if release-branch code changes Job Runtime, repeat the affected H3 local matrix rather than relying on prior evidence.

### H4 — Streaming Media Pipeline

Authority:

`docs/validation/LOCAL_VALIDATION_V2_1_1_H4.md`

Release use:

- reconcile streaming browser upload, staged cleanup, GET/HEAD/Range, canonical MIME/nosniff, and large-media memory evidence;
- do not repeat the historical ~380 MB memory matrix merely for ceremony if the release branch has not changed streaming code;
- current candidate must run automated Range/media regression and one real-media browser/HTTP Range smoke;
- if release-branch code changes H4 streaming paths, repeat the affected memory/abort/Range measurements.

### H5 — Project / Data Hardening

Authority:

`docs/validation/LOCAL_VALIDATION_V2_1_1_H5.md`

Release use:

- reconcile frozen historical schema, chained migration, referential integrity, bounded History, Recent Project summary, failed-import compensation, and guarded orphan maintenance;
- current candidate must save/reopen a real project and preserve current media/style references.

### H6 — Automated Acceptance

Authority:

`docs/validation/LOCAL_VALIDATION_V2_1_1_H6.md`

Release use:

- full Ubuntu/Windows/browser/windows-media CI matrix must remain green on the exact release-candidate head;
- local candidate must also run the repository Playwright and Windows-media smoke commands.

### H7 — Frontend Consolidation

Authority:

`docs/validation/LOCAL_VALIDATION_V2_1_1_H7.md`

Release use:

- reconcile typed clients/errors, event-driven Player sync, top-level frame isolation, rAF gesture commit boundaries, Planner i18n, theme/layout validation, Final Render UI, and HyperFrames UI;
- current candidate must include image B-roll in both Preview and an actual exported final video.

## 5. Entry gate

Do not begin local release acceptance until GPT Web supplies an exact frozen handoff SHA for `release/v2.1.1-final-acceptance` and confirms its full CI is green.

Recommended isolated paths:

```text
E:\Video-OS-Studio-V2.1.1-Release-Validation
E:\Video-OS-Data\v2.1.1-final-release-<short-sha>
```

Required checkout sequence:

```powershell
git fetch origin

git worktree add --detach `
  E:\Video-OS-Studio-V2.1.1-Release-Validation `
  <FROZEN_HANDOFF_SHA>

cd E:\Video-OS-Studio-V2.1.1-Release-Validation

git rev-parse HEAD
```

`git rev-parse HEAD` must exactly equal the supplied frozen handoff SHA.

Set an isolated data root:

```powershell
$env:VIDEO_OS_DATA_ROOT="E:\Video-OS-Data\v2.1.1-final-release-<short-sha>"
```

Never mutate a production data root or a prior H4/H5/H6/H7 validation root.

## 6. Environment record

Record exact values for:

```text
Windows edition/build/architecture
Node / npm
Chrome version and executable path
FFmpeg / ffprobe version and path
Python version
Remotion package versions
HyperFrames package version
Playwright package/browser version
VIDEO_USE_ROOT
VIDEO_OS_DATA_ROOT
worktree path
```

Verify pins:

```powershell
npm ls remotion @remotion/player @remotion/cli hyperframes @playwright/test
```

Expected:

```text
remotion             4.0.513
@remotion/player     4.0.513
@remotion/cli        4.0.513
hyperframes          0.8.10
@playwright/test     1.62.1
```

Do not upgrade dependencies during acceptance.

## 7. Clean code and automation gate

From the exact frozen SHA:

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build

npx --no-install playwright install chromium
npm run test:e2e

$env:H6_WINDOWS_MEDIA_SMOKE="1"
npm run test:windows-media
Remove-Item Env:H6_WINDOWS_MEDIA_SMOKE
```

Expected baseline before any release-blocker fix is whatever GPT Web reports for the frozen exact-head CI. Any new failure must be investigated; do not classify it as environmental without reproducible evidence.

The two existing `@next/next/no-img-element` warnings in `EffectLibrary.tsx` and `HyperFramesLibrary.tsx` are non-blocking if unchanged.

If port 3000 is occupied by an unrelated user process, do not kill that process. Record the conflict and run the same pinned Playwright smoke on an isolated alternate port using a validation-only configuration. This is acceptable only if the test itself passes unchanged in behavior.

## 8. Current-candidate repository-truth audit

Verify:

- `main` accepted H7 checkpoint is `06481c1d78c93bcadfa4be7ec58dd4c250cc19c3` at release-branch creation;
- release branch and PR point to the supplied frozen SHA;
- `PROJECT_STATUS.md` names V2.1.1 Final Release Acceptance as active;
- product version is still `2.1.0` during acceptance;
- Project Schema is `2.0.0`;
- V2.2 is blocked;
- no current authoritative document instructs agents to resume H0–H7 implementation or an obsolete PR.

Record `REPOSITORY TRUTH: PASS/FAIL`.

## 9. Final real-browser/media release project

Create a fresh release-validation project in the isolated data root.

Use representative real fixtures for:

- MP4 video;
- MOV video requiring the normal accepted import/normalization path if available;
- PNG or JPEG still image;
- audio, preferably FLAC/WAV plus a normal playback format if fixtures exist;
- SRT or VTT subtitles.

Exercise this complete UI flow:

```text
Create Project
→ Open/Recent
→ Import MP4
→ Import MOV
→ Import still image
→ Import audio
→ Import subtitle
→ Caption edit
→ Script/Scene representative edit
→ Planner rules Analyze
→ Planner Apply
→ Add image B-roll at non-zero playhead
→ Add video B-roll at non-zero playhead
→ Add audio at non-zero playhead
→ Canvas drag
→ Canvas resize
→ Canvas rotate
→ Undo
→ Redo
→ Play
→ Pause
→ Seek to two non-adjacent frames
→ Resume
→ End
→ Dark/Light toggle
→ Save
→ Reopen
→ Final Render
→ HyperFrames representative render
```

During the flow require:

```text
ZERO lost update
ZERO false-success UI
ZERO broken Asset reference
ZERO blocking browser console error
ZERO unhandled Promise rejection
Project Schema remains 2.0.0
```

Record exact revisions at important mutation boundaries.

## 10. Transaction safety / no-silent-data-loss gate

Create a deterministic stale revision scenario against the current release candidate:

```text
client A reads revision N
client B reads revision N
A commits → N+1
B submits expectedRevision=N
```

Required:

- B receives HTTP 409 / `PROJECT_REVISION_CONFLICT`;
- A's change remains durable;
- B does not overwrite A;
- UI/client error is sanitized and actionable;
- no false success;
- reload/retry can continue from the latest Project;
- no unhandled rejection.

Also verify duplicate operation/command IDs do not double-apply using existing automated or targeted API evidence.

This current-candidate evidence plus accepted H1 evidence supports:

```text
TRANSACTION SAFETY
ZERO KNOWN SILENT DATA LOSS
```

## 11. Engine runtime / deterministic dependency gate

Verify exact package pins and installed-dependency execution.

### Remotion

Start a short Final Render through the normal product path.

Required:

- local installed `@remotion/cli` path is used;
- no default `npx remotion@latest` or runtime package download occurs;
- Job reaches terminal `completed`;
- output is readable and valid;
- public errors remain sanitized if an intentional validation error is exercised.

### HyperFrames

Run a representative existing registry effect, preferably `process-flow`.

Required:

- HyperFrames version `0.8.10`;
- no unversioned/latest deterministic path;
- output artifact exists and probes successfully;
- Project revision/reference update is correct.

Accepted H2 Windows cancellation/timeout/process-tree evidence may be cited if no release-candidate code changed that layer. If it changed, re-run the affected H2 local matrix.

## 12. Durable Job / bounded concurrency / restart recovery gate

Reconcile H3 accepted evidence, then run targeted current-candidate smoke.

Required current-candidate evidence:

1. Start a durable Final Render job and observe queued/preparing/running/completed progression as applicable.
2. Confirm Job metadata/log/artifact remain queryable after completion.
3. Exercise restart recovery using an isolated candidate data root:
   - create or use a job that is in a non-terminal running/preparing state under controlled validation conditions;
   - restart the application/runtime in the documented H3 manner;
   - verify stale in-flight state becomes `interrupted` or otherwise follows the accepted H3 recovery contract;
   - verify safe retry remains possible.
4. Confirm configured Job concurrency remains bounded; use accepted H3 stress evidence plus current configuration/source/automated regression unless release code changed concurrency logic.

Record:

```text
DURABLE JOBS
ZERO UNBOUNDED RENDER CONCURRENCY
RESTART RECOVERY
```

## 13. Streaming media / Range gate

Run the repository Windows-media smoke and one targeted real-media Range request against the isolated candidate.

Verify:

- GET and HEAD work;
- byte Range returns 206;
- returned bytes match source/output bytes;
- invalid Range follows 416 contract where applicable;
- canonical MIME and `nosniff` remain correct;
- server does not exhibit full-file Range buffering behavior.

Use accepted H4 large-file RSS/heap evidence to satisfy the historical large-media memory gate if release-branch code has not changed streaming/upload/Range implementation.

If this release branch changes H4 implementation, repeat the affected H4 large-file memory, abort-cleanup, and Range matrix.

Record:

```text
STREAMING MEDIA
ZERO FULL-FILE RANGE BUFFERING
```

## 14. Data hardening gate

Using the real release-validation Project:

- Save/Reopen after media, Planner, Canvas, and Timeline changes;
- verify Asset IDs/references remain valid;
- verify linked style / Scene references remain valid when present;
- verify no timeline/source bounds failure was silently accepted;
- verify Recent Project summary remains usable;
- verify Undo/Redo remains revision-safe;
- ensure no failed import leaves an operation-owned orphan if an import failure is exercised.

Use accepted H5 migration/orphan-maintenance evidence unless release code changed those paths.

Record `DATA HARDENING: PASS/FAIL`.

## 15. H0 correctness regression gate

Run a focused current-candidate smoke for release-critical correctness:

- representative Script/Scene editing must not delete unrelated media;
- an Inspector edit must not overwrite an unrelated newer property;
- Canvas async failure/cancel path must clean draft state and surface an error;
- Linked Style / explicit Clip / Brand precedence must remain consistent with accepted H0 tests.

Automated tests may provide the exact edge-case matrix; current browser smoke should prove the live editor remains usable.

Record `DATA CORRECTNESS: PASS/FAIL`.

## 16. H7 Player / gesture / i18n release smoke

On the current candidate:

- play for several seconds and observe frame/time progression;
- pause and confirm frame holds;
- seek to two non-adjacent frames;
- resume and run to end;
- timeline playhead and Canvas active content remain synchronized;
- Add B-roll/Audio at a non-zero playhead and verify actual `startFrame` equals expected frame;
- perform one rapid Canvas drag, resize, and rotate;
- each gesture must produce one durable revision increment and preserve final pointer value;
- one Undo/Redo must reverse/restore each gesture boundary as expected;
- Planner rules Analyze/Apply works in Chinese and English without raw dictionary keys;
- dark/light theme does not create blocking layout regression.

This is a release smoke, not a request to repeat every H7 visual measurement unless the release branch changed frontend layout code.

## 17. Critical image B-roll final-output gate

This gate closes the H7 local defect discovered immediately before release.

Use a distinctive still image Asset and add it as B-roll during a known non-zero interval.

Required:

1. Preview at an active frame shows the still image without `MediaPlaybackError`, Remotion `EncodingError`, or other blocking console error.
2. Run a normal Final Render containing that interval.
3. Probe the final output with ffprobe and confirm expected container/video stream/duration.
4. Extract at least one frame from the final MP4 inside the image-B-roll interval using FFmpeg, for example:

```powershell
ffmpeg -ss <time-inside-broll> -i <final-output.mp4> -frames:v 1 <isolated-evidence-frame.png>
```

5. Visually inspect the extracted frame and confirm the distinctive image B-roll is actually present in the final encoded output.
6. Record the B-roll clip frame interval, extracted time/frame, output path, and observed result.

Preview-only success is not sufficient.

Record `IMAGE B-ROLL FINAL OUTPUT FRAME: PASS/FAIL`.

## 18. Final Render output gate

For the representative release project:

- start Final Render from real Studio UI;
- observe durable Job progression;
- output HEAD/GET works;
- ffprobe confirms expected video codec/container/dimensions/fps/duration;
- audio stream is present when the project contains audio and export profile expects it;
- rendered content includes the representative image B-roll interval from Section 17;
- no raw absolute path/stderr/stack is surfaced to the user.

Record `FINAL RENDER: PASS/FAIL`.

## 19. Video-Use local evidence — release blocker unless explicitly waived by repository truth

The Master PRD lists `video-use` among runtime-sensitive areas requiring local Codex evidence. H7 local acceptance recorded `VIDEO-USE: NOT CONFIGURED`; that is not sufficient to silently claim the final release gate.

### Required first step

Resolve the repository's documented video-use setup and check the local environment:

```text
VIDEO_USE_ROOT
Python version/environment
video-use repository/runtime availability
adapter/service configuration
```

Do not install or upgrade arbitrary latest packages without repository instructions.

### If configured/available

Run the most representative real product integration supported by the repository and current fixtures, such as:

```text
prepare / transcribe
→ inspect resulting job/log/artifact
→ apply EDL or supported Project mutation path
→ verify Project revision/reference result
```

Use real local media and Python/video-use runtime. Record exact command/service path only as diagnostic evidence; normal UI must still go through the product adapter/service boundary.

Required:

- runtime actually executes locally;
- durable Job semantics remain correct if the integration uses H3 Jobs;
- result can be applied without silent lost update;
- errors are sanitized;
- no direct agent hand-edit of `project.json`.

Record `VIDEO-USE LOCAL EVIDENCE: PASS`.

### If not configured or cannot run

Do not write PASS and do not infer success from unit tests.

Record:

```text
VIDEO-USE LOCAL EVIDENCE: BLOCKED
RELEASE RECOMMENDATION: NO
```

Include the exact missing prerequisite and any repository-supported setup step that was attempted.

Only GPT Web may later accept a waiver if a new explicit repository/product decision changes the Master PRD requirement. Local Codex must not create that waiver itself.

## 20. Security/error boundary smoke

Verify representative current-candidate responses do not expose:

- absolute local paths;
- full engine stderr;
- JavaScript/server stack traces;
- user-controlled shell concatenation behavior.

Verify same-origin/local workstation assumptions remain intact and media responses retain canonical MIME/nosniff.

Do not add OAuth/RBAC or unrelated security architecture in this release gate.

## 21. Temp/process cleanup

At the end:

- stop validation-owned Next/Node processes;
- stop validation-owned Chrome/Playwright processes;
- ensure no validation-owned FFmpeg/ffprobe process remains;
- ensure no validation-owned HyperFrames process remains;
- ensure no validation-owned Python/video-use process remains;
- inspect isolated data root for unexpected `.tmp`, `.part`, `.partial` files;
- preserve intentional validation fixtures, durable Job evidence, render outputs, extracted B-roll evidence frame, and HyperFrames artifacts;
- do not kill unrelated user processes or delete other worktrees/data roots.

Record residuals explicitly.

## 22. Release-blocker defect protocol

Use defect IDs:

```text
V2.1.1-REL-001
V2.1.1-REL-002
...
```

For every defect:

1. reproduce on the frozen release candidate;
2. record expected vs actual;
3. identify root cause;
4. implement the smallest release-scope fix;
5. add a regression test;
6. rerun the affected real local flow;
7. rerun `npm ci`, format, lint, typecheck, test, build;
8. rerun affected Playwright/Windows-media/engine smoke;
9. commit and push to `release/v2.1.1-final-acceptance`.

Do not absorb unrelated cleanup into a release-blocker commit.

## 23. Actual Results

Local Codex appends actual release evidence below this heading after completing acceptance from the frozen SHA.

Do not rewrite the contract above.

For each Master PRD Final Definition of Done gate, state PASS/FAIL and identify the evidence source:

- current release candidate smoke;
- exact-head CI;
- accepted H0–H7 authority document;
- or a combination.

If a required runtime gate is not actually validated, state BLOCKED rather than PASS.

## 24. Final report format

Return exactly this structure to GPT Web:

```text
BRANCH:
FINAL HEAD:
FROZEN INPUT HEAD:
LOCAL WORKTREE:
LOCAL DATA ROOT:
WINDOWS:
NODE/NPM:
CHROME:
FFMPEG/FFPROBE:
REMOTION VERSIONS:
HYPERFRAMES VERSION:
PLAYWRIGHT VERSION:
PYTHON:
VIDEO_USE_ROOT:

CLEAN NPM CI: PASS/FAIL
CODE CHECKS: PASS/FAIL — test files / tests
PLAYWRIGHT SMOKE: PASS/FAIL
WINDOWS MEDIA SMOKE: PASS/FAIL

REPOSITORY TRUTH: PASS/FAIL
DATA CORRECTNESS: PASS/FAIL
TRANSACTION SAFETY: PASS/FAIL
ENGINE RUNTIME: PASS/FAIL
DURABLE JOBS: PASS/FAIL
STREAMING MEDIA: PASS/FAIL
DATA HARDENING: PASS/FAIL
AUTOMATED ACCEPTANCE: PASS/FAIL
ZERO KNOWN SILENT DATA LOSS: PASS/FAIL
ZERO UNBOUNDED RENDER CONCURRENCY: PASS/FAIL
ZERO DEFAULT RUNTIME REMOTION DOWNLOAD: PASS/FAIL
ZERO FULL-FILE RANGE BUFFERING: PASS/FAIL
UBUNTU CI: PASS/FAIL
WINDOWS CI: PASS/FAIL
LOCAL WINDOWS MEDIA/ENGINE SMOKE: PASS/FAIL
RESTART RECOVERY: PASS/FAIL
V2.1 REGRESSION: PASS/FAIL

FINAL RELEASE BROWSER FLOW: PASS/FAIL
IMAGE B-ROLL FINAL OUTPUT FRAME: PASS/FAIL — interval / extracted frame evidence
FINAL RENDER: PASS/FAIL — dimensions / duration / streams
HYPERFRAMES: PASS/FAIL
VIDEO-USE LOCAL EVIDENCE: PASS/FAIL/BLOCKED
SECURITY/ERROR BOUNDARY: PASS/FAIL

DEFECTS FIXED:
COMMITS PUSHED:
REMAINING FAILURES:
RESIDUAL TEMP/PROCESSES:

RELEASE RECOMMENDATION: YES/NO
```

## 25. Stop condition

After pushing the final release-acceptance documentation commit:

- do not merge the release PR;
- do not bump product/package version;
- do not create a `v2.1.1` tag/release;
- do not start V2.2.

Return the exact FINAL HEAD and report to GPT Web.

GPT Web will then:

```text
review frozen → final diff
→ verify exact-head CI
→ reconcile every Final Definition of Done gate
→ decide whether Video-Use evidence and every runtime gate are satisfied
→ if PASS, prepare the release/version/tag checkpoint according to repository conventions
→ merge/accept V2.1.1 release state
→ only after accepted V2.1.1 may V2.2 begin
```
