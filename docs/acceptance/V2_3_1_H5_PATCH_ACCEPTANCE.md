# Video OS Studio V2.3.1 — H5 Patch Release Acceptance

## Purpose

H5 is the formal end-to-end acceptance boundary for the bounded V2.3.1 engineering-hardening release. H5 does not add product features. Product changes discovered by H5 must be fixed in a separately scoped blocker PR, then the complete H5 acceptance must restart on a new exact product SHA.

## Release boundaries

- Released baseline: `v2.3.0`
- Project Schema remains: `2.0.0`
- Node remains: `24.x`
- Remotion remains: `4.0.513`
- HyperFrames remains: `0.8.10`
- Playwright remains: `1.62.1`
- V2.4 remains: NOT STARTED
- Package metadata remains `2.3.0` until H5 is fully accepted.

## Formal acceptance cases

### Case A — Player / Timeline / Script playback

Prove on the same exact product SHA:

- Player event bridge survives key-driven/canvas/project remounts;
- Timeline playhead continues tracking playback;
- Script active-word highlighting follows source/timeline mapping;
- keyboard listener is not duplicated after rerenders/remounts.

### Case B — Editing commit boundary

Prove:

- continuous text input causes no Project mutation while focused;
- one commit produces exactly one Project revision/history entry;
- slider/range pointer motion is draft-only;
- pointer-up commits once;
- blur does not duplicate an already committed intent;
- Undo restores the previous durable value.

### Case C — Real Workflow / Jobs / Final

Use real Windows media and real accepted local engines:

`real media → import → video-use → transcript → Visual Planner → HyperFrames Durable Job → Project mutation → Remotion → Final Durable Job → encoded MP4`

Prove:

- Workflow completes;
- real video-use Job completes;
- real HyperFrames Job completes;
- Final Render Job completes;
- final MP4 is H.264 with AAC when source/project audio is present;
- encoded frames contain the accepted media/captions/visual treatment;
- `.props.json`, `.hf-work`, temp files and engine processes are cleaned.

### Case D — Restart / idempotency / durable recovery

Prove:

- durable Agent Session/Proposal/Project state survives server restart;
- no duplicate Apply or Project revision from restart alone;
- live executor PID is not incorrectly interrupted;
- dead executor is recovered as `JOB_INTERRUPTED` with `retryable=true`;
- operation ledger/idempotency/revision-conflict contracts remain intact;
- no stale locks remain.

### Case E — Local-first security + renderer media path

Prove:

- default server listener is loopback-only;
- spoofed Host cannot become renderer asset origin;
- non-loopback renderer origin is blocked without explicit opt-in;
- real Next asset GET Range returns 206 and HEAD returns correct length;
- real Remotion renders a media-backed Project through the genuine Next `/api/projects/.../assets/...` route;
- final encoded output matches the **resolved Export Profile**, not merely the raw Project Canvas;
- no orphan server/Chromium/Remotion/FFmpeg process remains.

## Attempt history

### Attempt 1 — BLOCKED / environment

Frozen product SHA: `4df173cdc40a330d677302ce5038157bf1c439e4`.

Local Windows preflight passed:

- `npm ci` PASS;
- typecheck PASS;
- full unit suite PASS — 105 files / 451 passed / 6 skipped / 0 failed;
- focused hardening PASS — 16 files / 79 tests;
- exact SHA and clean detached worktree confirmed.

Playwright baseline did not start because external original-workspace dev server PID `34232` already owned `127.0.0.1:3000`. Original process and worktree were deliberately left untouched. Classification: `ENVIRONMENT_ISSUE`.

### Attempt 2 — FAIL / product blocker

Same frozen product SHA: `4df173cdc40a330d677302ce5038157bf1c439e4`.

Passed before blocker:

- Playwright baseline 4/4 on temporary port `43273`;
- Case A PASS;
- Case B PASS;
- Case C PASS with real video-use, HyperFrames, Remotion, FFmpeg/ffprobe and real talking-head source;
- Case D PASS;
- Case E loopback listener, spoofed Host protection, real Next Range/HEAD and remote-origin policy all PASS.

Case C real evidence:

- Project: `w2-real-1787894949498`;
- Workflow: `0fccefc8-7f49-4e12-a694-39e4e121016e`;
- video-use Job: `2692e3d9-63ad-4a56-ab38-bde146da752f` completed;
- HyperFrames Job: `5ce22ca0-a2c4-46aa-be59-6179b5b5203f` completed;
- Final Render Job: `cb9e5fcb-4882-40d3-95d0-b8c9a56e8685` completed;
- encoded result: H.264 / AAC / 640×360 / 30 fps / 115.989333 s;
- encoded front/middle/back visual inspection PASS;
- no props/hf-work/orphan-engine residue.

Case D real evidence:

- Agent Project: `a7-agent-product-acceptance-83cab0f5`;
- Agent Session: `392a556d-407f-4a35-b984-196165a63cfd`;
- proposal statuses persisted as `stale,applied`;
- Project revision remained 4 across restart;
- live executor remained running;
- dead executor recovered to `JOB_INTERRUPTED`, `retryable=true`;
- no duplicate Apply or stale lock.

Case E blocker:

- default listener: `127.0.0.1:43276`;
- spoofed Host: `attacker.example:3456` → trusted renderer origin remained `http://127.0.0.1:3000`;
- real Next Range: `206`, `Content-Range: bytes 0-31/18382468`;
- HEAD: `200`, `Content-Length: 18382468`;
- real Next-route Remotion render executed;
- Project Canvas had been legitimately changed to `641×361`, revision 7 during Case A remount proof;
- current Export Profile resolution declared `641×361`;
- Remotion CLI was therefore invoked with `--width 641 --height 361`;
- actual H.264 output probed as `640×360`;
- H5 temporary assertion failed `expected 640 to be 641`.

Classification after repository contract review: **PRODUCT_DEFECT**.

Root cause is not H4 networking/Range. The product currently permits odd Project Canvas dimensions and `resolveExportProfile()` reports them unchanged for MP4/H.264, while the actual encoded output can be normalized by the downstream H.264 pipeline. This makes the declared/displayed resolved Export Profile diverge from the produced file.

Required blocker fix:

- preserve odd Project Canvas compatibility and Project Schema `2.0.0`;
- normalize MP4/H.264 resolved export dimensions deterministically to codec-compatible even dimensions;
- make the resolved profile/UI/job output path/Remotion prepared Project agree with the actual encoded dimensions;
- preserve already-even dimensions exactly;
- cover both `sizing: project` and odd custom output dimensions;
- do not change engine pins or H4 security behavior.

After the blocker fix merges, H5 A–E must restart on the new exact product SHA. Prior evidence may guide the rerun but cannot substitute for same-SHA acceptance.

## Acceptance completion rule

H5 can pass only when Cases A–E, Windows Media regression, cleanup audit and final exact-SHA repository proof all pass on one product SHA. Only then may package/lock metadata move to `2.3.1` and release finalization begin.
