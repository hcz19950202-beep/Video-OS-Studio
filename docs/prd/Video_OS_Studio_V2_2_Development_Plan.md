# Video OS Studio V2.2 — Development Plan

> Date: 2026-08-24  
> Baseline main: `6f0487f6b5b65d85083c96bc54e14bca37fb5704`  
> Product baseline: v2.1.1  
> Active product direction: V2.2 Workflow Runtime  
> Development model: GPT Web + GitHub for online development; Local Codex on Windows for exact-SHA runtime acceptance.

## 1. Delivery model

V2.2 uses one code source of truth: GitHub.

```text
GPT Web + GitHub
    │
    ├── product decisions / PRD
    ├── architecture / schemas / API
    ├── cloud-safe implementation
    ├── unit / integration / route / E2E tests
    ├── branch / PR / CI
    ├── review / merge
    └── PROJECT_STATUS sync
    │
    │ exact branch + frozen SHA handoff
    ▼
Local Codex on Windows
    │
    ├── real browser
    ├── real user media outside Git
    ├── FFmpeg / ffprobe
    ├── video-use / Python
    ├── HyperFrames
    ├── Remotion / Chrome
    ├── process interruption / restart
    ├── memory / codec / render behavior
    └── in-scope fixes + regression tests + evidence
    │
    └── push back to the SAME GitHub branch
```

There are never two competing implementations. Local Codex validates and fixes the exact online workstream branch supplied by GPT Web.

## 2. Project phases

```text
R0 Repository / Roadmap Sync
→ W0 Workflow Contract
→ W1 Workflow Runtime Core
→ W2 Existing Capability Stage Integration
→ W3 Human Review + Invalidation
→ W4 Workflow UI
→ W5 Failure / Retry / Restart Hardening
→ W6 End-to-End Release Acceptance
→ V2.2 Release Finalization
```

Real AI Provider and Agent Runtime remain V2.3 work.

## 3. Workstream matrix

| Workstream | Primary output | GPT Web/GitHub | Local Codex | Merge gate |
| --- | --- | --- | --- | --- |
| R0 | repo truth + PRD + roadmap | Mandatory | No | docs review / CI |
| W0 | workflow domain contract | Mandatory | No | unit/type/build |
| W1 | durable orchestration core | Mandatory | Usually no | runtime tests / CI |
| W2 | real subsystem stage adapters | Mandatory | Mandatory | cloud + Windows engine evidence |
| W3 | checkpoints/revision/invalidation | Mandatory | Optional unless platform behavior involved | tests + review flow |
| W4 | Generate First Draft + Workflow UI | Mandatory | Mandatory | E2E + real browser evidence |
| W5 | crash/retry/restart hardening | Mandatory | Mandatory | chaos/recovery evidence |
| W6 | 3 real projects + final encoded MP4 | Mandatory review | Mandatory execution | release acceptance |

## 4. Branch and PR strategy

One workstream equals one branch and one PR unless the active PRD explicitly authorizes otherwise.

Recommended branches:

```text
planning/v2.2-workflow-runtime
feature/v2.2-w0-workflow-contract
feature/v2.2-w1-workflow-runtime
feature/v2.2-w2-stage-integration
feature/v2.2-w3-human-review
feature/v2.2-w4-workflow-ui
feature/v2.2-w5-recovery-hardening
release/v2.2-final-acceptance
release/v2.2.0
```

Every feature branch starts from accepted current `main`, never from an old V2.1.1 workstream branch and never from PR #18.

## 5. Standard workstream lifecycle

### Phase A — GPT Web online implementation

1. Read live GitHub main/PR/CI state.
2. Read `PROJECT_STATUS.md`, `AGENTS.md`, `SYSTEM.md` and the active V2.2 PRD.
3. Create a new workstream branch from the accepted main SHA.
4. Inspect existing implementation before creating new abstractions.
5. Implement the smallest bounded workstream scope.
6. Add regression/unit/integration/route tests.
7. Run or inspect cloud CI.
8. Fix cloud failures.
9. Open/update the workstream PR.
10. If the workstream has no local gate, review and merge.
11. If a local gate is required, freeze an exact green head SHA and hand it to Local Codex.

### Phase B — Local Codex exact-SHA validation

Local Codex must:

