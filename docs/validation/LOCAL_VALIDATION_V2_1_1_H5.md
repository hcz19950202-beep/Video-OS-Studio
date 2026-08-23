# Video OS Studio V2.1.1 H5 — Local Windows Project / Data Hardening Validation Contract

> Workstream: H5 Project / Data Hardening  
> Branch: `hardening/v2.1.1-h5-project-data-hardening`  
> PR: #24  
> Authority: `PROJECT_STATUS.md` + Master Hardening PRD

## 0. Purpose

H5 hardens durable Project/data correctness after H4 established bounded streaming media IO.

H5 acceptance is primarily cloud-safe correctness plus a **bounded Windows/local-data proof** for filesystem and cleanup behavior that Ubuntu CI cannot fully establish.

H5 proves:

```text
frozen historical Project contracts
→ explicit migration chain
→ final Project referential integrity
→ transaction boundary efficiency
→ bounded/revision-safe History
→ lightweight Recent Project summaries
→ conservative failed-import/orphan cleanup
```

H5 does **not** start H6 broad automated acceptance, H7 frontend consolidation, a Project Schema version change, or V2.2 Workflow Runtime.

## 1. Entry gate

Do not use old chat memory as project truth.

Read in order:

1. `PROJECT_STATUS.md`
2. `AGENTS.md`
3. `SYSTEM.md`
4. `docs/prd/Video_OS_Studio_V2_1_1_Engineering_Hardening_Master_PRD.md`
5. this file
6. PR #24 live state

GPT Web will supply an exact frozen green SHA.

Create a fresh isolated worktree, for example:

```text
E:\Video-OS-Studio-H5-Validation
```

Use a fresh isolated runtime root, for example:

```text
E:\Video-OS-Data\v2.1.1-h5-validation-<sha-prefix>
```

Before validation:

```powershell
git fetch origin
git checkout hardening/v2.1.1-h5-project-data-hardening
git reset --hard <GPT_WEB_FROZEN_SHA>
git status --short
git rev-parse HEAD
node --version
npm --version
```

`git rev-parse HEAD` must exactly equal the frozen SHA. Otherwise stop.

Record Windows, Node/npm, Chrome, FFmpeg/ffprobe, Remotion, and HyperFrames versions.

Accepted H2 pins must remain unchanged:

```text
remotion             4.0.513
@remotion/player     4.0.513
@remotion/cli        4.0.513
hyperframes          0.8.10
```

## 2. Clean code gate

Run from the frozen SHA:

```powershell
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

All must pass. The two pre-existing `@next/next/no-img-element` warnings remain known non-blocking warnings. H5 must not introduce new warnings.

Do not weaken Project integrity or cleanup checks merely to make an old fixture pass.

## 3. Frozen V1 / migration chain smoke

The main migration correctness is covered by cloud tests, but local validation must confirm the same repository state executes on Windows.

Run the migration test suite and, using a validation-only harness if useful, load:

```text
tests/fixtures/legacy-v1-project.json
```

Required:

- the V1 fixture is accepted by the frozen V1 contract;
- V1 migrates to current Project version `2.0.0`;
- accepted legacy assets/tracks/media state survive migration;
- migration chain executes source-version → target-version step-by-step;
- duplicate registration of the same source version is rejected;
- unknown versions fail explicitly;
- `schemas/project-v1.ts` does not import mutable current `AssetSchema` or `ClipSchema`.

Do not change the Project Schema version during H5 validation.

## 4. Project referential-integrity regression

Run the H5 Project integrity tests and one representative real Project save/reopen cycle.

Required final Project validation must reject at least:

```text
duplicate Asset IDs
duplicate Track IDs
globally duplicate Clip IDs
Clip → missing Asset
invalid linkedStyle reference / target mismatch
invalid scene style reference
Clip outside timeline bounds
source range outside known source duration
```

For the real Project cycle:

- create a Project through the app/API;
- import valid media;
- perform normal Caption/Canvas/Timeline edits;
- save/reopen;
- Project remains valid and playable.

Do not hand-edit an active runtime `project.json`. Invalid payload checks belong in automated tests or a disposable validation-only harness/root.

## 5. Transaction + H1 semantics regression

Run the transaction/history/coordinator tests covering H1 + H5.

Required:

- a multi-command transaction advances Project revision exactly once;
- transaction final validation still runs;
- H1 `expectedRevision` conflicts still reject stale writers;
- command/transaction idempotency behavior remains unchanged;
- no partial transaction is durably saved.

H5 transaction efficiency must not be implemented by bypassing final Project validation.

No synthetic benchmark threshold is required locally; the architectural acceptance is boundary validation rather than N full Project validations for N internal commands.

## 6. History byte budget + repeated Undo/Redo

Run H5 History tests, then validate representative UI behavior in Chrome.

Required:

- History entry count remains bounded;
- byte budget removes/evicts oversized history rather than allowing unbounded memory growth;
- a fresh edit invalidates redo;
- repeated Undo → Redo → Undo continues to work even though each server restore produces a new revision;
- no unhandled browser Promise rejection or console error appears.

Record the final Project revision after the repeated Undo/Redo sequence.

## 7. Two-window stale History guard

Use one disposable Project in two browser windows/tabs or an equivalent two-client validation harness.

Suggested sequence:

```text
A: open Project at revision N
A: perform an edit → creates local History and revision N+1
B: load latest Project
B: perform another legitimate edit → durable revision N+2
A: attempt Undo using its stale state/history
```

Required:

- stale A must not overwrite B;
- H1 server conflict protection remains effective;
- A reloads latest durable Project after conflict;
- H5 History guard must not later apply the stale snapshot to an unrelated revision;
- B's newer edit remains intact after A recovers;
- subsequent fresh A edit and Undo/Redo work normally.

If validation exposes a defect, fix only H5 History/revision behavior. Do not redesign Undo/Redo into event sourcing.

## 8. Recent Project summary — real Windows filesystem

Use only the isolated H5 data root.

Create at least three disposable Projects and verify normal Recent Project listing.

Required:

### Fast summary path

- each Project gets `project.summary.json`;
- Recent listing returns summary metadata without requiring full `project.json` parse for a healthy summary;
- normal save/rename/revision update refreshes summary metadata.

### Missing summary repair

For one disposable Project:

- remove only `project.summary.json`;
- call Recent Project listing;
- listing falls back to valid `project.json`;
- summary is recreated;
- Project remains visible.

### Ghost summary cleanup

For a separate disposable Project/folder:

- ensure both `project.json` and `project.summary.json` initially exist;
- remove `project.json` from this disposable validation folder only;
- call Recent Project listing;
- the Project must **not** appear as a ghost Recent Project;
- stale `project.summary.json` is removed;
- other healthy Projects remain listed.

This test must not touch the user's real production data root.

## 9. Real MOV stale-import compensation on Windows

This is the main H5 local media proof and closes the H4 orphan follow-up.

Use a real MOV that requires `normalize-video` and a disposable Project at revision `N`.

Create a race where media preparation/normalization occurs, but the final H1 Project attachment uses stale `expectedRevision=N` after another legitimate Project edit advances the durable Project to `N+1`.

A validation-only harness is acceptable and preferred if browser timing is unreliable. It may:

- use the real `MediaImportService`;
- use the real `NodeFfmpegAdapter` / real FFmpeg normalization;
- wrap the FFmpeg adapter only to introduce a validation gate after real normalization so another Project mutation can advance the revision;
- keep the harness outside Git.

Required:

- real MOV original is staged/moved;
- real working MP4 normalization completes before the stale final attach attempt;
- final attach returns `PROJECT_REVISION_CONFLICT`;
- the newer Project edit remains intact;
- no Asset/Clip from the failed stale import is registered;
- the failed operation's unreferenced `original/media-*` file is removed;
- its unreferenced working `input/media-*` file is removed;
- no partial/owned file handle blocks deletion on Windows;
- a later normal MOV import succeeds.

Record the concrete original/working candidate paths and whether each exists before preparation, after normalization, after conflict cleanup, and after the later successful import.

## 10. Failed normalization compensation

Using a validation-only injected FFmpeg failure or an intentionally failing normalization adapter around a disposable source, prove cleanup when normalization fails before Project commit.

Required:

- any original file owned by that failed operation is removed;
- any partial working candidate owned by that failed operation is removed when present;
- Project revision does not advance;
- no Asset is registered;
- cleanup does not delete unrelated media.

The failure harness may be synthetic, but filesystem deletion must use the real Windows filesystem adapter.

## 11. Explicit orphan maintenance — dry run

Create a disposable Project with a controlled media set under:

```text
input/
assets/
original/
captions/
```

Include:

1. at least one current Project Asset path;
2. an `originalRelativePath` used by a current Asset;
3. at least one durable H3 job artifact path when practical;
4. at least two deliberately unreferenced `media-*` files;
5. at least one unrelated non-`media-*` file.

Call the H5 orphan inspection/dry-run path.

Required:

- current Asset paths are protected;
- current `originalRelativePath` is protected;
- durable job artifact paths are protected;
- only unreferenced H5-owned `media-*` files under the owned import folders are reported;
- unrelated files are not reported;
- dry run deletes nothing.

Record the exact candidate list and protected counts.

## 12. Explicit orphan maintenance — deletion safety

Run cleanup only against the isolated disposable Project.

Required safety gates:

### No idle confirmation

`confirmProjectIdle=false` must reject cleanup and delete nothing.

### Stale revision

Use a stale `expectedRevision`. Cleanup must reject with revision conflict and delete nothing.

### Active durable job

When the Project has a non-terminal durable job, cleanup must refuse deletion.

### Confirmed current revision + idle Project

With the current revision, no active jobs, and explicit idle confirmation:

- only the dry-run orphan candidate paths are removed;
- current Project Asset/original paths remain byte-identical;
- durable job artifacts remain byte-identical;
- unrelated non-`media-*` files remain;
- Project JSON remains unchanged by maintenance;
- no residual Windows file handles prevent rename/delete.

After cleanup, run dry-run again. Expected orphan list: empty for the controlled candidates.

The product contract relies on truthful explicit Project-idle confirmation; do not run cleanup concurrently with a real upload/import.

## 13. Failed-import automatic cleanup vs explicit maintenance

Prove the two H5 cleanup layers remain distinct:

```text
automatic compensation
= only candidate paths created by the current failed MediaImport operation

