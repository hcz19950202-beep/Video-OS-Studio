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

Local Windows/browser/media/engine release acceptance was completed from the frozen SHA in the isolated worktree.

BRANCH: release/v2.1.1-final-acceptance
FINAL HEAD: final documentation commit (code checkpoint before this commit: a554dccbc43c0c50a826dd1f0e4c77350aaec5f9)
FROZEN INPUT HEAD: d0d85fe8ea0fe85956ffb50c70fe58b81f6681cf
LOCAL WORKTREE: E:\Video-OS-Studio-V2.1.1-Release-Validation
LOCAL DATA ROOT: E:\Video-OS-Data\v2.1.1-final-release-d0d85fe
WINDOWS: Windows 10 家庭中文版 10.0.19045, build 19045, x64
NODE/NPM: system Node v25.2.1 / npm 11.6.2 for clean gates; bundled Node v24.19.0 (project engine) for authoritative release browser/engine server
CHROME: Google Chrome 151.0.7922.138
FFMPEG/FFPROBE: 8.1.1-full_build-www.gyan.dev
REMOTION VERSIONS: remotion 4.0.513; @remotion/player 4.0.513; @remotion/cli 4.0.513
HYPERFRAMES VERSION: 0.8.10
PLAYWRIGHT VERSION: @playwright/test 1.62.1; pinned Chromium installed
PYTHON: system Python 3.12.10; video-use venv Python 3.12.13
VIDEO_USE_ROOT: C:\Users\hcz\.codex\skills\video-use
VIDEO_USE_PYTHON: C:\Users\hcz\.codex\skills\video-use\.venv\Scripts\python.exe

CLEAN NPM CI: PASS — 684 packages installed after the release-blocker fixes; only the declared Node 24 engine warning and package deprecation warnings.
CODE CHECKS: PASS — format:check, lint, typecheck, build, and npm test; 57 test files passed, 240 tests passed, 1 test file/test skipped. Lint retained exactly the two historical no-img warnings.
PLAYWRIGHT SMOKE: PASS — pinned Chromium, isolated port 3014, unchanged H6 smoke 1/1 passed. The exact standard npm run test:e2e command was also executed and stopped before the test because an unrelated existing service occupied 127.0.0.1:3000; the contract-approved isolated rerun passed.
WINDOWS MEDIA SMOKE: PASS — H6 real-media smoke 1/1 passed after each release-blocker fix; MP4/MOV/image/audio/subtitle, normalization, Range and short render completed.

