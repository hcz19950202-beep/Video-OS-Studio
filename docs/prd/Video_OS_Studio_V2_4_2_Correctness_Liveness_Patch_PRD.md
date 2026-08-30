# Video OS Studio V2.4.2 — Correctness & Liveness Patch PRD

## 1. Release intent

V2.4.2 is a bounded post-V2.4.1 correctness/liveness patch. It adds no new product capability and must not change Project Schema, dependency/engine pins, or the immutable V2.4.0/V2.4.1 release tags.

Baseline:

- development baseline: `main @ bef05308926a790ff4ba1336e927b8407f30fc78`
- immutable V2.4.1 release: `v2.4.1 -> 4c105bad936479690711c03f3e349db36fbadaf5`
- Project Schema: `2.0.0`

## 2. Scope and priority

### H0 — truthful autonomous repair mutation scope — P1

Invariant: authorization/protection targets must cover every Project entity the repair transaction can actually mutate.

For bounded timing repair, target resolution and command construction must share one deterministic derivation from the same current Project + target duration. Any clip/scene/marker/canvas mutation that can be emitted must be represented by an exact `ProductionMutationTarget` before protection evaluation and before the transaction executes.

Required behavior:

- locked Track/Clip affected by a repair blocks before mutation;
- explicitly protected affected entity blocks before mutation;
- human-modified affected entity requires durable review before mutation;
- Plan declaration must not under-scope the concrete application-owned repair target set;
- no mutation may occur if scope/protection evaluation fails.

### H1 — exclusive lock liveness and process identity — P2

Invariant: a durable lock must neither be stolen from a live owner nor wedge all future contenders forever.

Required behavior:

- release still attempts ownership-safe cleanup if handle close fails;
- Windows transient `EPERM` / `EACCES` / `EBUSY` deletion is retried with a bounded policy;
- acquisition supports a bounded wait and fails with an explicit timeout instead of polling forever;
- process identity is stronger than PID-only liveness so PID reuse cannot make a dead owner appear live forever;
- no age-only takeover of a genuinely live long-running owner;
- stale legacy lock recovery remains supported.

Prefer one reusable process-identity abstraction shared by Exclusive Lock, Production runner ownership, and Agent Apply claims rather than three incompatible PID heuristics.

### H2 — Agent Apply durable finalization — P2

Invariant: an external idempotent mutation that has completed must not leave the stable Apply operation permanently wedged by an abandoned live-PID claim.

Required behavior:

- claims remain ownership-token safe;
- provider/network/tool work remains outside the durable session lock;
- if durable `markApplied` finalization fails after the external operation completed, the caller compensates by releasing only its own claim;
- retry uses the stable Apply operation ID to recover already-applied external truth exactly once;
- no duplicate Project mutation / Workflow action.

Also reduce pathological 25 ms full-session polling where possible without expanding scope into a new notification subsystem.

### H3 — single client Project publication boundary — P2

Invariant: no asynchronous response for Project A or an older revision may overwrite the currently active/newer Project.

Required behavior:

- `StudioWorkspaceV21` owns one guarded `publishProjectChange` callback;
- async child panels receive the guarded callback, never raw Zustand `setProject`;
- EffectLibrary -> VideoUse / VisualPlanner / HyperFrames / Asset paths inherit the same boundary;
- existing internal guards may remain as defense in depth;
- stale Project A and older-revision responses are regression-tested.

### H4 — render/export correctness — P2

#### H4.1 FPS rescale validation

Invariant: `projectForExportProfile()` must never return a schema-invalid Project.

Required behavior:

- temporal rescaling preserves positive scene/clip intervals and Project bounds;
- the fully transformed export Project is validated through `ProjectSchema` before render;
- regression coverage includes a legal 30 fps Project that would collapse a one-frame scene when rounded to a lower fps.

#### H4.2 unresolved referenced media fail-closed

Invariant: final/overlay render must not report success when enabled timeline content references an unresolved media asset URL.

Required behavior:

- validate referenced media before invoking Remotion, preferably in the Job/adapter boundary where a structured Job error can be persisted;
- final/overlay render fails with a stable structured error for unresolved enabled video/b-roll/audio/render-backed motion media;
- preview may remain tolerant if current UX requires it;
- no silent `null` content in a successful final artifact.

#### H4.3 fallback evidence

When the bounded Remotion OffthreadVideo -> Html5Video compatibility fallback occurs, persist structured output evidence (`backend`, `fallbackUsed`, `fallbackReason`) in durable Job output in addition to logs.

### H5 — Campaign liveness review — conditional P2

Do not perform a large Campaign architecture rewrite inside V2.4.2.

Patch-sized required work if feasible:

- repository mutation failures in worker begin/finish/final aggregation must not leave opaque permanently-running Campaign truth without recoverable evidence;
- add focused failure/recovery tests.

HTTP request/execution decoupling (`POST -> durable start/202 -> server-owned long-running loop`) is explicitly allowed to defer to V2.4.3 if implementing it safely expands the patch boundary.

### G0 — repository governance

Current GitHub truth at V2.4.2 start:

- `main` branch protection: disabled;
- required status checks: disabled;
- repository rulesets: none.

Target governance:

- PR required for `main`;
- required CI checks;
- force push disabled;
- branch deletion disabled.

This is a GitHub repository-setting change, not product code. If connected GitHub tooling lacks ruleset/branch-protection write authority, record it as an external governance action; do not simulate governance in application source.

## 3. Explicit non-goals

V2.4.2 must not:

- add user-facing product features;
- change Project Schema `2.0.0`;
- upgrade Node, Remotion, HyperFrames, Playwright, Prettier, or dependency trees;
- refactor AI provider implementations merely to remove duplication;
- perform lockfile registry cleanup;
- build a new Job notification/event subsystem;
- move/recreate any released tag;
- hide failures by increasing test timeouts or adding blanket retries.

## 4. Implementation sequence

1. R0 baseline freeze + this PRD + Draft PR.
2. H0 repair scope/protection truth + regression tests.
3. H1 process identity + exclusive lock bounded liveness + Windows-oriented tests.
4. H2 Agent Apply claim compensation/recovery + concurrency tests.
5. H3 single client publication boundary + race tests/contracts.
6. H4 export validation, unresolved-media fail-closed, fallback evidence + render tests.
7. H5 campaign persistence failure audit; implement only patch-sized safe recovery.
8. Online gates: format, lint, typecheck, full unit, build, browser, Windows cloud media/B6/B7.
9. Local Windows VERIFY ONLY exact-SHA gate focused on true multi-process locks/claims, real render, B6/B7, residue/process audit.
10. Exact-head review -> expected-head merge -> exact-main CI -> metadata-only V2.4.2 release finalization -> immutable annotated tag only after all gates pass.

## 5. Acceptance invariants

V2.4.2 cannot be accepted unless all are proven:

- protected/locked/human-owned entities cannot be silently mutated by repair;
- no live-owner lock theft and no permanent stale-lock wait;
- PID reuse cannot by itself prove ownership;
- Apply replay is exactly-once after finalization failure;
- stale async Project responses cannot switch/regress active Project truth;
- export transformation is schema-valid;
- final render cannot silently omit referenced media;
- compatibility fallback is visible in durable evidence;
- no regression to B6/B7 real-engine acceptance;
- no forbidden residue or attributable orphan processes on final Local Windows gate;
- V2.4.0 and V2.4.1 remain immutable.
