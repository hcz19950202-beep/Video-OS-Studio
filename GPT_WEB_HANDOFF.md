# Video OS Studio — GPT Web / Local Codex Handoff

> Updated: 2026-08-22 (Asia/Shanghai)  
> Current milestone: **V2.1.1 Engineering Hardening**  
> Current-state source of truth: [`PROJECT_STATUS.md`](PROJECT_STATUS.md)

## 1. Current truth

Repository:

```text
hcz19950202-beep/Video-OS-Studio
```

Released product baseline:

```text
Video OS Studio v2.1.0
main at milestone start: fcfb341367b6ff5e8911693483c14196386c5a93
Project Schema: 2.0.0
```

V2.1 is accepted. PR #14 and PR #15 are merged. The eight-canvas Windows acceptance and V2.1 release closeout are historical evidence, not active work.

Current active work is always listed in `PROJECT_STATUS.md`.

## 2. Development model

```text
GPT Web + GitHub
    │
    ├─ architecture / PRD
    ├─ cloud-safe code changes
    ├─ branches / PRs / CI
    ├─ unit/API/contract tests
    └─ review + merge decision

Local Codex on Windows
    │
    ├─ real browser
    ├─ real media outside Git
    ├─ FFmpeg / ffprobe
    ├─ Remotion / Chrome
    ├─ HyperFrames
    ├─ video-use / Python
    ├─ memory/performance checks
    └─ local defect fixes + evidence
```

They cooperate through GitHub commits, not through two independent copies of the implementation.

## 3. Workstream handoff protocol

### GPT Web phase

1. Read `PROJECT_STATUS.md` and `AGENTS.md`.
2. Create the next workstream branch from the accepted `main` SHA.
3. Implement cloud-safe scope only.
4. Add relevant tests.
5. Inspect GitHub CI.
6. Freeze an exact green branch SHA.
7. Update `PROJECT_STATUS.md` with that SHA and local gate requirements.

### Local Codex phase — only when local evidence is required

Codex receives:

```text
Repository
Branch
Exact SHA
Active workstream
Allowed files/areas
Required commands
Real-media fixtures
Acceptance gates
Stop rules
```

Codex then:

```text
git fetch
→ checkout exact active branch
→ verify expected SHA
→ use isolated Windows worktree/data root
→ run local acceptance
→ fix only in-scope defects
→ add regression tests
→ commit + push to same branch
→ return evidence + exact final SHA
```

Codex does not merge and does not begin the next workstream.

### GPT Web closeout phase

1. Review Codex commits/diff.
2. Confirm latest CI for the returned head.
3. Confirm required local evidence.
4. Merge if accepted.
5. Update `PROJECT_STATUS.md` to new main and next workstream.

## 4. Permanent product invariants

```text
Source Media != Project Canvas != Export Profile
```

Always preserve:

- Project JSON is durable project truth;
- canonical time is frames;
- durable project changes use validated Commands / Transactions / bounded services;
- UI does not spawn CLI tools directly;
- Agents do not hand-edit runtime `project.json`;
- Remotion remains the master composition/render engine;
- HyperFrames remains behind its adapter/service boundary;
- video-use and FFmpeg remain behind adapters/services;
- repository code and runtime media remain separate through `VIDEO_OS_DATA_ROOT`;
- Studio UI theme/locale remain separate from Generated Video Brand;
- `REUSE > MODIFY > CREATE`.

## 5. V2.1.1 workstreams

Authoritative PRD:

```text
docs/prd/Video_OS_Studio_V2_1_1_Engineering_Hardening_Master_PRD.md
```

Sequence:

```text
R0 Repository Truth / Agent Guardrails
H0 Correctness Hotfix
H1 Project Transaction Safety
H2 Engine Process Runtime
H3 Durable Job Runtime
H4 Streaming Media Pipeline
H5 Project / Data Hardening
H6 Automated Acceptance
H7 Frontend Consolidation
```

Do not combine unrelated workstreams into one PR.

## 6. Current high-priority problems

V2.1.1 is specifically meant to eliminate:

- Script editing that can rebuild/delete the wrong Video clip state;
- stale/lost Project updates;
- long-running tasks attaching results from old Project snapshots;
- mismatched/unpinned external engine runtime versions;
- in-memory-only Render jobs with no cancellation/recovery;
- full-file buffering for GB-scale upload/Range responses;
- historical migration schemas depending on current mutable schemas;
- incomplete project referential integrity;
- stale repository/agent instructions;
- insufficient Windows/API/browser automation.

## 7. V2.1 accepted product state

Do not re-open already accepted V2.1 feature work unless a hardening regression proves a defect.

Accepted product scope includes:

- universal Canvas including custom aspect ratios;
- AI-first Edit / AI / Script / Motion workspace shell;
- deterministic rules-based AI Composer / Director;
- canvas-aware planning and density restraint;
- Safe Area profiles;
- responsive effect capability metadata;
- Scenario Starter;
- universal media ingest with automatic normalization for supported non-working formats;
- Export Profile;
- semantic Inspector;
- Timeline V2;
- Windows eight-canvas real final-render validation.

The AI Director still intentionally reports the deterministic rules provider. A real external AI provider is not V2.1.1 scope.

## 8. Stop rules

Do not add during V2.1.1 unless `PROJECT_STATUS.md` and the active PRD are deliberately revised:

- real external AI Provider;
- broad AI Command Bar;
- V2.2 Workflow Runtime implementation;
- multi-timeline;
- arbitrary docking;
- full Crop / Mask;
- transition suite;
- generated-media marketplace;
- cloud collaboration;
- HDR/pro color;
- desktop packaging;
- unrelated large visual redesign.

## 9. Verification discipline

Cloud baseline:

```text
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

If the active branch adds formatter checks, include them.

Cloud CI proves repository code health. It does not prove:

- Windows process behavior;
- real browser interaction;
- real-media codec compatibility;
- Remotion/Chrome local behavior;
- HyperFrames;
- video-use;
- FFmpeg performance;
- large-file memory behavior.

Those require local Codex evidence when the active workstream calls for it.

## 10. Local Codex return format

Every local handoff must return:

```text
Final branch HEAD
Commits pushed
Environment summary
Commands executed
Automated test results
Real-media/engine evidence
Defects found
Fixes applied
Regression tests added
Remaining Failed Items
```

No PASS is accepted without the evidence defined by the active workstream.
