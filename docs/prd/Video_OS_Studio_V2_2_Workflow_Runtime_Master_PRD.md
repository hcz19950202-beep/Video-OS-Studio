# Video OS Studio V2.2 — Workflow Runtime Master PRD

> Version: Rev.1  
> Date: 2026-08-24  
> Status: Draft for implementation review  
> Target product version: Video OS Studio V2.2  
> Development baseline: Video OS Studio v2.1.1  
> Baseline main: `6f0487f6b5b65d85083c96bc54e14bca37fb5704`  
> Project Schema: `2.0.0`  
> Next milestone after V2.2: V2.3 Real AI Director / AI Editing Agent

## 1. Executive summary

Video OS Studio V2.1.1 completed the engineering foundation required for reliable automated video production: validated Project Commands/Transactions, project revision and idempotency protection, durable jobs, cancellation/retry/restart recovery, streaming media, safe external-engine adapters, Remotion, HyperFrames, video-use, FFmpeg/ffprobe, browser/Windows acceptance and final encoded-render proof.

V2.2 does **not** primarily add more editing features and does **not** add a real external LLM provider. Its job is to turn the existing capabilities into one durable, visible, reviewable production workflow.

The user-facing target is:

```text
Create Project
→ Import source video
→ Select Scenario
→ Generate First Draft
→ automatic media/transcript/script/scene/caption/visual-plan stages
→ Human Review
→ automatic motion/B-roll/audio/timeline assembly
→ Preview
→ Human Review
→ Final Render
```

V2.2 must be useful even when the Director runtime remains deterministic/rules-based. V2.3 may later replace or augment creative decision stages with real LLM/Agent providers without rewriting the Workflow Runtime.

## 2. Product decision

V2.2 is a **Durable Human-in-the-loop Video Production Workflow Runtime**.

The product moves from:

```text
User chooses feature
→ feature runs
→ user chooses next feature
→ feature runs
```

to:

```text
User defines production goal
→ Workflow schedules approved stages
→ existing Jobs/Services/Transactions execute
→ Human Review at deliberate checkpoints
→ Workflow resumes
→ editable first draft / final render
```

The Workflow layer is orchestration. It is not a second Project model and not a second Job system.

## 3. Goals

### G1 — Durable Workflow Runtime

Provide:

- WorkflowRun persistence;
- versioned WorkflowDefinition;
- Stage Registry;
- dependency resolution;
- start/pause/resume/cancel;
- retry;
- restart recovery;
- checkpoint/review gates;
- downstream invalidation;
- project revision conflict protection;
- stage/transaction idempotency;
- activity/audit visibility.

### G2 — Generate First Draft

A user can import one real source video, choose a supported Scenario and click **Generate First Draft**. The system automatically reaches a reviewable Draft Plan and then an Editable First Draft after approval.

Draft Plan includes:

```text
Transcript
Script analysis
Scenes
Captions
Visual Plan
```

Editable First Draft includes:

```text
Motion
B-roll when available
Audio when configured
Assembled Timeline
Preview-ready Project
```

### G3 — Human review

At least two checkpoints are required.

Checkpoint A reviews:

- Script;
- Scenes;
- Captions;
- Visual Plan;
- visual density/intensity;
- B-roll/motion suggestions.

Checkpoint B reviews:

- Timeline;
- Motion;
- B-roll;
- Audio;
- Captions;
- Preview.

### G4 — Failure safety

A long workflow may fail, be cancelled or be interrupted without losing the Project or replaying already valid work.

### G5 — Workflow visibility

The user must be able to see which stages completed, which stage is running, which Job is associated, why execution stopped, what can be retried, what artifact was produced and whether review is required.

### G6 — Agent-ready architecture

V2.2 must allow V2.3 to introduce a real provider, selection-aware context, tool registry, Plan/Diff/Confirm and multi-turn Agent behavior without rewriting Workflow scheduling, durability or project-mutation safety.

## 4. Explicit non-goals

V2.2 does not add:

- OpenAI/Claude/Gemini production providers;
- general AI command bar;
- autonomous arbitrary tool calling;
- multi-turn editing agent;
- provider marketplace;
- generated-image/video marketplace;
- cloud collaboration;
- multi-user editing;
- cloud render farm;
- multi-timeline;
- arbitrary docking;
- full crop/mask suite;
- transition suite;
- HDR/pro color;
- desktop packaging;
- avatar/voice/lip-sync product surfaces;
- unrelated large UI redesign.

