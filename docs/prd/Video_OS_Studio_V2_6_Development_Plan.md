# Video OS Studio V2.6 — Development Plan

> Status: **R0 planning baseline**  
> Target: **V2.6.0 Interactive Editing & Reusable Asset System**  
> Master PRD: `docs/prd/Video_OS_Studio_V2_6_Interactive_Editing_Reusable_Asset_System_Master_PRD.md`  
> Released predecessor: **V2.5.3**  
> Planning base: `c5d3eecc38be9d0c890527a10cd5052e98d088a0`

---

## 1. Delivery model

V2.6 follows the established split:

```text
GPT Web + GitHub
  primary product developer
  repo audit → design → code → tests → PR → CI → review/fix → merge

GitHub
  only code/status truth and exact-SHA handoff boundary

Local Codex on Windows
  VERIFY ONLY when acceptance depends on real Windows/runtime/media/browser/engine behavior
```

Local Codex does not become the implementation owner and does not continue the next workstream.

Every implementation batch begins from the currently accepted `main`, unless a sequential batch is intentionally stacked and documented.

No batch is COMPLETE because “code exists”. Completion requires its stated tests/evidence and merge gate.

---

## 2. Release sequence

```text
R0  Planning Baseline
 ↓
C0  Creative Asset Contracts
 ↓
C1  Durable Creative Asset Repository
 ↓
C2  Creative Asset Library UI
 ↓
C3  Embedded Remotion Player
 ↓
C4  Interactive Selection + Inspector
 ↓
C5  Materialization + Timeline Placement
 ↓
C6  HyperFrames Reusable Asset Lifecycle
 ↓
LOCAL GATE #1 — exact SHA
 ↓
C7  Clone / Variant / Immutable Versioning
 ↓
C8  Draft / Final Render Product Flow
 ↓
C9  Agent + Selection Mode Tools
 ↓
C10 Real Video End-to-End Acceptance
 ↓
MANDATORY LOCAL WINDOWS — frozen exact SHA
 ↓
Engineering merge / exact-main verification
 ↓
Release finalization / version sync / tag
```

---

## 3. Cross-batch invariants

Every batch must preserve:

1. Project JSON = durable editing/render truth.
2. Remotion = master renderer/composition semantics.
3. HyperFrames = bounded Creative Asset engine, not master timeline.
4. Creative Asset Library = separate cross-project reusable truth.
5. Asset Intelligence = derived Project metadata, not reusable source truth.
6. V2.6.0 Project portability = copy-on-insert/materialization.
7. Reusable provenance sidecar = derived/repairable, not required for render.
8. Accepted Creative Asset Versions = immutable.
9. UI/Agent/MCP mutations = existing/accepted production service paths.
10. Project Schema `2.0.0` and engine/dependency pins do not change incidentally.
11. Long-running mutations remain revision/idempotency safe.
12. No direct browser/Agent CLI spawn or arbitrary filesystem access.
13. `REUSE > MODIFY > CREATE`.

Any proposal that violates an invariant must stop and become a separately reviewed architecture/schema decision rather than being smuggled into a feature PR.

---

# R0 — Planning Baseline

## Goal

Freeze the product/architecture/development contract before product implementation.

## Scope

- add V2.6 Master PRD;
- add V2.6 Development Plan;
- sync agent governance to released V2.5.3 + active V2.6 planning authority;
- preserve released V2.5.3 evidence;
- no product code;
- no package/dependency/version/schema changes.

## Required decisions

- Remotion master composition;
- HyperFrames Creative Asset engine;
- Video OS-owned product editing UI;
- separate global Creative Asset Library;
- copy-on-insert/materialization;
- derived provenance sidecar;
- immutable versions;
- realtime/draft/final separation;
- Agent uses production services;
- V2.6.1 intelligence/template scope deferred.

## Verification

- docs only;
- branch based on exact accepted `main`;
- diff reviewed for accidental product/package/schema changes;
- normal docs-safe CI if GitHub workflow triggers.

