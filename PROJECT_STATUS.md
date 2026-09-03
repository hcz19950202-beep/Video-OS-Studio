# Video OS Studio — Current Project Status

> Current-state source of truth for GPT Web, Local Codex, and other development agents. GitHub is the code/status source of truth. Historical PRs, commits, CI runs, Local Windows reports, released tags, and tag objects remain immutable evidence.

## Current checkpoint

```yaml
released_product_version: 2.5.2
released_tag: v2.5.2
released_commit: 6b268629dc1fbce9c80a66384cc663be6692eb65
released_tag_object_sha: 700a4dfbd2dfdee9253b28302b219129227858f9
project_schema: 2.0.0

package_json_version: 2.5.2
package_lock_version: 2.5.2

active_development_workstream: NONE
active_stage: V2.5.2 RELEASE COMPLETE
active_branch: NONE
final_v2_4_audit_issue: Issue #94 / CLOSED
final_v2_4_audit_pr: PR #96
final_v2_4_audit_superseded_pr: PR #95 / CLOSED UNMERGED
final_v2_4_audit_exact_head: 09f06c63968e888411bd0b94d495374f396ad95d
final_v2_4_audit_pr_ci: CI #1116 / run 33340016483 / PASS / 7 of 7
final_v2_4_audit_main: 3b8c6c61894d4b8437aafa1d48fd32f8b858c808
final_v2_4_audit_main_ci: CI #1117 / run 33340339282 / PASS / attempt 3 / 7 of 7
post_v2_4_2_p3_issue: Issue #83 / CLOSED
post_v2_4_2_p3_pr: PR #91
post_v2_4_2_p3_exact_head: 1ed2946d9fdbe8e6f17effc5c666a733138b2038
post_v2_4_2_p3_main: c528e2ce0fc1a64006f2fc76c5708cb808b37575
post_v2_4_2_p3_pr_ci: CI #1096 / run 33336431466 / PASS
post_v2_4_2_p3_main_ci: CI #1097 / run 33336689239 / PASS / attempt 2
engineering_audit_pr: PR #87
engineering_merge_pr: PR #88
accepted_engineering_head: c3825fe42e77c4369ec6e03d89204161764667e9
accepted_engineering_main: 8e8f63cd570af460a53199f45a139ee78c3a4dcb
accepted_engineering_main_ci: CI #1091 / run 33333104052 / PASS
local_windows_gate: c3825fe42e77c4369ec6e03d89204161764667e9 / PASS
release_metadata_sync: run 33333443237 / PASS
release_finalization_pr: PR #89
release_pr_frozen_head: 6d72d70930f3571c84b9d3f250c140515dbbded3
release_pr_ci: CI #1092 / run 33333581692 / PASS
release_main_ci: CI #1093 / run 33333816771 / PASS
release_tag_creation: run 33334882825 / PASS
v2_5_engineering_audit_pr: PR #112 / CLOSED UNMERGED
v2_5_engineering_merge_pr: PR #113
v2_5_accepted_source_head: 58d303db9f39b24b5883a4d408d523d5f3617279
v2_5_engineering_main: 79867fa26d837fb4f36dc2c60dd07c15ee88c4fd
v2_5_engineering_main_dedicated_ci: run 33670276121 / PASS
v2_5_engineering_main_standard_ci: run 33670276165 / PASS / 7 of 7
v2_5_local_windows_gate: 58d303db9f39b24b5883a4d408d523d5f3617279 / S01-S16 PASS
v2_5_release_metadata_sync: run 33671108580 / PASS
v2_5_release_finalization_pr: PR #114
v2_5_release_pr_frozen_head: 3d23c55de780b8b028b0665c14d99b0cc148f4fe
v2_5_release_pr_dedicated_ci: run 33671444645 / PASS
v2_5_release_pr_standard_ci: run 33671444664 / PASS / 7 of 7
v2_5_release_commit: df54e10e38ee2793e8fdf285ea2c216fe8c65478
v2_5_release_main_dedicated_ci: run 33672088362 / PASS
v2_5_release_main_standard_ci: run 33672088402 / PASS / 7 of 7
v2_5_release_tag_creation: run 33673004195 / PASS
v2_5_1_engineering_audit_pr: PR #116 / CLOSED UNMERGED
v2_5_1_engineering_merge_pr: PR #117
v2_5_1_accepted_source_head: d6c2f0ae1a7a7d71623731a79e3c3c3759069c38
v2_5_1_engineering_main: d74da28c1548c8aec7e9dd3d62f3b7fcd06d1b9b
v2_5_1_engineering_main_dedicated_ci: run 33743200284 / PASS / 2 of 2
v2_5_1_engineering_main_standard_ci: run 33743200058 / PASS / 7 of 7
v2_5_1_local_windows_gate: d6c2f0ae1a7a7d71623731a79e3c3c3759069c38 / S01-S16 PASS
v2_5_1_release_metadata_sync: run 33743797484 / PASS
v2_5_1_release_finalization_pr: PR #118
v2_5_1_release_pr_frozen_head: 85e347f4830d3476ed31206134610ef3f515fbf5
v2_5_1_release_pr_dedicated_ci: run 33743958297 / PASS / 2 of 2
v2_5_1_release_pr_standard_ci: run 33743958288 / PASS / attempt 2 / 7 of 7
v2_5_1_release_commit: b6f30c08c1c85bb80c43385827baa3317c1efbb5
v2_5_1_release_main_dedicated_ci: run 33745650176 / PASS / 2 of 2
v2_5_1_release_main_standard_ci: run 33745650175 / PASS / 7 of 7
v2_5_1_release_tag_creation: run 33746191919 / PASS
v2_5_2_engineering_audit_pr: PR #120 / CLOSED UNMERGED
v2_5_2_engineering_merge_pr: PR #121
v2_5_2_accepted_source_head: c93fee31a54c045c9da5fefd5de14cd8437847f3
v2_5_2_accepted_source_tree: 28859a3a549158bd7db43d81d2f1a2a6d1a9227d
v2_5_2_engineering_main: dfb5c0b271742c499a62a5d273fe0df08bc1afda
v2_5_2_engineering_main_dedicated_ci: run 33756286459 / PASS / 2 of 2
v2_5_2_engineering_main_standard_ci: run 33756286475 / PASS / attempt 2 / 7 of 7
v2_5_2_local_windows_gate: c93fee31a54c045c9da5fefd5de14cd8437847f3 / PASS
v2_5_2_release_metadata_sync: run 33757369315 / PASS
v2_5_2_release_finalization_pr: PR #122
v2_5_2_release_pr_frozen_head: c2bd12ff0ac1dd58f481465f120a45f9b4b7445a
v2_5_2_release_pr_dedicated_ci: run 33757700000 / PASS / 2 of 2
v2_5_2_release_pr_standard_ci: run 33757699946 / PASS / 7 of 7
v2_5_2_release_commit: 6b268629dc1fbce9c80a66384cc663be6692eb65
v2_5_2_release_main_dedicated_ci: run 33758451201 / PASS / 2 of 2
v2_5_2_release_main_standard_ci: run 33758451245 / PASS / 7 of 7
v2_5_2_release_tag_creation: run 33759152930 / PASS
v2_5_2_release_tag_object: 700a4dfbd2dfdee9253b28302b219129227858f9
local_action_required: NO
next_action: NONE — V2.5.2 is released; future product work requires a separately approved next workstream
v2_4_status: RELEASED
v2_4_1_status: RELEASED
v2_4_2_status: RELEASED
post_v2_4_2_p3_hardening_status: COMPLETE
final_v2_4_audit_status: COMPLETE
v2_5_status: RELEASED
v2_5_1_status: RELEASED
v2_5_2_status: RELEASED
```