Scope creep into any of the above requires a new explicit design decision.

## 5. Permanent architecture invariants

Always preserve:

```text
Source Media != Project Canvas != Export Profile
```

And:

1. Project JSON remains the durable Project source of truth.
2. Workflow is not Project state.
3. Job is not Workflow state.
4. Canonical internal timeline timing remains frame-based.
5. Durable Project mutations use validated Commands/Transactions/bounded services.
6. Workflow code never hand-edits `project.json`.
7. UI and Workflow code never directly spawn external CLIs.
8. Remotion remains the master composition/render engine.
9. HyperFrames remains the deterministic complex-motion asset engine behind its adapter/service boundary.
10. video-use and FFmpeg/ffprobe remain behind adapters/services.
11. Source media remains immutable.
12. Runtime media/user data stays under `VIDEO_OS_DATA_ROOT`, outside repository code by default.
13. Project JSON stores logical asset IDs and project-relative paths, not machine absolute paths.
14. Studio theme/locale remains separate from generated-video Brand.
15. `REUSE > MODIFY > CREATE`.
16. Project Schema stays `2.0.0` unless a separate schema/migration decision explicitly changes it.

## 6. Three-layer runtime model

### 6.1 Project

Project answers: **what does the video currently contain?**

Examples: Assets, Tracks, Clips, Script, Scenes, Captions, Brand, Canvas, styles and Timeline.

### 6.2 Job

Job answers: **what concrete long-running execution task is currently running?**

Examples: Remotion render, HyperFrames render, FFmpeg normalization, video-use transcription.

The V2.1.1 Durable Job Runtime is reused. V2.2 must not create a second Job subsystem.

### 6.3 Workflow

Workflow answers: **what production stages must execute, in what dependency order, to reach a target outcome?**

```text
Project
└── WorkflowRun
    ├── Stage → Job
    ├── Stage → Read-only analysis
    ├── Stage → Project Transaction
    ├── Human Checkpoint
    ├── Stage → Job
    └── Final Render
```

## 7. Runtime architecture

```text
Workflow UI
    ↓
Typed Workflow Client / API
    ↓
WorkflowService
    ↓
WorkflowRunner
    ↓
Stage Registry + Dependency Resolver
    ↓
Jobs / Application Services / Project Commands
    ↓
Adapters / Engines / Project Persistence
```

`WorkflowRunner` owns orchestration only. It must not contain FFmpeg, video-use, Remotion, HyperFrames or editor-specific implementation details.

## 8. Workflow domain model

### 8.1 WorkflowDefinition

```ts
type WorkflowScenario =
  | "talking-head"
  | "product-ad"
  | "explainer";

type WorkflowDefinition = {
  id: string;
  version: string;
  name: string;
  scenario: WorkflowScenario;
  stages: WorkflowStageDefinition[];
  entryStageIds: string[];
  metadata?: { description?: string };
};
```

Definitions are immutable/versioned for existing runs, for example:

```text
talking-head@1
product-ad@1
explainer@1
```

A future `@2` definition must not silently alter the semantics of a run created with `@1`.

### 8.2 WorkflowRun

```ts
type WorkflowRunStatus =
  | "pending"
  | "running"
  | "waiting_review"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled"
  | "interrupted";

type WorkflowRun = {
  id: string;
  definitionId: string;
  definitionVersion: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  status: WorkflowRunStatus;
  scenario: WorkflowScenario;
  currentStageId?: string;
  sourceAssetIds: string[];
  canvasSnapshot: {
    width: number;
    height: number;
    fps: number;
  };
  stageExecutions: WorkflowStageExecution[];
  checkpoints: WorkflowCheckpoint[];
  artifacts: WorkflowArtifactReference[];
  lastKnownProjectRevision: number;
  error?: WorkflowError;
};
```

### 8.3 Workflow Stage

```ts
type WorkflowStageKind =
  | "analysis"
  | "job"
  | "mutation"
  | "checkpoint"
  | "render";

type WorkflowStageDefinition = {
  id: string;
  kind: WorkflowStageKind;
  dependsOn: string[];
  optional?: boolean;
  retryable: boolean;
  reviewRequired?: boolean;
  invalidates?: string[];
  executorKey: string;
};
```

