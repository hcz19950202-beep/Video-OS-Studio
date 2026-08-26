# Video OS Studio V2.3 — Real AI Director / AI Editing Agent Development Plan

> This plan executes `docs/prd/Video_OS_Studio_V2_3_Real_AI_Director_Agent_Master_PRD.md`.
>
> Baseline: V2.2.0 released and tagged at `0e813e5e1360318211e05c1c5fec5eb82be00224`; V2.3 branches start from accepted current `main` after repository-truth updates.

---

# 1. Development Model

```text
GPT Web + GitHub
→ PRD / architecture
→ cloud-safe implementation
→ tests
→ PR / CI / review / merge

Local Codex on Windows
→ only when real provider credentials, real browser/media/engines, Windows restart/process or final encoded-video evidence is required
```

GitHub remains the single code source of truth. One workstream = one branch/PR unless the Master PRD explicitly changes that rule.

Online development MUST continue through all cloud-safe code/test/CI work before freezing an exact SHA for Codex.

---

# 2. Delivery Sequence

```text
R0  Repository / PRD / Runtime Truth Sync
A0  Agent Contracts + Provider Abstraction
A1  Context Builder + Tool Registry
A2  Session Store + Multi-turn Agent Runner
A3  Production Real Provider
A4  AI Workspace Agent UX + Review / Apply
A5  Agent ↔ Workflow Integration
A6  Failure / Revision / Retry / Restart Hardening
A7  End-to-End Product Acceptance
Release
```

---

# 3. R0 — Repository / PRD / Runtime Truth Sync

Branch:

`planning/v2.3-real-ai-agent`

Scope:

- add V2.3 Master PRD;
- add this Development Plan;
- update `PROJECT_STATUS.md` to V2.3 R0 active;
- update `GPT_WEB_HANDOFF.md` for V2.3 ownership/handoff;
- update `AGENTS.md` active authoritative docs and V2.3 rules;
- update `SYSTEM.md` with Agent-specific durable boundary;
- update README roadmap/current milestone;
- repair stale `.env.example` Remotion CLI pin if it disagrees with accepted repository pin;
- no product behavior changes.

Gate:

```text
changed scope is governance/config truth only
Project Schema 2.0.0 unchanged
engine dependency pins unchanged
CI green
merge R0
```

Local Codex: no.

---

# 4. A0 — Agent Contracts + Provider Abstraction

Suggested branch:

`feature/v2.3-a0-agent-contracts`

Create/reuse bounded modules under `lib/ai/`.

Expected files:

```text
lib/ai/schema.ts
lib/ai/provider.ts
lib/ai/mock-provider.ts
lib/ai/errors.ts
lib/ai/index.ts

tests/ai-agent-schema.test.ts
tests/ai-provider-contract.test.ts
```

Deliver:

- `AgentMessageSchema`;
- `AgentToolDefinitionSchema`;
- `AgentToolCallSchema`;
- `AgentToolResultSchema`;
- `AgentProposalSchema`;
- normalized provider event/error schemas;
- provider-neutral `AIProvider` interface;
- deterministic mock provider supporting text + tool call sequences + failure fixtures;
- cancellation/abort contract;
- no network and no real secret.

Tests:

- valid/invalid message parsing;
- tool call schema rejection;
- proposal requires base Project revision;
- provider events normalized;
- mock provider deterministic ordering;
- abort terminates stream;
- no mutation APIs in provider abstraction.

Gate:

```text
format/lint/typecheck/unit/build PASS
no Project Schema changes
no dependencies added unless separately justified
CI green
```

Local Codex: no.

---

# 5. A1 — Context Builder + Allow-listed Tool Registry

Suggested branch:

`feature/v2.3-a1-context-tools`

Expected modules:

```text
lib/ai/context.ts
lib/ai/tools/schema.ts
lib/ai/tools/registry.ts
lib/ai/tools/read-tools.ts
lib/ai/tools/proposal-tools.ts
```

Reuse:

