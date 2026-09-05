# Video OS Studio V2.6 — Interactive Editing & Reusable Asset System Master PRD

> Status: **R0 PLANNING BASELINE — implementation not started**  
> Target product line: **V2.6.0**  
> Released predecessor: **V2.5.3**  
> Planning branch base: `c5d3eecc38be9d0c890527a10cd5052e98d088a0`  
> Project Schema at planning start: **2.0.0**  
> Development model: **GPT Web + GitHub = primary developer; Local Codex = exact-SHA VERIFY ONLY**

---

## 1. Executive decision

V2.6 turns Video OS Studio from an AI-assisted production workspace into a **human-correctable, reusable creative production system**.

The product must support one continuous loop:

```text
AI / user selects an editing moment
→ search previously proven creative assets
→ preview a reusable asset
→ reuse as-is OR clone and modify
→ materialize it into the current Project
→ preview the Project in the Video OS workspace
→ manually adjust placement/timing/parameters
→ Draft Render
→ Final Render
→ save a successful modified variant back as a reusable immutable version
→ reuse it in another Project
```

The key product value is not “more effects”. It is that successful editing work becomes durable capability instead of disappearing after one export.

V2.6.0 therefore establishes four foundations:

1. **Creative Asset Library** — cross-project reusable creative source/version/artifact storage;
2. **Interactive Editing Workspace** — embedded Remotion preview plus Video OS-owned selection/Inspector controls;
3. **HyperFrames Asset Lifecycle** — editable motion-graphics source → validated preview/final artifact;
4. **Reuse Flywheel** — search → clone/modify → project use → validated reuse → new immutable version.

---

## 2. Product problem

Video OS already has Project editing truth, rendering, Agent/Workflow/Job architecture, Asset Intelligence, Selection Mode, Remotion rendering, and HyperFrames integration. The missing capability is the bridge between **AI-generated editing results** and **persistent human-editable reusable creative assets**.

Without V2.6:

- a good motion effect can be rendered into one Project but is not a first-class cross-project reusable asset;
- users can ask AI to create/modify work, but manual correction is not yet a coherent product-level interactive editing loop;
- rendered WebM/MP4 artifacts can outlive the editable source relationship and become “dead” assets;
- reuse can fall back to recreating the same effect instead of using a proven prior asset;
- successful human corrections do not automatically become structured future capability.

V2.6 solves this without replacing the existing Project, Agent, Workflow, Job, Remotion, or HyperFrames architecture.

---

## 3. Inherited non-negotiable architecture

V2.6 inherits and must preserve the released architecture:

```text
Source Media != Project Canvas != Export Profile
Project != Workflow != Job
Agent Session != Project
Mission != Project
QA Report != Project
```

Permanent rules:

- canonical Project time remains frames;
- Project JSON remains durable editing/render truth;
- Project Schema `2.0.0` does not change incidentally;
- Remotion remains the master renderer;
- HyperFrames remains behind its adapter/service boundary;
- Agent/MCP/UI must reuse application-owned validated mutation paths;
- no Agent, Workflow, Mission, or UI shortcut may hand-edit runtime `project.json`;
- long-running work remains expected-revision/idempotency safe;
- runtime/user data remains under `VIDEO_OS_DATA_ROOT`;
- local-server boundaries remain loopback-first unless separately approved;
- `REUSE > MODIFY > CREATE` remains the default production policy.

Asset Intelligence remains **derived metadata over accepted Project assets**. It is not promoted into the canonical Creative Asset Library.

---

## 4. R0 architecture decisions

### AD-01 — Remotion is the Master Composition and render semantics owner

The final Video OS Project composition remains represented by the existing Project model and rendered through Remotion.

V2.6 must not introduce a second master timeline.

```text
Project / Timeline truth
        ↓
Remotion composition
        ↓
Preview / Render
```

HyperFrames does not become a competing Project timeline.

### AD-02 — HyperFrames is a Creative Asset Engine

HyperFrames is used to produce and revise motion-graphic source packages and their rendered artifacts, including examples such as:

- price highlights;
- kinetic titles;
- CTA cards;
- logo reveals;
- arrows/circles/scribbles;
- data callouts;
- branded motion graphics;
- animated subtitle treatments;
- reusable transitions/overlays.

It remains behind the existing runtime/adapter/service ownership boundary.

### AD-03 — Video OS owns product editing UI; Remotion Studio is not Project truth

V2.6 embeds `@remotion/player` (already an installed dependency at planning start) for product preview.

Video OS owns:

- selection;
- playhead/current frame;
- timeline placement;
- transform controls;
- Inspector parameters;
- Project mutations;
- dirty state;
- undo/review semantics where applicable.

Remotion Studio interactive/source-writeback features may be useful for developer/template/source authoring and debugging, but **must not become a second durable Project editing truth**.

### AD-04 — Creative Asset Library is a separate cross-project canonical library

A reusable Creative Asset is not merely a Project asset and is not Asset Intelligence metadata.

The library has its own durable repository beneath `VIDEO_OS_DATA_ROOT`, with stable logical IDs and immutable versions.

It may contain source, parameter schema, preview/final render artifacts, thumbnails, lineage and engine metadata.

### AD-05 — Project portability uses copy-on-insert / materialization

V2.6.0 does **not** require a Project to retain a live runtime dependency on the global Creative Asset Library.

When a reusable Creative Asset Version is inserted into a Project:

```text
Global Creative Asset Version
        ↓
select immutable rendered artifact
        ↓
materialize/copy accepted artifact into project-local assets
        ↓
insert/update through existing revision-safe Project mutation service
        ↓
existing Project clip / asset semantics remain renderable alone
```

Therefore:

- moving/opening the Project does not require the global library to render;
- deleting or changing a future library version cannot silently mutate an existing Project;
- V2.6.0 avoids an incidental Project Schema bump solely to support foreign library references.

A future schema revision may introduce first-class external references only through a separately approved migration.

### AD-06 — Reusable provenance is derived sidecar state, not mandatory render truth

V2.6 may store a repairable sidecar link between project-local materialized assets/clips and their reusable origin:

```text
projectId
projectAssetId / clipId
creativeAssetId
creativeAssetVersionId
artifactId
materializedAt
```

This provenance enables “edit source”, “open origin”, and “save as reusable variant”.

If provenance is missing/corrupt, Project preview/render must still work. The system may degrade source-edit/reuse affordances instead of breaking render.

Do not hide canonical provenance identifiers inside arbitrary effect `props`.

### AD-07 — Creative Asset Versions are immutable

A version is never modified in place after acceptance.

```text
V4 ($39,900)
  ↓ Clone / Fork
V5 ($49,900)
```

V4 remains byte/logically stable. V5 records lineage such as `parentVersionId`.

This is mandatory for reproducibility, project safety, cache correctness, and future style learning.

### AD-08 — Source and render artifacts are both first-class

A reusable motion asset is not complete if only the rendered WebM survives.

A version must be able to own:

```text
version metadata
source package
parameter values/schema
thumbnail
preview/proxy artifact
final artifact(s)
render fingerprints
lineage
```

The source may be absent for imported non-editable assets, but editability must be explicit rather than assumed.

### AD-09 — Realtime, Draft, and Final are distinct product modes

```text
Realtime Preview = embedded Remotion Player
Draft Render     = fast encoded review artifact
Final Render     = production output using Project export semantics
```

Do not force a full production render for every edit.

### AD-10 — Agent/MCP uses exactly the same production mutation paths

Agent, Selection Mode, Local MCP, and direct UI actions must converge on the same validated services.

Forbidden:

```text
Agent → raw library files
Agent → raw project.json
Agent → direct HyperFrames CLI
Agent → direct Remotion CLI
```

Required:

```text
Agent request
→ typed allow-listed tool
→ application service
→ expected revision / idempotency / policy
→ accepted repository or Project mutation path
```

---

## 5. Target system architecture