Runtime status:

```ts
type WorkflowStageStatus =
  | "pending"
  | "ready"
  | "running"
  | "waiting_review"
  | "completed"
  | "failed"
  | "cancelled"
  | "interrupted"
  | "skipped"
  | "invalidated";
```

Execution record:

```ts
type WorkflowStageExecution = {
  stageId: string;
  status: WorkflowStageStatus;
  attempt: number;
  attemptId?: string;
  startedAt?: string;
  completedAt?: string;
  baseProjectRevision?: number;
  inputDigest?: string;
  outputDigest?: string;
  jobIds?: string[];
  operationIds?: string[];
  artifactIds?: string[];
  error?: WorkflowError;
};
```

### 8.4 WorkflowCheckpoint

A checkpoint is durable workflow state, not a transient UI modal.

```ts
type WorkflowCheckpointStatus =
  | "pending"
  | "waiting_review"
  | "approved"
  | "rejected"
  | "superseded";

type WorkflowCheckpoint = {
  id: string;
  stageId: string;
  status: WorkflowCheckpointStatus;
  createdAt: string;
  resolvedAt?: string;
  baseProjectRevision: number;
  resolvedProjectRevision?: number;
};
```

### 8.5 WorkflowArtifact

Workflow artifacts track stage outputs and are distinct from Project Assets.

```ts
type WorkflowArtifactKind =
  | "transcript"
  | "script-analysis"
  | "scene-plan"
  | "caption-plan"
  | "visual-plan"
  | "motion"
  | "preview"
  | "final-render"
  | "other";

type WorkflowArtifactReference = {
  id: string;
  stageId: string;
  kind: WorkflowArtifactKind;
  createdAt: string;
  projectRevision?: number;
  jobId?: string;
  logicalAssetId?: string;
  relativePath?: string;
  digest?: string;
};
```

## 9. Persistence

Recommended layout:

```text
VIDEO_OS_DATA_ROOT/
└── workflows/
    └── <workflowRunId>/
        ├── workflow.json
        ├── activity.jsonl
        └── stage-results/
            ├── transcript.json
            ├── script-analysis.json
            └── visual-plan.json
```

`workflow.json` is durable Workflow truth. `activity.jsonl` is diagnostic/audit history only; V2.2 does not introduce event sourcing.

Workflow state writes must validate and use atomic temp-write/replace behavior consistent with existing durable-state safety principles.

## 10. State-machine rules

Only explicit legal transitions are allowed. Representative rules:

```text
pending → running
running → waiting_review
running → completed
running → failed
running → interrupted
running → cancelled
waiting_review → running
waiting_review → paused
paused → running
failed → running        (explicit retry only)
interrupted → running   (explicit resume/recovery only)
```

Terminal `completed` and `cancelled` runs cannot silently restart as the same run.

A stage may become `ready` only when all required dependencies are valid and completed.

Dependency cycles, missing stage IDs and duplicate stage IDs are invalid definitions.

## 11. Restart recovery

At application startup a `WorkflowRecoveryService` inspects non-terminal runs and reconciles them against Durable Job truth.

Examples:

```text
Stage=running + Job=completed
→ reconcile result
→ finish Stage exactly once

Stage=running + Job=interrupted
→ Stage=interrupted
→ Workflow=interrupted

Stage=running + Job=running
→ continue observing the existing Job
```

Workflow recovery must never guess that an engine task completed merely because the application restarted.

## 12. Retry and downstream invalidation

Retry reruns the failed/invalidated stage, not the whole Workflow.

If an upstream output changes, all downstream stages whose inputs are no longer valid become `invalidated` and must not silently reuse stale outputs.

For MVP, invalidation may use an explicit dependency graph plus `inputDigest`/`outputDigest` rather than a generic DAG optimizer.

Representative example:

```text
SCENE_DETECTION output changes
→ CAPTION_GENERATION invalidated when scene-grounded
→ VISUAL_PLANNING invalidated
→ MOTION_GENERATION invalidated
→ BROLL_ASSEMBLY invalidated
→ TIMELINE_ASSEMBLY invalidated
→ PREVIEW invalidated
→ FINAL_RENDER invalidated
```

## 13. Project revision and idempotency contract

Any stage that can mutate Project state must use the V2.1.1 safety pattern:

```text
capture deterministic input + baseProjectRevision
→ run analysis/job
→ reload latest Project
→ expectedRevision check
→ apply minimal validated Command/Transaction
→ persist
```

A long-running stage must never save an old whole-Project snapshot after external work finishes.

If the user edits the Project while a long stage is running, the stage must surface a revision conflict rather than overwrite newer work.

Each mutation attempt persists a deterministic operation ID before apply, for example:

```text
workflow:<workflowId>:stage:<stageId>:attempt:<attemptId>
```

If the transaction committed but the application crashed before the Workflow stage was marked complete, retry/recovery with the same operation ID must reconcile `alreadyApplied` rather than duplicate captions, motion, B-roll or clips.

## 14. Scenario definitions

Initial scenarios:

1. Talking Head
2. Product Ad
3. Explainer

Scenario determines Workflow definition/configuration, visual-density defaults, relevant optional stages and review presentation. It does not hard-code Canvas or Export Profile.

### 14.1 Talking Head

```text
Import
→ Probe
→ Normalize when required
→ Transcribe
→ Script Analysis
→ Scene Detection
→ Caption Generation
→ Visual Planning
→ Checkpoint A
→ Motion Generation
→ B-roll Assembly when available
→ Timeline Assembly
→ Preview
→ Checkpoint B
→ Final Render
```

### 14.2 Product Ad

Adds stronger Brand, proof/number, CTA, B-roll, HyperFrames and audio configuration while still using existing deterministic capabilities. The Workflow must not secretly fetch external media when no reusable B-roll exists.

### 14.3 Explainer

Emphasizes scene hierarchy, text support, process visuals, diagram-like motion and caption restraint using existing deterministic effect/motion systems.

## 15. Initial Stage Registry

Initial registered stages:

```text
01 MEDIA_IMPORT
02 MEDIA_PROBE
03 MEDIA_NORMALIZE
04 TRANSCRIBE
05 SCRIPT_ANALYSIS
06 SCENE_DETECTION
07 CAPTION_GENERATION
08 VISUAL_PLANNING
09 CONTENT_REVIEW
10 MOTION_GENERATION
11 BROLL_ASSEMBLY
12 AUDIO_ASSEMBLY
13 TIMELINE_ASSEMBLY
14 PREVIEW
15 ASSEMBLY_REVIEW
16 FINAL_RENDER
```

Stages may be optional per WorkflowDefinition.

Stage executors must reuse existing services/jobs. Examples:

```text
TRANSCRIBE
→ existing Durable Job
→ video-use adapter

MOTION_GENERATION
→ existing motion/HyperFrames service
→ existing Durable Job

FINAL_RENDER
→ existing Render Service
→ Durable render Job
→ Remotion
```

The Stage is an orchestration adapter, not a replacement implementation.

## 16. Human review behavior

### Checkpoint A — Content / Visual Plan

Show Script, Scenes, Captions and Visual Plan. Allow users to edit the Project, enable/disable suggestions and approve continuation.

Approval captures the current Project revision and recomputes downstream validity before execution resumes.

### Checkpoint B — Assembly

Show Timeline, motion, B-roll, audio, captions and Preview. Users may open the editor, retry a relevant stage, approve final render or continue manual editing.

Opening the editor is always allowed. The UI must warn that manual Project changes can invalidate downstream Workflow results.

## 17. User experience

Entry should reuse the existing product shell rather than create a separate application.

Suggested entry:

```text
Create Project

[ Manual Project ]
[ Generate First Draft ]
```

Scenario selection:

```text
Talking Head
Product Ad
Explainer
```

Workflow overview example:

```text
VIDEO WORKFLOW

Source: factory.mov
Scenario: Product Ad
Canvas: 1920 × 1080

✓ Import
✓ Probe
✓ Transcript
✓ Script Analysis
✓ Scenes
✓ Captions
● Visual Plan — Waiting for review
○ Motion
○ B-roll
○ Audio
○ Timeline
○ Preview
○ Final Render

[Review Draft]
```

Stage detail should expose status, timing, associated Job ID, sanitized error and useful output summary, not raw machine paths or raw stderr.

On restart, an incomplete run should be discoverable with actions such as Resume, Open Project and Cancel Workflow.

## 18. Pause/cancel semantics

Pause means: do not schedule new stages. V2.2 does not require true OS-level suspension of active engines. An already running Job either completes or is explicitly cancelled according to its existing Job capability.