## Exit

R0 planning PR merged. Only then may C0 begin.

---

# C0 — Creative Asset Contracts

## Goal

Define the domain and service contracts without prematurely wiring UI or engine process execution.

## Primary implementation areas

Expected new/changed areas may include:

```text
lib/creative-assets/
  types.ts
  schema.ts
  ids.ts
  fingerprints.ts
  errors.ts
  service-contracts.ts

tests/... creative asset contract tests
```

Exact paths may adapt to repository conventions after live-main audit.

## Deliverables

Freeze typed contracts for at least:

- `CreativeAsset`;
- `CreativeAssetVersion`;
- `CreativeAssetSourcePackage`;
- `CreativeAssetArtifact`;
- `CreativeAssetParameterSchema`;
- lifecycle/render states;
- `CreativeAssetProjectLink` sidecar shape;
- engine abstraction;
- artifact role/profile;
- fingerprint inputs;
- clone/version lineage.

## Critical design work

### C0.1 Existing Project Schema mapping

Before adding any new Project field, map reusable placement needs onto the existing Project types.

Prove which of these are already representable:

- project-local asset;
- motion clip;
- HyperFrames engine/effect identity;
- start/duration;
- transform/opacity/layer;
- parameterized props.

If a required placement cannot be represented, produce an explicit migration proposal. Do not silently bump schema.

### C0.2 Stable IDs

IDs must be logical and Windows-safe through storage-key encoding/hashing rather than using user display names as paths.

### C0.3 Fingerprint contract

Specify normalized fingerprint payloads and prove deterministic serialization.

## Tests

- schema accept/reject;
- unknown engine/kind fail-safe behavior;
- normalized IDs/keys;
- deterministic fingerprint;
- immutable/lineage validation;
- parameter bounds;
- no absolute-path identity leakage.

## Exit gate

Cloud tests/typecheck/lint/build accepted; contracts stable enough that C1 does not need ad hoc shape changes.

---

# C1 — Durable Creative Asset Repository

## Goal

Create cross-project durable storage and recovery for reusable creative assets/versions/artifacts metadata.

## Reuse before create

Audit and reuse proven durability patterns from the existing repository code (including primary/backup/recovery, safe keying, checksums and mutex/atomic replacement patterns) without conflating Creative Assets with Asset Intelligence.

## Deliverables

Application-owned operations such as:

```text
create asset
get asset
list/search metadata
create draft child version
read version
accept version
archive asset/version where policy permits
attach accepted artifact metadata
recover repository
```

No UI dependency required.

## Durability requirements

- writes cannot expose half-written accepted metadata;
- partial render files are not READY artifacts;
- primary/backup recovery has deterministic semantics;
- backup-only recovery is tested;
- corrupted primary does not destroy valid backup;
- Windows-safe path keys;
- concurrency/mutex semantics;
- version acceptance is idempotent where applicable;
- accepted immutable version cannot be overwritten through normal API.

## Tests

At minimum:

- create/read/restart;
- multiple assets/versions;
- primary corruption;
- primary missing;
- backup recovery;
- interrupted/temp residue simulation;
- concurrent writes;
- duplicate/idempotent acceptance;
- immutable overwrite rejection;
- archive/read history;
- invalid path/ID handling.

## Exit gate

Repository survives deterministic restart/recovery tests and passes cloud gates.

---

# C2 — Creative Asset Library UI

## Goal

Give users a first-class reusable library surface before engine authoring complexity is added.

## Deliverables

Within existing Studio shell/panels:

- Creative Assets navigation/surface;
- list/grid;
- search;
- tags/kind filters;
- thumbnail/preview area;
- detail view;
- version display;
- engine/editability state;
- duration/output metadata;
- Add to Timeline entry point (may be disabled/stubbed until C5 if needed);
- Duplicate & Edit entry point (may be staged until C7);
- render/failure state display.

## API/service boundary