- `ProjectRepository`;
- current selection model;
- current Scene/Script/Brand/Linked Style schemas;
- `VisualPlanService`;
- Workflow read/services;
- Project command schemas.

Context builder requirements:

- bounded deterministic snapshot;
- `projectId` + `baseProjectRevision`;
- project-relative/logical IDs only;
- selection-aware;
- no raw arbitrary local file reads;
- no automatic raw-media upload.

Tool registry requirements:

- registry is explicit allow-list;
- each tool has input/output Zod schema;
- classify `read`, `proposal`, `mutating-request`;
- reject unknown tools;
- no raw shell/fs/network/Git tools;
- proposal tools return `AgentProposal`, not Project mutations.

Tests:

- context from Project + Scene + Script range + Clip selection;
- context size/bounds;
- absolute machine paths excluded;
- unknown tool rejected;
- malformed args rejected before handler;
- proposal tool leaves repository Project unchanged;
- Rules Director can be surfaced through a bounded proposal tool without creating a second visual planner.

Local Codex: no.

---

# 6. A2 — Session Store + Multi-turn Agent Runner

Suggested branch:

`feature/v2.3-a2-agent-runtime`

Expected modules:

```text
lib/ai/session/schema.ts
lib/ai/session/repository.ts
lib/ai/runner.ts
lib/ai/budget.ts
lib/ai/service.ts
```

Persistence:

- outside `project.json`;
- atomic writes using accepted filesystem/repository patterns;
- session references current Project but is not Project truth;
- normalized messages/tool calls/proposals/errors only;
- no provider secret persistence.

Runner:

```text
load latest Project/context
→ provider stream
→ validate tool calls
→ execute allow-listed tools
→ append normalized result
→ enforce turn/tool/time budgets
→ produce answer/proposal
→ persist session
```

Tests:

- multi-turn context continuation;
- session reopen;
- provider failure leaves Project unchanged;
- max turns/tool calls terminate;
- cancel produces terminal cancelled turn;
- incomplete session recovers safely;
- proposal generated at revision N becomes stale when Project reaches N+1;
- same approved operation ID is idempotent.

Local Codex: normally no. Real process-kill/restart is deferred to A6.

---

# 7. A3 — Production Real Provider

Suggested branch:

`feature/v2.3-a3-real-provider`

Implementation rule:

Before writing provider-specific request payloads, verify the provider's current official API/tool-calling/structured-output contract.

Core stays provider-neutral.

Expected work:

- one production provider adapter;
- server-only environment config;
- streaming/tool-call normalization;
- strict schema/argument validation;
- timeout/abort;
- normalized rate-limit/auth/network/provider-output errors;
- provider model selected via runtime config, not Project JSON;
- `.env.example` documents empty variable names only.

Prefer avoiding a new dependency if the provider can be cleanly implemented through the runtime HTTP client without sacrificing correctness. If a provider SDK is intentionally added, package-lock generation is a controlled dependency-change step and must be reviewed separately.

Cloud tests:

- mocked HTTP/provider fixtures;
- tool call sequence;
- invalid output;
- auth error normalization;
- rate limit normalization;
- timeout/abort;
- secret redaction.

First mandatory Local Codex gate:

```text
exact green SHA
→ local .env.local real key
→ one live read-only Agent turn
→ one live structured tool call
→ no Project mutation
→ verify no key leakage
```

If a code/config/test fix is pushed during local validation, freeze is invalidated; GPT Web reviews new HEAD + CI before local validation continues.

---

# 8. A4 — AI Workspace Agent UX + Review / Apply

Suggested branch:

`feature/v2.3-a4-agent-workspace`

Reuse `components/studio/AIWorkspacePanel.tsx`; do not create a parallel Studio.

Target:

```text
AI Workspace
├─ Agent
├─ Composer
└─ Workflow
```

Expected UI pieces:

- session picker/new session;
- conversation list;
- composer input;
- context chips from current selection;
- streaming/status indicator;
- concise tool activity;
- proposal card;
- structured Review/Diff;
- Apply Selected / Apply / Reject;
- stale proposal warning/re-plan;
- cancel;
- error/retry;
- reopen after browser reload.

