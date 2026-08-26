# Video OS Studio V2.2-W5 — Local Windows Failure / Retry / Restart Validation Contract

> This is the Local Codex execution contract for W5. It is not acceptance evidence by itself. GPT Web must first freeze an exact cloud-green W5 SHA. Local Codex validates that exact SHA, fixes only W5-scoped defects on the same branch when necessary, and commits the final evidence report only after the exact tested code passes.

## Repository truth

```text
Repository: hcz19950202-beep/Video-OS-Studio
Branch: feature/v2.2-w5-failure-retry-restart
Workstream: V2.2-W5 Failure / Retry / Restart Hardening
Exact SHA: supplied by GPT Web after cloud CI is green
PR: supplied by GPT Web
```

Before validation:

```powershell
git fetch origin
git switch feature/v2.2-w5-failure-retry-restart
git pull --ff-only origin feature/v2.2-w5-failure-retry-restart
git status --short
git rev-parse HEAD
```

HEAD must equal the exact SHA supplied by GPT Web and the worktree must be clean. Do not merge, rebase, start W6, or validate a locally diverged commit.

## W5 acceptance goal

W5 must prove the accepted W4 product flow remains correct when the operating system, Node process, engine process, Project revision, or mutation persistence boundary behaves badly.

The required safety properties are:

```text
Project != Workflow != Job
Project operation log is the mutation idempotency truth
Workflow operation history survives retry
Durable Job truth survives process ownership change
same stale Job input is not blindly retried after Project revision changes
already-applied Project mutations are not duplicated
stale Final Render output is never accepted as current
WorkflowService recovers persisted runs automatically after server restart
```

## Required environment

- Windows.
- Node 24.x.
- FFmpeg + ffprobe.
- Playwright Chromium / Chrome.
- Python usable by video-use.
- video-use configured through `VIDEO_USE_ROOT` / `VIDEO_USE_PYTHON`.
- HyperFrames pinned at `0.8.10`.
- Remotion packages pinned at `4.0.513`.
- Project Schema remains `2.0.0`.
- one short real talking-head MOV/MP4 with intelligible speech, preferably 8–30 seconds.
- an isolated data root dedicated to W5 chaos testing.

Do not use a production/user Project root.

Baseline:

```powershell
node --version
npm ci --no-audit --no-fund
npm run typecheck
npm test
```

Recommended isolated root:

```powershell
$env:VIDEO_OS_DATA_ROOT="$env:TEMP\video-os-w5-chaos"
$env:VIDEO_USE_ROOT="$HOME\.codex\skills\video-use"
$env:VIDEO_USE_PYTHON="python"
```

Use a fresh isolated root for each destructive chaos scenario when practical. Never delete the user's source media.

## Required chaos matrix

All six scenarios below are mandatory. A scenario may use a purpose-built deterministic test seam when timing the real crash window would be unreliable, but the long-running engine scenarios must use real engines and real persisted runtime data.

### C1 — Kill during transcription

Goal: prove an in-flight `video-use-transcribe` Job is not guessed successful after the server/process dies.

Required flow:

1. create a fresh Project through the real product path and import real speech video;
2. start `Generate First Draft`;
3. wait until `TRANSCRIBE` has an attached `video-use-transcribe` Durable Job in queued/preparing/running state;
4. forcibly terminate the Studio Node process (and only the process tree belonging to this isolated run);
5. restart Studio against the **same** `VIDEO_OS_DATA_ROOT`;
6. reopen the Project / Workflow;
7. verify Job ownership recovery marks the prior active Job `interrupted` or otherwise reaches a truthful terminal state;
8. verify Workflow becomes recoverable, not silently completed;
9. invoke Retry from the product/API path;
10. verify transcription completes and the Workflow can continue without duplicate script/transcript mutation.

Evidence:
- Workflow ID;
- old Job ID / attempt / recovered status;
- retry result;
- script segment / word counts before and after retry;
- Project revision history;
- no duplicate transcript mutation.

