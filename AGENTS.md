<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Video OS Studio Agent Constitution

This repository is developed through two coordinated execution environments:

```text
GPT Web + GitHub
  primary developer: architecture / cloud-safe implementation / tests / PR / CI / review / merge

Local Codex on Windows
  exact-SHA VERIFY ONLY when correctness depends on real browser / media / FFmpeg / Remotion / HyperFrames / video-use / Windows restart or process behavior
```

GitHub branches, PRs, CI and exact commit SHAs are the handoff boundary and code/status source of truth. Never maintain competing implementations.

## 1. Mandatory boot sequence

Before editing anything, read in order:

1. live GitHub `main`, active branch/PR and CI;
2. `PROJECT_STATUS.md`;
3. this `AGENTS.md`;
4. `SYSTEM.md`;
5. the active Master PRD;
6. the active Development Plan / local validation contract.

Current released baseline:

```text
Video OS Studio V2.5.3
Project Schema 2.0.0
```

For V2.6 planning/development, once the R0 planning PR is merged, the authoritative planning documents are:

```text
docs/prd/Video_OS_Studio_V2_6_Interactive_Editing_Reusable_Asset_System_Master_PRD.md
docs/prd/Video_OS_Studio_V2_6_Development_Plan.md
```

V2.5 and earlier PRDs remain historical architecture/release evidence. They remain authoritative only for inherited permanent invariants that have not been superseded by a later accepted decision.

## 2. Immutable released baseline

```text
released product: 2.5.3
release tag: v2.5.3
release commit: c05bf836362ccf19c81bf2023f0838d560808ab4
annotated tag object: 66c43b7bd861d74f0abe046e063181c948981409
Project Schema: 2.0.0
```

Never move, delete or recreate `v2.5.3`.

`PROJECT_STATUS.md` is the current-state authority for later release evidence and active workstream state.

## 3. Permanent architecture invariants

Always preserve:

```text
Source Media != Project Canvas != Export Profile
Project != Workflow != Job
Agent Session != Project
Mission != Project
Mission != Workflow
QA Report != Project
Reusable Creative Asset != Project Asset
Creative Asset Library != Asset Intelligence
```

And:

- canonical Project time is frames;
- Project JSON is durable editing/render truth;
- Workflow is separate orchestration truth;
- Durable Job state is concrete execution truth;
- Agent Session is conversation/tool state;
- Production Mission is a production objective/state machine, not editing truth;
- Production Plan is execution intent, not proof that work completed;
- QA Report is derived evidence, not Project truth;
- Asset Intelligence is derived Project metadata/indexing, not reusable source truth;
- durable Project changes use validated Commands / Transactions / bounded services;
- UI, Agent, Mission and Workflow code do not spawn external CLIs directly;
- Agent/Mission/Workflow code never hand-edits runtime `project.json`;
- long-running mutation-capable work captures base revision, performs work, reloads latest Project, checks expected revision and applies the minimal validated mutation;
- revision and idempotency are mandatory;
- Remotion remains the master renderer and master Project-composition semantics owner;
- HyperFrames stays behind its adapter/service and is not a second master timeline;
- video-use and FFmpeg/ffprobe stay behind adapters/services;
- runtime/user data remains under `VIDEO_OS_DATA_ROOT`;
- default server boundary remains loopback-first;
- Project Schema `2.0.0` and engine/dependency pins do not change incidentally;
- `REUSE > MODIFY > CREATE`.

## 4. V2.6 interactive editing / reusable asset boundary

V2.6 adds a reusable creative layer without replacing Project truth:

```text
Creative Asset Library
  cross-project reusable source/version/artifact truth
        ↓ copy-on-insert / materialize
Project-local assets
        ↓
Project / Timeline editing truth
        ↓
Remotion preview/render
```

Rules:

- Creative Asset Versions are immutable after acceptance;
- modifying an accepted reusable asset creates a clone/fork/new version;
- a Project must remain previewable/renderable from its accepted project-local assets even if the global Creative Asset Library is unavailable;
- reusable provenance may live in a derived/repairable sidecar, but provenance is not mandatory Project render truth;
- do not hide canonical library/version IDs inside arbitrary effect `props`;
- Video OS owns product selection/Inspector mutations;
- embedded Remotion Player is a view of Project truth, not a second saved timeline;
- Remotion Studio source-writeback may be used for bounded authoring/debug flows but does not become canonical Project editing state;
- HyperFrames source/render lifecycle is application-service-owned;
- browser/Agent never obtains arbitrary HyperFrames/Remotion CLI execution.

A first-class foreign reusable-library reference in Project Schema requires a separately approved schema migration. V2.6.0 defaults to materialization instead.

## 5. Production Mission / Plan boundary

Production Mission may reference Project/Session/Proposal/Workflow/Job/Skill/QA/Creative-Asset IDs where accepted contracts allow it, but it must not duplicate their durable state.

Mission persistence lives outside `project.json` under a dedicated repository/service beneath `VIDEO_OS_DATA_ROOT`.

Mission state advancement requires actual evidence from accepted services/repositories. Model-generated text cannot mark work complete by itself.

Mission cancellation must prevent future autonomous advancement.

Production Plan is schema-validated execution intent. A step may be owned by:

```text
agent
workflow
job
human-review
```

Every step must have explicit dependency/status/evidence/risk semantics. Planner/provider output cannot contain arbitrary executable computer instructions. A stale plan cannot silently mutate a newer Project.

