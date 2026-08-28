# Video OS Studio V2.4 — Autonomous Production Agent Master PRD

> Status: authoritative planning contract for V2.4.
>
> Repository: `hcz19950202-beep/Video-OS-Studio`
>
> Immutable released baseline: `v2.3.1`
>
> Release commit: `6e07d1dbdd0ec4d64d022f7c821e133ddf207637`
>
> Annotated tag object: `b91d0c3adbaef09cd5c323481ec6bb04c516dd6e`
>
> Project Schema remains `2.0.0` unless a later explicit migration workstream is approved.

---

# 1. Product Goal

V2.3.1 established a safe, durable Real AI Director / multi-turn AI Editing Agent above the accepted Project, Workflow, Durable Job and render foundations.

V2.4 moves the product up one abstraction level:

```text
V2.3
"Help me edit this part"

→

V2.4
"Take this production goal and finish the video"
```

The target V2.4 interaction is:

```text
User Production Goal
→ Production Mission
→ Production Planner
→ Asset / Skill selection
→ bounded Agent execution
→ existing Workflow / Durable Jobs / Services
→ Project mutations through accepted Proposal / Apply boundaries
→ automated QA
→ localized repair loop
→ human checkpoints according to autonomy policy
→ final encoded video
```

V2.4 is successful only if Video OS Studio can take a real production brief plus real source media and drive a complete, inspectable, restart-safe production toward a publishable final video without requiring the user to micromanage every editing operation.

The product target is an **AI video production operating system**, not merely an AI-assisted editor.

---

# 2. Primary User Jobs

V2.4 must support production goals such as:

```text
"Turn this 2-minute talking-head clip into a Facebook B2B ad. Keep it direct, strengthen the proof points, and give me the final publishable MP4."

"Use the current script and asset library to make a 45-second product ad for Australian builders. Show the 15-day production, 30-day delivery and 4-worker installation proof clearly."

"Make this video more conversion-oriented, but preserve the manual edits I already approved."

"Run the whole production automatically. Stop only at the final review unless you encounter a high-risk decision."
```

A Mission should be able to survive browser refresh, application restart and individual Job interruption while retaining an understandable production state.

---

# 3. Non-Goals

V2.4 does **not** build:

- a second Project model;
- a second Workflow engine;
- a second Durable Job system;
- a second Agent Session truth;
- arbitrary autonomous shell or coding access;
- direct model writes to `project.json`;
- unrestricted filesystem traversal;
- unrestricted network fetch;
- hidden destructive editing without audit/history;
- a cloud collaboration platform;
- a stock-media marketplace;
- a Premiere / After Effects clone;
- a new timeline truth;
- a new master renderer;
- an implicit Project Schema migration;
- a provider-specific production architecture;
- a batch/campaign system before one-video autonomy is accepted.

V2.4 must not rewrite or reinterpret the immutable V2.3.1 release evidence.

---

# 4. Permanent Architecture Invariants

Always preserve:

```text
Source Media != Project Canvas != Export Profile
Project != Workflow != Job
Agent Session != Project
Mission != Project
Mission != Workflow
QA Report != Project
Skill != Project
```

And:

1. `project.json` remains durable editing truth.
2. Workflow durable state remains orchestration truth.
3. Durable Job state remains concrete execution truth.
4. Agent Session remains conversational/tool orchestration state.
5. Production Mission is a higher-level production objective/state machine, not an editing source of truth.
6. Canonical internal time remains frames.
7. Durable Project mutation continues through validated Commands / Transactions / bounded services.
8. Agent/provider/tool output never directly mutates Project or Workflow persistence.
9. Long-running mutation-capable work captures base revision and fails closed when stale.
10. Operation IDs remain idempotent across retry/restart.
11. Remotion remains the master renderer.
12. HyperFrames remains behind its accepted adapter/service.
13. video-use and FFmpeg/ffprobe remain behind bounded adapters/services.
14. Runtime/user media remains under `VIDEO_OS_DATA_ROOT`.
15. Default server security remains loopback-first.
16. `REUSE > MODIFY > CREATE` remains a permanent product principle.

---

# 5. V2.4 Core Architecture

V2.4 introduces a production orchestration layer above the accepted V2.3.1 control layer:

