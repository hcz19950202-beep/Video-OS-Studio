# Video OS Studio V2.2-W6 — Local Windows End-to-End Product Acceptance Contract

> Workstream: **V2.2-W6 End-to-End Product Acceptance**
>
> This contract is executed only after GPT Web freezes an exact cloud-green SHA on `release/v2.2-final-acceptance`.
>
> Local Codex may fix only demonstrated V2.2 release blockers on this same branch. It must not merge, start V2.3, redesign architecture, change Project Schema, or import the experimental W5.5 template branch.

## 1. Goal

Prove the V2.2 Master PRD product criterion on real Windows/browser/media/engine execution:

```text
Open Video OS
→ Create Project
→ Import real source video
→ choose Scenario
→ Generate First Draft
→ system runs durable Workflow
→ Content Review
→ user confirmation/edit
→ continue assembly
→ Assembly Review
→ Final Render
→ durable reopen + encoded MP4 verification
```

W6 is a release acceptance gate. Do not add product scope unless a demonstrated release blocker prevents the flow above.

## 2. Repository / exact-SHA rules

Before doing anything:

```powershell
git fetch origin
git switch release/v2.2-final-acceptance
git pull --ff-only origin release/v2.2-final-acceptance
git rev-parse HEAD
git status --short
```

Required:

- HEAD equals the exact SHA supplied by GPT Web.
- Working tree is clean.
- Use a fresh isolated `VIDEO_OS_DATA_ROOT` for each W6 case.
- Do not use or modify the user's normal production data root.
- Record the exact tested SHA, Windows build, Node/npm, FFmpeg/ffprobe, Python/video-use, HyperFrames, Remotion, Playwright and browser versions.

If the checkout does not equal the frozen SHA: **STOP and report BLOCKED**.

## 3. Baseline gate

Run from the exact frozen SHA:

```powershell
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Also run the normal browser regression required by the repository CI configuration.

Record pass/fail counts. Existing documented lint warnings may be reported, but no new error is allowed.

## 4. Engine / environment gate

Before the three product cases prove:

```text
FFmpeg / ffprobe: runnable
video-use: configured through repository-supported adapter/runtime
HyperFrames: exact accepted pin and runnable
Remotion: exact accepted pin and runnable
Playwright/browser: runnable
Project Schema: 2.0.0
```

Accepted pins must remain:

```text
remotion             4.0.513
@remotion/player     4.0.513
@remotion/cli        4.0.513
hyperframes          0.8.10
@playwright/test     1.62.1
```

If real video-use is not configured/runnable, W6 cannot be marked PASS.

## 5. Fixture rules

### Source video

Use at least one real MP4 or MOV with real spoken audio that can be transcribed. Prefer 1–3 minutes when practical; a shorter real fixture is allowed for iteration, but the final evidence must still prove the full real engine path.

Do not commit private source media, secrets, credentials, absolute private paths or large generated outputs.

### Product Ad support media

Case B must use available local/repository-supported media so the final Project contains real reusable B-roll and Audio evidence. Do not fetch arbitrary network media during the Workflow.

Allowed preparation before starting the Workflow:

- import one or more local image/video B-roll assets through the normal Media Import path;
- import local audio/BGM through the normal supported media path;
- configure Brand through existing Project command/UI/service surfaces;
- set Canvas through existing Project command/UI/API surface;
- configure scenario through the normal Project creation/scenario surface.

Do not hand-edit `project.json`.

## 6. Case A — Talking Head / 9:16

Create a fresh isolated Project with:

```text
Scenario: talking-head
Canvas: 9:16 (recommended 1080×1920)
Source: real MP4/MOV with spoken audio
```

Required flow:

```text
Create Project
→ Import
→ Generate First Draft
→ MEDIA_IMPORT
→ MEDIA_PROBE
→ MEDIA_NORMALIZE when required
→ TRANSCRIBE
→ SCRIPT_ANALYSIS
→ SCENE_DETECTION
→ CAPTION_GENERATION
→ VISUAL_PLANNING
→ CONTENT_REVIEW
→ perform one real Project edit during review
→ Approve & Continue
→ MOTION_GENERATION
→ BROLL_ASSEMBLY
→ AUDIO_ASSEMBLY
→ TIMELINE_ASSEMBLY
→ PREVIEW
→ ASSEMBLY_REVIEW
→ Approve & Continue
→ FINAL_RENDER
```

Evidence required:

- 16 production Stage rows are terminal as expected (`completed` or explicitly valid `skipped`).
- two checkpoints are approved;
- review-time Project edit advances revision and is preserved;
- durable Workflow can be rediscovered after browser reload/reopen;
- final MP4 downloads/serves successfully;
- final Project Canvas is 9:16;
- captions are present in the Project and visible in an extracted final frame;
- at least one generated/assembled visual or motion result is visible where the deterministic plan selects one;
- no duplicate captions/motion caused by review/continue.

## 7. Case B — Product Ad / 16:9

Create a fresh isolated Project with:

```text
Scenario: product-ad
Canvas: 16:9 (recommended 1920×1080)
Source: real source video
Support media: local reusable B-roll + audio/BGM
Brand: explicitly configured through normal Project surface
```

The Product Ad case must prove the V2.2 PRD product-specific path rather than merely selecting the scenario label.

Before Generate First Draft, record the imported support assets and Brand state.

Required final evidence:

```text
Brand-aware Project state
B-roll asset(s) available and at least one B-roll clip in the final editable Project
HyperFrames motion path exercised by at least one selected eligible suggestion/job when the deterministic plan produces one
Audio asset/clip present and audible/not muted where configured
Proof/number treatment visible in caption/motion/visual-plan output
CTA treatment present in plan/Project/output where the deterministic rules produce CTA treatment
```

If the deterministic plan does not produce one of the required Product Ad families from the chosen source, do not fake the evidence. Use an appropriate real Product Ad fixture or make the smallest in-scope deterministic test-fixture adjustment necessary to exercise the existing capability. Any product-code change requires a regression test, push to the same branch, GPT Web review/CI, and re-freeze before continuing acceptance.

Run the same full Workflow through both checkpoints and Final Render.

Final encoded output must be H.264/AAC MP4 at 16:9 and must visually prove relevant B-roll / caption / motion evidence in extracted frames.

## 8. Case C — Restart Recovery / 1:1

Create a fresh isolated Project with:

```text
Scenario: any production scenario suitable for real motion/render recovery
Canvas: 1:1 (recommended 1080×1080)
Source: real media
```

Run the visible Workflow until a real long-running Motion/HyperFrames or Final Render Job is active.

Then perform a controlled hard termination of the isolated Video OS runtime process tree only.

Required sequence:

```text
Workflow active
→ record WorkflowRun / Stage / Job IDs
→ hard-kill isolated app/runtime tree
→ restart the application against the same isolated VIDEO_OS_DATA_ROOT
→ normal first API/UI reads observe recovered durable truth
→ Resume / Retry as appropriate
→ continue through reviews
→ Final Render
```

Must prove after recovery:

- WorkflowRun still exists;
- completed stages before the crash are not lost;
- active Job becomes correct durable truth (`interrupted`/retryable as appropriate), never silently successful;
- no duplicate Caption clips;
- no duplicate Motion clips;
- no duplicate B-roll clips;
- no duplicate Project operation/history apply;
- Project JSON remains valid and revision-safe;
- final 1:1 MP4 renders successfully;
- browser reload/reopen can rediscover the recovered/completed Workflow.

## 9. Cross-aspect gate

All three must pass on actual Project/Final Render dimensions:

```text
9:16 PASS
16:9 PASS
1:1 PASS
```

No acceptance is allowed if a Workflow Stage or renderer silently forces 1080×1920/portrait dimensions.

Record both Project Canvas and encoded MP4 dimensions.

## 10. Final encoded MP4 verification

For every final output run `ffprobe` and record:

```text
video codec
audio codec
width
height
fps
duration
```

Example:

```powershell
ffprobe -v error `
  -show_entries stream=codec_name,codec_type,width,height,r_frame_rate `
  -show_entries format=duration `
  -of json <final.mp4>
```

Requirements:

- video codec = H.264;
- audio codec = AAC when the Project contains expected audio;
- encoded dimensions equal the target Canvas;
- positive fps and duration.

