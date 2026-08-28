# Video OS Studio — Current Project Status

> Current-state source of truth for GPT Web, Local Codex, and other development agents. Historical PRs, commits, CI runs, and acceptance reports remain evidence; this file intentionally avoids self-referential branch-head SHAs.

## Current checkpoint

```yaml
released_product_version: 2.3.1
project_schema: 2.0.0
released_tag: v2.3.1
released_commit: 6e07d1dbdd0ec4d64d022f7c821e133ddf207637
released_tag_object_sha: b91d0c3adbaef09cd5c323481ec6bb04c516dd6e

package_json_version: 2.3.1
package_lock_version: 2.3.1

active_development_workstream: V2.4 AUTONOMOUS PRODUCTION AGENT
active_stage: B3 REUSABLE VIDEO SKILLS COMPLETE / B4 READY
active_branch: feature/v2.4-b3-video-skills / PR #70 — FINAL STATUS SYNC
local_action_required: NONE
next_action: FINAL EXACT-HEAD CI → MERGE PR #70 → EXACT-MAIN CI → START B4 SELF-QA + REPAIR PROPOSALS
v2_4_status: DEVELOPMENT ACTIVE
```

## V2.4 authoritative planning docs

```text
docs/prd/Video_OS_Studio_V2_4_Autonomous_Production_Agent_Master_PRD.md
docs/prd/Video_OS_Studio_V2_4_Development_Plan.md
```

Authoritative sequence:

```text
R0  Repository / PRD / Runtime Truth Sync
B0  Production Mission Contracts + Store
B1  Production Planner + Mission Step Graph
B2  Asset Intelligence + Semantic Retrieval
B3  Reusable Video Skills
B4  Self-QA + Repair Proposals
B5  Controlled Autonomy + Mission Executor + Production Workspace
B6  End-to-End Autonomous Real Video Acceptance
B7  Campaign / Batch Production + Production Dashboard
Release
```

B7 must not begin until B6 proves one real autonomous video Mission end-to-end.

## V2.4 milestone evidence

```text
R0 Repository / PRD / Runtime Truth Sync    → COMPLETE / PR #66 / exact-main CI #769 PASS
B0 Production Mission Contracts + Store    → COMPLETE / PR #67 / exact-main CI #781 PASS
B1 Production Planner + Mission Step Graph → COMPLETE / PR #68 / exact-main CI #792 PASS
B2 Asset Intelligence + Semantic Retrieval → COMPLETE / PR #69 / exact-main CI #825 PASS
B3 Reusable Video Skills                   → COMPLETE CANDIDATE / PR #70 / product candidate CI #833 PASS / final status-sync CI pending
B4 Self-QA + Repair Proposals              → READY
B5 Controlled Autonomy + Mission Executor  → NOT STARTED
B6 Autonomous Real Video Acceptance        → NOT STARTED
B7 Campaign / Batch Production             → NOT STARTED
```

## B0 accepted product boundary

B0 introduces a durable Production Mission layer outside `project.json`:

- strict `ProductionMission` schema with Windows-safe UUID Mission IDs;
- bounded target and autonomy-policy contracts;
- references to existing Agent Session / WorkflowRun / Durable Job IDs instead of duplicate runtime truth;
- persistence beneath `VIDEO_OS_DATA_ROOT/projects/<projectId>/production/missions`;
- atomic primary/backup persistence and durable exclusive-lock protection;
- corrupt-primary recovery with lock-time primary recheck;
- repository-path identity validation;
- cross-instance atomic read-modify-write through `repository.mutate()`;
- Project revision capture on Mission creation without Project mutation;
- bounded Mission detail updates, terminal-state guards, and idempotent cancellation.

B0 does not implement Planner, Asset Intelligence, Video Skills, QA, Mission Executor, Campaign production, Project Schema migration, dependency upgrades, or engine/runtime changes.

## B1 accepted product boundary

B1 adds a durable planning layer above Production Missions without turning Plan into Project/Workflow/Job truth:

- immutable `ProductionPlan` and `ProductionPlanStep` contracts;
- allow-listed step kinds, execution owners, risk classes, and logical evidence references;
- strict step-kind ↔ execution-owner compatibility;
- dependency uniqueness, missing-dependency rejection, self-dependency rejection, and DAG/cycle validation;
- explicit review checkpoints for high-risk and human-review steps;
- rejection of arbitrary executable command fields, machine paths, and command-like normalized Plan text;
- immutable Plan persistence beneath `VIDEO_OS_DATA_ROOT/projects/<projectId>/production/plans`;
- Mission `planId` links the current Plan while historical Plans remain immutable audit evidence;
- re-planning records `supersedesPlanId` and preserves prior Plans;
- bounded Planner context containing Mission brief/target/autonomy plus accepted Project metadata, canvas, Script summary, Scene metadata, and Asset metadata;
- Planner context excludes asset filesystem paths and original filenames;
- deterministic mock Planner fixtures;
- Project revision capture before planning and post-generation revision recheck;
- persisted Plan freshness inspection and fail-closed stale Plan behavior;
- Mission semantic compare-and-link guard prevents concurrent Mission edits or plan replacement from being overwritten;
- Planner failure leaves Project and Mission durable truth unchanged;
- Planner produces Plan proposals only and never mutates `project.json` directly.

B1 does not implement Plan execution, Asset Intelligence, Video Skills, QA/repair, controlled autonomy, campaign/batch production, Project Schema migration, dependency upgrades, or browser/media/process runtime changes.

### B1 cloud evidence

- CI #782 exposed only lint errors in newly added B1 tests; product runtime was not exercised and the test lint defects were corrected.
- CI #787 passed format/lint/typecheck and exposed only assertion-shape mismatches in B1 tests; the tested product behavior itself matched the intended optional-field and owner-contract semantics.
- CI #790 / run `33170780714`: Ubuntu / Windows / Browser / Windows Media all PASS after final B1 self-review and immutable re-plan-lineage coverage.
- CI #792 passed all four gates on the final B1 status-sync head after PR #68 was marked complete; the accepted merge commit is `b7a7b530a63c11e77ffc5fe3eab215cf9858d0d5`.
- PR #68 merged with no unresolved review/thread blockers.

No Local Codex gate was required for B1 because B1 did not change real browser/media/process/runtime behavior.

## B2 accepted product boundary

B2 adds derived Asset Intelligence and bounded semantic retrieval above existing Project Asset truth without creating a second media store:

- durable derived Asset Intelligence records outside `project.json` beneath the production runtime area;
- Project Asset IDs remain media identity truth; repository filenames use `SHA-256(assetId)` Windows-safe storage keys without changing logical IDs;
- primary/backup recovery, including recovery when only a valid backup remains;
- explicit `project-asset-descriptor-v1` source fingerprint scope so descriptor hashes are never represented as raw media-content hashes;
- descriptor-based invalidation when a Project Asset disappears or relevant descriptor fields change;
- unrelated Project revision changes do not invalidate otherwise matching derived intelligence;
- deterministic metadata analyzer with normalized semantic summary/tags and bounded range support;
- stable semantic/tag/kind retrieval with deterministic ordering and hard required-tag filtering;
- normalized summary/tag/range/label schemas reject filesystem paths and original media filenames;
- unsafe/original-filename labels are excluded from analyzer input and Agent-facing retrieval;
- read-only `search_asset_intelligence` Agent tool with Project scope forced from the active Agent context;
- server Agent runtime registers the retrieval tool in the actual product tool registry;
- bounded per-Asset analysis and freshness API;
- API and Agent execution errors are normalized so internal runtime paths are not returned to clients/models;
- stale records are excluded from semantic search results even if derived data remains durably present for audit/recovery.

B2 intentionally does not claim face/object/topic detection or other real visual understanding. No specific real detector/model is mandated by V2.4; this accepted boundary is deterministic Asset Intelligence + Semantic Retrieval only.

### B2 cloud evidence