```text
Production Workspace
        ↓
Production Mission Service
        ↓
Production Planner
        ↓
Mission Step Graph / Checkpoints
        ↓
Agent Session + Tool Registry
        ↓
Existing application services
        ↓
Workflow / Durable Jobs / Project Commands
        ↓
QA Evaluator
        ↓
Repair Proposal / Next Mission Step
        ↓
Final Review / Export
```

The architecture must be additive. Existing Project, Workflow, Job, Agent Session, Proposal, ProjectMutationCoordinator and renderer/runtime contracts remain authoritative.

---

# 6. Production Mission

## 6.1 Purpose

A Production Mission represents **what the user wants completed**, not how the Project is stored.

Conceptual schema:

```ts
type ProductionMission = {
  id: string;
  projectId: string;
  title: string;
  brief: string;
  target: {
    platform?: "facebook" | "instagram" | "tiktok" | "youtube" | "generic";
    format?: "talking-head" | "product-ad" | "case-study" | "explainer" | "custom";
    targetDurationSeconds?: number;
    exportProfileId?: string;
    language?: string;
  };
  autonomyPolicy: MissionAutonomyPolicy;
  baseProjectRevision: number;
  status:
    | "draft"
    | "planning"
    | "ready"
    | "running"
    | "waiting-review"
    | "blocked"
    | "completed"
    | "cancelled"
    | "failed";
  planId?: string;
  activeStepId?: string;
  qaReportIds: string[];
  createdAt: string;
  updatedAt: string;
};
```

Exact fields may evolve during B0 implementation, but semantic boundaries above are fixed.

## 6.2 Persistence

Mission persistence must live outside `project.json`, under a dedicated runtime repository/service beneath `VIDEO_OS_DATA_ROOT`.

Example semantic layout:

```text
VIDEO_OS_DATA_ROOT/
  projects/<projectId>/production/
    missions/<missionId>/mission.json
    plans/<planId>.json
    qa/<qaReportId>.json
```

Do not bake these paths into public product semantics; use repositories/adapters.

## 6.3 Mission truth rules

A Mission may reference:

- Project revision;
- Agent Session IDs;
- Proposal IDs;
- WorkflowRun IDs;
- Durable Job IDs;
- Asset IDs;
- Skill IDs;
- QA report IDs.

A Mission must never duplicate the full Project, Workflow or Job state.

---

# 7. Production Planner

## 7.1 Purpose

The Production Planner converts a Mission brief and bounded current Project context into an inspectable production plan.

Target sequence:

```text
Mission brief
→ inspect current Project / Script / Scenes / Assets / Workflow state
→ determine production gaps
→ select reusable skills/assets/services
→ create ordered plan
→ mark review checkpoints
→ execute allowed steps
```

## 7.2 Plan model

Conceptual shape:

```ts
type ProductionPlan = {
  id: string;
  missionId: string;
  projectId: string;
  baseProjectRevision: number;
  summary: string;
  assumptions: string[];
  steps: ProductionPlanStep[];
  createdAt: string;
  status: "draft" | "approved" | "running" | "completed" | "stale";
};

type ProductionPlanStep = {
  id: string;
  kind:
    | "analyze-media"
    | "analyze-script"
    | "rough-cut"
    | "visual-plan"
    | "asset-match"
    | "caption"
    | "motion"
    | "audio"
    | "render-preview"
    | "qa"
    | "repair"
    | "final-render"
    | "review";
  title: string;
  dependencies: string[];
  execution: "agent" | "workflow" | "job" | "human-review";
  risk: "low" | "medium" | "high";
  status: "pending" | "running" | "waiting" | "completed" | "failed" | "skipped";
  evidenceRefs: string[];
};
```

## 7.3 Planning constraints

- Planner uses bounded application context, not repository/filesystem access.
- Planner prefers existing Skills, existing Assets and existing services.
- Planner must not invent executable shell commands.
- Planner output is schema validated.
- Planner cannot mark real work complete without accepted Job/Workflow/Project evidence.
- Planner must identify when a step requires human review under the active autonomy policy.
- If base Project revision becomes stale, mutation-dependent plan steps must re-evaluate before execution.

---

# 8. Asset Intelligence

## 8.1 Goal

V2.4 must let the system answer:

> What assets do I already have, what do they contain, and which asset best supports this exact line/scene/goal?

Asset Intelligence is metadata and indexing over existing Project assets. It does not create a second media store by default.

