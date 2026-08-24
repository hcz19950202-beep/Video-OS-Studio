<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Video OS Studio Agent Constitution

This repository is developed through two coordinated execution environments:

```text
GPT Web + GitHub
  architecture / cloud code / PR / CI / final review

Local Codex on Windows
  real media / browser / FFmpeg / Remotion / HyperFrames / video-use / local acceptance
```

GitHub branches and exact commit SHAs are the handoff boundary. Do not treat the environments as independent developers or maintain competing implementations.

## 1. Mandatory boot sequence

Before editing anything, read in order:

1. live GitHub `main`, active branch/PR and CI state;
2. `PROJECT_STATUS.md`;
3. this `AGENTS.md`;
4. `SYSTEM.md`;
5. the active PRD named by current status;
6. the active development/validation contract when relevant.

For V2.2, the authoritative product and delivery documents are:

```text
docs/prd/Video_OS_Studio_V2_2_Workflow_Runtime_Master_PRD.md
docs/prd/Video_OS_Studio_V2_2_Development_Plan.md
```

If files disagree about the current branch, milestone, release or PR state, do not guess. Treat `PROJECT_STATUS.md` as repository current-state truth after resolving the live GitHub state, and repair stale documentation in the active governance workstream.

## 2. Architecture invariants

Always preserve:

```text
Source Media != Project Canvas != Export Profile
Project != Workflow != Job
```

And:

- canonical timeline time is frames;
- Project JSON is the durable Project source of truth;
- Workflow state is separate orchestration state and does not replace Project state;
- Durable Job state represents concrete execution tasks and is not reimplemented by Workflow;
- durable Project changes go through validated Commands / Transactions / bounded services;
- UI and Workflow code must not spawn external CLIs directly;
- Agent/Workflow code must not hand-edit runtime `project.json`;
- long-running work must reload the latest Project before applying minimal validated mutation;
- revision and idempotency contracts must be preserved;
- Remotion is the master composition/render engine;
- HyperFrames produces deterministic complex-motion assets behind adapters/services;
- video-use is used for transcription / rough-cut / QA behind adapters/services;
- FFmpeg / ffprobe remain behind adapters/services;
- repository code and runtime media remain separated through `VIDEO_OS_DATA_ROOT`;
- Studio UI theme/locale must not become generated-video Brand;
- Project Schema and engine pins must not change incidentally;
- `REUSE > MODIFY > CREATE`.

## 3. Development ownership

### GPT Web + GitHub may

- create milestone/workstream branches;
- maintain PRDs and architecture contracts;
- change cloud-safe schemas/APIs/implementation according to the active PRD;
- add unit, route, contract, integration and pure-function tests;
- add browser automation when cloud-safe;
- review repository-wide diffs and GitHub CI;
- create/update PRs and documentation;
- review local Codex commits and decide merge readiness;
- maintain `PROJECT_STATUS.md` and workstream truth.

GPT Web must not claim successful Windows, real-browser, FFmpeg, Remotion, HyperFrames, video-use, restart or real-media validation unless the required local evidence exists for the exact tested SHA.

### Local Codex may

- pull the exact active branch/SHA supplied by GPT Web;
- verify HEAD before testing;
- use an isolated Windows worktree and isolated `VIDEO_OS_DATA_ROOT`;
- run the active real browser/media/engine/restart acceptance contract;
- fix defects discovered by that acceptance when they remain inside the active workstream;
- add regression tests for those defects;
- commit and push fixes to the same active branch;
- return exact final SHA, commands, evidence, defects and remaining failures.

Local Codex must not start the next workstream, redesign architecture, merge the PR or add unrelated product features unless the active PRD/status explicitly permits it.

## 4. Branch / PR discipline

One workstream = one branch/PR unless the active PRD explicitly says otherwise.

V2.2 branch examples:

```text
planning/v2.2-workflow-runtime
feature/v2.2-w0-workflow-contract
feature/v2.2-w1-workflow-runtime
feature/v2.2-w2-stage-integration
feature/v2.2-w3-human-review
feature/v2.2-w4-workflow-ui
feature/v2.2-w5-recovery-hardening
release/v2.2-final-acceptance
```

Rules:

- branch from the currently accepted `main` SHA;
- do not develop directly on `main`;
- do not continue product development on closed V2.1.1 hardening/release branches;
- do not use PR #18 as the implementation base for V2.2;
- do not mix unrelated workstreams;
- push local Codex fixes instead of leaving critical changes only on the local machine;
- after every pushed fix batch, re-check CI for that exact head;
- merge only after cloud checks and required local gates pass;
- keep current-state/status documentation truthful before the next workstream starts.

