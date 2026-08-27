# Video OS Studio V2.3.1 — Engineering Hardening Development Plan

Baseline: released `v2.3.0`
Master PRD: `docs/prd/Video_OS_Studio_V2_3_1_Engineering_Hardening_Master_PRD.md`
Project Schema: `2.0.0`

## Operating model

GitHub remains the code source of truth.

GPT Web + GitHub owns:

- scope, contracts, architecture, branches and PRs;
- cloud-safe implementation;
- focused regression tests;
- code review and exact-head CI;
- merge decisions and `PROJECT_STATUS.md` truth.

Local Codex on Windows owns only gates cloud CI cannot prove:

- real Windows file/process behavior;
- FFmpeg/ffprobe;
- Remotion/Chromium rendering;
- HyperFrames/video-use execution;
- live provider/network behavior when required;
- restart/kill/recovery/concurrency evidence;
- encoded-video inspection.

No stage may be merged because “the fix is obvious.” Every admitted defect needs regression evidence and exact-head CI.

---

## R0 — Hardening Truth / PRD Sync

Branch: `planning/v2.3.1-engineering-hardening`

Scope:

- add V2.3.1 Master PRD;
- add this development plan;
- update `PROJECT_STATUS.md` to mark V2.3.1 active while preserving immutable v2.3.0 release truth;
- no product code change;
- no Project Schema or engine pin change.

Gate:

- docs diff review;
- full GitHub CI because repository truth changes govern all later agents;
- merge before H0 begins.

Local Codex: not required.

---

## H0 — Correctness / Resource Hygiene / Safe Errors

Recommended branch: `hardening/v2.3.1-h0-correctness-resource-hygiene`

### H0.1 Player bridge remount correctness

Files expected:

- `components/player/StudioPreview.tsx`
- `components/player/usePlayerStoreBridge.ts`
- focused player/browser tests

Contract:

- listeners always attach to the current Remotion Player instance after key-driven remount;
- old instance listeners are removed;
- currentFrame/isPlaying continue updating after project/canvas/duration changes.

### H0.2 Prettier direct dependency

Files expected:

- `package.json`
- `package-lock.json`

Contract:

- `prettier` is explicit devDependency pinned to the formatter-expected version;
- no dependency or engine drift beyond that intentional addition;
- Local Codex may be used to generate/verify lockfile if necessary.

### H0.3 Provider HTTP cleanup

Files expected:

- `lib/ai/providers/openai-responses.ts`
- `lib/ai/providers/deepseek-chat.ts`
- `lib/ai/providers/volcengine-agent-plan.ts`
- provider tests

Contract:

- non-2xx responses explicitly cancel/drain body before terminal error;
- model-visible error remains sanitized;
- timeout/abort behavior remains unchanged.

### H0.4 Agent iterator/controller cleanup

Files expected:

- `lib/ai/runner.ts`
- Agent runtime tests

Contract:

- every provider round releases iterator/controller in a `finally` path;
- cancellation and provider failure remain durable and idempotent;
- no duplicate tool execution/proposal.

### H0.5 Render temporary artifact cleanup

Files expected:

- `adapters/hyperframes.ts`
- `adapters/remotion-cli.ts`
- adapter tests / Windows media smoke

Contract:

- `.hf-work` and `.props.json` are cleaned on success, failure and cancellation where safe;
- final outputs and diagnostics required by accepted Job artifacts remain untouched.

Local Codex exact-SHA Windows media gate required because real process/file cleanup is platform-sensitive.

### H0.6 Safe unknown errors

Files expected:

- `lib/workflows/http.ts`
- similar mutation/server error boundaries as proven necessary
- tests

Contract:

- unknown internal failures → HTTP 500 + stable public code/message;
- raw Error message/path is not returned to browser/provider;
- known domain errors retain existing status/code semantics.

### H0.7 Bounded Volcengine JSON completion

Contract:

- non-stream response body has a strict bounded byte/character policy before JSON parse;
- normal real Agent Plan completion remains accepted;
- oversized/malformed response fails sanitized and non-mutating.

### H0.8 Agent tool internal observability

Contract:

- unexpected tool handler failure emits server-side structured diagnostics with request/session/turn/tool identifiers where available;
- secret values, raw media, authorization and unsafe paths are not logged;
- model-visible result remains `tool_execution_failed` with sanitized text.

### H0.9 Environment truth sync

Update `.env.example` only for variables actually consumed by accepted runtime code. Mark obsolete variables clearly or remove only after code search proves they are unused.

### H0 merge gate

- exact head frozen;
- Ubuntu verify PASS;
- Windows verify PASS;
- Browser Smoke PASS;
- Windows Media Smoke PASS;
- mandatory Local Codex real Windows cleanup acceptance for H0.5 and any lockfile/runtime process change;
- no unresolved P0 correctness regression.

---

## H1 — Editing Commit Boundary

Recommended branch: `hardening/v2.3.1-h1-editing-boundary`

Order:

1. create reusable draft/commit helpers or component pattern;
2. migrate Scene Inspector text fields;
3. migrate Motion/Media timing/transform controls;
4. migrate Project/LinkedStyle color/range controls;
5. add current-project async response guard;
6. debounce ordinary `refreshRecent()` updates.