## 8.2 Asset semantic record

Possible normalized metadata:

```text
assetId
kind
source duration / dimensions / fps
people / faces when available
objects / product
location / environment
shot type
camera movement
speech/topic summary
visual quality flags
orientation
usable time ranges
emotion / energy
brand/product relevance
script/scene relevance
analysis provenance
analysis version
```

No single detector/model is mandated by this PRD.

## 8.3 Safety

- raw media is processed through accepted media/services;
- absolute machine paths are not exposed to providers when logical IDs suffice;
- provider upload of raw media is never implicit;
- semantic index entries are treated as derived metadata, not Project truth;
- stale/failed analysis must be detectable;
- Project asset deletion/update must invalidate relevant derived intelligence.

## 8.4 Retrieval

The Agent should gain bounded tools such as:

```text
search_project_assets
get_asset_analysis
find_assets_for_scene
find_assets_for_script_range
```

Tool results return logical IDs, summaries and confidence/evidence—not raw filesystem access.

---

# 9. Reusable Video Skills

## 9.1 Purpose

A Video Skill is a reusable production recipe that captures proven production knowledge so the Agent does not reason from zero every time.

Examples:

```text
Talking Head Hook
B2B Proof Card
Numeric Evidence Emphasis
Problem → Cost → Proof → CTA Ad
Case Study Sequence
Product Parameter Showcase
Caption Emphasis
Clean B-roll Insert
```

## 9.2 Skill model

A Skill may define:

```text
stable skill ID + version
description / intended use
preconditions
required input context
recommended Scene types
asset requirements
caption rules
motion/component preferences
HyperFrames recipe references
Remotion component references
execution steps
QA checks
risk classification
fallback behavior
```

Skills are **declarative reusable production knowledge**, not arbitrary executable code supplied by the model.

## 9.3 Skill precedence

Always follow:

```text
REUSE existing accepted Skill
→ MODIFY through explicit versioned change
→ CREATE new Skill only when needed
```

Mission execution records which skill/version influenced a result.

## 9.4 Storage

Initial V2.4 may support repository-shipped built-in Skills plus runtime/user-defined Skills behind a dedicated validated store. Do not persist arbitrary code snippets as executable Skill bodies.

---

# 10. Controlled Autonomy

V2.3 Core required explicit user confirmation for durable edits. V2.4 introduces a narrowly-scoped autonomy policy rather than removing safety boundaries.

## 10.1 Modes

Conceptual modes:

```text
assist
  every durable change waits for confirmation

guided
  low-risk grouped edits may execute; scene/phase checkpoints require confirmation

auto
  approved low/medium-risk plan steps may execute; high-risk checkpoints require confirmation

full-production
  executes the approved Mission plan automatically and stops only at declared high-risk/final-review checkpoints
```

Exact naming may change during UX design.

## 10.2 Autonomy is permission, not mutation authority

Even in full-production mode:

```text
Agent decision
→ validated tool/service request
→ revision / idempotency checks
→ existing mutation/service path
```

Never:

```text
Agent decision
→ raw project.json write
```

## 10.3 Risk policy

Examples of low-risk work:

- read-only analysis;
- asset semantic search;
- preview render;
- QA analysis;
- non-mutating Workflow inspection.

Examples requiring stricter policy:

- script deletion/rewrite;
- destructive clip removal;
- changing manually locked/approved edits;
- brand-wide style changes;
- final publish/export decision when configured as checkpoint;
- operations on a stale Project revision.

The application owns risk classification. The provider/model does not self-declare unrestricted permission.

## 10.4 Manual edit protection

V2.4 must protect human-approved/manual work.

At minimum the planner/executor must distinguish:

```text
AI-owned / generated
human-modified
explicitly locked / preserved
```

If an operation would overwrite protected work, it must fail closed or enter review according to policy.

---

# 11. Self-QA and Repair Loop

## 11.1 Goal

V2.4 must evaluate actual production outputs, not merely assume success because JSON/Jobs completed.

QA sources may include:

- Project semantic checks;
- transcript/script checks;
- timeline/scene checks;
- ffprobe / media technical checks;
- video-use QA capabilities;
- rendered-frame inspection;
- deterministic marketing/brand rules;
- bounded provider-based visual/content assessment where explicitly allowed.

