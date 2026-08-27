# Video OS Studio V2.3.1 — Engineering Hardening Master PRD

Status: PROPOSED / ACTIVE PLANNING
Baseline release: `v2.3.0`
Immutable release commit: `562ffb26d5a04bd2898513893258f857187a00b4`
Project Schema: `2.0.0` (must remain unchanged unless separately approved)

## 1. Purpose

V2.3.1 is a bounded engineering-hardening release on top of the accepted V2.3.0 product. It is not a V2.4 feature release and must not introduce a second editor, second Workflow Runtime, second Durable Job system, or new AI mutation architecture.

The workstream exists to remove confirmed correctness, responsiveness, resource-hygiene, I/O, observability, and local-security defects discovered by post-release review while preserving all V2.3.0 acceptance guarantees.

Primary themes:

1. correctness boundaries;
2. editing commit boundaries;
3. rendering/performance boundaries;
4. resource lifecycle hygiene;
5. durable runtime I/O efficiency;
6. local-first security boundary;
7. regression coverage for each fix.

## 2. Source findings and disposition

A third-party optimization review was originally based on V2.3 A3 (`f102e8a`). Findings were re-validated against immutable release tag `v2.3.0`. Only findings still supported by the current release are admitted into V2.3.1.

### Accepted for V2.3.1

- Player event bridge may remain bound to an old Remotion Player after key-driven remount.
- Several Inspector text/range/color controls commit every change directly to Project mutation/history.
- Prettier is used and version-checked but is not a direct devDependency.
- Provider non-2xx responses can return without explicitly releasing/cancelling bodies.
- Agent provider iterator/controller cleanup is not centralized in a guaranteed `finally` boundary.
- HyperFrames `.hf-work` and Remotion `.props.json` temporary artifacts are not guaranteed to be cleaned after execution.
- Timeline and Script rendering boundaries subscribe too broadly to frame-frequency state.
- Timeline keyboard listener lifecycle is coupled to rerenders.
- Waveform requests depend on unstable asset-object identity and have no request cache.
- Workspace command flow refreshes recent-project summaries too frequently.
- Some async project-refresh paths need a current-project guard/cancellation contract.
- Workflow Job reconciliation defaults to 25 ms durable-state polling.
- operation ledger growth/rewrite behavior needs bounded compaction design.
- Workflow unknown internal errors are currently mapped as client 400 with raw error messages.
- Volcengine non-stream JSON completion lacks an explicit response-size bound.
- Agent tool internal failures are sanitized for the model but lack server-side structured diagnostics.
- `.env.example` does not fully describe runtime variables currently consumed by accepted code.
- Durable Job list/log paths perform avoidable full-history/full-file I/O as history grows.
- Job startup recovery probes process liveness serially.
- Runtime singletons are only partially routed through the global runtime registry.
- Production-build browser smoke is not explicitly separated from dev-server browser smoke.

### Accepted only with a safer design than the external report proposed

- Workflow polling: event notification may be added only as a fast path. Durable Job truth remains authoritative and fallback polling/restart recovery must remain.
- operation ledger: do not replace atomic durability with unsafe blind append. Any append/compaction design must tolerate partial tail records and preserve pending/idempotency recovery.
- security: do not place a naive global token middleware in front of media/Remotion asset fetches. First harden loopback defaults and trusted asset-base URL handling; remote mode is a separate future product decision.
- provider refactor: only extract behavior-neutral shared utilities first. Do not collapse all production providers into one base class in this release.
- provider retries: no automatic whole-turn retry. Any future transport retry must prove no semantic output/tool call was emitted before retry.

### Explicitly rejected / deferred

- removing Project/Workflow read locks merely for performance;
- weakening unknown-tool fail-closed behavior;
- replacing accepted model allow-lists with arbitrary runtime model strings;
- large provider hierarchy refactor;
- adding temperature/top-p as a release requirement;
- treating the old A3 claim that Agent has no production wiring as current truth;
- automatic Playwright retries as a way to hide intermittent deterministic failures;
- Project Schema changes;
- engine pin changes unless a separately proven blocker requires them.

## 3. Non-negotiable V2.3.0 invariants

The following must remain true through every V2.3.1 PR:

```text
Project Schema: 2.0.0
Node: 24.x
Remotion: 4.0.513
HyperFrames: 0.8.10
Playwright: 1.62.1

Source Media != Project Canvas != Export Profile
Project != Workflow != Job
Agent Session != Project
```

Safety and durability:

- Project JSON remains the durable editing truth.
- Workflow state remains separate durable orchestration truth.
- Durable Job state remains execution truth.
- Agent/provider/tool code has no direct Project or Workflow mutation authority.
- Proposal → Review/Diff → explicit confirmation remains required for Agent mutations.
- Project revision and operation idempotency guards remain fail-closed.
- Windows crash/restart/concurrency semantics from V2.2 W5 and V2.3 A6/A7 must not regress.
- Server-side Studio selection remains authoritative for Agent planning.
- Provider secrets remain server-only and never enter Project or Agent Session persistence.

## 4. Workstreams

### H0 — Correctness / Resource Hygiene / Safe Errors

Goal: low-risk, high-value fixes with narrow regression coverage.

Required scope:

1. Remotion Player bridge remount-safe listener binding.
2. Add direct pinned Prettier devDependency matching formatter contract.
3. Cancel/drain provider non-2xx response bodies before returning errors.
4. Guarantee provider iterator/controller cleanup in Agent Runner.
5. HyperFrames and Remotion temporary artifact cleanup with `finally` semantics.
6. Sanitize unknown Workflow/internal HTTP failures as server errors without raw internal messages.
7. Add bounded Volcengine non-stream response reader/parser.
8. Add server-side structured logging for unexpected Agent tool failures while keeping model-visible errors sanitized.
9. Synchronize `.env.example` with runtime environment variables actually consumed by accepted code.

Acceptance:

- targeted unit/contract tests for every behavior;
- full Ubuntu/Windows verify;
- browser smoke;
- Windows media smoke;
- no Project Schema/engine-pin/product architecture change.

Local Codex is required only if a fix changes real process/media/Remotion/HyperFrames lifecycle behavior in a way cloud smoke cannot prove.

### H1 — Editing Commit Boundary

Goal: one human editing intent should normally produce one Project mutation/history entry.

Required scope:

- text/textarea controls use local draft and commit on blur/Enter according to control semantics;
- range/transform/color interactions preview locally and commit once at end of interaction;
- external Project changes (Undo/Redo/Workflow/Agent) must refresh local drafts safely;
- no stale draft may overwrite a newer Project revision silently;
- recent-project list refresh is immediate for create/import/rename and debounced for ordinary edits;
- async project responses must be rejected when they belong to a project that is no longer active.

Acceptance:

- typing multiple characters produces one logical Project revision on commit;
- slider drag produces one logical Project revision on commit;
- Undo restores the whole user intent, not one keystroke;
- Project revision conflict remains fail-closed;
- project switching during in-flight operations cannot restore the old project into the active workspace.

### H2 — Playback / Timeline / Waveform Rendering Boundary

Goal: frame-frequency player state must not rerender the entire editor surface.

Required scope:

- isolate playhead/current-time subscribers from static timeline tracks and clips;
- stabilize global keyboard listener lifecycle;
- add stable waveform dependencies and request cache/deduplication;
- use rAF/coalescing for pointer-frequency timeline draft updates where beneficial;
- isolate Script current-word/highlight updates from static transcript structure where practical;
- memoize expensive derived values only where profiling/structure supports it.

Acceptance:

- normal playback keeps frame/time/playhead/highlighting correct;
- Player remount remains correct after H0;
- no full waveform refetch after unrelated Project mutation;
- no repeated global keyboard listener rebind per frame;
- deterministic browser regression for timeline interactions.

### H3 — Durable Runtime I/O

Goal: reduce unnecessary filesystem/JSON work without weakening restart safety.

Required scope in order:

1. raise Workflow job polling default from 25 ms to a conservative 250–500 ms baseline;
2. add job-terminal notification/wait fast path only if durable truth + fallback polling remain authoritative;
3. optimize job logs to tail-read instead of full-file read for tail endpoints;
4. batch dense log writes where safe;
5. parallelize/deduplicate startup PID liveness probes;
6. design and implement operation-ledger compaction with crash-safe partial-tail handling;
7. optimize job/workflow list queries without weakening schema validation or recovery semantics.

Forbidden:

- removing accepted Windows read/write locks without replacement proof;
- in-memory-only completion truth;
- deleting historical operation evidence required for idempotency/recovery.

Local Codex Windows chaos/restart validation is mandatory for any change to Workflow/Job/Project locking, recovery, operation ledger, process liveness, or durable persistence semantics.

### H4 — Local-First Security Boundary

Goal: preserve local-first ergonomics while preventing accidental LAN exposure and untrusted render origins.

Required scope:

- production/development startup guidance and scripts default to loopback where supported;
- render/Workflow asset base URL must come from trusted local configuration/request policy rather than blindly accepting a spoofable Host origin;
- remote/LAN exposure is explicit opt-in and not the default supported path;
- security changes must preserve browser media range requests and Remotion/Chromium asset loading.

Deferred:

- account system;
- multi-user auth;
- cloud tenancy;
- naive global `x-video-os-token` middleware covering every internal media request.

## 5. Test strategy

Every hardening fix must first gain a focused regression test that fails on the old behavior where practical.

Cloud gates remain:

```text
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
browser smoke
Windows media smoke
```

Additional rules:

- do not set arbitrary coverage thresholds before recording the real baseline;
- do not enable automatic browser retries as a substitute for fixing deterministic races;
- add production-build browser smoke (`next build` + `next start`) as a distinct gate when H2/H4 reaches it;
- keep live-provider/local real-engine acceptance explicit and exact-SHA based.

## 6. Release model

V2.3.1 is a patch/hardening release. It must not silently become V2.4.

Recommended sequence:

```text
R0 Hardening truth/PRD sync
→ H0 Correctness + resource hygiene
→ H1 Editing commit boundary
→ H2 Playback/timeline performance
→ H3 Durable runtime I/O
→ H4 Local-first security boundary
→ H5 End-to-end regression / patch release acceptance
→ v2.3.1 release finalization
```

Each stage receives its own branch/PR and exact-head CI gate. Local Codex is invoked only when platform/real-engine/restart evidence is required.

## 7. Definition of done

V2.3.1 is ready to release only when:

- all admitted P0/P1 hardening defects in H0–H4 are resolved or explicitly deferred with evidence;
- V2.3 A7 real product paths remain valid;
- no Project Schema or accepted engine pins changed without explicit approval;
- Windows restart/idempotency/concurrency gates remain green;
- real final render still produces valid H.264/AAC MP4 through the existing Workflow Runtime;
- repository is clean and release metadata is synchronized;
- exact-head final CI and any required Local Codex acceptance pass before tag creation.
