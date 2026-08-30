# Video OS Studio

Video OS Studio is a local-first AI-native video production workspace.

## Current immutable release

**Video OS Studio v2.3.1 is the current immutable release.**

```text
Product version: 2.3.1
Project Schema: 2.0.0
Release commit: 6e07d1dbdd0ec4d64d022f7c821e133ddf207637
Release tag: v2.3.1 (annotated, verified)
Tag object: b91d0c3adbaef09cd5c323481ec6bb04c516dd6e
```

The `v2.3.0` and `v2.3.1` tags are immutable release evidence and must never be moved or recreated.

## V2.4.0 release candidate

V2.4 product development is complete through B7 and is now in release finalization.

Accepted V2.4 product main before release metadata:

`fe883ca5581d721e996e833d43d7b7f88faebc41`

Resulting exact-main CI #969 / run `33291257927` passed all current gates:

- Ubuntu Verify;
- Windows Verify;
- Browser Smoke;
- Windows Media Smoke;
- Windows B6 Core Acceptance;
- Windows B7 Campaign Acceptance.

The mandatory B7 Local Windows real-user-media gate also passed using two distinct real MP4 files, including the same 583.354921-second H.264/AAC source that exposed the previous Remotion frame-extraction defect.

Release branch:

`release/v2.4.0-finalization`

Candidate metadata:

```text
package.json version:                 2.4.0
package-lock.json version:            2.4.0
package-lock packages[""].version:    2.4.0
Project Schema:                       2.0.0
candidate tag:                        v2.4.0
```

**`v2.4.0` is not an immutable release until the release PR merges, resulting exact-main CI passes, an annotated tag is created on that exact release commit, and the tag object/dereferenced commit are independently verified.**

The live repository source of truth is:

[`PROJECT_STATUS.md`](PROJECT_STATUS.md)

Release evidence is recorded in:

[`docs/acceptance/V2_4_RELEASE_FINALIZATION.md`](docs/acceptance/V2_4_RELEASE_FINALIZATION.md)

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
        ✅ PRODUCT ACCEPTED
        ⏳ RELEASE FINALIZATION
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
V2.4.0 Release Finalization                     ⏳
```

## Accepted product model

```text
Words
→ Meaning
→ Scenes
→ Visual Decisions
→ Clips
→ Render
```

V2.2 orchestration:

```text
User Goal
→ WorkflowRun
→ registered Stages
→ existing Durable Jobs / Services / Project Transactions
→ Human Review
→ editable Project
→ Remotion Final Render
```

V2.3 conversational control:

```text
User Goal
→ Agent Session
→ bounded Project / Script / Scene / Selection / Workflow context
→ production provider / allow-listed tools
→ validated Proposal
→ Review / Diff
→ explicit Apply
→ existing Project / Workflow / Job services
→ latest Project revision
```

V2.4 production orchestration:

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

V2.4 Campaign control plane:

```text
Campaign
  shared logical references / policy
  ├─ Mission A → Project A → Workflow / Jobs
  ├─ Mission B → Project B → Workflow / Jobs
  └─ Mission C → Project C → Workflow / Jobs