## Immutable V2.5.2 release truth

Video OS Studio V2.5.2 is released at the independently verified annotated tag `v2.5.2`.

```text
release commit:      6b268629dc1fbce9c80a66384cc663be6692eb65
annotated tag:       v2.5.2
tag object SHA:      700a4dfbd2dfdee9253b28302b219129227858f9
tag target type:     commit
dereferenced target: 6b268629dc1fbce9c80a66384cc663be6692eb65
tag message:         Video OS Studio v2.5.2
```

Accepted V2.5.2 source SHA `c93fee31a54c045c9da5fefd5de14cd8437847f3` and tree `28859a3a549158bd7db43d81d2f1a2a6d1a9227d` passed exact-head Standard #1432 (7/7), Dedicated #102 (2/2), and Mandatory Local Windows acceptance. Draft PR #120 was closed unmerged; replacement PR #121 merged the identical accepted source with expected-head protection as engineering main `dfb5c0b271742c499a62a5d273fe0df08bc1afda`.

Engineering exact-main Dedicated #104 / run `33756286459` passed 2/2. Standard #1434 / run `33756286475` finished 7/7 PASS at attempt 2. Its first browser attempt exposed the existing C7 startup-test race where the status assertion could accept `disconnected` before the bridge address was published, yielding `Not running`; the identical main already passed C7 in Dedicated #104 and a single controlled identical-SHA browser rerun passed. No source or test patch was made.

