# Video OS Studio V2.3.1 — H5 Patch Release Acceptance

## Purpose

H5 is the formal end-to-end acceptance boundary for the bounded V2.3.1 engineering-hardening release. H5 does not add product features. Product changes discovered by H5 were fixed in separately scoped blocker PRs, after which the complete H5 acceptance restarted on the resulting exact product SHA.

## Release boundaries

- Released baseline: `v2.3.0`
- Hardening candidate: `v2.3.1`
- Project Schema remains: `2.0.0`
- Node remains: `24.x`
- Remotion remains: `4.0.513`
- HyperFrames remains: `0.8.10`
- Playwright remains: `1.62.1`
- V2.4 remains: NOT STARTED
- Package metadata remains `2.3.0` until release finalization.

## Final accepted product SHA

`e5d449b3eb3b69fca23113c2fe75a905049578ea`

Exact-main cloud baseline:

- CI #760 / run `33155438036`
- Ubuntu Verify: PASS
- Windows Verify: PASS
- Browser Smoke: PASS
- Windows Media Smoke: PASS

## Formal acceptance cases

### Case A — Player / Timeline / Script playback

PASS on the final exact product SHA.

Evidence:

- Project: `w2-real-1787906310977`
- transcript words: 594
- observed active words: `怎么样` → `一`
- Player survived Canvas remount and continued playback
- Timeline playhead continued tracking playback
- Script current-word highlighting followed playback and seek
- double Space produced exactly two toggles; no duplicate keyboard binding

### Case B — Editing commit boundary

PASS on the final exact product SHA.

Evidence:

- text command POSTs while focused: 0
- text commit: exactly 1
- slider commands while dragging: 0
- pointer-up commit: exactly 1
- blur duplicate commit: none
- Undo restored previous durable values

### Case C — Real Workflow / Jobs / Final

PASS with real Windows media and real accepted local engines.

Source:

`C:\Users\hcz\Downloads\鲈鱼是个编导-我500粉却能持续获客的方法_#编导_#-20260720102714.mp4`

Evidence:

- Project: `w2-real-1787906310977`
- Workflow: `90c1d91f-d6a2-4fe2-be28-56637f69428c`
- video-use Job: `f61d877d-6ee6-4ab2-94a7-c5acd37af432` — completed
- HyperFrames Job: `3ad6793b-7b3c-49a7-b3f9-4da9d7816165` — completed
- Final Render Job: `ce8fac7a-751b-4b5d-8dcc-10cce9c42e39` — completed
- Project revision: 6
- final MP4: `render/final-640x360-30fps-ce8fac7a-751b-4b5d-8dcc-10cce9c42e39.mp4`
- codec: H.264 / AAC
- size: 640×360
- fps: 30
- duration: 115.989333 seconds
- encoded front/middle/back visual proof: PASS
- `.props.json`: none
- `.hf-work`: none
- orphan engines: none

### Case D — Restart / idempotency / durable recovery

PASS on the final exact product SHA.

Evidence:

- Agent Project: `a7-agent-product-acceptance-dd196de3`
- Agent Session: `992d4a81-436d-4170-a671-eba53e7ae4e3`
- Proposal statuses persisted as `stale,applied`
- Project revision before restart: 4
- Project revision after restart: 4
- duplicate Apply: none; `alreadyApplied=true`, ledger unchanged
- live executor recovery: PASS
- two live Jobs sharing one PID produced shared PID probe count 1
- dead executor recovery: two Jobs interrupted
- `JOB_INTERRUPTED`: PASS
- `retryable=true`
- operation ledger: PASS
- stale locks: none

### Case E — Local-first security + H.264 export truth + Windows atomic persistence

PASS on the final exact product SHA.

Security/media evidence:

- default listener: `127.0.0.1:43310`
- spoofed Host: `attacker.example:3456`
- contract trusted origin remained `http://127.0.0.1:3000`; live Gate asset origin used `http://127.0.0.1:43310`
- real Next Range: 206 / `bytes 0-31/2624` / 32 bytes
- HEAD: 200 / Content-Length 2624
- remote origin default block: PASS

H.264 dimension truth:

- durable Project Canvas: 641×361
- resolved Export Profile: 640×360
- Render Job Profile: 640×360 @ 30
- prepared Remotion Project: 640×360
- actual H.264 MP4: 640×360 @ 30
- durable Project remained 641×361
- even-size preservation 640×360 → 640×360: PASS