```text
                        Video OS Studio
                              │
                ┌─────────────┴─────────────┐
                │                           │
          Human Editing                Agent / MCP
                │                           │
                └─────────────┬─────────────┘
                              │
                     typed application services
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
 Project / Timeline    Creative Asset Library   Render Services
 editing truth          reusable truth          Job/runtime truth
        │                     │                     │
        │               ┌─────┴─────┐               │
        │               │           │               │
        │           Existing     HyperFrames         │
        │            versions    source/render        │
        │               │           │               │
        └───────────────┴──── materialize ───────────┘
                              │
                              ▼
                     project-local assets
                              │
                              ▼
                     Remotion Composition
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
        Embedded Player                Draft / Final
        realtime preview                   render
```

---

## 6. Domain model

The exact TypeScript/schema representation belongs to C0, but the conceptual contract is frozen here.

### 6.1 CreativeAsset

Logical reusable identity.

Required concepts:

- `id`;
- `name`;
- `kind`;
- `engine`;
- `editable`;
- tags/search metadata;
- lifecycle/archive metadata;
- latest/recommended version reference as library metadata, not mutation of historical versions.

Example kinds:

```text
motion_graphic
animated_title
cta
transition
subtitle_treatment
brand_element
data_callout
overlay
other
```

Engine must be extensible, for example:

```text
hyperframes
remotion
static
other/future
```

V2.6 must not hard-code the library as HyperFrames-only.

### 6.2 CreativeAssetVersion

Immutable version snapshot.

Required concepts:

- stable `versionId`;
- `creativeAssetId`;
- `parentVersionId` where applicable;
- engine/version metadata;
- source package reference;
- parameter values/schema reference;
- preview/final artifact references;
- fingerprint(s);
- creation/acceptance state;
- no in-place mutation after accepted/ready state.

### 6.3 CreativeAssetSourcePackage

Editable source payload for engines that support source editing.

For HyperFrames this may contain HTML/CSS/JS/assets plus metadata required by the accepted adapter/CLI contract.

Absolute machine paths are not portable identifiers and must not become public logical identity.

### 6.4 CreativeAssetArtifact

Immutable rendered product associated with a specific version/fingerprint.

Representative artifact roles:

```text
thumbnail
preview
proxy
final
```

Each artifact should record enough metadata to determine suitability and staleness, e.g. engine version, dimensions, FPS, duration, codec/container where relevant, and fingerprint.

### 6.5 CreativeAssetParameterSchema

Defines editable user/Agent-facing parameters without exposing arbitrary source execution.

Examples:

```text
text
accentColor
fontSize
durationFrames
variant
```

Parameters are typed, bounded, validated, and allow-listed.

### 6.6 CreativeAssetProjectLink

Derived/repairable provenance sidecar linking materialized Project objects back to a reusable origin.

It is not required to render the Project.

### 6.7 Project placement

Timeline placement remains Project editing truth.

Examples of placement/editable state include:

- start frame;
- duration;
- layer/order;
- transform X/Y;
- scale;
- rotation;
- opacity;
- accepted parameterized clip properties supported by the current Project model.

C0 must map these onto existing Project Schema capabilities before proposing any schema extension.

---

## 7. Storage model

The exact on-disk layout is implementation-owned, but V2.6 should converge on a Windows-safe logical structure beneath `VIDEO_OS_DATA_ROOT` similar to:

```text
creative-assets/
  repository/
    ... durable metadata envelopes / indexes ...
  assets/
    <safe-asset-key>/
      versions/
        <safe-version-key>/
          version.json
          source/
          thumbnails/
          preview/
          render/
  project-links/
    ... repairable provenance sidecars ...
```

Rules:

- logical IDs are not raw paths;
- unsafe ID characters never become unvalidated filesystem paths;
- writes that establish durable metadata/artifact acceptance must be crash-aware;
- partial render files cannot be advertised as ready artifacts;
- primary/backup/recovery strategy should reuse proven repository patterns where appropriate;
- cache/temp directories are not durable truth;
- orphan temp/process cleanup must be testable.

---

## 8. Reuse and materialization flow

### 8.1 Reuse as-is