REPOSITORY TRUTH: PASS — release branch started exactly at d0d85fe; PROJECT_STATUS names PR #27/final acceptance active, product version remains 2.1.0 during acceptance, Project Schema remains 2.0.0, accepted H7/main is 06481c1, and V2.2 is blocked.
DATA CORRECTNESS: PASS — current release Project saved/reopened at revision 36; schema 2.0.0, 6 assets, 5 tracks, 8 clips, 1 Scene, 1 active Script segment, zero missing asset refs and zero out-of-bounds clips. Accepted H0/H5 evidence remains applicable.
TRANSACTION SAFETY: PASS — current candidate snapshots at revision 12; A committed 12→13, stale B with expectedRevision 12 returned HTTP 409 PROJECT_REVISION_CONFLICT, A's state remained durable, and no overwrite/false success occurred. Invalid mutation returned sanitized 422 without absolute path/stack/stderr. Accepted H1 evidence remains applicable.
ENGINE RUNTIME: PASS — installed Remotion pins and HyperFrames 0.8.10 used; final render completed through the product Job/UI path and no latest/npx runtime package download was used. Release browser/engine ran on bundled Node 24.19.0. System Node 25 was used only for clean gates and emitted the expected engine warning.
DURABLE JOBS: PASS — durable Final Render job 0b955fa4-3753-4ec7-b205-4ae06b737847 reached running, was stopped with the validation server, restarted as interrupted/JOB_INTERRUPTED, then safely retried as attempt 2 and completed with a durable render artifact. Video-Use job a60f0278-c143-4d39-ae74-777d852a4f12 also completed with transcript artifacts. Accepted H3 concurrency evidence remains applicable.
STREAMING MEDIA: PASS — current real Range smoke: HEAD 200 video/mp4/content-length 33486028; GET bytes 0–31 returned 206, Content-Range bytes 0-31/33486028, exact 32 bytes, canonical MIME and nosniff; invalid Range returned 416. Accepted H4 398313071-byte bounded upload/RSS evidence remains applicable. The Node 24 server had no abort controller exception; the system Node 25-only comparison showed Controller already closed during aborted browser streams and is recorded as an environment/runtime mismatch, not the authoritative release runtime.
DATA HARDENING: PASS — Save/Reopen preserved the Project, media references, Script/Scene, Planner motion, B-roll, Audio and HyperFrames asset. Project JSON referential-integrity/bounds audit returned zero failures. Accepted H5 migration/orphan/history evidence remains applicable.
AUTOMATED ACCEPTANCE: PASS — current release CI, local code gates, isolated Playwright, and Windows media smoke all passed.
ZERO KNOWN SILENT DATA LOSS: PASS — stale revision conflict preserved A's state; active video selection fix prevents Video-Use from processing a stale first video Asset after MOV import; failed subtitle attempt surfaced a structured error and left revision/assets unchanged.
ZERO UNBOUNDED RENDER CONCURRENCY: PASS — accepted H3 tests/configuration enforce one active render and bounded normalization/transcription concurrency; current Final Render/HyperFrames/Video-Use Jobs completed through durable runtime.
ZERO DEFAULT RUNTIME REMOTION DOWNLOAD: PASS — exact installed Remotion 4.0.513 packages and local CLI path were used; no runtime latest package download observed.
ZERO FULL-FILE RANGE BUFFERING: PASS — current 206/416 byte-exact Range evidence plus accepted H4 streaming/large-media memory evidence; no full-file buffer path was introduced.
UBUNTU CI: PASS — final release CI Run 32645303027.
WINDOWS CI: PASS — final release CI Run 32645303027.
LOCAL WINDOWS MEDIA/ENGINE SMOKE: PASS — FFmpeg/ffprobe 8.1.1, bundled Node 24.19.0, Remotion, HyperFrames, real MP4/MOV/image/audio/subtitle and video-use venv all executed locally.
RESTART RECOVERY: PASS — running Final Render transitioned to interrupted after validation server restart and safe retry completed at attempt 2.
V2.1 REGRESSION: PASS — accepted H0–H7 validation matrix reconciled; current candidate full tests, browser smoke, real media smoke, typed UI flow, final render and HyperFrames all passed.

