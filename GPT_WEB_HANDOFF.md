# Video OS Studio — GPT Web / Local Codex Handoff

> Updated: 2026-08-24 (Asia/Shanghai)  
> Current milestone: **V2.2 Workflow Runtime Planning / Implementation**  
> Current-state source of truth: [`PROJECT_STATUS.md`](PROJECT_STATUS.md)

## 1. Current truth

Repository:

```text
hcz19950202-beep/Video-OS-Studio
```

Released baseline:

```text
Video OS Studio v2.1.1
Release tag: v2.1.1
Release commit: 223b66799baf5b5faf1d1321a671d3fb5c6a0930
Project Schema: 2.0.0
```

Live accepted `main` at V2.2 planning start:

```text
6f0487f6b5b65d85083c96bc54e14bca37fb5704
```

V2.1.1 Engineering Hardening is complete and closed work. The active product direction is V2.2 Workflow Runtime. V2.3 Real AI Director / AI Editing Agent remains future work.

## 2. Authoritative V2.2 documents

Read after `PROJECT_STATUS.md`, `AGENTS.md` and `SYSTEM.md`:

```text
docs/prd/Video_OS_Studio_V2_2_Workflow_Runtime_Master_PRD.md
docs/prd/Video_OS_Studio_V2_2_Development_Plan.md
```

V2.2 delivery sequence:

```text
R0 Repository / Roadmap Sync
→ W0 Workflow Contract
→ W1 Workflow Runtime Core
→ W2 Existing Capability Stage Integration
→ W3 Human Review + Invalidation
→ W4 Workflow UI
→ W5 Failure / Retry / Restart Hardening
→ W6 End-to-End Release Acceptance
```

## 3. Development model

```text
GPT Web + GitHub
    │
    ├─ product decisions / architecture / PRD
    ├─ cloud-safe implementation
    ├─ branches / PRs / CI
    ├─ unit / route / contract / integration tests
    ├─ browser automation when cloud-safe
    └─ review + merge + PROJECT_STATUS

Local Codex on Windows
    │
    ├─ real browser
    ├─ real media outside Git
    ├─ FFmpeg / ffprobe
    ├─ Remotion / Chrome
    ├─ HyperFrames
    ├─ video-use / Python
    ├─ process termination / restart recovery
    ├─ memory / performance / codec checks
    └─ in-scope local fixes + evidence
```

GitHub is the only code source of truth. The two environments never maintain competing implementations.

## 4. Local Codex trigger policy

Do not hand a workstream to local Codex just because code exists.

Local evidence is required when correctness depends on:

- Windows process semantics;
- real browser interaction;
- real media/codecs;
- FFmpeg / ffprobe;
- video-use / Python;
- HyperFrames runtime;
- Remotion / Chromium final rendering;
- filesystem/path behavior not reproducible in cloud tests;
- application/process interruption and restart;
- large-media memory/performance;
- visual/encoded MP4 proof.

Expected V2.2 ownership:

```text
R0: online only
W0: online only
W1: online first; real restart proof deferred to W5
W2: online + mandatory local engine/media gate
W3: online first; local only if required by implementation, otherwise W4/W5
W4: online + mandatory local browser/media gate
W5: online + mandatory local restart/chaos gate
W6: mandatory local end-to-end acceptance
```

## 5. GPT Web workstream protocol

Before editing:

1. Resolve live GitHub main, active PR and CI state.
2. Read `PROJECT_STATUS.md`.
3. Read `AGENTS.md`.
4. Read `SYSTEM.md`.
5. Read the active PRD/workstream contract.
6. Inspect existing implementation before adding new abstractions.

Then:

```text
create one bounded branch
→ implement cloud-safe scope
→ add tests
→ inspect/fix CI
→ open/update one PR
```

If no local gate is required, GPT Web reviews and merges after cloud acceptance.

If a local gate is required, GPT Web freezes an exact green branch SHA and sends the exact handoff below.