Browser calls typed application APIs/services. It does not read library files directly.

## Testing

- empty/loading/error states;
- search/filter behavior;
- version selection;
- no raw machine path exposure;
- disabled actions accurately reflect readiness;
- browser smoke/interaction coverage.

## Exit gate

Users can browse/search/inspect seeded/test reusable assets without touching local files manually.

---

# C3 — Embedded Remotion Player

## Goal

Make Video OS itself the realtime Project preview workspace.

## Existing dependency

Planning audit confirms `@remotion/player` is already present. Do not add a second preview framework without evidence.

## Deliverables

- embedded Player component in Studio preview area;
- adapter from current Project state to preview composition/props;
- play/pause;
- seek/current-frame synchronization;
- project FPS/duration handling;
- controlled resize/aspect behavior;
- error boundary/loading state;
- preview invalidation after Project mutation.

## Architecture rule

Player state is ephemeral UI state. Saved editing truth remains Project.

Do not persist a second Remotion-only timeline model.

## Tests

- frame conversion;
- seek/play synchronization;
- Project reload;
- composition prop update;
- error state;
- browser interaction smoke;
- no source writeback to Project code/components.

## Exit gate

A representative existing Project can be previewed through embedded Player using Project-derived composition state.

---

# C4 — Interactive Selection + Inspector

## Goal

Allow useful human correction after AI editing without building a general-purpose NLE.

## Minimum editable surface

- selected clip/placement;
- X/Y;
- scale;
- rotation;
- opacity;
- start/duration;
- layer/order where existing Project semantics safely support it;
- text/font-size or other typed parameters only when explicitly exposed by the creative parameter schema.

## UI interaction model

```text
select timeline/canvas item
→ Inspector reads current Project-derived state
→ user edits validated value
→ accepted production mutation service
→ revision-safe Project update
→ Player refresh
```

Canvas drag/resize can be introduced if it maps cleanly to the same mutation commands; Inspector fields are the correctness baseline.

## Remotion Studio boundary

Do not rely on Remotion Studio source-code writeback to save Project edits. Video OS owns the Project mutation.

## Tests

- selection switching;
- bounded values;
- stale revision handling;
- repeated edit/idempotency where applicable;
- undo/review integration if current architecture provides it;
- Player reflects accepted state rather than optimistic stale state;
- non-selected clips unchanged.

## Exit gate

User can make at least position/scale/duration corrections and restart with the accepted Project state preserved.

---

# C5 — Materialization + Timeline Placement

## Goal

Insert a reusable Creative Asset Version into a Project without making the Project depend on the global library at render time.

## Deliverables

A production service roughly equivalent to:

```text
materializeCreativeAssetToProject(...)
```

Responsibilities:

1. verify chosen reusable version/artifact is accepted;
2. resolve immutable artifact;
3. copy/materialize it into project-local asset storage safely;
4. reload latest Project;
5. enforce expected revision;
6. add/reuse accepted project-local asset;
7. add/update motion/timeline clip through existing Project mutation path;
8. persist optional repairable provenance sidecar;
9. return new Project revision/placement identity.

## Idempotency

A repeated operation with the same operation identity must not create duplicate project-local assets/clips unintentionally.

## Portability proof

After materialization, temporarily make global library unavailable and prove Project preview/render input resolution still succeeds using its local asset.

## Tests

- insert accepted version;
- duplicate call/idempotency;
- stale Project revision;
- copy failure before Project mutation;
- Project mutation failure after copy with bounded orphan cleanup/reconciliation;
- global library unavailable after insert;
- provenance sidecar missing;
- second placement of same materialized asset where intended;
- Project schema remains expected version.

## Exit gate

Creative Asset → project-local asset → Project placement loop works without direct Project JSON edits or schema drift.

---

# C6 — HyperFrames Reusable Asset Lifecycle

## Goal

Extend existing bounded HyperFrames rendering into reusable editable source/version lifecycle.