## 11.2 QA dimensions

Minimum categories:

```text
Technical
Content
Visual
Brand
Marketing / Goal alignment
```

Example checks:

### Technical

- H.264/AAC/export profile correctness;
- non-zero duration/fps;
- no unexpected black/blank output;
- audio presence when required;
- dimensions match resolved Export Profile;
- no render/process residue.

### Content

- caption/script consistency;
- missing/duplicated transcript spans;
- CTA presence when required;
- required proof points present.

### Visual

- captions within safe/readable bounds;
- speaker not unintentionally obscured;
- B-roll relevance;
- scene pacing;
- visual-treatment continuity.

### Brand

- Brand / Linked Style compliance;
- forbidden colors/fonts/layouts where configured;
- consistent product identity.

### Marketing / Goal

- hook present early when Mission requires it;
- important proof/data visually emphasized;
- CTA aligned with Mission brief;
- output duration/platform alignment.

## 11.3 QA report

Conceptual result:

```ts
type ProductionQAReport = {
  id: string;
  missionId: string;
  projectId: string;
  projectRevision: number;
  renderJobId?: string;
  status: "pass" | "repair-recommended" | "fail";
  scores?: Record<string, number>;
  findings: QAFinding[];
  createdAt: string;
};
```

A QA score is advisory unless the active Mission defines an explicit threshold contract.

## 11.4 Repair

QA findings must map to bounded repair proposals/steps.

```text
QA finding
→ identify owning Scene/Clip/Style/Workflow step
→ generate minimal repair proposal
→ autonomy/risk check
→ revision check
→ apply through existing path
→ re-render only what acceptance requires
→ re-run relevant QA
```

V2.4 must avoid full-project regeneration when a local repair is sufficient.

Repair loops require budgets to prevent infinite autonomous cycles.

---

# 12. Mission Execution State Machine

A Mission executor/orchestrator must be deterministic at the application level even when provider reasoning is nondeterministic.

Illustrative flow:

```text
DRAFT
→ PLANNING
→ READY
→ RUNNING
    ├─ step executes
    ├─ durable evidence captured
    ├─ checkpoint may pause
    ├─ failure may retry within policy
    └─ stale revision may re-plan
→ QA
    ├─ PASS → FINAL REVIEW / COMPLETE
    └─ REPAIR → bounded repair loop → QA
```

Required properties:

- restart/reopen safe;
- no duplicated completed Job/Apply because of retry;
- explicit step statuses;
- evidence references;
- cancellation;
- bounded retries;
- stale Project detection;
- recoverable blocked state;
- no hidden continuation after user cancellation.

---

# 13. Mission ↔ Workflow Integration

Mission is not a replacement Workflow engine.

Correct relationship:

```text
Mission says WHY / WHAT outcome
Production Plan says WHAT sequence
Workflow says durable orchestration of accepted production stages
Job says concrete long-running execution
Project says durable edit result
```

Mission steps may:

- inspect Workflow status;
- create/request accepted WorkflowRuns;
- request retry/resume through existing Workflow services;
- reference Workflow artifacts;
- wait for review checkpoints;
- request final render through accepted render Job path.

Mission code must not:

- edit Workflow JSON manually;
- spoof Stage completion;
- invent completed Job evidence;
- directly spawn FFmpeg/Remotion/HyperFrames/video-use;
- bypass Workflow/Job durability.

---

# 14. Mission ↔ Agent Integration

A Mission may own or reference one or more Agent Sessions.

Agent remains responsible for:

- interpreting the current Mission step;
- bounded reasoning over context;
- allow-listed tools;
- generating proposals/explanations;
- interacting with Skills and Asset Intelligence.

Mission orchestrator remains responsible for:

- step lifecycle;
- autonomy policy;
- risk/checkpoint enforcement;
- retry budgets;
- durable evidence;
- deciding whether the Mission may advance.

Do not make model-generated free text the Mission state machine.

---

# 15. Provider / Tool Extensions

V2.4 extends the existing provider-neutral V2.3 tool registry.

Potential new read tools:

```text
get_mission
get_production_plan
get_step_status
search_project_assets
get_asset_analysis
list_video_skills
get_video_skill
get_latest_qa_report
```

Potential bounded request/proposal tools:

```text
propose_production_plan
propose_skill_application
propose_repair
request_preview_render
request_qa
request_workflow_action
```