- CI #820 exposed a TypeScript inference defect in new deterministic analyzer arrays (`tags` / `facts` inferred too narrowly); the fix made them explicit `string[]` without changing runtime behavior.
- CI #822 / run `33174132672` on exact product head `941a1c89df9a765049865e2be7a8db4c2cbaef11`: Ubuntu Verify, Windows Verify, Browser Smoke, and Windows Media Smoke all PASS.
- Final B2 status-sync CI #824 passed all four latest gates on frozen head `74feb93810fc33a41902b1daf715eb2839c7044b`; its first Browser Smoke attempt hit two existing E2E timing failures and a same-SHA Browser-only re-run passed without product-code changes.
- PR #69 merged with expected head `74feb93810fc33a41902b1daf715eb2839c7044b`; accepted merge commit is `e2ed06619a4d789e07454ac2080e103097c965df`.
- exact-main CI #825 / run `33183917957`: Ubuntu Verify, Windows Verify, Browser Smoke, and Windows Media Smoke all PASS on accepted main `e2ed06619a4d789e07454ac2080e103097c965df`.
- Final diff/security self-review confirmed Agent Project scope is context-owned, logical Asset IDs are preserved, path/original-filename data is excluded from normalized Agent/API outputs, source-descriptor fingerprints remain explicitly scoped, stale derived records are filtered before retrieval, and B2 introduces no generic filesystem/network/process authority.
- The small post-analysis Project-change window does not justify a new cross-store lock in B2: derived intelligence is explicitly invalidatable metadata, and freshness/search revalidate the current Asset fingerprint before the record is treated as usable truth.

No Local Codex gate was required for accepted B2 because this workstream does not claim real-media semantic intelligence. A later real video-use/local/provider analyzer must receive its own exact-SHA local-media acceptance before such claims are made.

## B3 accepted product boundary

B3 adds reusable, declarative production knowledge without turning Skills into executable runtime truth or Project truth:

- typed `VideoSkill` contracts with stable lowercase-kebab IDs and strict `major.minor.patch` semantic versions;
- explicit intended use, discovery terms, preconditions, required context, bounded recipe steps, allow-listed services/components, QA checks, risk policy, and fallback behavior;
- normalized Skill text rejects machine paths, shell/process patterns, script payloads, and other executable-like content;
- six deliberately small built-in Skills: `talking-head-hook`, `b2b-proof-card`, `numeric-evidence-emphasis`, `clean-broll-insert`, `problem-proof-cta-ad`, and `caption-emphasis`;
- registry-level exact `skill-id@version` uniqueness, deterministic version resolution, deterministic discovery/search, and stable ordering;
- recipe steps must reference services/components explicitly allow-listed by the Skill contract;
- application-request construction accepts only an exact Skill reference and re-resolves it through the registry before producing a request, preventing arbitrary unregistered Skill objects from bypassing the allow-list;
- required approved context fails closed before a Skill application request is produced;
- deterministic application-mode resolver enforces `REUSE > MODIFY > CREATE` when trustworthy reuse/modify hints are supplied;
- current Agent Skill selection intentionally does not fabricate reuse history: without persisted trusted reuse/modify evidence it produces the default `CREATE` mode rather than pretending reuse already exists;
- read-only `search_video_skills` Agent tool discovers allow-listed Skills;
- proposal-only `select_video_skill` Agent tool returns a bounded `VideoSkillSelectionRequest` and does not mutate Project truth;
- Agent callers cannot supply Project ID or Project revision for Skill selection; both are forced from the active Agent context snapshot;
- server Agent runtime registers the built-in Skill registry in the actual product tool registry;
- Production Plan evidence accepts logical `skill` references and requires exact `skill-id@major.minor.patch` syntax; this schema validation records exact identity/version syntax, while registry membership remains enforced by the Skill selection/request path;
- Skill selection/application in B3 remains a proposal/request boundary only and does not execute recipes or call engine adapters directly.

B3 does not add arbitrary executable code, generic shell/filesystem/network/process authority, direct Project mutation authority, new Mission execution behavior, Self-QA/repair, or new real Remotion/HyperFrames output behavior.

### B3 cloud evidence

