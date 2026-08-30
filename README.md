# Video OS Studio

Video OS Studio is a local-first AI-native video production workspace.

## Current immutable release

**Video OS Studio v2.4.0 is released.**

```text
Product version: 2.4.0
Project Schema: 2.0.0
Release commit: da22a5415cbf8ad2a9ce93b912b41b787b29a9b1
Release tag: v2.4.0 (annotated, verified)
Tag object: 96ebdd67e2412ed4d25be36cc6120f1bba8a8734
```

The annotated `v2.4.0` tag is the immutable current release boundary. Previous `v2.3.0` and `v2.3.1` release tags remain immutable evidence and must never be moved or recreated.

Release evidence is recorded in:

[`docs/acceptance/V2_4_RELEASE_FINALIZATION.md`](docs/acceptance/V2_4_RELEASE_FINALIZATION.md)

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

## Release verification

The V2.4 release-finalization PR #80 froze exact head:

`c4a395f9d3059dab7d2b6794df57fce292e8ea6d`

Exact-head CI #970 / run `33291797863` passed all six current gates. PR #80 then merged with expected-head protection as:

`da22a5415cbf8ad2a9ce93b912b41b787b29a9b1`

Resulting main CI #971 / run `33292090068` completed `SUCCESS`. Attempt 1 had one legacy H1 Browser Smoke 10-second Undo-state timing timeout while all other gates passed. The release PR head and resulting merge commit had the identical Git tree, and a Browser-only rerun on the unchanged exact main SHA passed the full Playwright suite. No product code changed for that rerun.

The annotated `v2.4.0` tag was then created by run `33292747452` only after confirming `origin/main` still exactly equaled the release commit and the tag did not already exist. Independent GitHub Git Data inspection verified:

```text
tag ref:             refs/tags/v2.4.0
tag object type:     tag
tag object SHA:      96ebdd67e2412ed4d25be36cc6120f1bba8a8734
tag target type:     commit
dereferenced commit: da22a5415cbf8ad2a9ce93b912b41b787b29a9b1
tag message:         Video OS Studio v2.4.0
```

## Real-media acceptance

V2.4 B6 and B7 used exact-SHA Windows acceptance for behavior cloud-only tests cannot fully prove. The final B7 gate used two distinct real user videos and successfully rendered the exact 583.354921-second H.264/AAC source that had exposed the prior Remotion frame-extraction defect.

Final B7 proof included:

- configured Mission concurrency `2` and observed concurrency `2`;
- heavy-render resource limit `1`;
- distinct Projects, Jobs and output paths;
- durable Campaign reload to `completed`;
- no cross-Project mutable truth leakage;
- no `.props.json`, `.hf-work`, stale lock/tmp residue, or attributable orphan process;
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

No new V2.4.x or V2.5 product workstream is active until separately planned and approved from the immutable `v2.4.0` baseline.
