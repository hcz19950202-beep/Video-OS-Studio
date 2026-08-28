# Video OS Studio — GPT Web / Local Codex Handoff

> Current milestone: **V2.4 Autonomous Production Agent**  
> Current-state source of truth: [`PROJECT_STATUS.md`](PROJECT_STATUS.md)

## 1. Current truth

Repository:

```text
hcz19950202-beep/Video-OS-Studio
```

Immutable released baseline:

```text
Video OS Studio v2.3.1
Release tag: v2.3.1
Release commit: 6e07d1dbdd0ec4d64d022f7c821e133ddf207637
Annotated tag object: b91d0c3adbaef09cd5c323481ec6bb04c516dd6e
Project Schema: 2.0.0
```

V2.3.1 is closed and immutable. V2.4 is a new workstream for autonomous, inspectable end-to-end video production.

## 2. Authoritative V2.4 documents

Read after `PROJECT_STATUS.md`, `AGENTS.md` and `SYSTEM.md`:

```text
docs/prd/Video_OS_Studio_V2_4_Autonomous_Production_Agent_Master_PRD.md
docs/prd/Video_OS_Studio_V2_4_Development_Plan.md
```

V2.4 sequence:

```text
R0 Repository / PRD / Runtime Truth Sync
→ B0 Production Mission Contracts + Store
→ B1 Production Planner + Mission Step Graph
→ B2 Asset Intelligence + Semantic Retrieval
→ B3 Reusable Video Skills
→ B4 Self-QA + Repair Proposals
→ B5 Controlled Autonomy + Mission Executor + Production Workspace
→ B6 End-to-End Autonomous Real Video Acceptance
→ B7 Campaign / Batch Production + Production Dashboard
→ V2.4 Release
```

B7 must not begin before B6 proves one real autonomous video Mission end-to-end.

## 3. Product direction

V2.3.1 proved:

```text
User editing goal
→ Agent
→ Proposal / Review / Apply
→ Project / Workflow / Job truth
```

V2.4 targets:

```text
User production goal
→ Production Mission
→ Production Plan
→ Agent + Skills + Asset Intelligence
→ existing Workflow / Durable Jobs / Project mutation paths
→ actual Render
→ Self-QA
→ bounded repair
→ controlled checkpoints
→ publishable final video
```

Mission is not Project truth. Plan is not Workflow truth. QA is not Project truth.

## 4. Development model

```text
GPT Web + GitHub
    │
    ├─ product decisions / architecture / PRD
    ├─ cloud-safe implementation
    ├─ branches / PRs / CI
    ├─ schemas / services / APIs
    ├─ deterministic provider/tool/mission fixtures
    ├─ unit / route / contract / integration tests
    ├─ browser automation when cloud-safe
    └─ review + merge + PROJECT_STATUS

Local Codex on Windows
    │
    ├─ live provider/network when required
    ├─ real browser
    ├─ real media outside Git
    ├─ FFmpeg / ffprobe
    ├─ Remotion / Chromium
    ├─ HyperFrames
    ├─ video-use
    ├─ Windows process / restart recovery
    ├─ actual Mission execution
    └─ final encoded-video / QA evidence
```

GitHub remains the only code/release source of truth. The two environments never maintain competing implementations.

## 5. Online-first policy

Do not hand a workstream to Local Codex simply because implementation exists.

GPT Web continues all cloud-safe implementation/tests/CI fixes/merge work until the next unresolved gate genuinely depends on local/live behavior.

Expected ownership:

```text
R0: online only
B0: online first
B1: online only
B2: online contracts/index first; local if claiming real-media intelligence
B3: online
B4: online QA contracts first; local for real encoded/visual QA claims
B5: online executor/risk/UI/browser first; mandatory local Mission/restart gate
B6: mandatory real browser/media/engines/encoded-output exact-SHA acceptance
B7: online orchestration first; local batch/resource/process gate when claimed
```

## 6. Permanent architecture invariants

```text
Source Media != Project Canvas != Export Profile
Project != Workflow != Job
Agent Session != Project
Mission != Project
Mission != Workflow
QA Report != Project
```

And:

- Project JSON is durable editing truth;
- internal Project time is frames;
- Mission/Plan/QA live outside Project JSON;
- Project Schema stays `2.0.0` by default;
- durable edits use existing Commands / Transactions / bounded services;
- Mission/Agent/Workflow never hand-edit runtime `project.json`;
- UI/Mission/Agent/Workflow never spawn engine CLIs directly;
- long-running work preserves revision/idempotency;
- Remotion remains master renderer;
- HyperFrames/video-use/FFmpeg remain behind adapters/services;
- `VIDEO_OS_DATA_ROOT` separates runtime data from repository code;
- server remains loopback-first by default;
- `REUSE > MODIFY > CREATE`.

## 7. Controlled autonomy contract

V2.4 may run more production steps without per-action clicks, but it does not grant generic computer access.

Required execution pattern:

```text
Mission / Agent decision
→ application-owned autonomy + risk policy
→ typed allow-listed tool/service
→ expected revision / idempotency guard
→ accepted Project / Workflow / Job path
```

