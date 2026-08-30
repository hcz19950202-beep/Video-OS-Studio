# Video OS Studio — Current Project Status

> Current-state source of truth for GPT Web, Local Codex, and other development agents. GitHub is the code/status source of truth. Historical PRs, commits, CI runs, Local Windows reports, released tags, and tag objects remain immutable evidence.

## Current checkpoint

```yaml
released_product_version: 2.4.1
released_tag: v2.4.1
released_commit: 4c105bad936479690711c03f3e349db36fbadaf5
released_tag_object_sha: 9f3d06d8eabb114d6f1bcd907e98b4de3756a4a7
project_schema: 2.0.0

package_json_version: 2.4.1
package_lock_version: 2.4.1

active_development_workstream: NONE
active_stage: V2.4.1 RELEASE COMPLETE
active_branch: NONE
hardening_audit_pr: PR #82
hardening_merge_pr: PR #84
accepted_hardening_head: 0560280cfe0701444198e38b34f82f132762d246
accepted_hardening_main: d868f7dd02c71577bab16029fa9cec2ae28bdf4e
accepted_hardening_main_ci: CI #1014 / run 33309131066 / PASS
local_windows_gate: 0560280cfe0701444198e38b34f82f132762d246 / PASS
release_metadata_sync: run 33309439413 / PASS
release_finalization_pr: PR #85
release_pr_frozen_head: 31e8b27f547880a660f2ea306013a93cb063793b
release_pr_ci: CI #1015 / run 33309688111 / PASS
release_main_ci: CI #1016 / run 33310596562 / PASS
release_tag_creation: run 33310884372 / PASS
local_action_required: NO
next_action: NONE — V2.4.1 is released; future product work requires a separately approved V2.4.x or V2.5 workstream
v2_4_status: RELEASED
v2_4_1_status: RELEASED
```

## Immutable V2.4.1 release truth

Video OS Studio V2.4.1 is released at the independently verified annotated tag `v2.4.1`.

```text
release commit:      4c105bad936479690711c03f3e349db36fbadaf5
annotated tag:       v2.4.1
tag object SHA:      9f3d06d8eabb114d6f1bcd907e98b4de3756a4a7
tag target type:     commit
dereferenced target: 4c105bad936479690711c03f3e349db36fbadaf5
tag message:         Video OS Studio v2.4.1
```

Independent GitHub Git Data verification proved `refs/tags/v2.4.1` points to an object of type `tag`, not directly to a commit, and that the tag object targets the exact release commit above.

Released tags `v2.3.0`, `v2.3.1`, `v2.4.0`, and `v2.4.1` are immutable and must never be moved or recreated.

Authoritative release evidence:

`docs/acceptance/V2_4_1_RELEASE_FINALIZATION.md`

## V2.4.1 accepted hardening truth

V2.4.1 is a correctness, security, durability, concurrency and release-hygiene patch over V2.4.0. It adds no new product capability, does not change Project Schema, and keeps the accepted Node / Remotion / HyperFrames versions frozen.

Authoritative PRD:

`docs/prd/Video_OS_Studio_V2_4_1_Engineering_Hardening_Master_PRD.md`

Accepted hardening boundary:

```text
engineering/audit PR:       #82
accepted merge PR:          #84
exact accepted head:        0560280cfe0701444198e38b34f82f132762d246
resulting hardening main:    d868f7dd02c71577bab16029fa9cec2ae28bdf4e
candidate CI #1012:          PASS / all six gates
replacement PR CI #1013:    PASS / all six gates
hardening main CI #1014:     PASS / all six gates
Local Windows exact-SHA:     PASS
```

PR #84 merged the exact same tested hardening commit as PR #82 after the connected draft-to-ready mutation failed at the connector layer. The replacement PR introduced no source/content delta and was merged with expected-head protection on `0560280cfe0701444198e38b34f82f132762d246`.

Accepted corrections include:

- trusted Job/Workflow renderer origins that do not persist request Host-derived authority;
- Windows transient atomic-replace retry plus primary/backup durable recovery for critical stores;
- ownership-safe filesystem locks with owner token, PID/liveness and owner-only release semantics;
- Production Mission short-lock `claim -> execute outside lock -> reconcile` execution boundaries;
- durable Production runner ownership and same-operation crash recovery without consuming an extra attempt;
- owner-token reconciliation preventing stale runners from overwriting reclaimed execution;
- stale Project and Mission client-publication guards;
- Agent Session full cross-process read/modify/write protection and durable apply-operation claims;
- Workflow corrupt-record isolation and bounded activity persistence;
- bounded PID probing and production polling defaults;
- one-transaction Effect Preset application and lower Asset Library playback render churn;
- generated Next/Playwright worktree-hygiene fixes;
- deterministic HTTP upload/security diagnostic coverage;
- corrected B7 real-media acceptance construction so long real sources exercise a bounded 90-frame Campaign render rather than accidentally rendering full source duration.

## Final Local Windows V2.4.1 acceptance

Exact tested SHA:

`0560280cfe0701444198e38b34f82f132762d246`

Final verdict:

```text
LOCAL_WINDOWS_V2_4_1_TARGETED_B7_GATE = PASS
LOCAL_WINDOWS_V2_4_1_GATE = PASS
```

Real-user-media identity:

```text
Source A: H.264/AAC / 720x1280 / 30fps / 583.354921s / 89,591,973 bytes
SHA-256: 2788FD4536E01F866BE90265B03EFA4D75BB2C99C454EBA4832F82846FC6E432

Source B: H.264/AAC / 1024x576 / 30fps / 65.921451s / 4,274,293 bytes
SHA-256: 2089729758C137573B68FACABE7916B58F0D50A6E1AD38164CCF95BB9431E32F
```

