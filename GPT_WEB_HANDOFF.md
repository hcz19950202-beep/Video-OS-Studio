# Video OS Studio — GPT Web / Local Codex Handoff

> Updated: 2026-08-26 (Asia/Shanghai)  
> Current milestone: **V2.3 Real AI Director / AI Editing Agent**  
> Current-state source of truth: [`PROJECT_STATUS.md`](PROJECT_STATUS.md)

## 1. Current truth

Repository:

```text
hcz19950202-beep/Video-OS-Studio
```

Released baseline:

```text
Video OS Studio v2.2.0
Release tag: v2.2.0
Release commit: 0e813e5e1360318211e05c1c5fec5eb82be00224
Project Schema: 2.0.0
```

V2.2 is closed. V2.3 is a new workstream for the production Real AI Director / multi-turn AI Editing Agent.

## 2. Authoritative V2.3 documents

Read after `PROJECT_STATUS.md`, `AGENTS.md` and `SYSTEM.md`:

```text
docs/prd/Video_OS_Studio_V2_3_Real_AI_Director_Agent_Master_PRD.md
docs/prd/Video_OS_Studio_V2_3_Development_Plan.md
```

V2.3 sequence:

```text
R0 Repository / PRD / Runtime Truth Sync
→ A0 Agent Contracts + Provider Abstraction
→ A1 Context Builder + Allow-listed Tool Registry
→ A2 Agent Session Store + Multi-turn Runner
→ A3 Production Real Provider Adapter
→ A4 AI Workspace Agent UX + Review / Apply
→ A5 Agent ↔ Workflow Integration
→ A6 Failure / Revision / Retry / Restart Hardening
→ A7 End-to-End Real Provider Product Acceptance
→ V2.3 Release
```

## 3. Development model

```text
GPT Web + GitHub
    │
    ├─ product decisions / architecture / PRD
    ├─ cloud-safe implementation
    ├─ branches / PRs / CI
    ├─ unit / route / contract / integration tests
    ├─ mocked-provider tests
    ├─ browser automation when cloud-safe
    └─ review + merge + PROJECT_STATUS

Local Codex on Windows
    │
    ├─ live provider credential/network smoke
    ├─ real browser
    ├─ real media outside Git
    ├─ FFmpeg / ffprobe
    ├─ Remotion / Chrome
    ├─ HyperFrames
    ├─ video-use / Python
    ├─ process termination / restart recovery
    └─ in-scope local fixes + evidence
```

GitHub is the only code source of truth. The two environments never maintain competing implementations.

## 4. Online-first policy

Do not hand a workstream to Local Codex just because code exists.

GPT Web continues all cloud-safe implementation, tests, CI fixes and merge work until the next unproven gate genuinely depends on local/live behavior.

Expected ownership:

```text
R0: online only
A0: online only
A1: online only
A2: online first; process-kill evidence can wait for A6
A3: online implementation + mocked provider tests, then live-provider Codex gate
A4: online UI/API/browser tests first, then real browser + real provider Codex gate
A5: online first; local only for real workflow/media/engine evidence
A6: online chaos tests + mandatory Windows/restart Codex gate
A7: mandatory real provider/browser/media/encoded-output Codex acceptance
```

## 5. Permanent architecture invariants

```text
Source Media != Project Canvas != Export Profile
Project != Workflow != Job
Agent Session != Project
```

And:

- Project JSON is durable editing truth;
- internal time is frames;
- Agent sessions live outside Project JSON;
- Project Schema stays `2.0.0` by default;
- durable changes use existing Commands / Transactions / bounded services;
- Agent/Workflow never hand-edit runtime `project.json`;
- UI/Agent/Workflow never spawn external CLIs directly;
- long-running work preserves revision/idempotency;
- Remotion remains master renderer;
- HyperFrames/video-use/FFmpeg remain behind adapters/services;
- `VIDEO_OS_DATA_ROOT` separates runtime data from repo code;
- `REUSE > MODIFY > CREATE`.

