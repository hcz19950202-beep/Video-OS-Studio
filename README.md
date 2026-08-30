# Video OS Studio

Video OS Studio is a local-first AI-native video production workspace.

## Current immutable release

**Video OS Studio v2.4.2 is released.**

```text
Product version: 2.4.2
Project Schema: 2.0.0
Release commit: 79e48b068f701bba3f1c826710337a82f0a64760
Release tag: v2.4.2 (annotated, verified)
Tag object: 2c9b0ca2401f547066c6a51ff0ec60a641cfce35
```

The annotated `v2.4.2` tag is the immutable current release boundary. Previous `v2.3.0`, `v2.3.1`, `v2.4.0`, and `v2.4.1` release tags remain immutable evidence and must never be moved or recreated.

Release evidence is recorded in:

[`docs/acceptance/V2_4_2_RELEASE_FINALIZATION.md`](docs/acceptance/V2_4_2_RELEASE_FINALIZATION.md)

The live repository source of truth is:

[`PROJECT_STATUS.md`](PROJECT_STATUS.md)

## What V2.4 adds

V2.4 moves Video OS Studio from an AI Editing Agent toward a bounded autonomous video-production operating system:

```text
Production Goal
→ Production Mission
→ Production Plan / Step Graph
→ Asset Intelligence + reusable Skills
→ bounded Agent execution
→ protected Project mutation
→ existing Workflow / Durable Jobs
→ Remotion render
→ Self-QA
→ bounded repair
→ final review/evidence
```

Campaign/batch production sits above isolated Mission/Project truth:

```text
Campaign
  shared logical references / policy
  ├─ Mission A → Project A → Workflow / Jobs
  ├─ Mission B → Project B → Workflow / Jobs
  └─ Mission C → Project C → Workflow / Jobs
```

V2.4 does not replace the accepted editing/runtime foundations. `project.json` remains editing truth, Workflow remains orchestration truth, Durable Jobs remain concrete execution truth, and Remotion remains the master renderer.

## Product roadmap

```text
V2.1.0
Universal AI-first Editor
        ✅ RELEASED

V2.1.1
Engineering Hardening / Agent-ready Foundation
        ✅

V2.2.0
Workflow Runtime / Generate First Draft
        ✅ RELEASED

V2.3.0
Real AI Director / AI Editing Agent
        ✅ RELEASED

V2.3.1
Engineering Hardening / Patch Acceptance
        ✅ RELEASED

V2.4.0
Autonomous Production Agent + Campaign Production
        ✅ RELEASED

V2.4.1
Engineering Hardening / Durability + Security Patch
        ✅ RELEASED

V2.4.2
Correctness / Liveness / HyperFrames Patch
        ✅ RELEASED
```

## V2.4 delivery sequence

```text
R0  Repository / PRD / Runtime Truth Sync        ✅
B0  Production Mission Contracts + Store        ✅
B1  Production Planner + Mission Step Graph     ✅
B2  Asset Intelligence + Semantic Retrieval     ✅
B3  Reusable Video Skills                       ✅
B4  Self-QA + Repair Proposals                  ✅
B5a Mission Executor Core                       ✅
B5b Controlled Autonomy + Protected Edits       ✅
B5c Production Workspace / Mission UI           ✅
B6  End-to-End Autonomous Real Video Acceptance ✅
B7  Campaign / Batch Production + Dashboard     ✅
V2.4.0 Release                                  ✅ VERIFIED
V2.4.1 Engineering Hardening                    ✅ VERIFIED
V2.4.2 Correctness / Liveness Patch             ✅ VERIFIED
```

## V2.4 accepted capabilities

### Production Mission / planning

- durable Production Missions outside `project.json`;
- validated Production Plans and bounded step graphs;
- stale Project revision handling;
- explicit evidence references and deterministic application-level progression.

### Asset Intelligence / Skills

- semantic Asset Intelligence with invalidation and logical asset IDs;
- bounded semantic retrieval;
- typed/versioned reusable Video Skills;
- `REUSE > MODIFY > CREATE` as a permanent product principle.

### Controlled autonomy

- application-owned autonomy/risk policy;
- revision/idempotency guards;
- protected/manual edit boundaries;
- restart-safe Mission execution;
- no raw model-to-Project mutation;
- no generic Agent shell/filesystem/Git/network/process/computer tools.

### Self-QA / repair

- actual rendered-output technical/content/goal evidence;
- durable QA reports;
- bounded targeted repair;
- no infinite autonomous repair loop.