```text
search library
→ select immutable version
→ preview
→ choose Insert
→ verify accepted artifact
→ materialize project-local asset
→ revision-safe Project mutation
→ optional provenance sidecar write
→ Player updates from new Project state
```

### 8.2 Duplicate and edit

```text
select V4
→ Clone / Fork
→ create draft V5 lineage
→ modify validated parameters/source
→ validate source
→ render preview artifact
→ accept V5
→ materialize V5 into Project
→ preserve V4 unchanged
```

### 8.3 Edit from a project selection

If provenance exists:

```text
selected project clip
→ resolve reusable origin
→ clone origin version
→ edit new version
→ render/accept
→ materialize new artifact
→ revision-safe replacement/update in Project
```

If provenance is absent, the system may offer “save as new reusable asset” from the available Project artifact where feasible, but must not fabricate editable source.

---

## 9. HyperFrames lifecycle

The current HyperFrames integration already isolates runtime/render behavior behind application code and can render project-local WebM assets. V2.6 extends this into a reusable-source lifecycle rather than bypassing that service boundary.

Conceptual states:

```text
DRAFT
→ SOURCE_READY
→ VALIDATING
→ PREVIEW_RENDERING
→ PREVIEW_READY
→ FINAL_RENDERING
→ READY
```

Failure/cancellation states:

```text
FAILED
CANCELLED
ARCHIVED
```

Required behavior:

- validation before marking a source/render usable;
- deterministic version/artifact association;
- retries do not mutate already accepted immutable versions;
- interrupted work recovers or fails explicitly;
- process cleanup is owned by the runtime service;
- stale preview/final artifacts are never silently presented as current after source/parameter/fingerprint changes.

---

## 10. Render fingerprint / stale semantics

At minimum, artifact identity must account for the inputs that materially change output.

Representative fingerprint inputs:

```text
source/package fingerprint
normalized parameter values
engine version/pin
render role/profile
width/height
fps
duration where relevant
```

If any required input changes, a prior artifact is stale for that new version/request.

No “same filename therefore current” assumptions.

---

## 11. Interactive Editing Workspace

V2.6 product editing remains inside Video OS Studio.

Reference layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ Assets / Creative │            Preview          │ Inspector  │
│                   │                             │            │
│ Media             │      Remotion Player        │ Position   │
│ Creative          │                             │ Scale      │
│ Templates*        │                             │ Timing     │
│ Search            │                             │ Opacity    │
│                   │                             │ Parameters │
├──────────────────────────────────────────────────────────────┤
│ V4      [motion graphic]              [CTA]                  │
│ V3                [B-roll]                                    │
│ V2    [B-roll]                  [image]                       │
│ V1    █████████████████████████████████████                  │
│ SUB   ███ captions █████ captions █████                      │
│ A1    █████████████████████████████████████                  │
│ A2    ───────────── BGM ───────────────────                  │
└──────────────────────────────────────────────────────────────┘
```

`Templates*` is allowed as a future/placeholder surface; the full Template system is not required for V2.6.0.

---

## 12. First-release manual edit surface

V2.6.0 is **not** a Premiere/After Effects clone.

The first manual editing surface should prioritize corrections users make after AI editing:

- select clip/creative placement;
- X/Y position;
- scale;
- rotation;
- opacity;
- start frame;
- end/duration;
- layer/order where supported safely;
- exposed text value for parameterized creative assets;
- exposed font size or other small allow-listed visual parameters where the source schema supports them.

Deferred unless already cheaply supported:

- arbitrary source-code editing in the main workspace;
- unrestricted CSS editing;
- full keyframe graph editor;
- arbitrary expression scripting;
- node graph;
- full multi-cam/NLE parity;
- Photoshop/AE-class shape authoring.

---

## 13. Preview and render modes

### 13.1 Realtime Preview

Embedded Remotion Player is the immediate Project preview.

Must support synchronized:

- play/pause;
- seek;
- current frame;
- Project duration/FPS;
- selection feedback;
- updates after accepted Project mutations.

The Player is a view of Project truth, not an independent saved composition.

### 13.2 Draft Render

Purpose: encoded whole-project review without production cost.

Target characteristics may include:

- lower resolution such as 720p where compatible;
- review FPS/profile;
- bounded quality;
- explicit artifact metadata identifying it as draft.

Exact profile values belong to implementation/configuration and must not silently override Project final export settings.

### 13.3 Final Render

Uses normal production export semantics and existing render architecture.

Draft success never substitutes for Final acceptance.

---

## 14. Creative Asset Library UI requirements

V2.6.0 minimum:

- list/browse;
- text search;
- category/tag filters;
- preview thumbnail/video;
- asset detail;
- version identity;
- editable/non-editable state;
- engine indicator;
- duration/output metadata where available;
- Add to Timeline;
- Duplicate & Edit;
- archive rather than destructive deletion where history would be harmed;
- clear failure/retry state for generation/render.

Search/reuse should favor an existing accepted asset before creating a new one.

---

## 15. Agent / Selection Mode contract

Selection context may include bounded references to:

```text
selected timeline clip
selected Project asset
selected Creative Asset / version
selected time range
current frame
```

Candidate tool surface for V2.6.0:

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

Final names/contracts are frozen in C9, not R0.

Rules:

- read/search tools do not expose arbitrary filesystem traversal;
- mutation tools call production services;
- tool args are typed and validated;
- Project writes require existing revision-safe semantics;
- source updates cannot execute arbitrary model-generated code outside the accepted engine/source workflow;
- the model cannot self-authorize risky operations.

Example intended interaction:

```text
User: “这里加一个之前用过的价格强调效果，把数字改成 $49,900。”

