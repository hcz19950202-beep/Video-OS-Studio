<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Video OS Studio Agent Constitution

This repository is developed through two coordinated execution environments:

```text
GPT Web + GitHub
  architecture / cloud-safe code / tests / PR / CI / review / merge

Local Codex on Windows
  real provider / browser / media / FFmpeg / Remotion / HyperFrames / video-use / restart acceptance
```

GitHub branches and exact commit SHAs are the handoff boundary. Never maintain competing implementations.

## 1. Mandatory boot sequence

Before editing anything, read in order:

1. live GitHub `main`, active branch/PR and CI;
2. `PROJECT_STATUS.md`;
3. this `AGENTS.md`;
4. `SYSTEM.md`;
5. the active Master PRD;
6. the active Development Plan / local validation contract.

For V2.4 the authoritative documents are:

```text
docs/prd/Video_OS_Studio_V2_4_Autonomous_Production_Agent_Master_PRD.md
docs/prd/Video_OS_Studio_V2_4_Development_Plan.md
```

V2.3/V2.3.1 documents remain historical architecture/release evidence but do not override current status.

## 2. Immutable released baseline

```text
released product: 2.3.1
release tag: v2.3.1
release commit: 6e07d1dbdd0ec4d64d022f7c821e133ddf207637
annotated tag object: b91d0c3adbaef09cd5c323481ec6bb04c516dd6e
Project Schema: 2.0.0
```

Never move, delete or recreate `v2.3.1`.

## 3. Permanent architecture invariants

Always preserve:

```text
Source Media != Project Canvas != Export Profile
Project != Workflow != Job
Agent Session != Project
Mission != Project
Mission != Workflow
QA Report != Project
```

And:

- canonical Project time is frames;
- Project JSON is durable editing truth;
- Workflow is separate orchestration truth;
- Durable Job state is concrete execution truth;
- Agent Session is conversation/tool state;
- Production Mission is a production objective/state machine, not editing truth;
- Production Plan is execution intent, not proof that work completed;
- QA Report is derived evidence, not Project truth;
- durable Project changes use validated Commands / Transactions / bounded services;
- UI, Agent, Mission and Workflow code do not spawn external CLIs directly;
- Agent/Mission/Workflow code never hand-edits runtime `project.json`;
- long-running mutation-capable work captures base revision, performs work, reloads latest Project, checks expected revision and applies the minimal validated mutation;
- revision and idempotency are mandatory;
- Remotion remains the master renderer;
- HyperFrames stays behind its adapter/service;
- video-use and FFmpeg/ffprobe stay behind adapters/services;
- runtime/user data remains under `VIDEO_OS_DATA_ROOT`;
- default server boundary remains loopback-first;
- Project Schema `2.0.0` and engine pins do not change incidentally;
- `REUSE > MODIFY > CREATE`.

## 4. V2.4 production architecture

V2.4 adds a higher-level orchestration layer:

```text
User Production Goal
→ Production Mission
→ Production Planner / Step Graph
→ Agent + Asset Intelligence + Video Skills
→ accepted Workflow / Durable Jobs / bounded Services
→ revision-safe Project mutation
→ actual Render
→ Self-QA
→ bounded repair
→ autonomy checkpoint / final review
```

Do not create a second Project, Workflow, Job runtime or provider architecture.

## 5. Mission boundary

Production Mission may reference Project/Session/Proposal/Workflow/Job/Skill/QA IDs, but it must not duplicate their durable state.

Mission persistence lives outside `project.json` under a dedicated repository/service beneath `VIDEO_OS_DATA_ROOT`.

Mission state advancement requires actual evidence from accepted services/repositories. Model-generated text cannot mark work complete by itself.

Mission cancellation must prevent future autonomous advancement.

## 6. Production Plan boundary

Production Plan is schema-validated execution intent.

A step may be owned by:

```text
agent
workflow
job
human-review
```

Every step must have explicit dependency/status/evidence/risk semantics.

Planner/provider output cannot contain arbitrary executable computer instructions.

A stale plan cannot silently mutate a newer Project.

## 7. Controlled autonomy boundary

V2.4 may introduce `assist`, `guided`, `auto` or `full-production` style modes, but autonomy is permission—not raw mutation authority.