For Cases A and B, extract representative frames from the actual encoded MP4 using FFmpeg. For Case B extract enough timestamps to prove B-roll and motion/visual treatment, not only a talking-head frame.

Example:

```powershell
ffmpeg -y -ss 3 -i <final.mp4> -frames:v 1 <frame-3s.png>
ffmpeg -y -ss 7 -i <final.mp4> -frames:v 1 <frame-7s.png>
```

Visually inspect the extracted frames. The report must state what is visibly present; do not claim B-roll/HyperFrames/Caption evidence from Project JSON alone.

## 11. Project / Workflow durable evidence

For each case record at minimum:

```text
Project ID
WorkflowRun ID
Scenario
Canvas width/height/fps
final Project revision
16 Stage statuses / attempts
Checkpoint A base + resolved revision
Checkpoint B base + resolved revision
Job IDs and types for real external-engine work
Workflow artifacts
Final Render Job ID
Final render relative path
ffprobe summary
reopen durability
```

For Case B additionally record counts/IDs for:

```text
B-roll assets
B-roll clips
Audio assets/clips
Motion clips
HyperFrames Jobs/artifacts
Brand config used
proof/number/CTA evidence
```

For Case C additionally record pre-kill/post-restart Workflow/Job truth and duplicate counts before/after recovery.

## 12. Resource / cleanup gate

At the end of each isolated case:

- no non-terminal Workflow-linked Jobs remain;
- no Workflow/Project/operation/runtime-owner `.lock` residue remains after clean shutdown;
- no W6-owned Next/Node, Chromium, Remotion, HyperFrames, FFmpeg/ffprobe or video-use Python process remains;
- ports started for the W6 isolated app are free;
- do not delete source media or any Project-referenced final output while gathering evidence.

## 13. Failure / fix protocol

If any W6 gate fails:

1. Capture the exact failing Project/Workflow/Stage/Job/error and reproduction steps.
2. Classify whether it is environment/fixture setup or a V2.2 release blocker.
3. If it is a product defect, make the smallest W6-scoped fix on `release/v2.2-final-acceptance`.
4. Add a regression test covering the defect.
5. Push the fix to the same branch.
6. Stop local acceptance and return the new exact SHA to GPT Web.
7. GPT Web reviews and waits for GitHub CI green.
8. GPT Web freezes the new SHA.
9. Rerun all affected local W6 cases from that exact SHA.

Do not continue validating an obsolete SHA after pushing a code/config/test change.

## 14. Formal report

When all cases pass without further product-code changes, create:

`docs/validation/LOCAL_VALIDATION_V2_2_W6.md`

The report must contain:

```text
Verdict
Exact tested code SHA
Final report HEAD
Environment/pins
Baseline commands/results
Case A evidence
Case B evidence
Case C evidence
Cross-aspect table
ffprobe tables
Extracted-frame visual observations
Project/Workflow/Job IDs
Revision/idempotency proof
Cleanup/process proof
Defects/fixes/regression tests, if any
Remaining failed items
Release recommendation
```

Do not commit source media, extracted private frames, generated large MP4 files, credentials or private absolute paths. Summarize visual evidence in text and keep local artifacts outside Git.

## 15. PASS definition

W6 is PASS only when all of the following are true:

```text
TALKING HEAD WORKFLOW: PASS
PRODUCT AD WORKFLOW: PASS
RESTART WORKFLOW CASE: PASS
9:16: PASS
16:9: PASS
1:1: PASS
VIDEO-USE: PASS
FFMPEG / FFPROBE: PASS
HYPERFRAMES: PASS
REMOTION: PASS
FINAL ENCODED MP4: PASS
HUMAN REVIEW A/B: PASS
RETRY / RESUME / RECOVERY: PASS
PROJECT REVISION SAFETY: PASS
WORKFLOW IDEMPOTENCY: PASS
ZERO KNOWN DUPLICATE MUTATION: PASS
ZERO KNOWN SILENT PROJECT OVERWRITE: PASS
DURABLE REOPEN: PASS
RESOURCE CLEANUP: PASS
PROJECT SCHEMA 2.0.0: PRESERVED
```

Only after GPT Web reviews the formal report and the report-only final HEAD passes GitHub CI may the W6 PR merge and V2.2 release finalization begin.