## 5. Project mutation rules

Never introduce a new direct whole-Project mutation path to bypass Commands/Transactions.

Long-running work must follow:

```text
capture deterministic input + baseProjectRevision
→ run external/long work
→ reload latest Project
→ expectedRevision check
→ apply minimal validated Command / Transaction
→ save latest revision
```

Do not persist stale Project snapshots after a long task finishes.

Workflow retry/recovery must preserve idempotency and must not create duplicate captions, motion, B-roll, clips or other durable project mutations.

If implementing Workflow requires a Project Schema version change, stop treating it as incidental. Document the requirement and make an explicit migration/version/backward-compatibility decision before changing durable schema semantics.

## 6. Workflow runtime rules for V2.2

The Workflow layer is orchestration only.

```text
WorkflowRun
→ registered Stage
→ existing Job / Service / Command / Transaction
```

Do not create:

- a second Job system;
- a second Project source of truth;
- arbitrary shell/file-system stages;
- direct engine-spawning stages.

Stage Registry is an allow-list. Stage executors reuse existing bounded application/runtime services.

Workflow runtime state belongs outside Project JSON under `VIDEO_OS_DATA_ROOT` unless a separately approved schema decision says otherwise.

## 7. Real media rules

Never commit user or acceptance media to Git unless it is an intentionally tiny, versioned deterministic test fixture.

Keep real runtime assets under an isolated local data root such as:

```text
E:\Video-OS-Data\<milestone>-<timestamp>
```

Do not write machine-specific absolute paths into Project JSON.

## 8. External engine rules

- adapters/services own CLI execution;
- UI/Workflow call application services/API, not executable files;
- do not silently download/change deterministic production engine versions;
- capture useful stdout/stderr locally without leaking raw machine paths in public errors;
- Windows-specific launcher/process behavior requires Windows evidence before acceptance;
- real final render must use the accepted Remotion master composition path.

Accepted V2.2-start pins include:

```text
remotion / @remotion/player / @remotion/cli: 4.0.513
hyperframes: 0.8.10
@playwright/test: 1.62.1
Project Schema: 2.0.0
```

## 9. Testing rules

For every code change, run or verify checks available in the current environment.

Cloud baseline:

```text
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

When browser flows are changed:

```text
npm run test:e2e
```

Cloud CI does not substitute for local runtime evidence when the active workstream requires Windows/browser/media/engine/restart behavior.

Every bug fix requires a regression test when reasonably testable.

## 10. V2.2 stop rules

Unless `PROJECT_STATUS.md` and the active V2.2 PRD are deliberately revised, do not add:

- real external AI provider;
- broad/multi-turn AI Editing Agent runtime;
- arbitrary Agent tool shell/filesystem execution;
- replacement Durable Job runtime;
- replacement Project persistence model;
- Project Schema change without explicit migration decision;
- engine pin changes without explicit engine/runtime decision;
- multi-timeline;
- arbitrary docking;
- full Crop / Mask suite;
- transition suite;
- generated-media marketplace;
- cloud collaboration;
- HDR/pro color;
- desktop packaging;
- unrelated large UI redesign.

PR #18 is retained only as future V2.3 architecture input.

## 11. Local validation trigger

Local Codex is required only when correctness depends on one or more of:

- Windows process behavior;
- real browser interaction;
- real media/codecs;
- FFmpeg / ffprobe;
- Remotion / Chrome;
- HyperFrames;
- video-use / Python;
- application/process interruption/restart;
- large-media memory/performance;
- final encoded-video evidence.

Pure domain/state-machine/cloud-safe Workflow work should remain online until those boundaries are reached.

## 12. Handoff report contract

Whenever GPT Web hands work to local Codex, provide:

```text
Repository
Branch
Exact SHA
Active workstream
Goal
Files/areas allowed to change
Forbidden scope
Setup/data-root rules
Local commands
Required real-media fixtures
Manual steps
Acceptance gates
Evidence to capture
Stop rules
Expected return format
```

Local Codex returns:

```text
Final branch HEAD
Commits pushed
Environment summary
Commands executed
Automated test results
Real-media/browser/engine evidence
Defects found
Fixes applied
Regression tests added
Remaining failed items
```

No `PASS` may be claimed without the evidence required by the active workstream.