- CI #832 on pre-fix head `80d93e2e00276ceeb6e6126908f3b22d0cc7f14a` passed format/lint/typecheck and exposed one assertion-shape error in a new B3 Agent-tool test: deterministic search correctly returned two ranked Skill candidates while the test incorrectly expected a one-item array. Product behavior was unchanged; the test was corrected to assert both candidates and score ordering.
- CI #833 / run `33186260322` on exact product head `9a12886f08bee89e8350f4477e76b46f52caa19b`: Ubuntu Verify, Windows Verify, Browser Smoke, and Windows Media Smoke all PASS.
- B3-specific tests cover built-in registry uniqueness, strict version parsing, executable/path rejection, explicit contract fields, recipe allow-list enforcement, deterministic search ranking, required-context failure, registry-bound request creation, `REUSE > MODIFY > CREATE`, exact Plan Skill evidence syntax, Agent tool risk classification, context-owned Project scope/revision, and unknown-Skill rejection.
- Full diff/security self-review found no new generic execution surface: Provider/Agent input cannot inject Project scope, recipe references are bounded to declared services/components, application requests re-check registry membership, Plan Skill evidence does not contain machine paths, and the Agent selection path never executes a Skill recipe directly.
- PR #70 has no submitted reviews or unresolved review threads at product-candidate review time.

No Local Codex gate is required for accepted B3 because this boundary is declarative Skills + bounded discovery/selection requests only and does not claim new real Remotion/HyperFrames output behavior.

## V2.3.1 immutable release truth

```text
Release tag:                 v2.3.1
Annotated tag object:        b91d0c3adbaef09cd5c323481ec6bb04c516dd6e
Dereferenced release commit: 6e07d1dbdd0ec4d64d022f7c821e133ddf207637
Final release CI:            #765 / run 33158996259 / four gates PASS
Post-release truth PR:       #65
```

`v2.3.0` and `v2.3.1` are immutable and must never be moved or recreated.

## Package and dependency truth

```text
package.json version:                 2.3.1
package-lock.json top-level version:  2.3.1
package-lock packages[""].version:    2.3.1

Project Schema:       2.0.0
Node:                 24.x
remotion:             4.0.513
@remotion/player:     4.0.513
@remotion/cli:        4.0.513
hyperframes:          0.8.10
@playwright/test:     1.62.1
prettier:             3.8.1
```

Any later change to these values requires an explicitly scoped workstream and acceptance gate.

## Permanent accepted invariants

```text
Source Media != Project Canvas != Export Profile
Project != Workflow != Job
Agent Session != Project
Mission != Project
Mission != Workflow
Production Plan != Project
Production Plan != Workflow
Production Plan != Job
QA Report != Project
Skill != Project
REUSE > MODIFY > CREATE
```

- `project.json` remains durable editing truth.
- Workflow state remains separate orchestration truth.
- Durable Job state remains concrete execution truth.
- Agent Session remains conversation/tool orchestration truth.
- Production Mission is a production objective/state machine, not Project truth.
- Production Plan is an inspectable proposal/step graph, not an executor or mutation log.
- Asset Intelligence is derived metadata, not Project/media truth.
- Video Skills are declarative reusable production knowledge, not Project truth or arbitrary executable code.
- Agent/provider/tool execution has no direct Project or Workflow mutation authority.
- stale Project/Workflow/Mission-dependent mutation state fails closed.
- default server security remains loopback-first.
- V2.4 autonomy must use application-owned policies and bounded services, never generic shell/filesystem authority.

## B4 next-work boundary

Start **B4 Self-QA + Repair Proposals** only after PR #70 merges and the B3 merge commit passes exact-main CI.

B4 may add:

- typed `ProductionQAReport` and `QAFinding` schemas with severity, bounded evidence, and logical target references;
- deterministic technical QA over accepted Project/render/job evidence;
- script/caption consistency checks where available;
- Mission-goal requirement checks;
- rendered-output evidence references without duplicating media truth;
- bounded repair proposal generation;
- explicit repair-loop budget contracts;
- repository/service boundaries for durable QA evidence where required by the authoritative PRD;
- Agent read/proposal tools over QA evidence only when they preserve existing context, revision, risk, and confirmation boundaries.

B4 must not automatically mutate Project truth, run arbitrary repair code, bypass Proposal/Apply, own Mission execution, or introduce generic shell/filesystem/network authority. Controlled autonomous repair execution belongs to B5 unless a narrower path is separately accepted.

B4 is cloud-safe for schemas, deterministic checks, repositories, and repair proposals. Any claim that depends on real rendered-media inspection must receive the appropriate exact-SHA Local Codex / real-media gate before being represented as accepted real-media QA.
