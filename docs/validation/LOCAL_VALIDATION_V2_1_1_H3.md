# Video OS Studio V2.1.1 H3 — Local Windows Durable Job Runtime Validation Contract

> Workstream: H3 Durable Job Runtime  
> Branch: `hardening/v2.1.1-h3-durable-job-runtime`  
> PR: #22  
> Authority: `PROJECT_STATUS.md` + Master Hardening PRD

## 0. Purpose

H3 proves that long-running Video OS work survives beyond one in-memory request and is safe to query, cancel, retry, and recover after restart.

H3 does **not** implement H4 streaming media or H5 orphan cleanup.

Required durable layout:

```text
VIDEO_OS_DATA_ROOT/jobs/<jobId>/job.json
VIDEO_OS_DATA_ROOT/jobs/<jobId>/stdout.log
VIDEO_OS_DATA_ROOT/jobs/<jobId>/stderr.log
VIDEO_OS_DATA_ROOT/jobs/<jobId>/artifacts.json
```

Required statuses:

```text
queued
preparing
running
completed
failed
cancelled
interrupted
```

Required job types:

```text
render-final
render-overlay
hyperframes-render
media-normalize
video-use-transcribe
```

Default concurrency contract:

```text
render       1
hyperframes  1
normalize    2
transcribe   1
```

## 1. Entry gate

Do not use old chat memory as project truth.

Read in order:

1. `PROJECT_STATUS.md`
2. `AGENTS.md`
3. `SYSTEM.md`
4. `docs/prd/Video_OS_Studio_V2_1_1_Engineering_Hardening_Master_PRD.md`
5. this file
6. PR #22 live state

GPT Web will supply an exact frozen green SHA after final cloud CI.

Create a new isolated worktree, for example:

```text
E:\Video-OS-Studio-H3-Validation
```

Use an isolated data root, for example:

```text
E:\Video-OS-Data\v2.1.1-h3-validation-<frozen-sha-prefix>
```

Before validation:

```powershell
git fetch origin
git checkout hardening/v2.1.1-h3-durable-job-runtime
git reset --hard <GPT_WEB_FROZEN_SHA>
git status --short
git rev-parse HEAD
node --version
npm --version
```

`git rev-parse HEAD` must exactly equal the frozen SHA. Otherwise stop.

Record Windows, Node/npm, Chrome, Python, FFmpeg/ffprobe, Remotion and HyperFrames versions.

Repository runtime pins from accepted H2 must remain:

```text
remotion             4.0.513
@remotion/player     4.0.513
@remotion/cli        4.0.513
hyperframes          0.8.10
```

Do not upgrade engines during H3 unless an H3 defect makes it unavoidable and GPT Web reviews the change.

## 2. Clean code gate

Run:

```powershell
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

All must pass. Existing two `@next/next/no-img-element` warnings remain known non-blocking warnings; H3 must not introduce new warnings.

## 3. Durable file layout

Start Video OS with the isolated `VIDEO_OS_DATA_ROOT` and create one short render job.

For its returned `jobId`, prove these four files exist:

```text
jobs/<jobId>/job.json
jobs/<jobId>/stdout.log
jobs/<jobId>/stderr.log
jobs/<jobId>/artifacts.json
```

Validate `job.json` includes at minimum:

```text
id
type
projectId
status
stage
progress
attempt
input
createdAt
updatedAt
```

After execution, validate timestamps/status/output/error fields are internally consistent.

Repeated job metadata updates on Windows must not produce `EPERM`, `EEXIST`, rename collisions, or leftover `*.tmp` files.

## 4. API contract

Using the running local app, validate:

```text
GET    /api/jobs
POST   /api/jobs
GET    /api/jobs/<jobId>
DELETE /api/jobs/<jobId>
POST   /api/jobs/<jobId>/retry
GET    /api/jobs/<jobId>/logs?stream=stdout
GET    /api/jobs/<jobId>/logs?stream=stderr
```

Also verify compatibility render endpoints still delegate correctly:

```text
POST /api/projects/<projectId>/renders
GET  /api/renders/<jobId>
GET  /api/renders/<jobId>/output
DELETE /api/renders/<jobId>
```

Required HTTP behavior:

- creation returns 202 with a job;
- unknown job returns 404;
- retry from an invalid state returns 409 where applicable;
- malformed job input is rejected before execution;
- list may filter by `projectId` and has a bounded limit;
- log tail endpoint is bounded and does not return unbounded log content.

Do not add H6's broad route-test matrix during local H3 validation; only fix H3 API defects discovered here.

## 5. Stage/progress state machine

Observe at least one real job from creation to completion.

Expected monotonic lifecycle:

```text
queued
→ preparing
→ running
→ completed
```

Stage names may become engine-specific while status remains `running`, for example:

```text
load-project
rendering
finalizing
hyperframes-render
project-commit
normalizing
probing
transcribing
```

Requirements:

- progress remains between 0 and 1;
- completed = progress 1;
- failed/cancelled/interrupted never masquerade as completed;
- a cancel request during preparing cannot subsequently start the executor.

## 6. Real render-final job

Create/open a small isolated project and submit a short Final Render through the normal render endpoint or generic job API.

Expected:

- durable type = `render-final`;
- status eventually `completed`;
- real MP4 exists and ffprobe validates width/height/FPS/duration;
- `artifacts.json` includes the render artifact;
- `stdout.log` / `stderr.log` persist the H2 ToolRunner output that exists for the run;
- output remains available through `/api/renders/<jobId>/output`;
- querying/restarting metadata does not delete the completed output.

## 7. Real render-overlay job

Run a short overlay render.

Expected:

- durable type = `render-overlay`;
- concurrency group is shared with Final Render;
- real WebM output exists and is ffprobe-readable;
- artifact metadata persists;
- output remains available through the compatibility output endpoint.

## 8. Real cancellation + retry

Use a render long enough to cancel safely.

Sequence:

```text
attempt 1
queued → preparing/running
DELETE job
→ cancellationRequestedAt
→ H2 AbortSignal/process-tree cancellation
→ cancelled
```

Verify no owned Remotion/Chrome/FFmpeg descendants remain.

Then:

```text
POST /api/jobs/<sameJobId>/retry
```

Expected:

```text
same jobId
attempt = 2
status returns to queued
old transient output/error state cleared
old artifact metadata cleared
historical stdout/stderr retained with retry marker
actual media files are NOT deleted by metadata reset
attempt 2 can complete
```

This is the main real-engine proof that H3 retry builds on H2 cancellation safely.

## 9. Real HyperFrames job

Use a project/current revision and stable operation ID to submit `hyperframes-render`, preferably `process-flow`.

Expected:

- durable type = `hyperframes-render`;
- stage shows HyperFrames work then Project commit;
- exact HyperFrames 0.8.10 runtime remains in use;
- generated WebM exists;
- Project revision increments exactly once;
- resulting Motion clip/asset is present;
- `artifacts.json` records the generated overlay;
- stdout/stderr persist;
- job completes without bypassing the H1 mutation envelope.

Do not run two simultaneous mutating HyperFrames jobs against the same Project/revision just to test concurrency. Use the isolated concurrency harness in section 13 instead.

## 10. Real media-normalize job

H3 normalization jobs operate on an already-staged **project-relative file**. They do not replace the H4 upload pipeline.

Use a real project file as `sourceRelativePath` and a safe validation output path as `outputRelativePath`.

Validate both the path-safety contract and one real normalization.

Expected:

- source/output stay inside the Project root;
- absolute paths and `..` traversal are rejected;
- FFmpeg runs through H2 ToolRunner;
- normalized output exists;
- probe output is persisted in job output;
- artifact metadata exists;
- no Asset registration is silently invented by H3;
- upload route behavior remains unchanged.

## 11. Real video-use-transcribe job

On a project with imported video, submit `video-use-transcribe` with:

```text
expectedRevision = current project revision
operationId = stable unique H3 validation id
```

Expected:

- durable type = `video-use-transcribe`;
- Python/video-use executes through H2 ToolRunner;
- transcript and packed transcript exist;
- artifact metadata includes both transcript artifacts;
- Project Script is committed through H1 mutation safety;
- Project revision increments exactly once;
- logs persist;
- job completes.

If the Project changes before commit, result must not silently overwrite the newer revision. A durable `PROJECT_REVISION_CONFLICT` is non-retryable for the same stale job; create a new job from the current revision instead.

## 12. Persistence across normal server restart

Complete at least one render job, record its job ID and output path, then stop and restart the local Next server using the same `VIDEO_OS_DATA_ROOT`.

Expected after restart:

- GET job still returns `completed`;
- timestamps/output/artifacts remain;
- logs remain;
- rendered media remains readable;
- completed jobs do not rerun automatically.

## 13. Controlled unclean-restart harness

Do **not** intentionally abandon a real Remotion/Chrome/FFmpeg process just to prove metadata recovery.

Use a temporary validation-only Node/TypeScript harness outside committed product source (or under the isolated validation data root) that instantiates `FileJobStore` + `DurableJobRuntime` with fake/pending executors.

The harness must use the real H3 runtime implementation and real filesystem.

### H3-RR1 — running/preparing becomes interrupted

Process A:

- creates a durable job;
- holds its fake executor pending while job is preparing/running;
- exits uncleanly without changing the job to terminal.

Process B:

- opens the same data root with a new DurableJobRuntime.

Expected:

```text
preparing/running → interrupted
error.code = JOB_INTERRUPTED
error.retryable = true
finishedAt populated
job is NOT automatically executed as if nothing happened
```

Then retry it with Process B and prove attempt increments and it may complete.

### H3-RR2 — queued survives and requeues

Persist a queued job that was not started before Process A ends.

Start Process B with the executor registered.

Expected:

```text
queued job is discovered
→ enters queue
→ executes
→ completes
```

No manual editing of repository/project source is required. Temporary job fixtures are allowed only inside the isolated validation root/harness and must not be committed.

## 14. Concurrency harness on Windows

Use a validation-only runtime harness with fake executors that expose start/release gates. This proves scheduler semantics without wasting real render time.

Required matrix:

```text
render-final + render-overlay  → max active render = 1
hyperframes-render             → max active HyperFrames = 1
media-normalize                → max active normalize = 2
video-use-transcribe           → max active transcribe = 1
```

Also prove:

- different groups may run concurrently;
- queued cancellation removes that job from the queue;
- cancelling one job does not kill or cancel an unrelated job;
- when a slot frees, the next queued job starts.

## 15. Durable logs

Use one real engine job with meaningful stdout/stderr.

Verify:

- live H2 ToolRunner callbacks append to durable files;
- job does not claim completion before its queued log writes have flushed;
- `stdout.log` and `stderr.log` survive server restart;
- log tail API returns only its bounded tail;
- no full stderr is copied into public `job.error` payload;
- exact diagnostics remain in the local durable log files.

## 16. Artifacts semantics

Verify:

- successful render artifact survives metadata reads/restart;
- retry clears prior attempt artifact **metadata** before the next attempt;
- retry does not delete actual media files;
- second attempt can replace stable artifact IDs with current output metadata;
- completed job cannot be retried through the normal retry API;
- `artifacts.json` remains valid JSON after repeated writes on Windows.

## 17. Project-mutation safety under jobs

H3 may not bypass H1.

For `hyperframes-render` and `video-use-transcribe`:

- use expectedRevision + operationId;
- introduce one controlled Project revision change before a long job commits;
- prove the stale result cannot overwrite current Project state;
- job must end failed with structured revision conflict rather than silently attaching;
- retrying the same stale non-retryable job must be rejected;
- creating a new job using the current revision is allowed.

Do not mutate runtime `project.json` by hand.

## 18. App regression

After durable-job validation, perform a representative V2.1 regression:

```text
Create/Open Project
Import tiny media
Caption edit
Canvas edit
Save/Reopen
Undo/Redo
Preview playback
Final Render through durable job
Download/read Final output
HyperFrames durable job and Project add
```

No H4/H5 code should be required for this pass.

## 19. Defect handling

Use IDs:

```text
V2.1.1-H3-LV-001
V2.1.1-H3-LV-002
...
```

For each defect record:

- reproduction;
- expected;
- actual;
- root cause;
- relevant job.json/log/artifact evidence;
- process evidence if external tool involved;
- changed files;
- regression test;
- commit SHA.

Fix only H3 scope on:

```text
hardening/v2.1.1-h3-durable-job-runtime
```

After every fix:

```powershell
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
git push origin hardening/v2.1.1-h3-durable-job-runtime
```

Do not merge locally. Do not start H4.

## 20. Explicitly prohibited in H3

Do not implement:

- streaming browser upload;
- replacing `File.arrayBuffer()` for large uploads;
- streaming Range responses;
- H4 memory/RSS redesign;
- H5 orphan media cleanup;
- historical-schema freeze/migration rewrite;
- broad H6 Windows CI/Playwright program;
- Project Schema migration;
- real external AI Provider;
- unrelated UI redesign.

Whole-file render output response remains an H4 concern; do not rewrite it merely to satisfy H3.

## 21. Final report format

Return exactly:

```text
BRANCH:
FINAL HEAD:
FROZEN INPUT HEAD:
LOCAL WORKTREE:
LOCAL DATA ROOT:
WINDOWS:
NODE/NPM:
CHROME:
PYTHON:
FFMPEG/FFPROBE:
REMOTION VERSIONS:
HYPERFRAMES VERSION:

CLEAN NPM CI: PASS/FAIL
CODE CHECKS: PASS/FAIL
DURABLE FILE LAYOUT: PASS/FAIL
JOB API CONTRACT: PASS/FAIL
STATUS/STAGE/PROGRESS: PASS/FAIL
RENDER FINAL JOB: PASS/FAIL
RENDER OVERLAY JOB: PASS/FAIL
REAL CANCEL + RETRY: PASS/FAIL
HYPERFRAMES JOB: PASS/FAIL
MEDIA NORMALIZE JOB: PASS/FAIL
VIDEO-USE TRANSCRIBE JOB: PASS/FAIL
NORMAL SERVER RESTART PERSISTENCE: PASS/FAIL
UNCLEAN RESTART INTERRUPTED: PASS/FAIL
QUEUED RESTART REQUEUE: PASS/FAIL
CONCURRENCY MATRIX: PASS/FAIL
DURABLE LOGS: PASS/FAIL
ARTIFACT SEMANTICS: PASS/FAIL
PROJECT MUTATION SAFETY: PASS/FAIL
APP REGRESSION: PASS/FAIL
FINAL GITHUB VERIFY: PASS/FAIL

DEFECTS FIXED:
COMMITS PUSHED:
REMAINING FAILURES:
RESIDUAL OWNED PROCESSES:

MERGE RECOMMENDATION: YES/NO
```

If validation documentation creates the last commit, report that documentation commit as FINAL HEAD.