Cancel Workflow:

1. stops scheduling new stages;
2. requests cancellation of active cancellable Jobs;
3. preserves valid completed Project mutations/artifacts;
4. does not delete the Project;
5. marks the run `cancelled`;
6. leaves manual editing available.

## 19. API surface

Initial route contract:

```text
POST   /api/workflows
GET    /api/workflows
GET    /api/workflows/:workflowId
POST   /api/workflows/:workflowId/start
POST   /api/workflows/:workflowId/pause
POST   /api/workflows/:workflowId/resume
POST   /api/workflows/:workflowId/cancel
POST   /api/workflows/:workflowId/stages/:stageId/retry
POST   /api/workflows/:workflowId/checkpoints/:checkpointId/approve
GET    /api/workflows/:workflowId/activity
```

Example create request:

```json
{
  "projectId": "project-xxx",
  "definitionId": "product-ad",
  "definitionVersion": "1",
  "sourceAssetIds": ["asset-main"],
  "expectedProjectRevision": 12
}
```

Representative public error codes:

```text
WORKFLOW_NOT_FOUND
WORKFLOW_INVALID_STATE
WORKFLOW_STAGE_NOT_READY
WORKFLOW_STAGE_FAILED
WORKFLOW_STAGE_INVALIDATED
WORKFLOW_REVIEW_REQUIRED
WORKFLOW_PROJECT_REVISION_CONFLICT
WORKFLOW_JOB_FAILED
WORKFLOW_CANCELLED
WORKFLOW_INTERRUPTED
```

Errors exposed to UI must be sanitized. Detailed process output remains in server/Job diagnostics.

UI uses a typed Workflow client rather than importing server/runtime internals.

## 20. Security boundary

Stage Registry is an allow-list. Workflow execution must not expose arbitrary shell, filesystem, executable, network or raw Project-write capabilities.

Allowed execution path:

```text
Workflow Stage
→ registered Application Service / Durable Job / Command / Transaction
→ validated adapter/runtime boundary
```

Forbidden:

```text
Workflow Stage
→ spawn("ffmpeg")
Workflow Stage
→ spawn("remotion")
Workflow Stage
→ arbitrary shell
Workflow Stage
→ direct raw project.json edit
```

## 21. Project Schema decision

Default decision: Project Schema remains `2.0.0`.

Workflow runtime state lives outside Project JSON under `VIDEO_OS_DATA_ROOT`.

If implementation proves that durable Project semantics must change, work stops being incidental. A separate schema-version/migration/backward-compatibility decision is required before code changes.

## 22. Observability

Activity records should include at least:

```text
Workflow created
Stage ready
Stage started
Job created
Job completed
Transaction applied
Review requested
Review approved
Stage failed
Stage retried
Workflow paused/resumed
Workflow completed/cancelled
```

Activity is user/debug visibility, not a second source of truth.

## 23. Test strategy

Expected test areas include:

```text
workflow-schema.test.ts
workflow-state-machine.test.ts
workflow-dependencies.test.ts
workflow-runner.test.ts
workflow-persistence.test.ts
workflow-recovery.test.ts
workflow-idempotency.test.ts
workflow-revision-conflict.test.ts
workflow-checkpoint.test.ts
workflow-invalidation.test.ts
workflow-api.test.ts
workflow-stage-registry.test.ts
workflow-job-integration.test.ts
```

Browser E2E should cover create/import/start/progress/review/approve/retry/resume/cancel/reopen using tiny deterministic fixtures where appropriate.

Cloud tests do not substitute for Windows/real-engine acceptance.

## 24. Workstreams

### V2.2-R0 — Repository / Roadmap Sync

Scope:

- add this Master PRD;
- add V2.2 development plan;
- update README/current-status handoff documents;
- update `PROJECT_STATUS.md` to V2.2 planning after the R0 branch exists;
- reposition PR #18 as future V2.3 AI Agent architecture input;
- no product code.

Local Codex: not required.

### W0 — Workflow Contract

Implement domain schemas, WorkflowDefinition validation, WorkflowRun/Stage/Checkpoint/Artifact/Error models, state-transition guards, persistence contract and definition versioning.

Acceptance includes duplicate/missing/cyclic dependency rejection, illegal transition rejection, atomic persistence and reopen tests.

Local Codex: not required if no platform-specific runtime code is touched.