### C2 — Crash after Project transaction commit but before Workflow Stage completion

Goal: prove the commit gap cannot duplicate Caption / Motion / B-roll / Timeline mutations.

Because the exact micro-window is too narrow to hit reliably by process timing, use the repository's deterministic W5 commit-gap regression seam/test as the authoritative reproduction, and additionally inspect the real persisted Project operation log behavior.

Must prove:

```text
Project transaction = applied
Workflow Stage completion = not yet persisted / simulated failure
Retry Stage
→ historical applied Project operation is discovered
→ Project mutation is NOT applied again
→ Project revision does NOT advance a second time
→ output count does NOT duplicate
→ Workflow Stage reaches completed
```

At minimum rerun the W5 hardening test that covers `CAPTION_GENERATION`. If a local harness exists for another mutation Stage, also exercise Motion or B-roll.

Evidence:
- operation ID;
- operation status `applied`;
- Project revision immediately after first commit;
- Project revision after retry;
- caption/motion/broll count before/after;
- Workflow attempt count and operation history.

### C3 — Kill/fail during HyperFrames

Goal: prove a real HyperFrames Durable Job is recoverable and does not duplicate motion output.

Required flow:

1. use a scenario/plan that produces at least one HyperFrames suggestion;
2. start Workflow until `MOTION_GENERATION` has a real `hyperframes-render` Job;
3. kill the Studio/engine process tree while that Job is active, or deliberately interrupt the job process in a bounded W5 test root;
4. restart against the same data root;
5. verify old active Job truth is recovered as interrupted/failed rather than completed by assumption;
6. retry through Workflow;
7. if the previous failure was a stale `PROJECT_REVISION_CONFLICT`, verify Workflow creates a **fresh Job with fresh expectedRevision** instead of retrying stale input;
8. verify exactly one logical HyperFrames motion output exists per planned suggestion.

Evidence:
- old/new Job IDs where applicable;
- attempts;
- Project revisions;
- HyperFrames asset and motion clip counts;
- final terminal status.

### C4 — Kill during Final Render

Goal: prove a real Remotion Final Render can be interrupted/recovered without accepting partial output.

Required flow:

1. reach and approve `ASSEMBLY_REVIEW`;
2. wait for `FINAL_RENDER` / `render-final` Job to be active;
3. kill the Studio process tree;
4. restart same data root;
5. verify old render Job is not reported completed unless a complete durable Job record says so;
6. retry/resume appropriately;
7. verify a valid encoded MP4 is eventually produced;
8. ffprobe positive duration + H.264 video stream;
9. visually inspect representative frames.

Evidence:
- render Job ID / attempts or old/new Job IDs;
- status transitions;
- final relative path;
- ffprobe;
- visual result;
- no partial/corrupt artifact accepted as final.

### C5 — Edit Project while long Stage is running

Goal: prove stale long-running work cannot overwrite a newer human edit.

Use a long mutation-bearing stage such as transcription or HyperFrames.

Required flow:

1. record Workflow `lastKnownProjectRevision` and active Stage `baseProjectRevision`;
2. while the long Job is still active, make a valid Project edit through the UI/API so Project revision advances;
3. allow the long Job to reach commit/reconcile;
4. verify stale mutation is rejected with Project revision conflict / Workflow recoverable failure;
5. verify the human edit remains present;
6. invoke Workflow Retry;
7. verify retry refreshes to latest Project revision and creates fresh stale-input Job where required;
8. verify no stale Job silently overwrites the edit.

Evidence:
- revision before edit / after edit / after retry;
- human edit proof;
- stale Job error code;
- Workflow error retryability;
- old/new Job IDs;
- final Project state.

### C6 — Retry failed mutation Stage without duplicate output

Goal: prove repeated retries are idempotent at Project level.

Must cover at least Caption and one of Motion/B-roll when practical.

Required assertions:

- retryable Stage has a new Workflow attempt identity;
- historical Workflow operation IDs remain for audit;
- already-applied Project operation stays `applied`;
- no duplicate caption clip / motion clip / B-roll clip / timeline mutation;
- Project revision advances only for a mutation that was not already applied;
- repeated Retry cannot create duplicate logical output.

## Startup recovery proof

Separately prove the application does not depend on a manual `/recover` action after restart:

- terminate Studio with a running Workflow;
- restart against same data root;
- the first normal Workflow read/open must observe recovered durable state because `WorkflowService` performs startup recovery;
- no manual recovery command should be required for this proof.

## Final Render stale-revision proof

W5 records `sourceProjectRevision` in render Job output.

Prove at least once that:

1. render starts from revision N;
2. Project changes to N+1 before the completed render is reconciled, using a deterministic test seam if timing is impractical;
3. Workflow rejects the completed Job as `WORKFLOW_RENDER_STALE`;
4. retry at N+1 creates a fresh `render-final` Job;
5. the old completed MP4 remains historical evidence but is not surfaced as the current final artifact.

## Required final healthy run

After chaos scenarios, run one complete real W4-style workflow in a clean isolated W5 root:

```text
real source video
→ Generate First Draft
→ CONTENT_REVIEW
→ Approve
→ assembly
→ ASSEMBLY_REVIEW
→ Approve
→ FINAL_RENDER
→ completed MP4
```

This proves hardening did not break the normal path.

Required checks:
- all required stages completed/skipped;
- both checkpoints approved;
- no Workflow-linked non-terminal Jobs remain;
- final MP4 downloads/exists;
- ffprobe valid;
- visual inspection PASS;
- reload/reopen durable state PASS.

## Residual process check

After each kill/restart scenario and at the end, inspect only W5-scoped processes/ports. Do not kill unrelated user processes.

Check for orphaned:
- Node/Next process for the isolated W5 run;
- FFmpeg/ffprobe;
- Chromium spawned by acceptance;
- Remotion renderer;
- HyperFrames;
- video-use Python process.

Document any pre-existing unrelated process separately; do not delete unrelated data.

## Failure / fix policy

If a W5 defect is found:

- diagnose root cause;
- fix only W5-scoped recovery, retry, revision, idempotency, durable Job/Workflow integration, or directly exposed existing-contract defects;
- add a regression test where practical;
- push to the **same branch** `feature/v2.2-w5-failure-retry-restart`;
- stop and return the new SHA to GPT Web;
- do not merge;
- do not start W6;
- do not change Project Schema or engine pins;
- do not add Real AI Provider / V2.3 Agent behavior;
- do not create a second Job or Workflow system.

Any code/config/test change invalidates the previous frozen SHA. GPT Web must review the new SHA and rerun GitHub CI before local acceptance continues.

If only the final Markdown evidence report is added after an exact tested SHA has already passed, the tested code SHA remains the same.

## Required validation report

On PASS create:

```text
docs/validation/LOCAL_VALIDATION_V2_2_W5.md
```

Include:

```text
Repository / branch / exact tested code SHA
Windows / Node / FFmpeg / ffprobe / Python versions
video-use / HyperFrames / Remotion versions
source fixture type + duration (no private absolute path)
Project IDs / Workflow IDs used
C1..C6 result table
per-scenario Workflow/Stage/Job IDs and attempts
Project revision evidence
Project operation IDs/status for commit-gap/idempotency cases
old/new Job IDs for stale-input retries
startup auto-recovery evidence
Final Render sourceProjectRevision + stale-rejection evidence
final healthy-run Stage table
checkpoint evidence
final MP4 relative path and ffprobe
visual inspection
reload/reopen durability
non-terminal linked Job check
residual process check
commands executed
fixes/commits if any
Final Verdict: PASS / FAIL
```

Do not commit raw media, generated large videos, engine caches, credentials, local secrets, or private absolute paths.
