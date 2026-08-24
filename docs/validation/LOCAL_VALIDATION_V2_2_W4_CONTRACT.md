# Video OS Studio V2.2-W4 — Local Windows Workflow UI Validation Contract

> This is the Local Codex execution contract for W4. It is not acceptance evidence by itself. GPT Web must first freeze an exact cloud-green W4 SHA. Local Codex validates that exact SHA and commits the evidence report back to the same branch.

## Repository truth

```text
Repository: hcz19950202-beep/Video-OS-Studio
Branch: feature/v2.2-w4-workflow-ui
Workstream: V2.2-W4 Workflow UI
Exact SHA: supplied by GPT Web after cloud CI is green
```

Before validation:

```powershell
git fetch origin
git switch feature/v2.2-w4-workflow-ui
git pull --ff-only origin feature/v2.2-w4-workflow-ui
git status --short
git rev-parse HEAD
```

HEAD must equal the exact SHA supplied by GPT Web. Do not validate a locally diverged or newer/older commit.

## What W4 must prove locally

W2 already proved the real engine chain. W4 must prove the **visible user product flow** drives that accepted chain correctly:

```text
real source video
→ Studio browser UI
→ Generate First Draft
→ live Workflow Stage / Job progress
→ CONTENT_REVIEW
→ human Project edit in the editor
→ Approve & Continue using latest Project revision
→ Motion / B-roll / Audio / Timeline / Preview
→ ASSEMBLY_REVIEW
→ Approve & Continue
→ FINAL_RENDER Durable Job
→ downloadable encoded MP4
```

It must also prove the Workflow survives browser reload/reopen as durable state and that user-facing rendering does not depend on a hard-coded port 3000 when the active request origin differs.

## Required environment

- Windows.
- Node 24.x.
- repository dependencies installed from the lockfile.
- Chrome / Playwright Chromium available.
- FFmpeg + ffprobe available.
- video-use installed and usable through `VIDEO_USE_ROOT` / `VIDEO_USE_PYTHON`.
- HyperFrames pinned at `0.8.10`.
- Remotion packages pinned at `4.0.513`.
- Project Schema remains `2.0.0`.
- use an isolated `VIDEO_OS_DATA_ROOT`; do not use an existing production/user Project root for acceptance.

Baseline checks:

```powershell
node --version
npm ci --no-audit --no-fund
npm run typecheck
npm test
```

## Source fixture

Use a short real talking-head MOV or MP4 with intelligible speech, preferably 8–30 seconds. The source may live outside the repository. Do not commit it.

MOV is useful because it also keeps the already accepted normalization path exercised, but W4 acceptance is primarily about the browser/Workflow UX rather than re-proving W2 normalization.

## Mandatory automated browser acceptance

Set an isolated data root and real media path, then run the dedicated Playwright test:

```powershell
$env:VIDEO_OS_DATA_ROOT="$env:TEMP\video-os-w4-ui-acceptance"
$env:W4_WINDOWS_WORKFLOW_UI_SMOKE="1"
$env:W4_SOURCE_VIDEO="E:\path\to\short-real-talking.mov"
$env:VIDEO_USE_ROOT="$HOME\.codex\skills\video-use"
$env:VIDEO_USE_PYTHON="python"
npx playwright test tests/e2e/w4-local-real.spec.ts --project=chromium --reporter=list
```

The Playwright web server inherits these variables. The test creates a fresh Project through the real Studio UI and never relies on an existing Project.

## Required PASS evidence

The test must emit `W4_ACCEPTANCE_EVIDENCE` and prove:

1. real source import succeeds through the Studio UI;
2. `Generate First Draft` creates a persisted `video-production-* @2` Workflow;
3. Workflow reaches `CONTENT_REVIEW` visibly in the browser;
4. generated captions are visible on the Timeline;
5. a real manual UI edit changes Project revision while review is waiting;
6. `Approve & Continue` resolves Checkpoint A using the newer Project revision;
7. Workflow proceeds through assembly stages and reaches `ASSEMBLY_REVIEW`;
8. Checkpoint B approval continues to final render;
9. Workflow status becomes `completed` and all required Stage executions are completed/skipped;
10. a concrete `render-final` Durable Job is linked to `FINAL_RENDER`;
11. final MP4 downloads through the UI route;
12. ffprobe reports positive duration plus a valid H.264 video stream;
13. both review checkpoints are durably `approved`;
14. browser reload/reopen shows the same durable Workflow state;
15. no Project Schema or engine pin was changed for validation convenience.

In addition to the automated assertions, visually inspect the final MP4 (or at least representative frames) and confirm it is non-empty, captions render, and the output is not corrupt.

## Request-origin / port check

W4 introduces persisted Workflow `assetBaseUrl` so final render follows the active Studio request origin instead of permanently assuming `127.0.0.1:3000`.

The default Playwright config uses port 3000, so perform one additional bounded manual/API check on a different port when practical:

```powershell
npm run dev -- --hostname 127.0.0.1 --port 3017
```

Create or resume a W4 Workflow through `http://127.0.0.1:3017` and confirm its stored `assetBaseUrl` is `http://127.0.0.1:3017`. A full second render is not required if the automated run already proved final rendering; this check exists to validate the W4 origin-binding contract.

## Failure / fix policy

If a W4 defect is found:

- diagnose the root cause;
- fix only W4-scoped UI/API/client/Workflow integration behavior or a directly exposed existing-contract defect;
- add a regression test where practical;
- push the fix to the **same branch** `feature/v2.2-w4-workflow-ui`;
- do not merge;
- do not begin W5;
- do not change Project Schema, engine pins, introduce Real AI Provider, or replace the Job/Workflow architecture.

Typical allowed areas:

```text
app/api/workflows/**
components/studio/AIWorkspacePanel.tsx
components/studio/WorkflowPanel.tsx
lib/client/workflows.ts
lib/i18n/workflow.ts
lib/workflows/* W4 integration files
W4 tests / validation docs
small existing UI/service fixes only when W4 acceptance exposes a real defect
```

After any pushed fix, return the new branch HEAD to GPT Web. GPT Web must re-check diff and CI, then Local Codex reruns W4 acceptance on that exact new SHA.

## Required validation report

On PASS create:

```text
docs/validation/LOCAL_VALIDATION_V2_2_W4.md
```

Include:

```text
Repository / branch / exact tested SHA
Windows / Node / FFmpeg / ffprobe / Python versions
source fixture type + duration (no private absolute path required)
Project ID
Workflow ID
browser flow steps
Stage status table
Checkpoint A/B revisions and status
manual edit performed + Project revision before/after
Durable Job table for Workflow-linked jobs
assetBaseUrl evidence
Final Render Job ID
final MP4 relative path / downloaded file evidence
ffprobe result
visual inspection result
reload/reopen durability result
residual process / non-terminal Workflow-linked Job check
commands executed
fixes/commits if any
Final verdict: PASS / FAIL
```

Do not commit raw media, generated large video files, credentials, local secrets, or private absolute paths.