FINAL RELEASE BROWSER FLOW: PASS — fresh release project used real MP4 (76s), MOV, distinctive PNG, FLAC, and SRT. Create/Open/Import/Caption edit/Script tag/Scene generation/Planner Analyze+Apply/Add image B-roll/Add video B-roll/Add Audio/Canvas drag-resize-rotate/Undo-Redo/Play/Seek/Resume/End/Dark-Light/Save-Reopen/Final Render/HyperFrames completed. Project ended at revision 36 with no browser error or unhandled rejection in the authoritative Node 24 run.
IMAGE B-ROLL FINAL OUTPUT FRAME: PASS — image B-roll interval startFrame 60, endFrame 150 (active frames [60,150)); extracted frame 90 at 3.0s from the final MP4. Final MP4: E:\Video-OS-Data\v2.1.1-final-release-d0d85fe\projects\v2-1-1-final-release-acceptance-38c8a962\render\final-1920x1080-30fps-814f6e70-5001-4c5d-9315-4cd1f082cda6.mp4. Evidence PNG: E:\Video-OS-Data\v2.1.1-final-release-d0d85fe\image-broll-proof.png. Visual inspection showed the distinctive yellow RELEASE IMAGE B-ROLL image in the encoded output, with the caption and HyperFrames process-flow overlay.
FINAL RENDER: PASS — final UI Job 814f6e70-5001-4c5d-9315-4cd1f082cda6 completed; H.264 video + AAC audio, 1920×1080, 30 fps, 7.061333s, 3810128 bytes. HEAD output returned 200 video/mp4 with attachment disposition.
HYPERFRAMES: PASS — UI Process Flow committed revision 35→36; artifact E:\Video-OS-Data\v2.1.1-final-release-d0d85fe\projects\v2-1-1-final-release-acceptance-38c8a962\animations\hf-process-flow-e2dbe3d8347bb474.webm, 210603 bytes, VP9 1920×1080, 4.000s.
VIDEO-USE LOCAL EVIDENCE: PASS — stable repository-supported root and venv executed real release-speech.mp4. Direct UI prepare produced transcript/packed files; after REL-001, durable Job a60f0278-c143-4d39-ae74-777d852a4f12 completed from expected revision 11 to project revision 12 with wordCount 341, scriptSegmentCount 1, transcript JSON and takes_packed.md artifacts, no lost update, and sanitized error behavior.
SECURITY/ERROR BOUNDARY: PASS — stale conflict and invalid mutation responses contained machine code/action/requestId but no absolute path, full stderr or stack; authoritative Node24 browser run showed no blocking console/unhandled error. The only repeated informational message was the non-blocking Remotion license notice.

DEFECTS FIXED:
- V2.1.1-REL-001 — after MP4 then MOV import, VideoUseService selected the first video Asset instead of the active video-main clip Asset. Root cause: primaryVideo() used the first video Asset. Smallest fix: resolve the current video-main clip asset with first-video fallback. Regression: tests/video-use.test.ts multi-video active-clip case. Frozen reproduce: direct prepare used the wrong source/range; fixed evidence Job a60f0278 completed with 341 words/1 Script segment and revision 12.
- V2.1.1-REL-002 — image and video B-roll at the same layer rendered in insertion order, so the later video hid the required final image proof. Smallest fix: asset-kind render rank keeps image B-roll above same-layer video B-roll. Regression: tests/h7/master-composition-media.test.ts. Final encoded proof is the yellow image-broll-proof.png above.

COMMITS PUSHED:
- 0dcef2a — fix: bind video-use to active video clip
- a554dcc — fix: keep image b-roll on top in final renders
- Final documentation commit: docs: record V2.1.1 final release acceptance (this commit)

REMAINING FAILURES:
- No V2.1.1 product release blocker remains in the tested scope.
- Exact standard Playwright port 3000 preflight remains blocked by the unrelated existing service; isolated port 3014 passed unchanged.
- System Node 25 produced a server-side `Controller already closed` abort signal during comparison; the project-declared bundled Node 24.19.0 authoritative release server passed the same abort smoke without the exception. This is recorded as an environment mismatch, not waived as a product pass.
- Browser harness Canvas rapid gesture evidence uses a test-only pointer-capture stub for synthetic PointerEvents; native application pointer-capture code was not changed. Gesture durable revisions/Undo/Redo were verified.

RESIDUAL TEMP/PROCESSES: Validation-owned Node/Next servers, Playwright server, FFmpeg, HyperFrames and video-use processes were stopped; no validation-owned process remains. Temporary Playwright config and test-results were removed. The isolated data root intentionally retains fixtures, project.json/backup/summary, Job logs/artifacts, transcript, render MP4, HyperFrames WebM and image-broll-proof.png. Original user worktree and unrelated port-3000 service were not touched.

RELEASE RECOMMENDATION: YES — V2.1.1 Final Release Acceptance is locally PASS pending GPT Web frozen→final diff review and exact-head CI verification. Do not merge PR #27, do not bump version, do not tag/release, and do not start V2.2 in this task.

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