Release version-sync run `33757369315` bounded metadata changes to the three package version fields. Release-finalization PR #122 froze head `c2bd12ff0ac1dd58f481465f120a45f9b4b7445a`; Standard #1435 / run `33757699946` passed 7/7 and Dedicated #105 / run `33757700000` passed 2/2. Expected-head merge produced GitHub-signature-verified release commit `6b268629dc1fbce9c80a66384cc663be6692eb65`.

Release exact-main Standard #1436 / run `33758451245` passed 7/7 and Dedicated #106 / run `33758451201` passed 2/2, including browser, real Media, HyperFrames, B6 and B7 gates. Isolated immutable-tag run `33759152930` then created `v2.5.2` only after proving `origin/main` still exactly equaled the release commit and the tag did not already exist. Independent GitHub Git Data verification proved `refs/tags/v2.5.2` points to object type `tag`, tag object `700a4dfbd2dfdee9253b28302b219129227858f9`, targeting the exact release commit with message `Video OS Studio v2.5.2`.

The tag object is unsigned; the correct release language is **annotated, independently verified immutable tag**.

Authoritative release evidence:

`docs/acceptance/V2_5_2_RELEASE_FINALIZATION.md`

## V2.5.2 accepted product truth

V2.5.2 adds durable built-in Agent provider/model routing and Composer control without changing Project Schema or Project mutation authority. New Sessions can select a configured provider/model; existing Sessions pin their durable `providerId + model`, reopen with the same identity, and execute Turns from persisted identity rather than current server defaults. Unsupported/unconfigured provider/model states fail explicitly, client Turn requests cannot override current Session identity, and provider secrets are not exposed in the runtime catalog or UI.

## Immutable V2.5.1 release truth

Video OS Studio V2.5.1 is released at the independently verified annotated tag `v2.5.1`.

```text
release commit:      b6f30c08c1c85bb80c43385827baa3317c1efbb5
annotated tag:       v2.5.1
tag object SHA:      d73595ad3a51d010d61df1c096bead911f4a31b5
tag target type:     commit
dereferenced target: b6f30c08c1c85bb80c43385827baa3317c1efbb5
tag message:         Video OS Studio v2.5.1
```

Accepted V2.5.1 source SHA `d6c2f0ae1a7a7d71623731a79e3c3c3759069c38` passed source cloud gates and Mandatory Local Windows S01–S16. PR #117 merged that exact source with expected-head protection as engineering main `d74da28c1548c8aec7e9dd3d62f3b7fcd06d1b9b`; engineering exact-main Dedicated run `33743200284` passed 2/2 and Standard run `33743200058` passed 7/7.