B7 acceptance evidence:

```text
Project duration:               90 frames each
video-main clip count:          1 each
clip duration:                  90 frames each
renderDurationFrames:           90 each
render logs:                    Rendered 90/90; Encoded 90/90
Source A output:                H.264/AAC / 640x360 / 30fps / 3.050667s
Source B output:                H.264/AAC / 640x360 / 30fps / 3.050667s
configured Mission concurrency: 2
observed Mission concurrency:   2
observed render resource limit: 1
Campaign:                       completed
durable reload:                 completed
JSON integrity:                 28 total / 0 invalid
.props.json residue:            0
.hf-work residue:               0
*.tmp residue:                  0
live/unrecoverable lock:        0
attributable process/listener:  0
primary worktree:               preserved exactly
```

## V2.4.1 release finalization evidence

Package metadata synchronization:

```text
release branch:                            release/v2.4.1-finalization
accepted hardening main baseline:          d868f7dd02c71577bab16029fa9cec2ae28bdf4e
package.json.version:                      2.4.0 -> 2.4.1
package-lock.json.version:                 2.4.0 -> 2.4.1
package-lock.json.packages[""].version:    2.4.0 -> 2.4.1
sync run:                                  33309439413 / PASS
```

The one-shot version-sync guard proved no dependency, devDependency, engine, package-tree or lock-integrity drift.

Release PR #85 exact head:

`31e8b27f547880a660f2ea306013a93cb063793b`

CI #1015 / run `33309688111` passed all six release gates on that exact head.

PR #85 merged with expected-head protection as release commit:

`4c105bad936479690711c03f3e349db36fbadaf5`

Exact-main CI #1016 / run `33310596562` passed all six gates at attempt 1:

```text
ubuntu-verify                    PASS
windows-verify                   PASS
browser-smoke                    PASS
windows-media-smoke              PASS
windows-b6-core-acceptance       PASS
windows-b7-campaign-acceptance   PASS
```

Isolated tag creation run `33310884372` then created `v2.4.1` only after proving `origin/main` still exactly equaled the release commit and the tag did not already exist. The run verified the annotated object and dereferenced commit before succeeding, and removed its temporary workflow from the isolated tagging branch.

Independent GitHub Git Data verification then confirmed:

```text
ref:                 refs/tags/v2.4.1
ref object type:     tag
tag object SHA:      9f3d06d8eabb114d6f1bcd907e98b4de3756a4a7
tag target type:     commit
tag target commit:   4c105bad936479690711c03f3e349db36fbadaf5
```

## Previous immutable V2.4.0 release truth

```text
release commit:      da22a5415cbf8ad2a9ce93b912b41b787b29a9b1
annotated tag:       v2.4.0
tag object SHA:      96ebdd67e2412ed4d25be36cc6120f1bba8a8734
tag target type:     commit
dereferenced target: da22a5415cbf8ad2a9ce93b912b41b787b29a9b1
tag message:         Video OS Studio v2.4.0
```

Independent re-verification during V2.4.1 release finalization confirmed the V2.4.0 object still targets the same commit.

## V2.4 delivery history

```text
R0   COMPLETE / PR #66
B0   COMPLETE / PR #67
B1   COMPLETE / PR #68
B2   COMPLETE / PR #69
B3   COMPLETE / PR #70
B4   COMPLETE / PR #71
B5a  COMPLETE / PR #73
B5b  COMPLETE / PR #75
B5c  COMPLETE / PR #77
B6   COMPLETE / PR #78
B7   COMPLETE / PR #79 / Local Windows real-user-media PASS
V2.4.0 RELEASE / PR #80 / release commit da22a5415cbf8ad2a9ce93b912b41b787b29a9b1 / annotated tag verified
V2.4.1 HARDENING / PR #82 audit + PR #84 accepted merge / Local Windows PASS
V2.4.1 RELEASE / PR #85 / release commit 4c105bad936479690711c03f3e349db36fbadaf5 / CI #1016 PASS / annotated tag verified
```

## Frozen technical invariants

```text
Project Schema:       2.0.0
Node:                 24.x
remotion:             4.0.513
@remotion/player:     4.0.513
@remotion/cli:        4.0.513
hyperframes:          0.8.10
@playwright/test:     1.62.1
prettier:             3.8.1
```

## Permanent accepted invariants

```text
Source Media != Project Canvas != Export Profile
Project != Workflow != Job
Agent Session != Project
Mission != Project
Mission != Workflow
Production Plan != Project
Production Plan != Workflow
Production Plan != Job
QA Report != Project
Skill != Project
Production Execution != Project
Production Execution != Workflow
Production Execution != Job
Edit Protection != Project
Campaign != Project
Campaign != Mission
REUSE > MODIFY > CREATE
```

- `project.json` remains the mutable editing truth for each output;
- stale mutation-dependent state fails closed;
- Project mutation passes accepted application-owned mutation/revision boundaries;
- protected/manual edits are not silently overwritten;
- Campaign operations do not silently destroy sibling output truth;
- no generic Agent shell/filesystem/network/process/computer authority is introduced;
- Remotion remains the master renderer;
- released tags are immutable and must never be moved or recreated.

## Deferred post-V2.4.1 follow-up

Issue #83 tracks non-blocking P3 follow-up work that remains outside the completed V2.4.1 release unless a reproducible correctness/security failure upgrades severity:

- successful provider-stream unread-body cleanup;
- Workflow secondary-persistence-error/original-error preservation.