## 6. Exact handoff contract to Local Codex

Every local handoff must contain:

```text
Repository
Branch
Exact SHA
Active workstream
Goal
Allowed files/areas to change
Forbidden scope
Setup / isolated VIDEO_OS_DATA_ROOT
Commands to run
Required real-media fixtures
Required manual steps
Acceptance gates
Evidence to capture
Stop rules
Expected return format
```

Codex must begin with:

```text
git fetch
→ checkout the supplied branch
→ verify HEAD equals the supplied SHA
→ create/use isolated Windows worktree/data root
```

If HEAD is not the expected SHA, Codex stops and reports the mismatch rather than validating an unknown revision.

## 7. Local Codex permissions

Local Codex may:

- run the active local acceptance contract;
- use real media outside Git;
- fix defects discovered by that acceptance when they remain inside the current workstream;
- add regression tests;
- commit and push those fixes to the same branch;
- return exact final SHA and evidence.

Local Codex must not:

- merge the PR;
- begin the next workstream;
- redesign Workflow architecture;
- add a Real AI Provider;
- start V2.3 Agent runtime;
- replace the Durable Job system;
- replace Project persistence;
- change Project Schema or engine pins without explicit authorization;
- perform unrelated UI/product redesign.

## 8. Codex return format

Every local return must include:

```text
Final branch HEAD
Commits pushed
Environment summary
Commands executed
Automated test results
Real browser/media/engine evidence
Defects found
Fixes applied
Regression tests added
Remaining failed items
```

No PASS is accepted without the evidence named by the active handoff.

## 9. GPT Web closeout after Codex

GPT Web then:

1. verifies the returned branch and final SHA;
2. reviews Codex commits/diff;
3. confirms latest CI for that exact head;
4. checks local evidence against the active acceptance gates;
5. rejects/reworks out-of-scope changes if present;
6. merges only after cloud + required local gates pass;
7. updates current-state documentation before starting the next workstream.

## 10. Permanent architecture invariants

Always preserve:

```text
Source Media != Project Canvas != Export Profile
Project != Workflow != Job
```

And:

- Project JSON is durable Project truth;
- canonical internal timeline time is frames;
- durable Project changes use validated Commands/Transactions/bounded services;
- Workflow orchestrates existing services/jobs and does not become a second Job system;
- UI/Workflow do not spawn CLIs directly;
- agents do not hand-edit runtime `project.json`;
- Remotion remains the master renderer;
- HyperFrames remains the deterministic complex-motion engine behind adapters/services;
- video-use and FFmpeg/ffprobe remain behind adapters/services;
- runtime media/user data remains separated through `VIDEO_OS_DATA_ROOT`;
- Studio UI theme/locale remains separate from generated-video Brand;
- Project Schema `2.0.0` and engine pins are not changed incidentally;
- `REUSE > MODIFY > CREATE`.

## 11. V2.2 stop rules

Unless the active PRD/status is deliberately revised, V2.2 must not add:

- real external AI Provider;
- broad multi-turn Editing Agent runtime;
- arbitrary Agent shell/filesystem execution;
- second Job system;
- unrelated editor rewrites;
- multi-timeline/arbitrary docking/full crop-mask/transition suite;
- generated-media marketplace;
- cloud collaboration;
- HDR/pro color;
- desktop packaging.

PR #18 is historical/future architecture input for V2.3, not the V2.2 implementation branch.

## 12. Verification baseline

Cloud baseline:

```text
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Add:

```text
npm run test:e2e
```

when browser flows are changed.

Cloud CI proves repository/cloud behavior only. It does not prove Windows/real-media/real-engine behavior.

## 13. Final V2.2 outcome

The release target is not merely a Workflow API. A user must be able to:

```text
create Project
→ import real source video
→ choose Scenario
→ Generate First Draft
→ observe durable automatic stages
→ review/approve
→ obtain editable Timeline
→ Preview
→ Final Render
```

with safe retry, cancellation, manual editing and restart recovery.