Release-finalization PR #118 froze exact head `85e347f4830d3476ed31206134610ef3f515fbf5`. Dedicated run `33743958297` passed 2/2. Standard run `33743958288` completed 7/7 PASS at attempt 2 after the initial Windows unit job recorded two fixed timeout failures under runner contention; the identical exact release head passed those same tests in Dedicated Windows and then passed the controlled Standard rerun. No source or test change was made for the rerun.

PR #118 then merged with expected-head protection as release commit `b6f30c08c1c85bb80c43385827baa3317c1efbb5`. Release exact-main Dedicated run `33745650176` passed 2/2 and Standard run `33745650175` passed 7/7, including real Media, HyperFrames, B6 and B7 Windows gates.

Isolated immutable-tag run `33746191919` created `v2.5.1` only after proving `origin/main` still exactly equaled the release commit, package metadata was exactly `2.5.1`, `v2.5.1` did not already exist, and immutable `v2.5.0` remained unchanged. Independent GitHub Git Data verification proved `refs/tags/v2.5.1` points to object type `tag`, tag object `d73595ad3a51d010d61df1c096bead911f4a31b5`, which targets the exact release commit with message `Video OS Studio v2.5.1`.

Immutable `v2.5.0` remains tag object `bff4bf67edc95dbf4cc78019f6795c94a4e59ea5`, targeting `df54e10e38ee2793e8fdf285ea2c216fe8c65478`.

Authoritative release evidence:

`docs/acceptance/V2_5_1_RELEASE_FINALIZATION.md`

## V2.5.1 accepted patch truth

V2.5.1 is a bounded correctness and runtime-ownership patch over V2.5.0. It keeps Project Schema unchanged while aligning MCP product metadata, removing constructor-time runtime ownership side effects, making Job/Workflow recovery lazy and shared, correcting Windows ownership/residue acceptance semantics, preserving production render timeouts, and proving restart reconciliation cannot leave FINAL_RENDER permanently running.
## Immutable V2.5.0 release truth

Video OS Studio V2.5.0 is released at the independently verified annotated tag `v2.5.0`.

```text
release commit:      df54e10e38ee2793e8fdf285ea2c216fe8c65478
annotated tag:       v2.5.0
tag object SHA:      bff4bf67edc95dbf4cc78019f6795c94a4e59ea5
tag target type:     commit
dereferenced target: df54e10e38ee2793e8fdf285ea2c216fe8c65478
tag message:         Video OS Studio v2.5.0
```

Accepted C7 source SHA `58d303db9f39b24b5883a4d408d523d5f3617279` passed source cloud acceptance and Mandatory Local Windows S01–S16. PR #113 merged that exact source to engineering main `79867fa26d837fb4f36dc2c60dd07c15ee88c4fd`; engineering exact-main Dedicated run `33670276121` and Standard run `33670276165` passed.

Release-finalization PR #114 froze exact head `3d23c55de780b8b028b0665c14d99b0cc148f4fe`. Its Dedicated run `33671444645` and Standard run `33671444664` passed, then expected-head merge produced release commit `df54e10e38ee2793e8fdf285ea2c216fe8c65478`. Release exact-main Dedicated run `33672088362` and Standard run `33672088402` passed, with Standard 7/7 green.

Isolated immutable-tag run `33673004195` created `v2.5.0` only after proving `origin/main` still exactly equaled the release commit, package metadata was exactly `2.5.0`, the new tag did not already exist, and immutable `v2.4.2` remained unchanged. Independent GitHub Git Data verification proved `refs/tags/v2.5.0` points to object type `tag`, tag object `bff4bf67edc95dbf4cc78019f6795c94a4e59ea5`, which targets `df54e10e38ee2793e8fdf285ea2c216fe8c65478` with message `Video OS Studio v2.5.0`.