### Production Workspace

- durable Mission state after reload/restart;
- Plan/current activity/progress/checkpoints/QA/render readiness surfaced from durable truth;
- no hidden chain-of-thought exposure.

### Campaign / batch production

- durable Campaign aggregate outside Project truth;
- one isolated mutable Project per Campaign Mission;
- shared logical Brand/Asset/Policy/Skill/Export Template references;
- bounded Mission concurrency;
- heavy-render resource limiting;
- per-Mission cancel/failure isolation;
- retry-failed without rerunning successful siblings;
- explicit resume for waiting-review/blocked without hidden approval;
- Campaign archive does not delete Project/Mission truth;
- Dashboard reconstructs from durable Campaign + Mission/Project state.

### Media / renderer compatibility

- **Remotion 4.0.513** remains the master renderer;
- ordinary Project video/B-roll defaults to frame-perfect `OffthreadVideo`;
- only the exact known Offthread `No frame found at position` extraction failure may trigger one bounded HTML5 compatibility rerun inside the same Durable Render Job;
- timeout/cancel/unrelated render errors are not reclassified;
- transparent HyperFrames video remains on `OffthreadVideo`;
- `.props.json` and `.hf-work` cleanup remain enforced.

### Workflow / engines

- durable V2.2 Workflow Runtime;
- Durable Jobs;
- **video-use** behind adapters/services;
- **HyperFrames 0.8.10** behind adapter/service;
- **Remotion 4.0.513** as Player/master composition/final renderer;
- **FFmpeg / ffprobe** behind adapters/services;
- **Playwright 1.62.1** for browser acceptance.

## V2.4.2 release verification

The accepted engineering exact SHA was `c3825fe42e77c4369ec6e03d89204161764667e9`. Mandatory Local Windows acceptance passed on that exact SHA, including targeted HyperFrames real-render recertification. Cloud CI #1089 / run `33329513152` and replacement merge CI #1090 / run `33332846468` both passed all seven gates.

PR #88 merged the exact accepted engineering head with expected-head protection as `8e8f63cd570af460a53199f45a139ee78c3a4dcb`; exact-main engineering CI #1091 / run `33333104052` passed all seven gates.

Release PR #89 froze exact head `6d72d70930f3571c84b9d3f250c140515dbbded3`. CI #1092 / run `33333581692` passed all seven gates, and PR #89 merged with expected-head protection as release commit `79e48b068f701bba3f1c826710337a82f0a64760`. Exact-main CI #1093 / run `33333816771` then passed all seven gates on that exact release commit.

Isolated immutable-tag run `33334882825` created `v2.4.2`. Independent GitHub Git Data verification confirmed:

```text
tag ref:             refs/tags/v2.4.2
tag object type:     tag
tag object SHA:      2c9b0ca2401f547066c6a51ff0ec60a641cfce35
tag target type:     commit
dereferenced commit: 79e48b068f701bba3f1c826710337a82f0a64760
tag message:         Video OS Studio v2.4.2
```

`v2.4.0` and `v2.4.1` were independently reverified and remain unchanged.

## V2.4.1 release verification

The accepted hardening exact SHA was:

`0560280cfe0701444198e38b34f82f132762d246`

It passed cloud CI #1012 and #1013 across all six gates and the final Local Windows real-user-media gate. PR #84 merged that exact tested commit with expected-head protection as hardening main:

`d868f7dd02c71577bab16029fa9cec2ae28bdf4e`

Exact-main hardening CI #1014 / run `33309131066` passed all six gates.

The metadata/docs-only release PR #85 froze exact head:

`31e8b27f547880a660f2ea306013a93cb063793b`

CI #1015 / run `33309688111` passed all six release gates on that exact head. PR #85 then merged with expected-head protection as the immutable release commit:

`4c105bad936479690711c03f3e349db36fbadaf5`

Exact-main release CI #1016 / run `33310596562` completed `SUCCESS` at attempt 1 with all six gates passing.

The isolated one-shot tag workflow run `33310884372` created `v2.4.1` only after confirming `origin/main` still exactly equaled the release commit, the tag did not already exist, and the previous `v2.4.0` release remained unchanged. Independent GitHub Git Data inspection verified:

```text
tag ref:             refs/tags/v2.4.1
tag object type:     tag
tag object SHA:      9f3d06d8eabb114d6f1bcd907e98b4de3756a4a7
tag target type:     commit
dereferenced commit: 4c105bad936479690711c03f3e349db36fbadaf5
tag message:         Video OS Studio v2.4.1
```