## 6. Real Agent safety contract

Required mutation flow:

```text
User goal
→ bounded context
→ provider + typed allow-listed tools
→ explanation / validated proposal
→ Preview Diff
→ user confirmation
→ existing Command Transaction / bounded service
```

The Agent does not receive generic shell/filesystem/Git/network tools.

Provider tool calls are schema-validated before execution. Unknown tools are rejected.

Proposal generated at Project revision N cannot silently apply to revision N+1.

Retry of one confirmed operation must not duplicate Project mutations.

Provider secrets remain server-side in `.env.local` and never enter Project/session/browser/repository truth.

## 7. Existing capabilities to reuse

V2.3 should reuse rather than recreate:

- `AIWorkspacePanel`;
- Studio selection context;
- `VisualPlanService` / `RulesVisualPlannerAdapter`;
- Project Commands / Transactions / `ProjectMutationCoordinator`;
- Workflow Runtime;
- Durable Jobs;
- Remotion / HyperFrames / video-use / FFmpeg services.

The Rules Director remains deterministic fallback/baseline and can be exposed as an Agent tool.

## 8. GPT Web workstream protocol

Before editing:

1. resolve live GitHub main/PR/CI;
2. read current status/constitution/system/active PRD;
3. inspect existing implementation;
4. create one bounded branch;
5. implement cloud-safe scope;
6. add tests;
7. open/update PR;
8. fix CI until green;
9. merge when all required gates pass;
10. update current status and immediately continue to the next cloud-safe workstream.

## 9. Exact Local Codex trigger

Local evidence is required when correctness depends on one or more of:

- live provider API key/network/tool-calling behavior;
- Windows process semantics;
- real browser interaction;
- real media/codecs;
- FFmpeg / ffprobe;
- video-use / Python;
- HyperFrames runtime;
- Remotion / Chromium final rendering;
- application/process interruption/restart;
- final encoded-video proof.

## 10. Exact handoff contract

Every handoff must contain:

```text
Repository
Branch
Exact frozen SHA
Active workstream
Goal
Allowed files/areas
Forbidden scope
Setup / isolated VIDEO_OS_DATA_ROOT
Secret/provider setup rules when applicable
Commands
Required fixtures
Manual actions
Acceptance gates
Evidence to capture
Stop rules
Expected return format
```

Codex begins with fetch/checkout and verifies HEAD equals the supplied SHA.

If Codex pushes any code/config/test/runtime fix, it stops local acceptance. GPT Web reviews the new HEAD + GitHub CI and freezes a new exact SHA before local testing continues.

Codex never merges and never starts the next workstream.

## 11. V2.3 provider handoff rule

A3 is the first expected mandatory live-provider local gate.

The cloud branch must already have:

```text
provider-neutral contracts
real provider adapter
mocked provider/HTTP tests
secret redaction tests
error normalization tests
CI green
```

Only then provide Codex an exact SHA and ask for a live `.env.local` smoke using a real key. Never send the secret through GitHub/chat/report output.

## 12. V2.3 UI/media handoff rule

A4/A7 local acceptance must prove the real product path:

```text
real Project
→ Agent session
→ selected Scene/Script/Clip context
→ live provider tool use
→ proposal
→ Review/Diff
→ user Apply
→ revision-safe Project mutation
→ reload/reopen
→ real Preview/Final Render when visual changes are accepted
```

Where final visuals are part of acceptance, inspect the actual encoded output rather than inferring success from Project JSON.

## 13. Local return format

Codex returns:

```text
Final branch HEAD
Commits pushed
Environment summary
Provider/model summary without secret
Commands executed
Automated test results
Browser/media/engine evidence
Project/session/proposal/operation IDs
Revision/idempotency evidence
Defects found
Fixes applied
Regression tests
Remaining failures
```

No PASS is accepted without evidence named by the active handoff.

## 14. Release boundary

The V2.2.0 tag `v2.2.0` is immutable and must never be moved.

Do not begin V2.3 release-version bump/tag work before A7 is accepted.