## Reuse existing engine ownership

Current HyperFrames process/runtime/render service remains the execution boundary. C6 must extend/adapt it rather than creating browser/Agent direct CLI paths.

## Deliverables

- source-package creation/import contract;
- lint/validation;
- inspect metadata where useful;
- preview/proxy render;
- final reusable artifact render;
- lifecycle state persistence;
- deterministic artifact association/fingerprint;
- retry/cancel/failure state;
- cleanup/recovery;
- preview artifact surfaced in Creative Asset Library.

## Long-running correctness

HyperFrames render does not hold stale Project state and then blindly write it. Project materialization remains a separate revision-safe step after reusable artifact acceptance.

## Tests — cloud/mock

- runtime unavailable;
- validation failure;
- render failure;
- output missing;
- wrong/stale fingerprint;
- retry;
- cancellation;
- duplicate request/idempotency;
- lifecycle recovery.

## Exit gate

Cloud-safe correctness complete, then freeze exact SHA for Local Gate #1.

---

# LOCAL GATE #1 — Real engine/workspace proof

## Trigger

After C6 cloud acceptance, before C7 begins.

## Ownership

Local Codex on Windows — **VERIFY ONLY** against the exact frozen SHA.

## Required real checks

- exact SHA/tree clean before test;
- `npm ci` / required baseline gates;
- real Video OS browser/Player path;
- real Remotion preview/render dependency health;
- real HyperFrames source validation/render;
- preview WebM/artifact creation;
- materialization into a real Project;
- Windows path handling;
- child process cleanup;
- temp/work directory cleanup;
- application/runtime restart around reusable metadata;
- no source modification/commit by Codex.

## Outcome

PASS → continue C7.  
FAIL → return evidence to GPT Web; fix online; create a new exact frozen SHA; rerun required local acceptance.

---

# C7 — Clone / Variant / Immutable Versioning

## Goal

Productize non-destructive reuse.

## Deliverables

- Duplicate & Edit workflow;
- child-version creation;
- typed parameter editor for supported reusable assets;
- parent lineage UI;
- acceptance of new version only after valid source/render lifecycle;
- parent version remains immutable;
- version selector/history;
- optional “save current Project creative as reusable variant” when provenance/source conditions permit.

## Mandatory scenario

```text
V4 text = $39,900
→ Duplicate & Edit
→ V5 text = $49,900
→ render/accept V5
→ V4 content/fingerprint unchanged
```

## Tests

- immutable parent;
- failed child edit leaves parent intact;
- lineage consistency;
- clone retry/idempotency;
- invalid parameter rejected;
- multiple child variants;
- archive behavior does not orphan project-local materialized media.

## Exit gate

Non-destructive clone/edit/version behavior is proven before Agent automation uses it.

---

# C8 — Draft / Final Render Product Flow

## Goal

Separate fast review from production output while keeping existing final render semantics authoritative.

## Deliverables

### Realtime
Embedded Player, already established.

### Draft
- explicit Draft action/state;
- bounded lower-cost render profile;
- output artifact metadata;
- queued/progress/error UX;
- cache/fingerprint semantics.

### Final
- explicit Final action/state;
- existing Project export settings/master render path;
- production output evidence;
- clear distinction from Draft.

## Fingerprint requirements

At minimum account for material output inputs such as:

- Project/render input revision or fingerprint;
- source/package/creative artifact identity;
- relevant props/parameters;
- engine pins;
- width/height;
- FPS;
- render role/profile.

## Tests

- Draft never mislabeled Final;
- stale Draft invalidation;
- Final uses production settings;
- cancellation/failure;
- queue/restart behavior inherited from accepted runtime;
- output existence/metadata.

## Exit gate

Realtime/Draft/Final are three explicit, testable modes.

---

# C9 — Agent + Selection Mode Tools

## Goal

Allow Agent-native editing to use the same reusable system without adding a second mutation path.

## Candidate tools

Exact names may change after contract review:

```text
creative_asset.search
creative_asset.get
creative_asset.clone
creative_asset.update_parameters
creative_asset.render_preview
creative_asset.materialize_to_project
timeline.update_placement
render.create_draft
render.create_final
creative_asset.save_reusable
```

## Selection context

Bounded references may include:

- selected clip;
- selected Project asset;
- selected Creative Asset/version;
- selected time range;
- current frame.

## Permission rules

- search/read does not imply mutation;
- clone/edit/render/materialize are separate typed capabilities;
- explicit user/Session tool narrowing still applies;
- Agent cannot expand tool surface;
- existing approval/review/autonomy policy remains authoritative;
- source generation/editing stays inside accepted engine workflow;
- no raw filesystem, shell, Git, Project JSON or direct CLI tools.

## Golden Agent scenario

```text
User selects a timeline moment:
“这里加一个以前用过的价格强调，把文字改成 $49,900。”

Agent
→ search reusable library
→ get accepted version
→ clone
→ update bounded text parameter
→ preview render
→ materialize to Project
→ Project mutation accepted
→ embedded Player shows result
```

## Tests

- tool schema;
- explicit Skill/tool narrowing;
- unknown/malformed tool fail closed;
- stale Project revision;
- tool replay/idempotency;
- approval-required behavior;
- selection resolution;
- no direct engine spawn path.

## Exit gate

Agent can complete the golden scenario using only the same production services available to UI.

---

# C10 — Real Video End-to-End Acceptance Harness

## Goal

Turn S01–S16 from prose into repeatable engineering acceptance.

## Deliverables

- deterministic fixture/seeding strategy where possible;
- real-media acceptance contract;
- state snapshots/evidence paths;
- restart points;
- version/fingerprint assertions;
- cleanup assertions;
- exact-SHA report template;
- dedicated CI coverage for cloud-safe portions.

## Required scenario set

Use Master PRD S01–S16 as minimum release acceptance:

1. real Project open;
2. historical reusable assets visible;
3. search;
4. historical HyperFrames preview;
5. duplicate/edit `$39,900 → $49,900`;
6. materialize/insert;
7. Player preview;
8. manual position/scale/duration;
9. restart persistence;
10. Draft;
11. Final;
12. save reusable variant;
13. second-Project reuse;
14. original immutable;
15. HyperFrames failure/retry;
16. restart/recovery/no duplicate/orphan residue.

## Exit gate

Cloud-testable portions pass; exact source SHA frozen for mandatory Local Windows acceptance.

---

# Final Mandatory Local Windows Acceptance

## Mode

Local Codex **VERIFY ONLY**.

## Input

One exact frozen source SHA produced by GPT Web/GitHub after all C0–C10 online fixes.

## Baseline

At minimum use the repository’s then-current required Windows acceptance contract, expected to include:

- clean exact SHA;
- `npm ci`;
- format;
- lint;
- typecheck;
- full unit/integration tests;
- build;
- browser/runtime acceptance as required;
- real Remotion;
- real HyperFrames;
- real media/FFmpeg where product path uses it;
- residue/process cleanup.

## V2.6-specific mandatory proof

All S01–S16 against real local media and exact source SHA.

## Local Codex prohibitions

- no implementation edits;
- no commit;
- no merge;
- no next-workstream development;
- no substituting a different SHA;
- no claiming PASS for scenarios not actually run.

Failure returns evidence only. GPT Web fixes and produces a new frozen SHA.

---

## 4. PR / branch strategy

Recommended names:

```text
docs/v2.6-interactive-editing-planning
feature/v2.6-c0-creative-asset-contracts
feature/v2.6-c1-creative-asset-repository
feature/v2.6-c2-creative-asset-library-ui
feature/v2.6-c3-remotion-player
feature/v2.6-c4-interactive-inspector
feature/v2.6-c5-asset-materialization
feature/v2.6-c6-hyperframes-asset-lifecycle
feature/v2.6-c7-asset-versioning
feature/v2.6-c8-draft-final-render
feature/v2.6-c9-agent-tools
release/v2.6-core-acceptance
```