Forbidden:

- generic shell/PowerShell/bash;
- arbitrary filesystem;
- arbitrary Git;
- unrestricted network fetch;
- raw Project/Workflow writes;
- direct engine process spawn.

The provider cannot self-authorize unrestricted behavior or downgrade high-risk operations.

Human-modified/protected edits must not be silently overwritten.

## 8. Mission / Plan contract

Mission stores production objective and lifecycle, not full Project/Workflow/Job state.

Plan stores intended step graph with dependencies, risk, execution owner and evidence refs.

A Mission step only advances from real accepted evidence.

Model text alone cannot mark a render, Job, Workflow stage or Project mutation completed.

Cancellation prevents future autonomous advancement.

## 9. Asset Intelligence contract

Asset Intelligence provides derived semantic metadata/search over existing Project assets.

It must:

- return logical asset IDs;
- keep provenance/version/invalidation;
- avoid unnecessary absolute path exposure;
- never imply automatic raw-media upload;
- remain derived metadata rather than media truth.

## 10. Video Skills contract

Video Skills are typed, versioned, declarative reusable production recipes.

Initial high-value Skill families include:

```text
talking-head hook
B2B proof card
numeric evidence emphasis
clean B-roll insert
problem-proof-CTA ad
caption emphasis
```

Skills may reference accepted components/services but never arbitrary executable model code.

## 11. Self-QA contract

QA must inspect actual durable/rendered evidence where output correctness is claimed.

Minimum categories:

```text
technical
content
visual
brand
goal/marketing alignment
```

QA finding → bounded repair proposal/step → autonomy/review/revision checks → accepted mutation/service path → relevant re-QA.

Repair loops are budgeted. No infinite autonomous regeneration.

## 12. Existing capabilities to reuse

V2.4 reuses instead of recreating:

- Real AI Director / Agent Session runtime;
- provider-neutral adapter;
- typed Tool Registry;
- `AIWorkspacePanel` / Studio selection context;
- Proposal / Review / Apply path;
- `VisualPlanService` / Rules Director;
- Project Commands / Transactions / `ProjectMutationCoordinator`;
- Workflow Runtime;
- Durable Jobs;
- Remotion / HyperFrames / video-use / FFmpeg services;
- accepted path-safety / atomic-persistence helpers.

## 13. GPT Web workstream protocol

Before editing:

1. resolve live GitHub main/active PR/CI;
2. read current status/constitution/system/active PRD;
3. inspect existing implementation;
4. create one bounded branch;
5. implement cloud-safe scope;
6. add tests;
7. open/update PR;
8. fix CI until green;
9. run exact local gate only when required;
10. merge after all gates pass;
11. update current status and continue to the next cloud-safe workstream.

## 14. Local Codex trigger

Local evidence is required when correctness depends on:

- live provider API/network;
- Windows process semantics;
- real browser interaction;
- real media/codecs;
- FFmpeg/ffprobe;
- video-use;
- HyperFrames;
- Remotion/Chromium;
- Mission interruption/restart;
- actual encoded-video/visual QA evidence;
- batch resource/process isolation.

## 15. Exact handoff contract

Every handoff must contain:

```text
Repository
Branch
Exact frozen SHA
Active workstream
Goal
Allowed files/areas
Forbidden scope
VIDEO_OS_DATA_ROOT
Environment
Provider-secret rules when applicable
Commands
Required fixtures
Manual actions
Acceptance gates
Evidence to capture
Stop rules
Expected return format
```

Codex verifies HEAD equals supplied SHA before testing.

If Codex pushes any code/config/test/runtime fix, local acceptance stops. GPT Web reviews new HEAD + CI and freezes a new SHA before acceptance resumes.

Codex never merges and never starts the next workstream.

## 16. B6 end-to-end local proof

B6 must prove a real Mission path such as:

```text
real production brief
+ real talking-head/product source media
→ Mission
→ Plan
→ Agent / Skill / Asset selection
→ Workflow / Durable Jobs
→ Project edits
→ HyperFrames when selected
→ Remotion final render
→ QA
→ at least one bounded repair
→ final H.264/AAC MP4
```

Required evidence:

- exact tested SHA;
- Mission/Plan/Session/Proposal/Workflow/Job IDs;
- Project revisions;
- autonomy/checkpoint decisions;
- Skill/Asset evidence;
- QA finding/repair evidence;
- ffprobe + encoded frames;
- restart/reopen;
- no duplicate mutation;
- no orphan/temp/lock residue.

## 17. Release boundary

`v2.3.1` is immutable and must never move.

Do not bump V2.4 package version during R0–B5.

B6 must pass before release finalization. B7 begins only after B6 and may be deferred if it would destabilize the accepted single-video production core.

Final release follows:

```text
accepted exact product SHA
→ release metadata/docs
→ exact-head four-gate CI
→ merge
→ final merge-commit CI
→ annotated immutable tag
→ independent tag-object/dereference verification
→ post-release truth sync
```