## 6. Controlled autonomy boundary

Autonomy is permission—not raw mutation authority.

Even at highest accepted autonomy:

```text
Agent/Mission decision
→ application-owned risk policy
→ typed allow-listed tool/service
→ expected revision / idempotency
→ existing mutation / Workflow / Job path
```

Never:

```text
Agent decision
→ shell/fs/network computer control
→ raw project.json write
→ raw reusable-library file mutation
→ direct Remotion/HyperFrames/video-use/FFmpeg spawn
```

Application code owns risk classification. The model/provider cannot self-authorize unrestricted execution.

Human-modified/locked/protected edits must not be silently overwritten.

## 7. Self-QA boundary

QA must inspect actual durable/rendered evidence where the claim depends on output correctness.

QA categories may include:

```text
technical
content
visual
brand
goal/marketing alignment
```

QA findings may generate bounded repair proposals/steps, but QA must not become a direct Project or Creative Asset mutation shortcut.

Repair loops require budgets and revision checks; no infinite autonomous retry.

## 8. Asset Intelligence boundary

Asset Intelligence is derived metadata/indexing over accepted Project assets.

Rules:

- use logical asset IDs;
- do not expose unnecessary absolute machine paths;
- do not automatically upload raw media to remote providers;
- derived analysis can become stale and must be invalidatable;
- Agent receives bounded search/read tools, not filesystem traversal;
- do not repurpose Asset Intelligence as the canonical Creative Asset Library.

## 9. Reusable Creative Asset boundary

Reusable Creative Assets are cross-project capability assets and may contain accepted source packages, parameter schemas, immutable versions, preview/final artifacts, lineage and search metadata.

Rules:

- logical IDs are not raw filesystem paths;
- storage keys must be Windows-safe;
- source + artifact association is fingerprinted;
- incomplete/partial outputs never advertise READY;
- accepted immutable version overwrite fails closed;
- project insertion uses accepted production materialization services;
- deleting/archiving a global library item must not silently invalidate already materialized Project media;
- source edit and Project placement edit are different operations.

## 10. Video Skills boundary

Skills are declarative, typed and versioned reusable production recipes.

Skills may reference accepted components/services/recipes/assets but must not contain arbitrary provider-generated executable code.

Mission evidence records Skill ID/version when a Skill influences an outcome.

Always prefer reuse of accepted Skills/components/assets before creating new ones.

## 11. Agent/provider safety boundary

The provider-neutral Agent architecture remains authoritative.

Required mutation pattern:

```text
bounded context
→ provider + typed allow-listed tools
→ validated proposal/request
→ autonomy/review policy
→ accepted application service
```

Forbidden Agent capabilities remain:

- raw shell / PowerShell / bash;
- arbitrary filesystem;
- arbitrary Git;
- unrestricted network fetch;
- raw Project JSON write;
- raw Creative Asset repository write;
- direct FFmpeg / Remotion / HyperFrames / video-use process spawn.

Unknown tools or malformed args fail closed.

Do not expose/store hidden chain-of-thought; retain concise rationale and structured operational evidence only.

## 12. Provider / secret rules

Provider-specific request/auth/error mapping remains inside provider adapters.

Secrets:

```text
.env.local / server runtime only
```

Never persist them in Project, Mission, Plan, Agent Session, QA Report, Creative Asset metadata/source, browser/client bundle, repository files or user-visible logs.

## 13. Workflow / Job rules

Accepted runtime remains:

```text
WorkflowRun
→ registered Stage
→ existing Job / Service / Command / Transaction
```

Mission/Agent may inspect/request actions through bounded services. They may not edit Workflow JSON, invent completion, bypass reviews, spawn engines or introduce a second Job runtime.

Creative Asset rendering may use accepted Job/runtime infrastructure, but it must not create an independent competing job system.

## 14. Development ownership

### GPT Web + GitHub

Continue without stopping through all cloud-safe work:

- PRD/architecture;
- schemas/contracts;
- repositories/services;
- deterministic Mission/Planner/Skill/QA logic;
- Creative Asset domain/repository/service logic;
- provider/tool mocks;
- APIs/UI/browser CI automation;
- unit/contract/integration tests;
- PR/CI review/fixes/merge;
- current-state documentation.

Do not claim local/live/media/restart evidence without exact-SHA proof.

### Local Codex on Windows

Use only when correctness genuinely depends on:

- live provider/network behavior;
- real browser;
- real media/codecs;
- FFmpeg/ffprobe;
- video-use;
- HyperFrames;
- Remotion/Chromium;
- Windows process/restart behavior;
- actual encoded-video/visual QA proof.

Codex works against the exact named branch/SHA, performs VERIFY ONLY unless a separately approved instruction explicitly changes that role, never merges and never begins the next workstream.

## 15. Branch / PR discipline

One workstream = one branch/PR by default.

V2.6 planned sequence:

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

Rules:

- branch from accepted current `main`;
- no product development directly on `main`;
- do not mix workstreams;
- exact HEAD CI after every pushed fix batch;
- merge only after cloud and required local gates pass;
- Local Gate #1 occurs after C6 before C7;
- final mandatory Local Windows acceptance runs against one frozen exact SHA after C10;
- update `PROJECT_STATUS.md` before the next workstream begins when required by repository governance;
- do not mark a batch complete from partial tests or a Draft PR.
