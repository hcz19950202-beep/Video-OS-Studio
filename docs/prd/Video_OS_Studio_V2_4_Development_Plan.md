# Video OS Studio V2.4 — Autonomous Production Agent Development Plan

> This plan executes `docs/prd/Video_OS_Studio_V2_4_Autonomous_Production_Agent_Master_PRD.md`.
>
> Immutable baseline: `v2.3.1` → release commit `6e07d1dbdd0ec4d64d022f7c821e133ddf207637`.
>
> V2.4 starts as a new workstream from accepted current `main`. The V2.3.1 tag and release evidence are immutable.

---

# 1. Development Model

```text
GPT Web + GitHub
→ product/architecture decisions
→ PRD and repository truth
→ cloud-safe implementation
→ tests
→ branch / PR / CI / review / merge

Local Codex on Windows
→ only for exact-SHA gates that require
  real provider/network
  real browser
  real media/codecs
  FFmpeg/video-use/HyperFrames/Remotion
  process/restart behavior
  final encoded-video evidence
```

GitHub remains the single source of code/release truth.

One workstream = one bounded branch/PR unless this Development Plan explicitly splits a stage.

Online implementation should continue until the next unresolved requirement genuinely depends on local/live behavior.

---

# 2. Authoritative Delivery Sequence

```text
R0  Repository / PRD / Runtime Truth Sync
B0  Production Mission Contracts + Store
B1  Production Planner + Step Graph
B2  Asset Intelligence + Semantic Retrieval
B3  Reusable Video Skills
B4  Self-QA + Repair Proposals
B5  Controlled Autonomy + Mission Executor + Production Workspace
B6  End-to-End Autonomous Real Video Acceptance
B7  Campaign / Batch Production + Dashboard
Release
```

Do not begin B7 before B6 passes.

---

# 3. R0 — Repository / PRD / Runtime Truth Sync

Branch:

`planning/v2.4-autonomous-production-agent`

Scope:

- add V2.4 Master PRD;
- add this Development Plan;
- update `PROJECT_STATUS.md` to V2.4 planning active;
- update `AGENTS.md` active authoritative docs and V2.4 rules;
- update `SYSTEM.md` with Mission/Plan/QA/Autonomy boundaries;
- update `GPT_WEB_HANDOFF.md` to V2.4 ownership and handoff sequence;
- preserve V2.3.1 release truth and immutable tag;
- no product behavior changes;
- no package/dependency/schema/pin changes.

Gate:

```text
changed scope = governance / architecture docs only
v2.3.1 immutable truth preserved
Project Schema = 2.0.0
package = 2.3.1
engine/tool pins unchanged
CI green
```

Local Codex: no.

After merge:

```text
PROJECT_STATUS:
active_development_workstream = V2.4 AUTONOMOUS PRODUCTION AGENT
active_stage = B0 READY
v2_4_status = PLANNING COMPLETE / IMPLEMENTATION READY
```

---

# 4. B0 — Production Mission Contracts + Store

Suggested branch:

`feature/v2.4-b0-production-mission`

Goal:

Create the smallest durable Mission layer without changing Project Schema or duplicating Workflow/Job state.

Expected modules:

```text
lib/production/mission/schema.ts
lib/production/mission/repository.ts
lib/production/mission/service.ts
lib/production/mission/errors.ts
lib/production/mission/index.ts
```

Reuse:

- `VIDEO_OS_DATA_ROOT` path conventions;
- safe-path helpers;
- accepted bounded Windows atomic replacement helper;
- repository durability patterns;
- ProjectRepository for referenced Project truth only.

Deliver:

- `ProductionMissionSchema`;
- Mission target/output brief schema;
- `MissionAutonomyPolicySchema` initial contract;
- Mission lifecycle statuses;
- Mission repository outside `project.json`;
- create/load/list/update/cancel APIs at service level;
- references to Project/Session/Workflow/Job IDs without copying their state;
- base Project revision capture;
- atomic persistence;
- crash-tail/partial-write failure handling consistent with accepted repository patterns;
- path traversal rejection.

Cloud tests:

- schema valid/invalid cases;
- mission create/reopen/list;
- Project remains unchanged;
- restart/repository reconstruction preserves Mission;
- malformed durable Mission fails closed;
- atomic write retry contract reused;
- no absolute machine path leakage in public Mission payload;
- cancellation terminal-state behavior;
- stale/missing Project handling is normalized.

