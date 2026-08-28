# Video OS Studio — Current Project Status

> Current-state source of truth for GPT Web, Local Codex, and other development agents. Historical PRs and validation reports remain evidence; they do not override this file.

## Current checkpoint

```yaml
released_product_version: 2.3.0
hardening_candidate_version: 2.3.1
project_schema: 2.0.0
released_tag: v2.3.0
released_commit: 562ffb26d5a04bd2898513893258f857187a00b4
released_tag_object_sha: 24069497b1986348510ef0d904382f5c3f99855d

package_json_version: 2.3.0
package_lock_version: 2.3.0

active_development_workstream: V2.3.1 RELEASE FINALIZATION
active_hardening_stage: H5 PATCH RELEASE ACCEPTANCE COMPLETE
active_branch: release/v2.3.1-final-acceptance
local_action_required: NONE / H5 COMPLETE
next_action: MERGE H5 REPORT-ONLY PR, THEN V2.3.1 RELEASE FINALIZATION
v2_4_status: NOT STARTED
```

## V2.3.1 accepted product boundary

The final accepted H5 product SHA is:

`e5d449b3eb3b69fca23113c2fe75a905049578ea`

Exact-main cloud evidence:

- CI #760 / run `33155438036`
- Ubuntu Verify: PASS
- Windows Verify: PASS
- Browser Smoke: PASS
- Windows Media Smoke: PASS

Formal Windows H5 local acceptance also passed on this exact SHA with Node `v24.20.0`, npm `11.19.0`, FFmpeg/ffprobe `8.1.1`, real Playwright/Remotion Chromium, real HyperFrames, and real video-use.

Full report:

`docs/acceptance/V2_3_1_H5_PATCH_ACCEPTANCE.md`

## V2.3.1 milestone evidence

```text
R0 Hardening Truth / PRD Sync              → COMPLETE / PR #53 / main 2aeb207c2c4d77ea872edd4c1dec5648a15f20f1
H0 Correctness / Resource Hygiene          → COMPLETE / PR #54 / main 692a97a8a7500e063675bbe9dfaeef9caf849e81
H1 Editing Commit Boundary                 → COMPLETE / PR #55 / main afcbef92c8f125251305af9f46b93cee071e7e13
H2 Playback / Timeline / Waveform          → COMPLETE / PR #56 / main 090b38196026c353ecc4452841fbcbc28cbeb5d2
H3a Runtime I/O Low-Risk                   → COMPLETE / PR #57 / main 2c519b62b42ecdd537d80e7b53576598a1398c76
H3b Startup PID Probes                     → COMPLETE / PR #58 / main e2fa211de9f6d6c73be3f0e0431a8fee39b51de8
H3c Operations Ledger                      → COMPLETE / PR #59 / main f714079a57e391b779849d92320fb5dfc113492a
H4 Local-First Security Boundary           → COMPLETE / PR #60 / main 4df173cdc40a330d677302ce5038157bf1c439e4
H5 Blocker: H264 export dimension truth    → COMPLETE / PR #62 / main c34a1d337ea5434f1a9da0c385cac19ffa89d722
H5 Blocker: Windows atomic persistence     → COMPLETE / PR #63 / main e5d449b3eb3b69fca23113c2fe75a905049578ea
H5 End-to-End Patch Acceptance             → COMPLETE / PR #61 PENDING REPORT-ONLY MERGE
V2.3.1 Release Finalization                → ACTIVE NEXT
```

## H5 final acceptance summary

### Case A — Player / Timeline / Script

PASS.

- Player playback survived Canvas remount.
- Timeline playhead stayed synchronized.
- Script current-word highlighting followed playback and seek.
- double Space toggled exactly twice with no duplicate keyboard listener.

### Case B — Editing commit boundary

PASS.

- text input while focused: 0 Project command POSTs.
- commit: exactly 1.
- slider drag: 0 commands.
- pointer-up: exactly 1.
- blur: no duplicate commit.
- Undo restored durable values.

### Case C — Real Workflow / Jobs / Final

PASS.

Real talking-head media traversed:

`media → video-use → transcript → Visual Planner → HyperFrames Durable Job → Project mutation → Remotion → render-final → encoded MP4`

Final evidence:

- real video-use Job completed;
- real HyperFrames Job completed;
- real Final Render Job completed;
- H.264 / AAC / 640×360 / 30 fps / 115.989333 s;
- encoded visual proof PASS;
- no props/hf-work/orphan-engine residue.

### Case D — Restart / idempotency

PASS.

- durable Agent Session/Proposal/Project state survived restart;
- Project revision remained unchanged across restart;
- duplicate Apply was idempotent;
- shared live PID was probed once;
- dead PID recovered Jobs to `JOB_INTERRUPTED`, `retryable=true`;
- operation ledger passed;
- no stale locks.

### Case E — Local security + H.264 + Windows atomic persistence

PASS.

- default listener loopback-only;
- spoofed Host could not control trusted renderer origin;
- remote renderer origin blocked by default;
- real Next Range 206 and HEAD 200 passed;
- odd Project Canvas remained 641×361;
- resolved H.264 Export Profile / Render Job / prepared Remotion Project / actual MP4 all agreed on 640×360;
- already-even 640×360 remained 640×360;
- real Windows `FileShare.None` contention passed for both `FileJobStore` and `NodeFileSystemAdapter.writeTextAtomic`;
- no product-level EPERM/EACCES/EBUSY failure or temp residue.

## Release-finalization boundaries

V2.3.1 Release Finalization is metadata/docs only unless a release-gate defect is proven.

Required sequence:

1. merge PR #61 after its report-only CI is green;
2. create a dedicated V2.3.1 release-finalization branch from resulting main;
3. update `package.json` version to `2.3.1`;
4. synchronize only package-lock root metadata (`version` and `packages[""]` version) to `2.3.1` without dependency/pin drift;
5. update release truth docs/status;
6. run final exact-release GitHub CI across Ubuntu, Windows, Browser Smoke, and Windows Media Smoke;
7. merge release-finalization with expected-head protection;
8. create immutable annotated tag `v2.3.1` only after the final release commit is independently verified;
9. independently verify the tag object and dereferenced commit.

Do not move or recreate `v2.3.0`.

## Accepted invariants

```text
Project Schema:       2.0.0
Node:                 24.x
remotion:             4.0.513
@remotion/player:     4.0.513
@remotion/cli:        4.0.513
hyperframes:          0.8.10
@playwright/test:     1.62.1

Source Media != Project Canvas != Export Profile
Project != Workflow != Job
Agent Session != Project
REUSE > MODIFY > CREATE
```

- Project JSON remains durable editing truth.
- Workflow durable state remains separate from Project Schema.
- Durable Job runtime remains concrete execution truth.
- Agent/provider/tool execution has no direct Project or Workflow mutation authority.
- Agent mutation requires validated Proposal plus explicit Review/Apply/Confirm boundary.
- stale Project/Workflow state fails closed.
- default local server boundary remains loopback-first.
- Windows durable atomic replacement preserves temp-file + atomic rename semantics with bounded transient-error retry.

## Release truth

The currently released immutable boundary remains V2.3.0 until V2.3.1 release finalization completes:

- tag: `v2.3.0`
- release commit: `562ffb26d5a04bd2898513893258f857187a00b4`
- annotated tag object: `24069497b1986348510ef0d904382f5c3f99855d`

V2.4 is NOT STARTED and must not begin implicitly inside release finalization.