Immutable `v2.4.0`, `v2.4.1`, and `v2.4.2` were independently reverified and remain unchanged.

Authoritative release evidence:

`docs/acceptance/V2_5_0_RELEASE_FINALIZATION.md`

## V2.5.0 accepted product truth

V2.5.0 is the Agent-native Workspace + Local MCP release. It preserves `project.json` as editing truth and Project Schema `2.0.0`, while adding the unified Agent workspace, ContextReference/Selection semantics, shared Tool Registry, authenticated loopback MCP reads/proposals/approval path, durable external-agent audit/history/job truth, production-surface integration, and C7 workflow/lock/runtime hardening.

## Immutable V2.4.2 release truth

Video OS Studio V2.4.2 is released at the independently verified annotated tag `v2.4.2`.

```text
release commit:      79e48b068f701bba3f1c826710337a82f0a64760
annotated tag:       v2.4.2
tag object SHA:      2c9b0ca2401f547066c6a51ff0ec60a641cfce35
tag target type:     commit
dereferenced target: 79e48b068f701bba3f1c826710337a82f0a64760
tag message:         Video OS Studio v2.4.2
```

Exact-main CI #1093 / run `33333816771` passed all seven gates on the release commit. Isolated tag creation run `33334882825` then created the immutable annotated tag only after proving `origin/main` still equaled the release commit and `v2.4.2` did not already exist. Independent GitHub Git Data verification proved `refs/tags/v2.4.2` points to object type `tag`, tag object `2c9b0ca2401f547066c6a51ff0ec60a641cfce35`, which targets commit `79e48b068f701bba3f1c826710337a82f0a64760`.

Immutable `v2.4.0` and `v2.4.1` were independently reverified and still target their original release commits.

Authoritative release evidence:

`docs/acceptance/V2_4_2_RELEASE_FINALIZATION.md`

## V2.4.2 accepted patch truth

V2.4.2 is a bounded correctness/liveness patch over V2.4.1. It adds no Project Schema migration and keeps Node, Remotion, HyperFrames, Playwright and Prettier pins frozen. The accepted engineering candidate is `c3825fe42e77c4369ec6e03d89204161764667e9`; mandatory Local Windows acceptance passed on that exact SHA, including targeted real HyperFrames recertification. PR #88 merged the exact accepted head to engineering main `8e8f63cd570af460a53199f45a139ee78c3a4dcb`, and PR #89 finalized release metadata before immutable tagging.

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
V2.4.2 PATCH / PR #87 audit + PR #88 accepted merge / Local Windows PASS
V2.4.2 RELEASE / PR #89 / release commit 79e48b068f701bba3f1c826710337a82f0a64760 / CI #1093 PASS / annotated tag verified
POST-V2.4.2 P3 HARDENING / Issue #83 CLOSED / PR #91 / main c528e2ce0fc1a64006f2fc76c5708cb808b37575 / CI #1097 PASS
FINAL V2.4.x INDEPENDENT AUDIT / Issue #94 CLOSED / PR #96 / exact head 09f06c63968e888411bd0b94d495374f396ad95d / main 3b8c6c61894d4b8437aafa1d48fd32f8b858c808 / CI #1117 PASS attempt 3
V2.5 C7 FINAL ACCEPTANCE / PR #112 audit + PR #113 accepted merge / source 58d303db9f39b24b5883a4d408d523d5f3617279 / Local Windows S01-S16 PASS
V2.5.0 RELEASE / PR #114 / release commit df54e10e38ee2793e8fdf285ea2c216fe8c65478 / Standard exact-main 7 of 7 PASS / annotated tag verified
V2.5.1 RELEASE / PR #118 / release commit b6f30c08c1c85bb80c43385827baa3317c1efbb5 / Standard exact-main 7 of 7 PASS / Dedicated exact-main 2 of 2 PASS / annotated tag verified
V2.5.2 RELEASE / PR #122 / release commit 6b268629dc1fbce9c80a66384cc663be6692eb65 / Standard exact-main 7 of 7 PASS / Dedicated exact-main 2 of 2 PASS / annotated tag verified
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