Gate:

```text
format/lint/typecheck/unit/build PASS
Project Schema unchanged
no second Workflow/Job implementation
CI green
```

Local Codex: normally no. Real Windows lock semantics are already accepted at V2.3.1; run local only if B0 changes the shared atomic layer.

---

# 5. B1 — Production Planner + Mission Step Graph

Suggested branch:

`feature/v2.4-b1-production-planner`

Goal:

Convert a Mission + bounded Project context into a validated, inspectable execution plan.

Expected modules:

```text
lib/production/plan/schema.ts
lib/production/plan/repository.ts
lib/production/planner/context.ts
lib/production/planner/service.ts
lib/production/planner/mock-planner.ts
```

Prefer reusing the V2.3 provider-neutral Agent/provider stack instead of creating a separate provider architecture.

Deliver:

- `ProductionPlanSchema`;
- `ProductionPlanStepSchema`;
- dependency graph validation;
- allowed step kinds;
- risk classification;
- execution owner classification (`agent`, `workflow`, `job`, `human-review`);
- evidence reference contract;
- plan version/base Project revision;
- stale-plan behavior;
- deterministic mock planning fixtures;
- planner service that produces plan proposals, not direct Project mutations.

Planning context includes only bounded accepted truth:

```text
Mission brief
Project metadata/revision/canvas
Script/Scenes
selected/manual protected state when available
Asset metadata
Visual Plan summary
Workflow status
available Skills summary when B3 exists
```

Cloud tests:

- plan schema validation;
- cyclic dependency rejected;
- unknown step kind rejected;
- high-risk checkpoint cannot silently downgrade itself;
- plan generated at revision N becomes stale when required mutation context reaches N+1;
- no arbitrary tool/process/path instructions in normalized plan;
- deterministic mock planner ordering;
- planner failure leaves Project/Mission durable state recoverable.

Local Codex: no.

---

# 6. B2 — Asset Intelligence + Semantic Retrieval

Suggested branch:

`feature/v2.4-b2-asset-intelligence`

Goal:

Make existing media assets searchable by production meaning rather than file name only.

Expected modules may include:

```text
lib/assets/intelligence/schema.ts
lib/assets/intelligence/repository.ts
lib/assets/intelligence/service.ts
lib/assets/intelligence/retrieval.ts
lib/ai/tools/asset-tools.ts
```

Deliver:

- typed derived asset-analysis record;
- provenance/versioning;
- semantic tags/summaries;
- usable ranges where analysis supports them;
- invalidation when asset identity/content changes;
- bounded search by Scene/script/production need;
- Agent tool integration returning logical asset IDs and summaries;
- no implicit remote raw-media upload.

Cloud-safe work first:

- schemas;
- repository/index contracts;
- deterministic analyzer fixtures;
- retrieval ranking tests;
- invalidation tests;
- path/privacy tests;
- Agent tool input/output validation.

Potential real analyzers:

- existing video-use capability;
- ffprobe metadata;
- deterministic local frame/media analysis;
- provider-assisted semantic analysis only behind explicit bounded adapter if approved.

Mandatory Local Codex gate if B2 claims real media intelligence:

```text
exact green SHA
→ real local video(s)
→ actual analysis service
→ durable semantic metadata
→ retrieval by real Scene/script need
→ selected logical asset IDs match evidence
→ no raw-media/provider/path leakage
→ restart/reopen
```

If implementation remains deterministic/mock-only in B2, do not claim real-media acceptance until local proof exists.

---

# 7. B3 — Reusable Video Skills

Suggested branch:

`feature/v2.4-b3-video-skills`

Goal:

Represent proven editing/production recipes as typed, versioned, reusable knowledge.

Expected modules:

```text
lib/production/skills/schema.ts
lib/production/skills/registry.ts
lib/production/skills/builtin/*.ts-or-json
lib/ai/tools/skill-tools.ts
```

Initial built-in Skills should be deliberately small and high-value. Suggested first set:

```text
talking-head-hook
b2b-proof-card
numeric-evidence-emphasis
clean-broll-insert
problem-proof-cta-ad
caption-emphasis
```

Each Skill must define:

- stable ID;
- version;
- intended use;
- preconditions;
- required context;
- execution recipe references;
- allowed services/components;
- QA checks;
- risk policy;
- fallback behavior.

Skills must not contain provider-generated arbitrary executable code.

Cloud tests:

- registry uniqueness;
- version parsing;
- invalid Skill rejected;
- required inputs enforced;
- Agent can discover relevant Skills through allow-listed tool;
- Skill selection/application produces proposal/request objects, not direct mutation;
- Mission/Plan evidence records Skill ID/version;
- `REUSE > MODIFY > CREATE` behavior can be asserted where deterministic.

Local Codex: no unless a Skill explicitly claims real HyperFrames/Remotion output behavior not already covered by existing adapters.

---

# 8. B4 — Self-QA + Repair Proposals

Suggested branch:

`feature/v2.4-b4-self-qa`

Goal:

Evaluate actual production results and create bounded repair proposals instead of trusting completed Jobs blindly.

Expected modules:

```text
lib/production/qa/schema.ts
lib/production/qa/repository.ts
lib/production/qa/service.ts
lib/production/qa/checks/technical.ts
lib/production/qa/checks/content.ts
lib/production/qa/checks/visual.ts
lib/production/qa/checks/brand.ts
lib/production/qa/checks/goal.ts
lib/production/qa/repair.ts
```

Deliver:

- `ProductionQAReportSchema`;
- `QAFindingSchema` with severity/evidence/target references;
- deterministic technical QA;
- script/caption consistency checks where possible;
- Mission goal requirement checks;
- rendered-output evidence references;
- repair proposal generation;
- repair-loop budget contract;
- no automatic mutation in B4 unless execution path is explicitly part of accepted B5 autonomy.

Technical QA must reuse actual accepted media truth where possible:

```text
ffprobe / export profile
render Job output
Project revision
asset/render metadata
```

Cloud tests:

- H264/export mismatch detection;
- missing audio when required;
- zero/invalid duration;
- missing CTA/proof requirement fixture;
- duplicate/missing caption fixtures;
- finding → targeted repair proposal;
- repair cannot target stale Project without revision guard;
- QA report persists/reopens;
- repair-loop max budget.

Mandatory Local Codex gate for claims about actual encoded video/visual QA:

```text
real MP4
→ actual ffprobe
→ real rendered frames/media analysis path
→ QA report with evidence
→ one intentionally bad fixture detected
→ one corrected output passes relevant checks
```

Do not claim general visual-quality intelligence beyond demonstrated evidence.

---

# 9. B5 — Controlled Autonomy + Mission Executor + Production Workspace

Suggested branch:

`feature/v2.4-b5-controlled-autonomy`

This is the largest V2.4 Core workstream and may be split into B5a/B5b/B5c only if PR size becomes unsafe:

```text
B5a Mission Executor / risk policy
B5b autonomy + protected-edit boundary
B5c Production Workspace UX
```

Any split must preserve one authoritative B5 contract and sequential merge order.

## B5a Mission Executor

Expected modules:

```text
lib/production/executor.ts
lib/production/risk-policy.ts
lib/production/checkpoints.ts
lib/production/budget.ts
lib/production/service.ts
```

Executor responsibilities:

- load Mission/Plan latest durable state;
- identify next runnable step;
- enforce dependencies;
- enforce risk/autonomy policy;
- call bounded Agent/Workflow/Job/application services;
- persist evidence refs;
- advance only after real evidence;
- retry only within declared policy;
- stop on cancel;
- stop/re-plan when stale;
- survive restart;
- never duplicate successful Apply/Job requests under retry.

## B5b Controlled autonomy

Implement explicit modes/policies with application-owned risk classification.

Required proofs:

- Assist: durable change waits for confirmation;
- Guided/Auto: allowed low-risk operations may advance without per-operation click;
- high-risk operations still checkpoint;
- full-production never gains raw computer access;
- stale revision fails closed;
- manual/protected edits cannot be silently overwritten;
- cancellation prevents later queued advancement;
- same confirmed/executable operation retry remains idempotent.

Manual/protected edit semantics must be explicit. Reuse existing metadata/operation provenance if sufficient; do not add Project Schema fields casually. If the accepted Project model cannot express the needed protection without schema change, stop and create a separate schema-migration decision before proceeding.

## B5c Production Workspace UX

Extend existing Studio/AI Workspace.