Forbidden classes remain:

- raw shell;
- raw PowerShell/bash;
- arbitrary filesystem access;
- arbitrary Git;
- arbitrary unrestricted network fetch;
- direct Project JSON write;
- direct engine process invocation.

Every new tool requires stable ID, input/output schema, read/proposal/request classification, revision behavior, idempotency behavior, risk classification and confirmation/autonomy policy.

---

# 16. Production Workspace UX

V2.4 should extend Studio instead of creating a disconnected second application.

Target top-level production experience:

```text
Production Workspace
├─ Mission
├─ Plan
├─ Agent
├─ Assets
├─ Skills
├─ QA
└─ Workflow / Jobs
```

The user should be able to see:

- Mission goal;
- current step;
- overall progress;
- autonomy mode;
- what the system is doing now;
- what evidence was produced;
- what is waiting for review;
- what failed and whether it is retryable;
- latest QA findings;
- final render readiness.

The UI must not expose hidden model chain-of-thought. Show concise rationale, action summaries, structured evidence and normalized errors.

---

# 17. Production Dashboard Boundary

A dashboard becomes useful only after one-video Mission execution is proven.

Initial dashboard may show:

```text
Mission
Project
status
current step
progress
last QA status
blocking review
recent Job
final output
```

Campaign/batch orchestration is deferred until B6 acceptance proves one-video autonomous production.

---

# 18. Campaign / Batch Production

Campaign support is a late V2.4 workstream, not the first implementation target.

Conceptually:

```text
Campaign
├─ shared Brand / Skills / Asset Library / export policy
├─ Mission A → Project A / Workflow / Jobs
├─ Mission B → Project B / Workflow / Jobs
└─ Mission C → Project C / Workflow / Jobs
```

Campaign must never collapse multiple videos into one competing Project/Workflow truth.

Minimum batch safety:

- bounded concurrency;
- per-Mission isolation;
- per-Project revision truth;
- per-Job durability;
- cancellation isolation;
- failure isolation;
- explicit resource limits.

---

# 19. Security and Privacy

V2.4 increases autonomous orchestration, so least-privilege boundaries must become stricter, not looser.

Minimum requirements:

1. Mission autonomy never grants generic computer access.
2. Provider receives only required bounded context.
3. Raw media is not automatically uploaded to a remote provider.
4. Asset semantic metadata must not expose unnecessary machine paths.
5. Tool args/results remain schema validated.
6. Unknown tool IDs fail closed.
7. Provider-generated IDs/paths are untrusted.
8. API keys remain server-side and never enter Mission/Project/session/QA persistence.
9. Autonomy policy is enforced by application code, not provider self-assertion.
10. Cancellation must stop future Mission advancement.
11. Remote asset origin remains blocked by default unless explicitly allowed through accepted security configuration.
12. Human-protected edits must not be silently overwritten.

---

# 20. Observability / Audit

A Mission must retain enough operational metadata to explain what happened without storing hidden model reasoning.

At minimum:

```text
missionId
projectId
planId
plan version / baseProjectRevision
autonomy policy
step IDs + statuses
Agent Session / turn IDs used by steps
provider/model identifiers without secrets
Skill IDs/versions
Asset IDs selected
Proposal / Apply operation IDs
WorkflowRun IDs
Durable Job IDs
QA report IDs
retry counts
review decisions
timestamps
normalized failures
final output reference
```

Every durable edit should remain traceable to the Mission/Plan/Proposal/operation that caused it.

---

# 21. Resource / Budget Controls

Autonomous production must be bounded.

Mission-level budgets should cover:

- max plan steps;
- max Agent turns;
- max provider calls;
- max repair loops;
- max render attempts;
- max Workflow retries;
- max wall-clock runtime where practical;
- cancellation signal;
- batch concurrency when Campaign support exists.

Budget exhaustion must produce a durable blocked/failed state rather than an infinite loop.

---

# 22. V2.4 Delivery Sequence

Authoritative sequence:

```text
R0  V2.4 Repository / PRD / Runtime Truth Sync
↓
B0  Production Mission Contracts + Store
↓
B1  Production Planner + Mission Step Graph
↓
B2  Asset Intelligence + Semantic Retrieval
↓
B3  Reusable Video Skills
↓
B4  Self-QA + Repair Proposals
↓
B5  Controlled Autonomy + Mission Executor + UX
↓
B6  End-to-End Autonomous Real Video Acceptance
↓
B7  Campaign / Batch Production + Production Dashboard
↓
V2.4 Release
```

