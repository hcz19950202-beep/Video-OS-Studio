# Video OS Studio V2.4.1 — Engineering Hardening Master PRD

## Status

`V2.4.1_ENGINEERING_HARDENING = ACTIVE`

Baseline main: `667610d1bfbfdd9db9ba2d036aa3416d3419dd93`

Released baseline remains immutable: `v2.4.0` → `da22a5415cbf8ad2a9ce93b912b41b787b29a9b1`.

## Purpose

V2.4.1 is a bounded post-release engineering-hardening patch. It adds no new product capability and does not change Project Schema. The goal is to close confirmed security, correctness, durability, concurrency, recovery, and client-publication gaps discovered after V2.4.0 acceptance.

## Frozen product boundaries

- Project Schema remains `2.0.0`.
- Remotion remains `4.0.513`.
- HyperFrames remains `0.8.10`.
- Node remains `24.x`.
- V2.4.0 tag and release commit remain immutable.
- No generic shell/filesystem/network/process/computer authority is added.
- Project / Workflow / Job / Mission / Campaign truth boundaries remain unchanged.

## Required hardening scope

### H0 — Trusted renderer asset origin

All durable render/workflow asset origins must come from `resolveTrustedAssetBaseUrl()`, never a request Host-derived origin. Contract tests must cover the complete `app/api` tree.

### H1 — Windows durable persistence

All temp-file → durable JSON replacement paths must use the accepted bounded Windows atomic-replace helper. Workflow and runtime-owner persistence must match Job/FileSystem durability behavior.

### H2 — Durable lock and long-running execution boundary

Filesystem locks must be ownership-safe under stale recovery. Long-running Production execution must not depend on a fixed 30-second lock age remaining valid for the full external step duration. Claim/execute/reconcile must preserve operation identity, fail-closed revision checks, cancellation, restart recovery, and idempotency.

### H3 — Async client publication

Responses from Project A must never publish over active Project B. Older responses must never regress a newer revision. Revision-conflict reloads follow the same rule. Mission polling must not publish a previous Mission after selection changes.

### H4 — Runtime I/O and recovery

- Workflow listing isolates corrupt records.
- Production polling defaults must not use a 25ms production fallback.
- Process liveness probing must be bounded.
- Job/Workflow listing and activity/log access should avoid unnecessary unbounded full-history work where safely possible.

### H5 — UI atomic intent and render efficiency

One user preset-apply intent must be one Project transaction. Panels must not subscribe to frame-rate state when they only need a snapshot at action time.

### G0 — Repository governance

Main-branch enforcement should match the repository's exact-head / required-CI discipline. This is repository configuration work and must not be simulated by product code.

## Acceptance

Cloud gates:

- format
- lint
- typecheck
- full unit
- build
- browser smoke
- Windows verify/media/B6/B7 gates as applicable

Mandatory Local Windows VERIFY ONLY after the online candidate is frozen:

- real NTFS contention and atomic replacement
- stale-lock ownership/recovery
- long-running Mission step / concurrent advance
- restart/idempotency
- B6 autonomous real-video regression
- B7 Campaign with distinct real user media
- no Project cross-leakage, duplicate mutation, corrupt durable JSON, stale lock/tmp residue, or attributable orphan process

## Release rule

Do not move or recreate `v2.4.0`. V2.4.1 may be released only from a frozen exact SHA after cloud and mandatory Local Windows acceptance pass, followed by exact-main verification and a new annotated `v2.4.1` tag.