### W1 — Workflow Runtime Core

Implement WorkflowService, WorkflowRunner, dependency resolver, Stage Registry, scheduler, start/pause/resume/cancel/retry and recovery reconciliation with test/dummy stages.

Acceptance includes dependency ordering, checkpoint stop/resume, failure/retry, cancel, recovery and exactly-once mutation simulation.

Local Codex: normally not required yet; final restart behavior is revalidated in W5 with real runtime.

### W2 — Existing Capability Stage Integration

Register and connect FFmpeg/media, video-use, Script/Scene/Caption, Rules Visual Planner, HyperFrames, B-roll/audio, Timeline and Remotion through existing services/jobs.

Cloud tests prove delegation/contracts. Real FFmpeg/video-use/HyperFrames/Remotion behavior requires Local Codex evidence on the exact frozen SHA.

### W3 — Human Review / Invalidation

Implement Checkpoints A/B, approval, Project revision refresh, manual-edit handling and downstream invalidation.

Cloud tests are primary. Local acceptance may be combined with W4/W5 if no platform-specific defect appears.

### W4 — Workflow UI

Implement Generate First Draft entry, Workflow overview, stage details, review actions, retry/resume/cancel/activity and typed i18n in existing workspace architecture.

Browser E2E is required. Local Codex verifies real Windows browser/media interaction on the frozen SHA.

### W5 — Failure / Retry / Restart Hardening

Release-blocking durability work. Validate crashes/restarts during transcription, after a transaction commits but before stage-state persistence, during HyperFrames, during Final Render and while the Project is manually edited.

Local Codex is mandatory.

### W6 — End-to-End Release Acceptance

Real projects:

1. Talking Head, target 9:16;
2. Product Ad with B-roll/Brand/HyperFrames/audio, target 16:9;
3. Restart Recovery case, target 1:1.

Final MP4 must be probed and sampled to prove encoded captions/B-roll/motion where applicable.

Local Codex is mandatory.

## 25. Release gates

V2.2 can release only when all applicable gates pass:

```text
REPOSITORY TRUTH
WORKFLOW CONTRACT
WORKFLOW DURABILITY
WORKFLOW DEPENDENCIES
STAGE REGISTRY
EXISTING CAPABILITY REUSE
HUMAN REVIEW
RETRY / CANCEL / RESUME
RESTART RECOVERY
DOWNSTREAM INVALIDATION
PROJECT REVISION SAFETY
WORKFLOW IDEMPOTENCY
ZERO KNOWN DUPLICATE MUTATION
ZERO KNOWN SILENT PROJECT OVERWRITE
TALKING HEAD WORKFLOW
PRODUCT AD WORKFLOW
RESTART WORKFLOW CASE
9:16
16:9
1:1
VIDEO-USE
FFMPEG
HYPERFRAMES
REMOTION
FINAL ENCODED MP4
UBUNTU CI
WINDOWS CI
BROWSER SMOKE
PROJECT SCHEMA 2.0.0 PRESERVED (unless separately approved)
```

Report independently:

```text
CODE COMPLETE
CLOUD VERIFIED
LOCAL VERIFIED
PRD ACCEPTED
RENDER VERIFIED when applicable
VISUAL ACCEPTED for major UI changes
MIGRATION VERIFIED only if a separately approved schema change occurs
```

## 26. Final product acceptance criterion

V2.2 is not accepted merely because a Workflow API exists.

A user must be able to:

```text
Open Video OS
→ create a Project
→ import a real talking-head/product video
→ select a Scenario
→ Generate First Draft
→ observe automatic stages
→ review the draft
→ approve continuation
→ obtain a real editable Timeline
→ Preview
→ Final Render
```

The user must not need to manually visit every subsystem and trigger each engine individually.

## 27. V2.3 boundary

Only after V2.2 release acceptance should V2.3 formally introduce:

```text
AIProviderAdapter
real LLM provider
AgentContextBuilder
selection references
Agent Tool Registry
structured Agent Plan
Dry Run
Diff
Confirm
multi-turn Agent Session
```

Target architecture then becomes:

```text
User Intent
→ AI Understanding / Plan
→ Workflow + registered tools
→ Jobs / Transactions
→ Video OS engines
→ Human Review
→ Timeline / Render
```

V2.2 builds the reliable production machine. V2.3 adds the AI brain.