Target surfaces:

```text
Mission header / goal
Plan step list
current activity
progress
Autonomy mode control
review checkpoints
Agent conversation
Assets / selected evidence
Skills used
QA findings
Workflow / Job links
final render readiness
```

Required UX states:

```text
planning
ready
running
waiting review
blocked
retrying
repairing
qa pass/fail
cancelled
completed
```

Do not show hidden chain-of-thought.

Cloud tests:

- mission executor deterministic service tests;
- risk-policy matrix;
- cancellation;
- restart/reconstruction;
- duplicate retry/idempotency;
- stale revision;
- checkpoint behavior;
- API route contracts;
- Playwright with deterministic provider/workflow/job fixtures;
- UI accurately reflects durable Mission truth after reload.

Mandatory Local Codex gate:

- real Windows/browser;
- real provider only if provider reasoning is required by the chosen fixture;
- real Project + media;
- run Mission through multiple steps;
- one checkpoint;
- one restart/reopen;
- one cancel or blocked/retry scenario;
- no duplicate mutation/Job;
- clean processes/residue.

---

# 10. B6 — End-to-End Autonomous Real Video Acceptance

Suggested branch:

`release/v2.4-core-acceptance`

B6 is the decisive V2.4 Core gate.

Do not add new product scope during acceptance.

Cloud acceptance first:

- exact branch tests;
- format/lint/typecheck/unit/build;
- browser deterministic Mission acceptance;
- route/API contracts;
- persisted Mission/Plan/QA/restart tests;
- idempotency/risk/cancel tests.

Then freeze exact green SHA for Local Codex.

## Mandatory real acceptance case A — Talking-head production Mission

Input:

- real talking-head video with audio;
- real script/transcript path;
- Mission brief with clear target, duration/style/CTA/proof expectations.

Must prove:

```text
Mission
→ Production Plan
→ real asset/script context
→ Agent + Skills
→ workflow/jobs
→ Project mutations
→ render
→ QA
→ final MP4
```

## Mandatory case B — Self-QA repair

Create or naturally encounter one bounded QA defect that the system can repair safely.

Proof:

```text
QA detects finding
→ repair proposal/step
→ autonomy/checkpoint policy
→ revision-safe minimal repair
→ re-render/re-check
→ finding resolved
```

## Mandatory case C — Human protection / stale change

During Mission execution:

- introduce a manual edit or revision drift;
- prove the Mission does not silently overwrite protected/stale truth;
- re-plan/review appropriately;
- no duplicate mutation.

## Mandatory case D — Restart / interrupted execution

- stop/restart app/runtime mid-Mission;
- Mission/Plan/Session/Workflow/Job evidence persists;
- completed steps are not repeated incorrectly;
- active interrupted Jobs follow accepted recovery semantics;
- Mission resumes/blocks deterministically.

## Mandatory case E — Final encoded media

Final result must be inspected as actual media:

- H.264 video;
- AAC audio when source/mission requires audio;
- resolved Export Profile dimensions;
- fps/duration > 0;
- front/middle/back visual frame proof;
- captions/visual treatment encoded when planned;
- not black/empty;
- actual CTA/proof/goal evidence as required by Mission;
- no `.props.json`, `.hf-work`, tmp, stale locks or orphan engines.

## B6 acceptance record

Capture:

```text
Exact SHA
Mission ID
Plan ID + step IDs/statuses
Autonomy policy
Project ID/revisions
Agent Session/turn IDs
Skill IDs/versions
Asset IDs/analysis refs
Proposal/Apply operation IDs
WorkflowRun IDs
Durable Job IDs
QA Report IDs/findings
repair evidence
review decisions
final MP4 + ffprobe
encoded frame evidence
restart/recovery evidence
cleanup
```

Only B6 PASS allows campaign/batch work to begin.

---

# 11. B7 — Campaign / Batch Production + Production Dashboard

Suggested branch:

`feature/v2.4-b7-campaign-production`

This workstream begins only after B6 is accepted on `main`.

Scope:

- Campaign schema/store referencing isolated Missions;
- shared Brand/Skill/Asset collection references;
- bounded Mission concurrency;
- queue/resource limits;
- per-Mission cancel/failure isolation;
- dashboard showing Mission production state;
- batch retry semantics;
- no shared mutable Project truth between outputs.