B7 may be split or deferred if B6 proves that campaign scope would destabilize the one-video production core.

---

# 23. Workstream Acceptance Summary

## R0 — Planning truth

- Master PRD + Development Plan committed;
- governance/status docs updated;
- V2.3.1 immutable release truth preserved;
- Project Schema/pins unchanged;
- no product behavior changes.

## B0 — Mission contracts/store

- typed Mission schema/repository/service;
- separate persistence outside Project;
- atomic/path-safe writes;
- restart/reopen;
- no Project duplication.

## B1 — Planner

- validated Plan/Step schemas;
- bounded context;
- dependency/checkpoint model;
- stale revision behavior;
- deterministic mock planner/provider tests.

## B2 — Asset Intelligence

- semantic asset records;
- invalidation rules;
- bounded search tools;
- real local media analysis acceptance where required.

## B3 — Skills

- typed/versioned Skill schema/registry;
- built-in skills;
- Agent discovery/application;
- no arbitrary executable code.

## B4 — QA

- technical/content/visual/brand/goal findings;
- actual rendered-output evidence;
- repair proposals;
- bounded repair loop.

## B5 — Controlled autonomy

- autonomy policies enforced by application code;
- low/medium/high risk boundaries;
- Mission executor restart/idempotency/cancel;
- human-protected edits respected;
- Production Workspace UX.

## B6 — End-to-end acceptance

A real talking-head/product-ad Mission must prove:

```text
real brief
+ real source video
+ real Project
→ Mission
→ Plan
→ Agent / Skills / Asset selection
→ video-use / Workflow / Durable Jobs
→ Project edits
→ HyperFrames where selected
→ Remotion final render
→ QA
→ at least one bounded repair scenario
→ final H.264/AAC MP4
```

Mandatory evidence includes:

- exact tested SHA;
- Mission/Plan/Session/Proposal/Workflow/Job IDs;
- Project revisions;
- autonomy/checkpoint decisions;
- QA report and repair evidence;
- ffprobe;
- representative encoded frames;
- restart/reopen proof;
- no duplicate mutation;
- no orphan/temp/lock residue.

## B7 — Campaign/batch

Only after B6 passes:

- multiple isolated Missions;
- bounded concurrency;
- shared reusable assets/skills/brand references;
- failure/cancel isolation;
- production dashboard.

---

# 24. Exact Local Acceptance Requirements

GPT Web + GitHub remains responsible for all cloud-safe architecture/code/tests/PR/CI work.

Local Codex is required only when correctness genuinely depends on:

- Windows process/restart behavior;
- real browser UX;
- real source media/codecs;
- FFmpeg/ffprobe;
- video-use;
- HyperFrames;
- Remotion/Chromium;
- real provider API/network when provider behavior is in scope;
- actual encoded-video/visual QA evidence.

Every local gate must freeze an exact green SHA. Any pushed fix invalidates the frozen SHA until GPT Web reviews the new head and CI.

---

# 25. V2.4 Product Success Criteria

V2.4 Core is successful when a user can provide a real production goal and real source material and the system can:

1. persist a Mission;
2. create an understandable production plan;
3. reuse existing Project/Workflow/Job/Agent architecture;
4. select useful existing assets/skills;
5. execute approved work under a declared autonomy policy;
6. survive restart/retry without duplicate mutation;
7. protect manual/approved edits;
8. render a real final MP4;
9. inspect the actual output through QA;
10. localize and apply at least one bounded repair;
11. present final review/evidence to the user;
12. leave clean durable state and no process/temp residue.

The key V2.4 proof is not “the Agent can call more tools.”

It is:

> **Video OS Studio can responsibly complete a real video-production Mission end-to-end.**

---

# 26. Release Boundary

- `v2.3.1` is immutable and must never move or be recreated.
- V2.4 development begins only from accepted current `main` after R0 planning truth is merged.
- Do not bump package version during R0–B5.
- Final V2.4 package/tag work begins only after B6 and any release-required B7 scope are accepted.
- Project Schema remains `2.0.0` unless a separate explicit schema-migration decision is approved.