## Completed post-release P3 follow-up

Issue #83 is complete. The deferred provider-stream cleanup and Workflow original-error preservation work was implemented after the immutable V2.4.2 release and merged through PR #91 without changing the released product version, Project Schema, dependency pins, or the `v2.4.2` tag.

```text
Issue:     #83 / CLOSED
PR:        #91 / MERGED
exact accepted PR head:        1ed2946d9fdbe8e6f17effc5c666a733138b2038
PR exact-head CI #1096:        run 33336431466 / PASS / all seven gates
post-release hardening main:    c528e2ce0fc1a64006f2fc76c5708cb808b37575
exact-main CI #1097: run 33336689239 / PASS / all seven gates / attempt 2
Local Windows action required: NO
```

The provider change best-effort cancels the locked SSE reader before releasing it, so terminal/early-return paths do not leave unread successful response bodies alive while provider events and usage semantics remain unchanged. The Workflow change preserves both the original execution/reconciliation failure and any secondary durable failure-recording error instead of allowing the storage error to replace the primary failure.

The regression suite first proved the new tests RED on the pre-patch implementation and GREEN after the patch. Exact-main CI #1097 attempt 1 then exposed two unrelated pre-existing Windows timing flakes (`exclusive-lock.test.ts` at a 500 ms wait threshold and `workflow-production-stages.test.ts` at a 5 s test timeout); the new P3 regression suite itself passed. Re-running `windows-verify` on the identical commit and tree passed, after which Windows media, B6, B7, and HyperFrames exact-SHA gates all passed. No product-code change or timeout relaxation was needed.

## Final independent V2.4.x audit closure

Issue #94 is closed. The final independent V2.4.x audit found and fixed two P1 and seven P2 correctness/durability/runtime-lifecycle issues. The accepted engineering exact head is `09f06c63968e888411bd0b94d495374f396ad95d`.

Draft PR #95 carried the same exact head but was closed unmerged only because the connected GitHub Draft → Ready mutation was incompatible with the connector GraphQL schema. Replacement non-draft PR #96 contained the identical code and was merged with expected-head protection to engineering main `3b8c6c61894d4b8437aafa1d48fd32f8b858c808`.

```text
Issue:                       #94 / CLOSED
superseded Draft PR:         #95 / CLOSED UNMERGED
accepted merge PR:           #96 / MERGED
exact accepted engineering:  09f06c63968e888411bd0b94d495374f396ad95d
replacement PR CI #1116:     run 33340016483 / PASS / all seven gates
engineering main:            3b8c6c61894d4b8437aafa1d48fd32f8b858c808
exact-main CI #1117:         run 33340339282 / PASS / all seven gates / attempt 3
Local Windows action needed: NO
```

Exact-main CI #1117 attempts 1 and 2 exposed only pre-existing hosted Windows timing sensitivity at the fixed 5-second Vitest boundary. Attempt 1 timed out two otherwise passing Workflow tests at 5285 ms and 5211 ms. On attempt 2 the first test passed in 2961 ms and only the W2 workflow integration test timed out at 5024 ms, just 24 ms beyond the threshold. The final-audit regression suites continued to pass. Attempt 3 on the identical `3b8c6c...` source tree passed Windows verification and then all four dependent real-engine gates: Media, B6, B7, and HyperFrames. No product code, dependency, timeout, Project Schema, version, release, or tag changed to obtain the PASS.

The immutable release baseline remains `v2.4.2 -> 79e48b068f701bba3f1c826710337a82f0a64760`. The final audit is post-release hardening only and does not create V2.4.3. V2.5 development remains paused and unapproved.