```text
git fetch
→ checkout exact supplied branch
→ verify exact expected SHA before testing
→ use isolated worktree/data root
→ run only the active validation contract
→ fix only in-scope defects
→ add regression tests where practical
→ commit and push to the same branch
→ return exact final HEAD and evidence
```

Codex does not merge the PR and does not begin the next workstream.

### Phase C — GPT Web closeout

1. Read returned Codex SHA and evidence.
2. Review every local Codex diff.
3. Inspect CI for the returned exact head.
4. Reject/repair out-of-scope architecture changes if any.
5. Confirm local acceptance requirements are satisfied.
6. Merge the PR.
7. Update `PROJECT_STATUS.md` on a bounded status-sync branch/PR if required by repository discipline.
8. Start the next workstream from the new accepted main.

## 6. Local Codex trigger policy

GPT Web does **not** ask for local validation merely because code changed.

Local Codex is required when correctness depends on one or more of:

- Windows process semantics;
- real browser interaction;
- real MP4/MOV/MKV/WebM/FLAC/SRT/etc.;
- FFmpeg or ffprobe executable behavior;
- video-use/Python runtime;
- HyperFrames CLI/runtime;
- Remotion/Chromium final rendering;
- filesystem/path behavior that cloud tests cannot prove;
- application/process termination and restart recovery;
- large media memory/performance;
- actual encoded-video visual proof.

Pure TypeScript domain models, state-machine tests and cloud-safe scheduling logic should stay online until a workstream reaches one of these boundaries.

## 7. Handoff contract to Local Codex

Every local handoff from GPT Web must contain:

```text
Repository
Branch
Exact SHA
Active workstream
Goal
Allowed files/areas to modify
Forbidden scope
Setup/data-root rules
Commands to run
Required real-media fixtures
Required manual steps
Acceptance gates
Evidence to capture
Stop rules
Expected return format
```

Required Codex return:

```text
Final branch HEAD
Commits pushed
Environment summary
Commands executed
Automated test results
Real browser/media/engine evidence
Defects found
Fixes applied
Regression tests added
Remaining failed items
```

No local PASS is accepted without the evidence defined in that handoff.

## 8. Detailed workstreams

### R0 — Repository / Roadmap Sync

Goal: make every new agent land on the same V2.2 truth before product code starts.

Online scope:

- create V2.2 Master PRD;
- create this Development Plan;
- update README from v2.1.0/V2.1.1-hardening state to released v2.1.1 + V2.2 planning;
- update GPT Web/Local Codex handoff document;
- update stale AGENTS hardening-only language where necessary;
- update PROJECT_STATUS with active V2.2 planning workstream;
- reposition PR #18 as V2.3 architecture input;
- no product code.

Local gate: none.

R0 exit:

```text
REPOSITORY TRUTH: PASS
ROADMAP: V2.2 Workflow Runtime
V2.3 AI Agent boundary: explicit
Project Schema: 2.0.0 unchanged
```

### W0 — Workflow Contract

Goal: define the durable domain before scheduling real engines.

Expected areas:

```text
schemas/workflow*
lib/workflow/domain*
lib/workflow/persistence*
tests/workflow-*.test.ts
```

Implementation:

- WorkflowDefinition + versioning;
- WorkflowRun;
- WorkflowStageDefinition/Execution;
- WorkflowCheckpoint;
- WorkflowArtifactReference;
- WorkflowError;
- legal state transitions;
- dependency validation including cycles/missing/duplicates;
- atomic workflow persistence under `VIDEO_OS_DATA_ROOT/workflows`;
- no Project Schema change.

Local gate: none.

### W1 — Workflow Runtime Core

Goal: build a durable orchestration engine with fake/test stage executors first.

Implementation:

- WorkflowService;
- WorkflowRunner;
- Stage Registry;
- Dependency Resolver;
- scheduler/readiness;
- start/pause/resume/cancel;
- retry;
- checkpoint stop/resume;
- activity records;
- restart reconciliation contract against Durable Jobs;
- operation/attempt identity;
- no real engine duplication.

Local gate: normally none. Restart reconciliation receives real OS/process acceptance later in W5.

### W2 — Existing Capability Stage Integration

Goal: make Workflow use the system already built.

Integrate, by reuse:

```text
MEDIA_IMPORT
MEDIA_PROBE
MEDIA_NORMALIZE
TRANSCRIBE
SCRIPT_ANALYSIS
SCENE_DETECTION
CAPTION_GENERATION
VISUAL_PLANNING
MOTION_GENERATION
BROLL_ASSEMBLY
AUDIO_ASSEMBLY
TIMELINE_ASSEMBLY
PREVIEW
FINAL_RENDER
```

Cloud side proves contracts, job delegation, command safety and deterministic fixtures.

Local gate: mandatory for FFmpeg, video-use, HyperFrames, Remotion and real media.

Do not merge W2 until local exact-SHA evidence passes or all failing engine-dependent pieces are deliberately removed from W2 scope.

### W3 — Human Review / Invalidation

Goal: make automation safely coexist with human editing.

Implementation:

- Checkpoint A/Checkpoint B;
- waiting_review state;
- approval routes/services;
- manual edit while paused/reviewing;
- base project revision capture;
- revision conflicts;
- dependency/output digest invalidation;
- downstream reset without replaying unrelated upstream work.

Key invariant:

```text
long Stage output
+ newer user Project edit
≠ silent overwrite
```

Local gate: optional unless real UI/process behavior is needed; otherwise validate in W4/W5.

### W4 — Workflow UI

Goal: deliver the visible product experience.

Implementation:

- Generate First Draft entry;
- Scenario selection;
- Workflow overview;
- stage progress/details;
- review screens/actions;
- retry/resume/cancel;
- activity/status;
- sanitized errors;
- typed i18n for zh-CN/en-US;
- dark/light compatibility;
- reuse current workspace shell and design system.

Cloud gate: Playwright + build/test.

Local gate: mandatory real Windows browser + media flow.

### W5 — Failure / Retry / Restart Hardening

Goal: prove a long production workflow can fail without corrupting or duplicating work.

Mandatory local chaos scenarios:

1. terminate during transcription;
2. terminate after Project Transaction commits but before Workflow stage completion persists;
3. terminate/fail during HyperFrames;
4. terminate during Final Render;
5. edit Project manually while a long Stage is running;
6. retry a failed mutation stage and prove no duplicate Caption/Motion/B-roll/Timeline result.

Local gate: mandatory.

### W6 — End-to-End Release Acceptance

Goal: validate product behavior, not just APIs.

Case A — Talking Head:

```text
real MP4/MOV
→ transcript
→ script/scenes/captions/visual plan
→ review
→ motion/timeline
→ preview
→ final MP4
```

Target: 9:16.

Case B — Product Ad:

```text
real media
→ Brand
→ B-roll
→ HyperFrames
→ Audio
→ Timeline
→ final MP4
```

Target: 16:9.

Case C — Restart Recovery:

```text
workflow partially runs
→ application/process terminated
→ restart
→ recover/resume/retry
→ final MP4
```

Target: 1:1.

Final output must be probed and sampled to verify actual encoded media, not merely a completed Job state.

Local gate: mandatory.

## 9. CI policy

Baseline cloud commands:

```text
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

When browser flows are touched:

```text
npm run test:e2e
```

A green cloud run proves repository/cloud behavior only. It cannot be used as evidence for Windows engines or real media.

## 10. Merge policy

A PR may merge only when:

- scope matches the active workstream;
- no unrelated architecture replacement appears;
- tests exist for new durable behavior;
- cloud CI is green for the exact head;
- required local gate is green for that exact head or a later reviewed Codex head;
- Project Schema/engine pins were not changed incidentally;
- status/handoff documentation remains truthful.

## 11. Development stop rules

During V2.2 do not add unless a new approved PRD/status explicitly changes scope:

- real external AI Provider;
- V2.3 Agent Tool Registry/Agent Session product runtime;
- arbitrary shell/filesystem tool execution;
- replacement Job System;
- replacement Project persistence model;
- Project Schema change without migration decision;
- Remotion/HyperFrames/video-use version changes without explicit engine decision;
- unrelated major editor redesign.

## 12. Completion definition

V2.2 is complete only when the product can perform:

```text
real source video
→ Generate First Draft
→ automatic durable stages
→ Human Review
→ automatic assembly
→ editable Timeline
→ Preview
→ Final Render
```

with safe retry/recovery and real encoded-output evidence.

At that point the next planned milestone becomes V2.3 Real AI Director / AI Editing Agent.