Exact naming may be adjusted to repository conventions, but each branch/PR must remain one coherent workstream.

Large batches may be split only when the split preserves a clear sequential contract and does not allow parallel incompatible truths.

---

## 5. Per-PR verification policy

For every product PR:

1. verify branch base/current main assumptions;
2. inspect exact diff;
3. run applicable local/cloud-safe tests during development;
4. push exact HEAD;
5. wait for required GitHub CI;
6. inspect failures rather than rerunning blindly;
7. fix on same workstream branch;
8. reverify exact HEAD;
9. merge only after required gates pass;
10. run required exact-main verification before declaring the batch COMPLETE;
11. update `PROJECT_STATUS.md` before advancing when the project governance contract requires it.

Do not describe a Draft PR with partial tests as COMPLETE.

---

## 6. Schema/dependency governance

### Project Schema

Default V2.6.0 policy: keep `2.0.0`.

If implementation proves a schema extension is unavoidable:

- document why materialization/sidecar/current clip schema cannot represent the requirement;
- provide forward/backward migration behavior;
- update compatibility tests;
- treat it as an explicit architecture gate;
- do not combine it casually with UI work.

### Dependencies / engine pins

No dependency or engine upgrade simply because V2.6 uses Remotion/HyperFrames more deeply.

Upgrade only with an explicit requirement, isolated diff and verification.

---

## 7. Known implementation risks and required mitigations

### Risk A — dual timeline truth

Mitigation: Project remains editing truth; Player derives from Project; HyperFrames renders reusable artifacts only.

### Risk B — cross-project library breaks Project portability

Mitigation: copy-on-insert/materialization; Project uses local accepted artifact.

### Risk C — reusable source edited in place

Mitigation: immutable accepted versions; edit = clone/fork.

### Risk D — source and preview/final drift

Mitigation: deterministic fingerprints + explicit stale states.

### Risk E — Player UI diverges from saved Project

Mitigation: application-owned mutation service; Player refreshes from accepted state.

### Risk F — Asset Intelligence accidentally becomes canonical

Mitigation: separate module/repository/domain names and tests; Asset Intelligence remains derived.

### Risk G — Agent adds privileged mutation path

Mitigation: tools wrap production services only; typed allow-list + existing policy.

### Risk H — long render overwrites newer Project

Mitigation: reusable render acceptance separated from Project materialization; materialization uses latest reload + expected revision.

### Risk I — render latency makes editing unusable

Mitigation: realtime Player, reusable preview/proxy, Draft, then Final.

### Risk J — Windows process/temp residue

Mitigation: dedicated real-engine gates and forced failure/restart acceptance.

---

## 8. V2.6.1 boundary

Do not pull these into V2.6.0 unless required for correctness:

```text
Template Library full productization
Style Memory
favorites/usage analytics
semantic/similarity search
personalized recommendation ranking
AI-learned style preference
full keyframe graph editor
```

V2.6.1 should consume V2.6.0’s trustworthy asset/version/usage evidence instead of inventing an intelligence layer before durable assets exist.

---

## 9. Release Definition of Done

Before V2.6.0 release finalization:

- all batches R0/C0–C10 accepted;
- both local gates handled as specified;
- final frozen source SHA passes S01–S16 on Windows;
- required Standard/Dedicated CI green;
- no unexplained dependency/engine/schema drift;
- Project remains standalone renderable after reusable materialization;
- immutable version lineage proven;
- Agent/UI use same mutation path;
- Draft/Final semantics proven;
- cleanup/restart evidence preserved;
- release metadata sync is guarded;
- exact release main is reverified;
- annotated immutable release tag is created through existing release process;
- `PROJECT_STATUS.md`, acceptance evidence and handoff docs match GitHub truth.

Only then mark `V2.6.0 RELEASED`.