```

Permanent distinctions:

```text
Source Media != Project Canvas != Export Profile
Project != Workflow != Job
Agent Session != Project
Mission != Project
Mission != Workflow
Production Plan != Project
QA Report != Project
Campaign != Project
Campaign != Mission
```

## V2.4 accepted capabilities

### Project / durability

- Project Schema `2.0.0` remains the editing truth;
- validated Project Commands / Transactions;
- revision/idempotency protection;
- bounded Undo / Redo;
- atomic save/reopen and migrations;
- project-relative asset paths;
- `VIDEO_OS_DATA_ROOT` runtime-data separation.

### Autonomous production

- durable Production Missions outside `project.json`;
- validated Production Plans and bounded step graphs;
- semantic Asset Intelligence with invalidation and logical asset IDs;
- typed/versioned reusable Video Skills;
- application-owned autonomy/risk policy;
- protected/manual edit boundaries and revision guards;
- restart-safe Production Execution with idempotent operation/Job identities;
- real encoded-output Self-QA and bounded repair;
- Production Workspace showing durable Mission truth after reload;
- end-to-end real-video acceptance through Agent → Project → Workflow/Jobs → render → QA → repair.

### Campaign / batch production

- durable Campaign aggregate outside Project truth;
- one isolated mutable Project per Campaign Mission;
- shared logical Brand/Asset/Policy/Skill/Export Template references;
- bounded Mission concurrency;
- heavy-render resource limiting;
- per-Mission cancel/failure isolation;
- retry-failed without rerunning successful siblings;
- explicit resume for waiting-review/blocked without hidden approval;
- archive does not delete Project/Mission truth;
- Dashboard reconstructs from durable Campaign + current Mission/Project state.

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

## Agent safety model

Durable mutation remains application-owned:

```text
Agent decision
→ validated tool/service request
→ risk / revision / idempotency checks
→ accepted Project / Workflow / Job service
→ durable evidence
```

Rules:

- no direct model-to-`project.json` mutation;
- no raw shell/filesystem/Git/network/process/computer Agent tools;
- provider outputs and tool calls are schema validated;
- provider secrets remain server-side in `.env.local`;
- Agent Session, Mission, Plan, QA and Campaign truth remain outside Project JSON;
- stale mutation-dependent work fails closed;
- protected/manual edits cannot be silently overwritten;
- retry/restart cannot duplicate accepted mutations or Durable Jobs;
- Campaign sibling Projects remain isolated;
- `REUSE > MODIFY > CREATE` remains a permanent product principle.

## Development model

Video OS Studio uses two coordinated execution environments with GitHub as the single code source of truth.

### GPT Web + GitHub

Owns:

- architecture / PRDs;
- cloud-safe implementation;
- schemas/services/runtime composition;
- branches / PRs / CI;
- unit/API/contract/integration tests;
- cloud-safe browser automation;
- review/merge/release truth.

### Local Codex on Windows

Acts as an independent exact-SHA verifier when correctness genuinely depends on:

- live provider credentials/network behavior;
- real browser interaction;
- real media/codecs;
- FFmpeg / ffprobe;
- Remotion / Chrome;
- HyperFrames;
- video-use / Python;
- process interruption/restart recovery;
- final encoded-video proof.

Local Codex does not own mainline development, merge decisions, or release tags.

## Local requirements

Baseline:

- Node.js 24;
- npm;
- FFmpeg / ffprobe;
- Chromium/Chrome when browser/render validation is required;
- runtime requirements in `.env.example`.

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

Both commands bind `127.0.0.1`. Network exposure is explicit:

```bash
npm run dev:remote
npm run start:remote
```

The remote entrypoints bind `0.0.0.0` and should only be used on a trusted network. Remotion and Workflow asset fetches use `VIDEO_OS_ASSET_BASE_URL`; non-loopback asset origins additionally require the explicit `VIDEO_OS_ALLOW_REMOTE_ASSET_ORIGIN=1` opt-in.

## Cloud verification baseline

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Browser-impacting changes also run Playwright acceptance. Windows/media-impacting changes use exact-SHA media gates. Current V2.4 CI also carries exact-SHA B6 and B7 Windows acceptance jobs.

Cloud CI does not replace mandatory real-user-media/local acceptance when the claimed behavior genuinely depends on local Windows/runtime/media conditions.

## Read order before work

1. `PROJECT_STATUS.md`
2. `AGENTS.md`
3. `SYSTEM.md`
4. active approved PRD / development plan
5. active acceptance/release document when applicable

Until the annotated `v2.4.0` tag is independently verified, `v2.3.1` remains the immutable released baseline and V2.4.0 remains a release candidate.
