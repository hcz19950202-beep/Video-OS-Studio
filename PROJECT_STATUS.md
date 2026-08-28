# Video OS Studio — Current Project Status

> Current-state source of truth for GPT Web, Local Codex, and other development agents. Historical PRs and validation reports remain evidence; they do not override this file.

## Current checkpoint

```yaml
released_product_version: 2.3.0
release_candidate_version: 2.3.1
project_schema: 2.0.0
released_tag: v2.3.0
released_commit: 562ffb26d5a04bd2898513893258f857187a00b4
released_tag_object_sha: 24069497b1986348510ef0d904382f5c3f99855d

package_json_version: 2.3.1
package_lock_version: 2.3.1

active_development_workstream: V2.3.1 RELEASE FINALIZATION
active_stage: FINAL RELEASE CANDIDATE CI / MERGE / TAG
active_branch: release/v2.3.1
local_action_required: NONE
next_action: OPEN RELEASE PR → EXACT-HEAD FOUR-GATE CI → EXPECTED-HEAD MERGE → ANNOTATED v2.3.1 TAG
v2_4_status: NOT STARTED
```

## V2.3.1 accepted product boundary

Final H5 accepted product SHA:

`e5d449b3eb3b69fca23113c2fe75a905049578ea`

H5 acceptance/report merge on main:

`c78f60aa657fd603397c8e41a170971521d609be`

Evidence:

- exact-main CI #760 / run `33155438036`: Ubuntu / Windows / Browser / Windows Media PASS;
- full Windows H5 A–E on `e5d449b...`: PASS;
- H5 report-only CI #762: PASS;
- PR #61 merged as `c78f60aa657fd603397c8e41a170971521d609be`.

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
H5 End-to-End Patch Acceptance             → COMPLETE / PR #61 / main c78f60aa657fd603397c8e41a170971521d609be
V2.3.1 Release Metadata Sync               → COMPLETE / package + lock = 2.3.1
V2.3.1 Final Release CI / Merge / Tag      → ACTIVE
```

## Release metadata truth

Release branch:

`release/v2.3.1`

Package metadata:

```text
package.json version:                 2.3.1
package-lock.json top-level version:  2.3.1
package-lock packages[""].version:    2.3.1
```

The one-shot metadata sync passed a structural before/after guard that allowed only those three version changes. The temporary workflow was removed after use, so it does not belong in the final release diff.

Detailed record:

`docs/acceptance/V2_3_1_RELEASE_FINALIZATION.md`

## H5 final acceptance summary

### Case A — Player / Timeline / Script

PASS.

- Player playback survived Canvas remount.
- Timeline playhead stayed synchronized.
- Script current-word highlighting followed playback and seek.
- double Space toggled exactly twice with no duplicate keyboard listener.

### Case B — Editing commit boundary

PASS.

- text input while focused: 0 Project command POSTs;
- commit: exactly 1;
- slider drag: 0 commands;
- pointer-up: exactly 1;
- blur: no duplicate commit;
- Undo restored durable values.

### Case C — Real Workflow / Jobs / Final

PASS.

Real talking-head media traversed:

`media → video-use → transcript → Visual Planner → HyperFrames Durable Job → Project mutation → Remotion → render-final → encoded MP4`

Final output evidence:

- H.264 / AAC;
- 640×360;
- 30 fps;
- 115.989333 seconds;
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

## Final release gate

V2.3.1 Release Finalization is metadata/docs only unless the release CI proves a defect.

Required remaining sequence:

1. open the `release/v2.3.1` PR against `main`;
2. freeze the exact final PR head;
3. run the repository's four gates on that exact head:
   - Ubuntu Verify;
   - Windows Verify;
   - Browser Smoke;
   - Windows Media Smoke;
4. audit the final PR diff for metadata/docs only and zero dependency/pin/schema drift;
5. merge with expected-head protection;
6. independently verify `main` at the release merge commit;
7. create annotated immutable tag `v2.3.1` pointing to that exact release merge commit;
8. independently verify the tag object and dereferenced commit;
9. optionally add a post-release truth-only docs commit recording the immutable tag object SHA; never move the tag.

No new Local Codex gate is required for this metadata/docs-only step unless cloud CI or diff review exposes a real release defect.

## Accepted invariants

```text
Project Schema:       2.0.0
Node:                 24.x
remotion:             4.0.513
@remotion/player:     4.0.513
@remotion/cli:        4.0.513
hyperframes:          0.8.10
@playwright/test:     1.62.1
prettier:             3.8.1

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

## Release truth before V2.3.1 tag

The currently released immutable boundary remains V2.3.0 until V2.3.1 release finalization and annotated tag verification complete:

- tag: `v2.3.0`
- release commit: `562ffb26d5a04bd2898513893258f857187a00b4`
- annotated tag object: `24069497b1986348510ef0d904382f5c3f99855d`

V2.3.1 is currently a release candidate with synchronized package metadata. V2.4 is NOT STARTED.
