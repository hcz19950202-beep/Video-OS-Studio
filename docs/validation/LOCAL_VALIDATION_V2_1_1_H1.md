# Video OS Studio V2.1.1 H1 — Local Windows Validation Contract

> Workstream: H1 Project Transaction Safety  
> Branch: `hardening/v2.1.1-h1-transaction-safety`  
> PR: #20  
> Authority: `PROJECT_STATUS.md` + `docs/prd/Video_OS_Studio_V2_1_1_Engineering_Hardening_Master_PRD.md`

## 0. Entry gate

Do not use conversation memory as the source of truth.

GPT Web must first provide one exact **FROZEN GREEN SHA**. Then:

```powershell
git fetch origin
git checkout hardening/v2.1.1-h1-transaction-safety
git reset --hard <FROZEN_GREEN_SHA_FROM_GPT_WEB>
git status --short
git rev-parse HEAD
```

The local HEAD must exactly match the frozen SHA. If it does not, stop.

Use an isolated worktree and runtime root, for example:

```powershell
$env:VIDEO_OS_DATA_ROOT="E:\Video-OS-Data\v2.1.1-h1-validation"
```

Do not reuse H0 or release-acceptance Project data.

Run before browser validation:

```powershell
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

All must pass.

## 1. Scope and stop rules

H1 validates **no silent lost updates**. It does not begin H2 Engine Runtime.

Validate only:

1. revision conflict behavior;
2. per-operation idempotency;
3. Caption stale-write protection for Issue #11;
4. normal Save semantics after whole-project PUT removal;
5. representative Canvas conflict behavior;
6. one representative long-running/bounded-service stale-result race;
7. save/reopen and V2.1 regression.

Do not install/pin Remotion CLI, redesign process execution, implement durable jobs, rewrite media streaming, or start H2+ work.

If a defect is found, fix only H1 scope on the same branch, add a regression test, push, and return the new SHA to GPT Web. Do not merge PR #20 locally.

## 2. Architecture under test

The intended mutation path is:

```text
client Project revision N
→ mutation envelope { expectedRevision: N, operationId/commandId/transactionId, mutation }
→ shared ProjectMutationCoordinator
→ acquire per-project mutex
→ load latest Project
→ compare expectedRevision
→ mismatch = HTTP 409 PROJECT_REVISION_CONFLICT
→ apply validated mutation
→ revision N+1 exactly once
→ atomic project save
→ durable operations.jsonl record
→ release mutex
```

Different Projects must not share one global lock.

Normal Studio Save must not PUT the complete browser Project back to the server.

## 3. H1-R — Mandatory revision race

Create/open an isolated Project and record revision `N`.

Using two independent requests (two tabs, browser console requests, PowerShell, or a small temporary local harness that is **not committed**), prepare two different valid command envelopes with the same `expectedRevision = N` and distinct command IDs.

Example intent:

```text
A: rename Project → "Writer A"
B: rename Project → "Writer B"
```

Send them concurrently or close enough that both were created from revision `N`.

Expected:

```text
one request → 200, revision N+1
other request → 409 PROJECT_REVISION_CONFLICT
final Project revision → N+1
final Project contains only the winning mutation
no silent overwrite
```

Record response status/body and final Project JSON.

## 4. H1-I — Idempotency and operation identity

### H1-I1 — duplicate same operation executes once

At current revision `N`, send one valid command envelope with a fixed `commandId`.

Send the **exact same envelope again with the same commandId**.

Expected:

- first request applies once and advances revision to `N+1`;
- duplicate returns success with `alreadyApplied = true`;
- duplicate does not advance revision again;
- final Project state is identical to the first result;
- `operations.jsonl` contains the operation audit trail.

### H1-I2 — same operation ID with different payload is rejected

Reuse the same command/operation ID with a different mutation payload.

Expected:

```text
HTTP 409
code = PROJECT_OPERATION_ID_REUSED
retryable = false
```

Project revision/state must not change.

Do not edit `operations.jsonl` manually.

## 5. H1-C — Caption / Issue #11 stale-write acceptance

Use one Caption clip with distinct initial style values.

Create two edits from the same Project revision `N`:

```text
A: fontFamily → Inter
B: fontSize → 72
```

A and B must both carry `expectedRevision = N`.

Expected:

1. exactly one succeeds and advances to `N+1`;
2. the stale request receives `409 PROJECT_REVISION_CONFLICT`;
3. the stale request does **not** restore any old unrelated Caption field;
4. reload latest Project;
5. retry only the intended stale field as a fresh minimal patch at `N+1`;
6. final state contains both new values;
7. restart/reopen preserves both values.

If using the normal Inspector UI, also confirm conflict feedback is visible and the Studio reloads/uses the latest durable Project rather than pretending the stale edit succeeded.

This is the merge-blocking local proof for GitHub Issue #11.

## 6. H1-S — Save is no longer a whole-project overwrite

With browser network instrumentation active:

1. make one normal durable edit;
2. wait for it to complete;
3. click **Save**;
4. inspect network traffic;
5. restart the dev server and reopen.

Expected:

- the edit persisted through its command/transaction endpoint;
- clicking Save does **not** send a whole-Project `PUT /api/projects/<id>`;
- Save waits for queued mutations and reloads the durable Project;
- reopen shows the same durable state.

A direct legacy raw Project body sent to `PUT /api/projects/<id>` should be rejected by the new replacement envelope contract. Do not modify product source just to force this test.

## 7. H1-V — Canvas stale command behavior

Use a Video/B-roll/Motion clip in Canvas mode.

1. record current revision `N` and transform;
2. prepare a Canvas command based on `N` but do not send it yet;
3. make another normal durable edit so the Project becomes `N+1`;
4. send/trigger the stale Canvas command from `N`.

Expected:

- stale Canvas command receives conflict, not success;
- Project remains at the latest durable state;
- Canvas draft/guides clear;
- visible error feedback appears;
- Studio reloads latest Project state;
- a new Canvas gesture based on the latest revision succeeds exactly once;
- no unhandled Promise rejection.

## 8. H1-L — Long-running stale result cannot overwrite newer edits

Validate one available representative H1 service path. Prefer media import because it is already part of the normal Studio flow; HyperFrames or video-use may be used if already configured.

Suggested media-import race:

1. open Project at revision `N`;
2. begin importing a real supported media file so the request carries `expectedRevision = N`;
3. while the import/normalization/probe work is still active, commit a separate fast Project edit that advances to `N+1`;
4. allow the older import request to finish its expensive work and attempt Project attachment.

Expected:

- the old result must not overwrite the newer edit;
- if its Project attachment is stale, it receives `409 PROJECT_REVISION_CONFLICT`;
- Project revision remains the newer durable revision unless a fresh retry is explicitly performed;
- reopen confirms the newer edit was preserved.

H1 does **not** require orphan-file cleanup after a rejected long task; import rollback/cleanup is H5. Record any orphan artifact as expected follow-up, not as permission to mutate Project state.

Do not broaden this into H2 process/cancellation work.

## 9. H1-P — Shared coordinator and regression smoke

Confirm through normal product use that commands from different UI surfaces can be performed without corruption:

```text
Caption command
Canvas command
rename command
one Timeline/Effect command
```

Then:

```text
Save/reload
restart dev server
reopen Project
Undo/Redo representative supported edit
Preview playback
```

Expected: no corruption, no unexplained revision jumps, no unhandled console errors.

A Final Render smoke is not required for H1 if local Remotion CLI is not already installed. Do not enter H2 to make H1 pass.

## 10. Operations log checks

For the isolated validation Project, inspect but do not edit:

```text
<VIDEO_OS_DATA_ROOT>\projects\<projectId>\operations.jsonl
```

Expected for applied operations:

- stable operation ID;
- expected revision;
- applied revision;
- `pending` then `applied` audit states;
- duplicate retry does not create another Project revision.

A failed save may record `aborted`; retrying the same operation ID is allowed only for the same operation payload. The same ID must never be repurposed for a different mutation.

## 11. Defect handling

Use IDs:

```text
V2.1.1-H1-LV-001
V2.1.1-H1-LV-002
...
```

For every defect record:

- reproduction;
- expected;
- actual;
- root cause;
- changed files;
- regression test;
- commit SHA;
- local evidence.

After any fix:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
git push origin hardening/v2.1.1-h1-transaction-safety
```