Selection Mode
→ search Creative Asset Library
→ choose accepted price-highlight version
→ clone immutable version
→ update bounded text parameter
→ render preview
→ materialize into Project
→ show result in Remotion Player
```

---

## 16. V2.6.0 scope

Required:

1. Creative Asset contracts;
2. durable cross-project Creative Asset repository;
3. Creative Asset Library browse/search/preview UI;
4. embedded Remotion Player product preview;
5. Video OS-owned selection/Inspector corrections;
6. project materialization/placement using existing production mutation path;
7. HyperFrames reusable source/preview/final lifecycle;
8. immutable clone/variant/version lineage;
9. realtime/draft/final separation;
10. Agent/Selection Mode tool integration;
11. real-video cross-project reuse acceptance;
12. restart/recovery/Windows/runtime cleanup evidence.

---

## 17. Explicit V2.6.0 non-goals

Not required to declare V2.6.0 complete:

- full Template Library productization;
- automatic Style Memory;
- personalized recommendation ranking;
- favorites/usage analytics beyond minimal metadata required by the repository;
- similarity/vector search unless needed later;
- full keyframe/graph editor;
- replacing the existing Project Schema with a new timeline model;
- making HyperFrames a master renderer;
- making Remotion Studio the user’s canonical Project editor;
- arbitrary Agent filesystem/shell/code execution;
- live library dependency required to render a saved Project.

These boundaries prevent V2.6 from becoming an uncontrolled NLE rewrite.

---

## 18. V2.6.1 deferred productization

After V2.6.0 proves the durable reuse loop, V2.6.1 may add:

- Template Library;
- Style Memory;
- favorites;
- usage count;
- user preference signals;
- similar assets;
- AI reuse ranking;
- recommended variants;
- learned preference from accepted human corrections.

The dependency is deliberate:

```text
first build trustworthy reusable assets
then build intelligence over those assets
```

---

## 19. Failure and recovery requirements

V2.6 must test failure as a first-class product state.

Required classes:

- repository primary missing/corrupt;
- backup recovery;
- interrupted metadata write;
- interrupted source validation;
- HyperFrames process failure;
- preview render failure;
- final render failure;
- cancelled job;
- stale Project revision after long-running render;
- application restart mid-operation;
- missing provenance sidecar;
- missing global library while opening a previously materialized Project;
- orphan process/temp residue.

Core guarantees:

- immutable accepted versions remain intact;
- Project renderability is not lost because reusable provenance is unavailable;
- failures cannot advertise incomplete artifacts as ready;
- retry is explicit/idempotent where applicable;
- long-running work never blindly overwrites a newer Project revision.

---

## 20. Security and process boundaries

V2.6 inherits local-runtime restrictions.

- source bundles are handled only by accepted application services;
- browser/client does not gain arbitrary filesystem access;
- Agent cannot submit unrestricted shell commands;
- process spawning remains server/runtime-owned;
- user paths are not trusted as command fragments;
- output paths are normalized and bounded;
- secrets remain server-only;
- logs expose operational evidence, not secrets or hidden chain-of-thought;
- runtime service must account for child-process and temp cleanup.

---

## 21. Mandatory acceptance scenarios

The V2.6 release candidate must pass at least the following real-product scenarios on the frozen exact SHA.

### S01 — Open real video Project

A real local media Project opens successfully and remains compatible with the existing Project model.

### S02 — Historical Creative Assets visible

Creative Asset Library loads accepted historical reusable assets after process restart.

### S03 — Search

Searching for a price/highlight concept returns the correct accepted reusable asset without arbitrary filesystem search.

### S04 — Reusable preview

A historical HyperFrames-backed version can be previewed from the library.

### S05 — Duplicate and edit is non-destructive

Clone an existing `$39,900` version, change the bounded text parameter to `$49,900`, and prove the original version remains unchanged.

### S06 — Insert/materialize to timeline

The new accepted version is materialized to project-local assets and inserted through the normal Project mutation path.

### S07 — Realtime Project preview

Embedded Remotion Player displays the new Project composition correctly.

### S08 — Manual correction

User changes at least position, scale, and duration through Video OS-owned editing controls; accepted Project state updates correctly.

### S09 — Restart persistence

Close/restart the application and prove Project edits, reusable library metadata, and accepted version lineage survive consistently.

### S10 — Draft Render

Draft Render produces a valid review artifact and reports explicit draft metadata/state.

### S11 — Final Render

Final production render succeeds using normal Project export semantics.

### S12 — Save successful variant for reuse

The modified creative version is accepted into the global reusable library without mutating its parent version.

### S13 — Cross-project reuse

Open/create a second Project and find/reuse the new accepted version.

### S14 — Original remains immutable

Cryptographic/logical evidence proves the parent reusable version was not modified by S05–S13.

### S15 — HyperFrames failure/retry

Induce a real HyperFrames lifecycle failure; prove failure state, cleanup, and bounded retry without duplicate accepted version/artifact corruption.

### S16 — Recovery consistency

Interrupt/restart around durable asset/job/render state and prove Project, Creative Asset, artifact, and process state recover without orphan `running`, duplicate mutation, or temp/process residue.

---

## 22. Release Definition of Done

V2.6.0 may be called complete only when:

- R0 architecture is represented by implementation, not just UI labels;
- no second Project/timeline/render truth exists;
- Project Schema remains compatible or any schema change has its own explicit migration approval/evidence;
- reusable Creative Asset versions are durable and immutable;
- project-local materialization proves standalone Project renderability;
- source → preview → accepted reusable artifact lifecycle works;
- embedded Player + Inspector provide useful manual correction;
- Draft and Final flows are distinguishable and both verified;
- Agent tools reuse production services rather than bypassing them;
- S01–S16 pass against an exact frozen SHA on mandatory Local Windows acceptance;
- cloud Standard/Dedicated gates pass as required by repository policy;
- no unapproved dependency/engine/version drift exists;
- release metadata, status docs, acceptance evidence, and immutable release tag are finalized through the existing release process.

---

## 23. Product success criterion

V2.6 is successful when the product can prove this flywheel with real media:

```text
successful creative work
      ↓
structured reusable source/version
      ↓
search
      ↓
reuse
      ↓
human or Agent bounded modification
      ↓
Project preview/render
      ↓
accepted new immutable version
      ↓
reuse in another Project
```

That flywheel — not raw effect count — is the central V2.6 product capability.