Even at highest autonomy:

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
```

Application code owns risk classification. The model/provider cannot self-authorize unrestricted execution.

Human-modified/locked/protected edits must not be silently overwritten.

## 8. Self-QA boundary

QA must inspect actual durable/rendered evidence where the claim depends on output correctness.

QA categories may include:

```text
technical
content
visual
brand
goal/marketing alignment
```

QA findings may generate bounded repair proposals/steps, but QA must not become a direct Project mutation shortcut.

Repair loops require budgets and revision checks; no infinite autonomous retry.

## 9. Asset Intelligence boundary

Asset Intelligence is derived metadata/indexing over accepted Project assets.

Rules:

- use logical asset IDs;
- do not expose unnecessary absolute machine paths;
- do not automatically upload raw media to remote providers;
- derived analysis can become stale and must be invalidatable;
- Agent receives bounded search/read tools, not filesystem traversal.

## 10. Video Skills boundary

Skills are declarative, typed and versioned reusable production recipes.

Skills may reference accepted components/services/recipes but must not contain arbitrary provider-generated executable code.

Mission evidence records Skill ID/version when a Skill influences an outcome.

Always prefer reuse of accepted Skills/components/assets before creating new ones.

## 11. Agent/provider safety boundary

The V2.3 provider-neutral Agent architecture remains authoritative.

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
- direct FFmpeg / Remotion / HyperFrames / video-use process spawn.

Unknown tools or malformed args fail closed.

Do not expose/store hidden chain-of-thought; retain concise rationale and structured operational evidence only.

## 12. Provider / secret rules

Provider-specific request/auth/error mapping remains inside provider adapters.

Secrets:

```text
.env.local / server runtime only
```

Never persist them in Project, Mission, Plan, Agent Session, QA Report, browser/client bundle, repository files or user-visible logs.

## 13. Workflow / Job rules

Accepted runtime remains:

```text
WorkflowRun
→ registered Stage
→ existing Job / Service / Command / Transaction
```

Mission/Agent may inspect/request actions through bounded services. They may not edit Workflow JSON, invent completion, bypass reviews, spawn engines or introduce a second Job runtime.

## 14. Development ownership

### GPT Web + GitHub

Continue without stopping through all cloud-safe work:

- PRD/architecture;
- schemas/contracts;
- repositories/services;
- deterministic Mission/Planner/Skill/QA logic;
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

Codex works against the exact named branch/SHA, never merges and never begins the next workstream.

## 15. Branch / PR discipline

One workstream = one branch/PR by default.

V2.4 sequence:

```text
planning/v2.4-autonomous-production-agent
feature/v2.4-b0-production-mission
feature/v2.4-b1-production-planner
feature/v2.4-b2-asset-intelligence
feature/v2.4-b3-video-skills
feature/v2.4-b4-self-qa
feature/v2.4-b5-controlled-autonomy
release/v2.4-core-acceptance
feature/v2.4-b7-campaign-production
```

B5 may split into sequential B5a/B5b/B5c only if PR size/risk requires it.

Rules:

- branch from accepted current `main`;
- no product development directly on `main`;
- do not mix workstreams;
- exact HEAD CI after every pushed fix batch;
- merge only after cloud and required local gates pass;
- update `PROJECT_STATUS.md` before next workstream begins.

## 16. V2.4 workstream gates

```text
R0  docs/repository truth only — online
B0  Mission contracts/store — online first
B1  Planner/step graph — online
B2  Asset intelligence — online contracts, local if real-media claims
B3  Skills — online
B4  QA — online contracts + local real-media proof for encoded/visual claims
B5  autonomy/executor/UX — online first + mandatory local browser/restart Mission gate
B6  end-to-end autonomous real-video acceptance — mandatory local exact-SHA gate
B7  campaign/batch — only after B6; local resource/process acceptance when claimed
```

## 17. Testing rules

Cloud baseline:

```text
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Browser-impacting work:

```text
npm run test:e2e
```

Every reasonably testable bug fix needs regression coverage.

Never use local testing to replace cloud-safe deterministic tests.

## 18. Project Schema / dependency rules

V2.4 starts with:

```text
Project Schema 2.0.0
Node 24.x
Remotion 4.0.513
HyperFrames 0.8.10
Playwright 1.62.1
```

Mission/Plan/QA/Skill/Campaign state should live outside Project JSON initially.

If Project Schema change becomes genuinely necessary, stop and create a dedicated explicit migration workstream. No incidental schema bump.

Do not upgrade engines while implementing unrelated V2.4 features.

## 19. Handoff contract

Every GPT Web → Codex handoff includes:

```text
Repository
Branch
Exact SHA
Active workstream
Goal
Allowed files/areas
Forbidden scope
VIDEO_OS_DATA_ROOT
Environment
Provider-secret rules if relevant
Commands
Fixtures
Manual steps
Acceptance gates
Evidence
Stop rules
Return format
```

Any pushed fix invalidates the frozen local acceptance SHA until GPT Web reviews new HEAD + CI.

## 20. Release boundary

- `v2.3.1` is immutable.
- Do not bump V2.4 package version during R0–B5.
- B6 must pass before release finalization.
- B7 must not weaken the accepted single-video core; defer it rather than destabilize B6.
- Final release follows exact-head CI → merge → merge-commit CI → annotated tag → independent dereference verification → post-release truth sync.