Then stop and return the new SHA. GPT Web will inspect CI and decide merge readiness.

## 12. Final report to GPT Web

Return exactly:

```text
BRANCH:
FINAL HEAD:
FROZEN INPUT HEAD:
LOCAL WORKTREE:
LOCAL DATA ROOT:
NODE/NPM:
BROWSER:

CODE CHECKS: PASS/FAIL
REVISION RACE: PASS/FAIL
IDEMPOTENCY: PASS/FAIL
CAPTION ISSUE #11: PASS/FAIL
SAVE NO-WHOLE-PUT: PASS/FAIL
CANVAS CONFLICT: PASS/FAIL
LONG-TASK STALE RESULT: PASS/FAIL/NOT RUN
OPERATIONS LOG: PASS/FAIL
SAVE/REOPEN: PASS/FAIL
UNDO/REDO: PASS/FAIL
PREVIEW PLAYBACK: PASS/FAIL
FINAL RENDER SMOKE: PASS/FAIL/NOT REQUIRED

DEFECTS FIXED:
COMMITS PUSHED:
REMAINING FAILURES:
UNHANDLED CONSOLE ERRORS:

MERGE RECOMMENDATION: YES/NO
```

## 13. Completion boundary

H1 is not accepted merely because local checks pass. Local Codex must not merge PR #20 and must not start H2.

The final sequence remains:

```text
Local Codex returns evidence + FINAL HEAD
→ GPT Web reviews diff and latest GitHub CI
→ GPT Web prepares the post-H1 PROJECT_STATUS checkpoint
→ GPT Web merges PR #20
→ only then H2 may begin from the new accepted main
```