Mutation path:

```text
UI confirm
→ Agent application service
→ expectedRevision
→ proposal operation resolution
→ existing Command Transaction/bounded service
→ reload latest Project
```

Cloud tests:

- component/pure tests where available;
- API tests;
- Playwright flow with deterministic mock provider;
- no direct mutation before confirmation;
- stale proposal cannot Apply;
- one Apply = one logical undoable transaction where applicable.

Local gate after cloud green:

- real browser;
- real provider;
- real Project selection context;
- real proposal/review/apply;
- reload/reopen.

---

# 9. A5 — Agent ↔ Workflow Integration

Suggested branch:

`feature/v2.3-a5-agent-workflow`

Add only bounded tools/services over existing V2.2 Workflow Runtime.

Initial allowed actions:

- get workflow status/stages/reviews;
- explain current/failed stage from structured data;
- request first-draft Workflow creation through existing API/service;
- request retry/resume when state permits and user confirms;
- inspect workflow artifacts;
- request final render only through accepted path and explicit user intent.

Forbidden:

- direct Workflow JSON writes;
- arbitrary Stage construction;
- Stage status spoofing;
- direct engine process spawn;
- second Job runtime.

Tests:

- Agent tool maps to existing service;
- invalid workflow transition rejected;
- retry/resume preserves Job/Workflow rules;
- read-only explanation does not mutate;
- user confirmation boundary for mutating requests.

Local Codex only if acceptance needs real workflow/media/engines; otherwise finish online first.

---

# 10. A6 — Hardening / Recovery

Suggested branch:

`feature/v2.3-a6-agent-hardening`

Cloud chaos tests first:

- provider timeout;
- provider malformed tool call;
- unknown tool;
- tool handler failure;
- budget exhaustion;
- cancellation;
- Project revision conflict;
- duplicate Apply retry;
- session partial write/reopen;
- workflow action failure;
- provider retry after recoverable error.

Mandatory local exact-SHA cases:

- browser/app restart with persisted Agent session;
- interrupt active provider/turn if reproducible;
- local Project manually edited before Apply;
- real provider retry;
- no duplicate mutation;
- no orphan process/lock introduced by Agent integration;
- existing real engines remain unaffected.

---

# 11. A7 — End-to-End Product Acceptance

Suggested branch:

`release/v2.3-final-acceptance`

Cloud acceptance harness/docs first, then freeze exact green SHA.

Mandatory local cases from Master PRD:

A. Talking Head conversational hook edit.

B. Product Ad proof/number/CTA edit with visible final encoded result.

C. Multi-turn stale proposal/manual-edit conflict and re-plan.

D. Session restart/reopen recovery.

Record:

```text
Exact tested SHA
Project IDs
Session IDs / turn IDs
Provider/model
Project revisions before/after
Tool calls (normalized, no secrets)
Proposal IDs/status
Apply operation IDs
Workflow/Job IDs when involved
final MP4 path + ffprobe/frame evidence when visuals changed
reload/reopen/restart evidence
cleanup
```

No V2.3 release merge until required cloud + local gates pass.

---

# 12. Stop / Handoff Rules

GPT Web does not stop in the middle of pure TypeScript/domain/API/test work.

Hand off to Local Codex only when the next unproven requirement genuinely depends on:

- a real provider API key/live network behavior;
- Windows/browser interaction;
- real media/codecs;
- video-use/FFmpeg/HyperFrames/Remotion;
- process restart/chaos;
- final encoded-video evidence.

Every Codex handoff must name:

```text
Repository
Branch
Exact frozen SHA
Goal
Allowed files
Forbidden scope
Environment/data root
Commands
Fixtures
Manual actions
Acceptance gates
Evidence
Stop rule after any pushed fix
Return format
```

---

# 13. Release Boundary

V2.3 release version is chosen only after A7 passes. Do not bump package version during A0-A6 unless the release workstream explicitly starts.

Project Schema stays `2.0.0` throughout V2.3 by default.

The V2.2.0 tag stays immutable and must never be moved.
