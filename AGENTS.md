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

Do not treat these as independent developers. GitHub branches and exact commit SHAs are the handoff boundary.

## 1. Mandatory boot sequence

Before editing anything, read in order:

1. `PROJECT_STATUS.md`
2. this `AGENTS.md`
3. `SYSTEM.md`
4. the active PRD named in `PROJECT_STATUS.md`
5. the active local validation contract if local evidence is required

If the files disagree about the current branch, milestone, release, or PR state, do not guess. Treat `PROJECT_STATUS.md` as current-state truth and repair stale documentation inside the active documentation/governance workstream.

## 2. Architecture invariants

Always preserve:

```text
Source Media != Project Canvas != Export Profile
```

And:

- canonical timeline time is frames;
- Project JSON is the durable project source of truth;
- durable state changes go through validated Commands / Transactions / bounded services;
- UI components must not spawn external CLIs directly;
- Agent code must not directly hand-edit runtime `project.json`;
- Remotion is the master composition/render engine;
- HyperFrames produces deterministic complex-motion assets;
- video-use is used for transcription / rough-cut / QA capabilities behind adapters/services;
- FFmpeg / ffprobe remain behind adapters/services;
- repository code and runtime media remain separated through `VIDEO_OS_DATA_ROOT`;
- Studio UI theme/locale must not become generated-video Brand;
- `REUSE > MODIFY > CREATE`.

## 3. Development ownership

### GPT Web + GitHub may

- create milestone/workstream branches;
- change architecture, schemas, APIs and cloud-safe implementation according to the active PRD;
- add unit, route, contract and pure-function tests;
- review repository-wide diffs and GitHub CI;
- create/update PRs and documentation;
- review local Codex commits and decide merge readiness.

GPT Web must not claim successful Windows, browser, FFmpeg, Remotion, HyperFrames, video-use or real-media validation unless local evidence exists.

### Local Codex may

- pull the exact active branch/SHA supplied by GPT Web;
- use an isolated Windows worktree and isolated `VIDEO_OS_DATA_ROOT`;
- run real browser/media/engine acceptance;
- fix defects discovered by that acceptance when they are within the active workstream;
- add regression tests for those defects;
- commit and push fixes to the same active branch;
- return exact commit SHA, commands, evidence, defects and remaining failures.

Local Codex must not start the next workstream, redesign architecture, merge the PR, or add unrelated product features unless the active PRD/status explicitly permits it.

## 4. Branch / PR discipline

One workstream = one branch/PR unless the PRD explicitly says otherwise.

Preferred branch examples:

```text
hardening/v2.1.1-r0-repository-truth
hardening/v2.1.1-h0-correctness
hardening/v2.1.1-h1-transactions
hardening/v2.1.1-h2-engine-runtime
```

Rules:

- branch from the currently accepted `main` SHA recorded in `PROJECT_STATUS.md`;
- do not develop directly on `main`;
- do not mix unrelated hardening workstreams;
- push local Codex fixes instead of leaving critical changes only on the local machine;
- after every pushed fix batch, re-check the latest GitHub CI for that exact head;
- merge only after cloud checks and required local gates pass;
- after merge, update `PROJECT_STATUS.md` before opening the next workstream.

## 5. Project mutation rules

Until H1 lands, treat all load → apply → save paths as concurrency-sensitive.

Never introduce a new direct whole-project mutation path to bypass Commands/Transactions.

Long-running work must not save an old Project snapshot after external work finishes. The required direction is:

```text
capture task input
→ run external work
→ reload latest Project
→ apply minimal validated Command / Transaction
→ save latest revision
```

When H1 is implemented, all mutation callers must use the revision/idempotency contract defined by the active PRD.

## 6. Real media rules

Never commit user or acceptance media to Git unless it is an intentionally small versioned test fixture.

Keep real runtime assets under an isolated local data root such as:

```text
E:\Video-OS-Data\<milestone>-<timestamp>
```

Do not write machine-specific absolute paths into Project JSON.

## 7. External engine rules

- adapters/services own CLI execution;
- UI must call application services/API, not executable files;
- do not silently download or change engine versions in a deterministic production path;
- capture useful stdout/stderr locally without leaking raw machine paths to user-facing API errors;
- Windows-specific launcher/process behavior requires Windows evidence before acceptance.

## 8. Testing rules

For every code change, run the checks available in the current environment.

Cloud baseline:

```text
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

If the active branch adds `format:check`, include it.

For local engine/media work, also execute the active Windows validation contract. Cloud CI does not substitute for local runtime evidence.

Every bug fix requires a regression test when reasonably testable.

## 9. Stop rules

During V2.1.1 Engineering Hardening, do not add unless a later status/PRD explicitly unlocks them:

- real external AI provider;
- broad AI command bar;
- V2.2 Workflow Runtime implementation;
- multi-timeline;
- arbitrary docking;
- full Crop / Mask;
- transition suite;
- generated-media marketplace;
- cloud collaboration;
- HDR/pro color;
- desktop packaging;
- unrelated large UI redesign.

If a requested fix requires a Project Schema version change, stop treating it as incidental. Document the requirement and make the migration/version decision explicitly before changing durable schema semantics.

## 10. Handoff report contract

Whenever GPT Web hands work to local Codex, provide:

```text
Repository
Branch
Exact SHA
Active workstream
Files/areas allowed to change
Local commands to run
Required real-media fixtures
Acceptance gates
Stop rules
Expected return format
```

Local Codex returns:

```text
Final branch HEAD
Commits pushed
Commands executed
Environment summary
Tests/results
Real-media/render evidence
Defects found + fixes
Remaining failed items
```

No `PASS` may be claimed without the evidence required by the active workstream.