Windows atomic persistence truth:

- production Render Job: completed
- durable Job JSON parse/schema: PASS
- temp residue: none
- real NTFS `FileShare.None` lock against `FileJobStore`: PASS
- real NTFS `FileShare.None` lock against `NodeFileSystemAdapter.writeTextAtomic`: PASS
- product-level EPERM/EACCES/EBUSY failure: none

## Windows Media Smoke

PASS on Windows with real FFmpeg/ffprobe and the accepted media runtime.

## Final residue audit

PASS.

- Gate ports `43300`, `43301`, `43302`, `43310`: released
- Gate Node: none
- Gate Chrome/Chromium: none
- Gate FFmpeg: none
- Gate HyperFrames: none
- Gate video-use: none
- Gate Remotion: none
- PowerShell lock child: exited
- stale locks: none
- unexpected tmp: none
- props: none
- hf-work: none

## Final regression

- baseline `npm ci`: PASS
- baseline typecheck: PASS
- full unit: 112 files / 466 passed / 6 skipped / 0 failed
- focused hardening: 22 files / 94 tests PASS
- Playwright baseline: 4/4 PASS on temporary port 43300
- final focused regression: 11 files / 54 tests PASS
- final typecheck: PASS

## Final repository proof

- Windows: Microsoft Windows 10 10.0.19045
- Node: v24.20.0
- npm: 11.19.0
- FFmpeg / ffprobe: 8.1.1
- exact HEAD: `e5d449b3eb3b69fca23113c2fe75a905049578ea`
- Gate git status: clean
- original worktree untouched: YES
- original worktree retained its pre-existing `M next-env.d.ts`

## Attempt / blocker history

### Attempt 1 — BLOCKED / environment

Product SHA `4df173cdc40a330d677302ce5038157bf1c439e4`.

Playwright could not start because external original-workspace dev server PID `34232` already owned `127.0.0.1:3000`. Original process/worktree were deliberately left untouched. Classification: `ENVIRONMENT_ISSUE`.

### Attempt 2 — FAIL / H.264 export-dimension blocker

Same SHA. Cases A–D and most of E passed, but a 641×361 Project declared a 641×361 H.264 Export Profile while the actual encoded MP4 was 640×360.

Dedicated blocker PR #62 normalized MP4/H.264 resolved output dimensions to codec-compatible even values while preserving the durable odd Project Canvas. PR #62 merged to main as `c34a1d337ea5434f1a9da0c385cac19ffa89d722` after CI #757 and focused real Windows acceptance passed.

### Attempt 3 — FAIL / Windows atomic persistence blocker

Product SHA `c34a1d337ea5434f1a9da0c385cac19ffa89d722`.

Cases A–D passed. Case E production `render-final` Job failed at progress 0.02 with Windows `EPERM` during atomic `job.json.<uuid>.tmp → job.json` rename.

Dedicated blocker PR #63 introduced bounded Windows retry for transient `EPERM`, `EACCES`, and `EBUSY` while preserving temp-file + atomic rename semantics and failing closed on non-transient/exhausted errors. The fix covered both `FileJobStore` and `NodeFileSystemAdapter.writeTextAtomic`. PR #63 passed CI #759 plus real Windows `FileShare.None` lock acceptance and merged to main as `e5d449b3eb3b69fca23113c2fe75a905049578ea`.

### Final attempt — PASS

Complete H5 A–E restarted on exact merged product SHA `e5d449b3eb3b69fca23113c2fe75a905049578ea` and passed in full, including CI #760, real media workflow, restart/idempotency, local security, odd H.264 export truth, Windows atomic persistence, Windows Media Smoke, cleanup, and exact-SHA clean repository proof.

## Acceptance completion rule — SATISFIED

`H5_LOCAL_GATE = PASS`

H5 is complete. Product implementation hardening is frozen at exact accepted SHA `e5d449b3eb3b69fca23113c2fe75a905049578ea`.

The next and only active V2.3.1 step is **Release Finalization**:

1. merge this report-only H5 acceptance PR;
2. update package/package-lock release metadata to `2.3.1` without dependency/pin/schema drift;
3. run final exact-release CI;
4. merge release-finalization metadata/docs;
5. create and independently verify immutable annotated tag `v2.3.1`.

V2.4 remains NOT STARTED.