explicit maintenance
= conservative scan of MediaImport-owned media-* files in owned import folders
```

Required:

- automatic compensation does not perform a broad Project-folder scan;
- explicit maintenance does not delete render/job directories or arbitrary user files;
- both re-check current Project references before deleting owned candidates.

## 14. Representative application regression

After data-hardening tests, perform a short real Studio regression:

```text
Create/Open Project
Import MP4
Import MOV
Caption edit
Canvas edit
Timeline edit
Save/Reopen
Undo/Redo
Preview playback/seek
one representative HyperFrames operation
```

A new long Final Render is optional for H5 if H3/H4 render behavior remains covered by automated tests and no H5 change touched render execution/streaming.

Required:

- no H0/H1/H2/H3/H4 behavior regresses;
- no unexpected data cleanup occurs;
- no unhandled browser console errors;
- no H5-owned residual temp/process remains.

## 15. Defect handling

Use IDs:

```text
V2.1.1-H5-LV-001
V2.1.1-H5-LV-002
...
```

For each defect record:

- reproduction;
- expected;
- actual;
- affected Project revision;
- affected paths/files;
- root cause;
- changed files;
- regression test;
- commit SHA.

Fix only H5 scope on:

```text
hardening/v2.1.1-h5-project-data-hardening
```

After every product-code fix:

```powershell
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
git push origin hardening/v2.1.1-h5-project-data-hardening
```

Do not merge locally. Do not start H6.

## 16. Explicitly prohibited in H5

Do not implement:

- H6 broad Windows CI / Playwright matrix;
- H7 frontend consolidation;
- event-sourcing Undo/Redo rewrite;
- Project Schema version bump without a separately approved migration decision;
- broad media-library garbage collection outside the bounded H5 ownership rules;
- object/cloud-storage architecture;
- real external AI Provider;
- V2.2 Workflow Runtime;
- unrelated editor features.

Do not clean or migrate the user's real production data root as part of validation. Use a fresh isolated H5 root and disposable copies/fixtures only.

## 17. Final documentation

Append an `Actual Results / Final Result` section to this file with concrete evidence.

If local validation requires product fixes, include their commits and regression tests.

If validation documentation creates the last commit, that documentation commit becomes `FINAL HEAD`.

Push all H5 validation commits to the same branch:

```text
hardening/v2.1.1-h5-project-data-hardening
```

PR #24 must remain Draft/unmerged until GPT Web reviews the final local diff and final GitHub CI.

## 18. Final report format

Return exactly:

```text
BRANCH:
FINAL HEAD:
FROZEN INPUT HEAD:
LOCAL WORKTREE:
LOCAL DATA ROOT:
WINDOWS:
NODE/NPM:
CHROME:
FFMPEG/FFPROBE:
REMOTION VERSIONS:
HYPERFRAMES VERSION:

CLEAN NPM CI: PASS/FAIL
CODE CHECKS: PASS/FAIL — test files / tests
V1/MIGRATION CHAIN: PASS/FAIL
PROJECT INTEGRITY: PASS/FAIL
TRANSACTION/H1 REGRESSION: PASS/FAIL
HISTORY BUDGET: PASS/FAIL
UNDO/REDO REVISION GUARD: PASS/FAIL
RECENT SUMMARY FAST PATH: PASS/FAIL
RECENT SUMMARY REPAIR: PASS/FAIL
GHOST SUMMARY CLEANUP: PASS/FAIL
MOV STALE-IMPORT COMPENSATION: PASS/FAIL
FAILED NORMALIZATION CLEANUP: PASS/FAIL
ORPHAN DRY RUN: PASS/FAIL
ORPHAN SAFETY GATES: PASS/FAIL
ORPHAN CLEANUP: PASS/FAIL
APP REGRESSION: PASS/FAIL
FINAL GITHUB VERIFY: PASS/FAIL

ORPHAN CANDIDATES BEFORE CLEANUP:
REMOVED ORPHANS:
PROTECTED PROJECT PATHS:
PROTECTED JOB ARTIFACT PATHS:
RESIDUAL TEMP/PROCESSES:

DEFECTS FIXED:
COMMITS PUSHED:
REMAINING FAILURES:

MERGE RECOMMENDATION: YES/NO
```