Regression cases:

- type `Example Scene` continuously → no Project mutation until commit → revision +1;
- blur/Enter does not double-commit;
- external Undo while draft exists refreshes correctly;
- slider drag of many pointer events → one mutation/history entry;
- switch Project A→B while A request is in flight → B remains active;
- revision conflict reloads latest Project and never silently overwrites it.

Local Codex: real browser acceptance recommended before merge.

---

## H2 — Playback / Timeline / Waveform Performance

Recommended branch: `hardening/v2.3.1-h2-playback-timeline`

Order:

1. isolate `TimelinePlayhead` current-frame subscriber;
2. isolate static tracks/clips from frame-frequency state;
3. stabilize one global keyboard listener with current action refs;
4. fix Waveform dependency identity;
5. add waveform request cache/dedup;
6. coalesce timeline drag draft updates with rAF if profiling supports it;
7. isolate Script active-word rendering from static transcript structure.

Acceptance:

- 30fps playback produces correct playhead/time/script highlighting;
- no repeated waveform network request after unrelated Project command;
- keyboard shortcuts continue to use latest selection/project state;
- drag/snap/marquee behavior unchanged;
- browser smoke passes normal Timeline interactions.

Local Codex: real browser acceptance required if cloud browser cannot reproduce the actual Remotion playback cadence.

---

## H3 — Durable Runtime I/O

Recommended branch: `hardening/v2.3.1-h3-durable-runtime-io`

H3 must be split into multiple PRs if any change touches locks/recovery and operation ledger at the same time.

### H3.1 Polling baseline

- change default Workflow Job polling from 25 ms to 250–500 ms;
- keep test injection for fast deterministic tests;
- verify Workflow cancellation/pause/completion latency remains acceptable.

Cloud-safe first; local real Workflow timing acceptance after cloud green.

### H3.2 Job completion notification fast path

- add per-job terminal notification/wait contract;
- durable `job.json` remains truth;
- startup/restart must recover without prior in-memory event;
- fallback polling remains for lost notification/cross-runtime situations.

Local Windows restart gate mandatory.

### H3.3 Job list/log I/O

- tail-read log endpoints;
- optional log write coalescing;
- query/list only required recent Job metadata where possible;
- preserve complete durable history on disk.

### H3.4 Startup process probing

- deduplicate by PID;
- probe unique PIDs concurrently with bounded concurrency;
- cache result within one initialize pass;
- preserve runtime-owner semantics.

Local Windows gate mandatory.

### H3.5 Operation ledger compaction

Design before code:

- append/record format must tolerate a partial final record;
- compaction is atomic;
- all non-terminal operations are retained;
- enough applied operation identity is retained for accepted idempotency horizon;
- crash during compaction cannot lose Project truth or make an already-applied operation apply twice.

Mandatory tests:

- partial tail recovery;
- crash between Project save and operation terminal record;
- concurrent duplicate Apply;
- restart after compaction;
- old applied operation idempotency according to the declared retention contract.

Full Local Codex Windows chaos gate required.

---

## H4 — Local-First Security Boundary

Recommended branch: `hardening/v2.3.1-h4-local-security`

Order:

1. explicitly bind documented/dev-supported local runtime to loopback by default;
2. centralize trusted local asset-base URL resolution;
3. remove render trust in arbitrary request Host/origin where possible;
4. add tests that malicious Host input does not become an engine asset origin;
5. verify Remotion, media Range, final download and Workflow final render still work;
6. document remote/LAN exposure as unsupported unless explicitly opted in.

Do not add broad auth middleware in this stage unless an explicit remote mode is designed and its internal media/renderer credential flow is specified.

Local real render gate mandatory.

---

## H5 — Patch Release Acceptance

Recommended branch: `release/v2.3.1-final-acceptance`

Formal cases:

A. Player remount + Timeline playback + Script highlight after canvas/project changes.

B. Inspector editing boundary: text/range/color edits produce bounded logical Project revisions and Undo semantics.

C. Real Workflow/Job path: real media → Workflow → Agent-compatible Project truth → final H.264/AAC render, with no leaked temp artifacts and acceptable polling/IO behavior.

D. Restart/idempotency: restart during/after durable Job and Proposal states; no duplicate operation, no stale lock, same recovery invariants as V2.3 A7.

E. Local security: loopback/trusted-origin behavior does not break media range or Remotion final render.

Release gate:

- exact tested product SHA;
- formal local report;
- final report-only CI;
- package version/lock metadata to `2.3.1` only after acceptance;
- annotated `v2.3.1` tag after release-finalization merge and independent verification.

---

## Hard boundaries for all agents

Do not:

- start V2.4 features;
- change Project Schema from `2.0.0`;
- upgrade engine pins during hardening unless separately approved as a blocker fix;
- remove Windows durability locks because a Linux-style optimization seems safe;
- replace durable Job/Workflow truth with an in-memory event bus;
- bypass Proposal/Review/Confirm for Agent mutation;
- expose secrets, raw provider bodies, local absolute paths or raw media to the model;
- merge a branch before exact-head CI and any declared Local Codex gate pass.