Campaign conceptual model:

```text
Campaign
  shared references / policy
  ├─ Mission A → Project A → Workflow/Jobs
  ├─ Mission B → Project B → Workflow/Jobs
  └─ Mission C → Project C → Workflow/Jobs
```

Tests:

- N Missions isolated;
- one failure does not corrupt others;
- one cancel does not kill others;
- concurrency limit honored;
- duplicate enqueue/idempotency;
- dashboard reload uses durable state;
- Campaign deletion/archival rules do not delete Projects implicitly unless separately designed and confirmed.

Local Codex acceptance:

Run a small real batch, e.g. 2–3 short videos, when actual resource/process isolation is part of the acceptance claim.

If B7 destabilizes the accepted B6 single-video core, defer B7 to V2.4.x/V2.5 rather than weakening the core release.

---

# 12. Testing Strategy

Every workstream uses the current repository baseline:

```text
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Browser-impacting work:

```text
npm run test:e2e
```

Media/Windows-impacting work follows the accepted Windows Media Smoke and exact-SHA local evidence model.

Every reasonably testable defect requires a regression test.

Never use local acceptance to replace deterministic cloud tests when the behavior can be tested in CI.

---

# 13. Migration Rules

V2.4 begins with Project Schema `2.0.0`.

Mission, Plan, QA, Skill registry state and Campaign state should initially live outside Project JSON.

If a workstream determines that a Project Schema change is truly necessary:

1. stop that workstream before silently changing schema;
2. document why runtime/external metadata cannot express the required semantics;
3. define explicit schema migration/versioning/backward compatibility;
4. create a dedicated migration PR/workstream;
5. rerun affected acceptance.

No incidental schema bump.

---

# 14. Dependency / Engine Rules

Accepted pins remain unchanged unless a workstream has a justified dependency-change gate:

```text
Node 24.x
Remotion 4.0.513
HyperFrames 0.8.10
Playwright 1.62.1
Project Schema 2.0.0
```

Do not upgrade engines while implementing unrelated V2.4 product features.

New libraries require explicit justification and lockfile review.

---

# 15. Security / Autonomy Stop Rules

Immediately stop and reject any implementation direction that requires:

- generic shell access for the production Agent;
- generic filesystem tools;
- direct provider-generated Project writes;
- unvalidated provider paths/IDs;
- hidden bypass of Review/Autonomy policy;
- arbitrary remote media upload;
- provider-owned risk classification overriding application policy;
- second Workflow/Job systems;
- autonomous infinite repair/retry loops.

A production Agent is allowed to be more autonomous only through **more explicit application contracts**, not fewer.

---

# 16. GPT Web → Local Codex Handoff Rules

Every local handoff must name:

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
Provider-secret setup rules when relevant
Commands
Fixtures
Manual actions
Acceptance gates
Evidence to capture
Stop rule
Return format
```

Codex must verify exact SHA before testing.

If Codex pushes a fix, the prior local acceptance freeze is invalid. GPT Web reviews the new branch head + CI before local acceptance resumes.

Codex never merges and never starts the next workstream.

---

# 17. Status Progression

Expected `PROJECT_STATUS.md` stages:

```text
R0 PLANNING ACTIVE
→ B0 MISSION CONTRACTS
→ B1 PRODUCTION PLANNER
→ B2 ASSET INTELLIGENCE
→ B3 VIDEO SKILLS
→ B4 SELF-QA
→ B5 CONTROLLED AUTONOMY
→ B6 CORE ACCEPTANCE
→ B7 CAMPAIGN/BATCH (if retained for V2.4 release)
→ RELEASE FINALIZATION
→ V2.4 RELEASED
```

The status file must always distinguish:

- released immutable truth;
- currently active branch/PR;
- cloud verification state;
- local-action requirement;
- next action.

---

# 18. Release Boundary

- Never move or recreate `v2.3.1`.
- Do not bump package version during R0–B5.
- B6 must pass before release finalization.
- If B7 is retained inside V2.4, its acceptance must also pass before final release.
- Final release flow follows the proven V2.3.1 discipline:

```text
accepted exact product SHA
→ release metadata/docs branch
→ exact-head four-gate CI
→ merge
→ final merge-commit CI
→ annotated immutable tag
→ independent tag object + dereference verification
→ post-release truth sync
```