`v2.4.0` was independently reverified to remain annotated object `96ebdd67e2412ed4d25be36cc6120f1bba8a8734`, targeting `da22a5415cbf8ad2a9ce93b912b41b787b29a9b1`.

## Real-media acceptance

V2.4.2 final Local Windows acceptance also proved the corrected bounded B6 construction and a real HyperFrames render on Windows with deterministic built-in templates, idempotent browser provisioning, ffprobe verification, and no attributable residue.

V2.4 B6 and B7 use exact-SHA Windows acceptance for behavior cloud-only tests cannot fully prove. V2.4.1 final recertification reused the same byte-identical real sources and proved each Campaign Project was intentionally bounded to 90 frames rather than accidentally rendering the full source duration.

Final V2.4.1 proof included:

- Source A: H.264/AAC, 720x1280, 30fps, 583.354921s, SHA-256 `2788FD4536E01F866BE90265B03EFA4D75BB2C99C454EBA4832F82846FC6E432`;
- Source B: H.264/AAC, 1024x576, 30fps, 65.921451s, SHA-256 `2089729758C137573B68FACABE7916B58F0D50A6E1AD38164CCF95BB9431E32F`;
- each Project and only video clip bounded to 90 frames;
- both Render logs reached `Rendered 90/90` and `Encoded 90/90`;
- outputs H.264/AAC, 640x360, 30fps, 3.050667s;
- configured/observed Mission concurrency `2`;
- heavy-render resource limit `1`;
- durable Campaign reload to `completed`;
- 28 JSON records / 0 invalid;
- no `.props.json`, `.hf-work`, tmp/live-lock, attributable process, or listener residue;
- primary local worktree preserved exactly.

## Permanent architecture boundaries

```text
Source Media != Project Canvas != Export Profile
Project != Workflow != Job
Agent Session != Project
Mission != Project
Mission != Workflow
Production Plan != Project
QA Report != Project
Skill != Project
Campaign != Project
Campaign != Mission
```

Rules:

- Project Schema remains `2.0.0`;
- `project.json` remains durable editing truth;
- Workflow and Durable Job stores remain separate truths;
- Agent/provider/tool output never directly mutates persistence;
- stale mutation-dependent work fails closed;
- retry/restart must not duplicate successful mutations or Jobs;
- protected/manual edits cannot be silently overwritten;
- Campaign operations cannot silently destroy sibling output truth;
- no generic Agent shell/filesystem/network/process/computer authority.

## Development model

Video OS Studio uses GitHub as the single code/release source of truth.

### GPT Web + GitHub

Owns mainline product development:

- architecture / PRDs;
- cloud-safe implementation;
- schemas/services/runtime composition;
- branches / PRs / CI;
- unit/API/contract/integration/browser tests;
- review/merge/release truth.

### Local Codex on Windows

Acts as an independent exact-SHA verifier when correctness genuinely depends on local/live behavior:

- real source media/codecs;
- FFmpeg / ffprobe;
- Remotion / Chrome;
- HyperFrames;
- video-use / Python;
- live provider/network when explicitly in scope;
- process interruption/restart behavior;
- final encoded-video evidence.

Local Codex does not own mainline development, merge decisions, or release tags.

## Local requirements

Baseline:

- Node.js 24;
- npm;
- FFmpeg / ffprobe;
- Chromium/Chrome when browser/render validation is required;
- runtime requirements documented in `.env.example`.

Example local data root:

```env
VIDEO_OS_DATA_ROOT=E:\Video-OS-Data
```

Real provider secrets belong only in `.env.local`; they must never be committed.

Local serving is loopback-only by default:

```bash
npm run dev
npm run start
```

Explicit trusted-network entrypoints:

```bash
npm run dev:remote
npm run start:remote
```

## Verification baseline

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Browser-impacting work also runs Playwright acceptance. Windows/media-impacting work uses exact-SHA media gates. The current CI additionally carries Windows B6 Core Acceptance and Windows B7 Campaign Acceptance.

## Read order before future work

1. `PROJECT_STATUS.md`
2. `AGENTS.md`
3. `SYSTEM.md`
4. the approved PRD / development plan for the next workstream
5. relevant acceptance/release evidence

No new V2.4.x or V2.5 product workstream is active until separately planned and approved from the immutable `v2.4.1` baseline.
