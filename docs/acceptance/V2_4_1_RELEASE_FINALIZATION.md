# Video OS Studio V2.4.1 — Release Finalization

## Status

`V2_4_1_RELEASE = COMPLETE`

Video OS Studio V2.4.1 is released at an independently verified annotated Git tag.

```text
release commit:      4c105bad936479690711c03f3e349db36fbadaf5
release tag:         v2.4.1
tag object SHA:      9f3d06d8eabb114d6f1bcd907e98b4de3756a4a7
tag object type:     tag
tag target type:     commit
dereferenced target: 4c105bad936479690711c03f3e349db36fbadaf5
tag message:         Video OS Studio v2.4.1
```

The tag is immutable. Never move or recreate `v2.4.1`. Previous `v2.3.0`, `v2.3.1`, and `v2.4.0` release tags remain immutable as well.

## Accepted hardening boundary

```text
engineering/audit PR:       #82
accepted merge PR:          #84
accepted exact head:        0560280cfe0701444198e38b34f82f132762d246
hardening merge main:       d868f7dd02c71577bab16029fa9cec2ae28bdf4e
Project Schema:             2.0.0
Node:                       24.x
Remotion:                   4.0.513
HyperFrames:                0.8.10
```

PR #84 merged the exact same tested hardening commit as PR #82 after the connected draft-to-ready mutation failed at the connector layer. The merge used expected-head protection on `0560280cfe0701444198e38b34f82f132762d246`; no replacement product code was introduced.

## Hardening cloud evidence

```text
CI #1012 / run 33307842357 / exact 0560280c... / PASS all six gates
CI #1013 / run 33308928363 / exact 0560280c... / PASS all six gates
CI #1014 / run 33309131066 / exact main d868f7dd... / PASS all six gates
```

Required gates:

```text
ubuntu-verify                    PASS
windows-verify                   PASS
browser-smoke                    PASS
windows-media-smoke              PASS
windows-b6-core-acceptance       PASS
windows-b7-campaign-acceptance   PASS
```

## Final Local Windows real-user-media gate

Exact tested SHA:

`0560280cfe0701444198e38b34f82f132762d246`

Final result:

```text
LOCAL_WINDOWS_V2_4_1_TARGETED_B7_GATE = PASS
LOCAL_WINDOWS_V2_4_1_GATE = PASS
```

Real Source A:

```text
H.264/AAC / 720x1280 / 30fps / 583.354921s / 89,591,973 bytes
SHA-256: 2788FD4536E01F866BE90265B03EFA4D75BB2C99C454EBA4832F82846FC6E432
```

Real Source B:

```text
H.264/AAC / 1024x576 / 30fps / 65.921451s / 4,274,293 bytes
SHA-256: 2089729758C137573B68FACABE7916B58F0D50A6E1AD38164CCF95BB9431E32F
```

B7 bounded-render evidence:

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
props/hf-work/tmp residue:      0
attributable process/listener:  0
primary worktree:               preserved exactly
```

## V2.4.1 hardening contents

The patch adds no new product capability. Accepted corrections include:

- renderer/Workflow durable asset origins resolved from trusted configuration rather than request Host;
- Windows transient atomic-replace retry plus primary/backup recovery for critical durable stores;
- ownership-safe locks with PID/liveness and owner-token release semantics;
- short Production Mission `claim -> execute outside lock -> reconcile` boundaries;
- durable Production runner ownership/reclaim without duplicate operation or extra attempt;
- stale Project/Mission client publication guards;
- Agent Session cross-process read/modify/write protection and durable apply claims;
- Workflow corrupt-record isolation and bounded activity persistence;
- bounded PID probing and production polling defaults;
- Effect Preset single-transaction application and Asset Library frame snapshot optimization;
- source-worktree hygiene for generated Next/Playwright artifacts;
- deterministic HTTP upload/security diagnostic coverage;
- corrected B7 acceptance harness so long real sources test a bounded 90-frame Campaign render rather than accidentally rendering the full source duration.

## Release metadata synchronization

Release branch:

`release/v2.4.1-finalization`

Accepted hardening main baseline:

`d868f7dd02c71577bab16029fa9cec2ae28bdf4e`

One-shot version synchronization changed only:

```text
package.json.version:                    2.4.0 -> 2.4.1
package-lock.json.version:               2.4.0 -> 2.4.1
package-lock.json.packages[""].version:  2.4.0 -> 2.4.1
```

Sync workflow run `33309439413` passed structural guards proving no dependency, devDependency, engine, package-tree or lock-integrity drift. The temporary workflow removed itself and is not part of the release diff.

## Release PR and exact-head CI

Release PR #85 froze exact head:

`31e8b27f547880a660f2ea306013a93cb063793b`

CI #1015 / run `33309688111` passed all six gates on that exact head:

```text
ubuntu-verify                    PASS
windows-verify                   PASS
browser-smoke                    PASS
windows-media-smoke              PASS
windows-b6-core-acceptance       PASS
windows-b7-campaign-acceptance   PASS
```

The net release diff contained only:

```text
package.json
package-lock.json
PROJECT_STATUS.md
docs/acceptance/V2_4_1_RELEASE_FINALIZATION.md
```

No product implementation, runtime, tests, Project Schema, dependency tree, engine pin, or renderer version changed.

PR #85 merged with expected-head protection on `31e8b27f547880a660f2ea306013a93cb063793b` as:

`4c105bad936479690711c03f3e349db36fbadaf5`

## Exact-main release CI

CI #1016 / run `33310596562` completed `SUCCESS` on exact release main:

`4c105bad936479690711c03f3e349db36fbadaf5`

All six gates passed at attempt 1:

```text
ubuntu-verify                    PASS
windows-verify                   PASS
browser-smoke                    PASS
windows-media-smoke              PASS
windows-b6-core-acceptance       PASS
windows-b7-campaign-acceptance   PASS
```

## Immutable annotated tag creation

Isolated tagging branch:

`release/v2.4.1-tagging`

One-shot tag workflow:

```text
run:                 33310884372
result:              PASS
release boundary:    origin/main == 4c105bad936479690711c03f3e349db36fbadaf5
pre-existing v2.4.1: NO
tag created:         v2.4.1 / annotated
remote dereference:  4c105bad936479690711c03f3e349db36fbadaf5
one-shot workflow:   removed from tagging branch after verification
```

Independent GitHub Git Data verification then proved:

```text
ref:                  refs/tags/v2.4.1
ref object type:      tag
tag object SHA:       9f3d06d8eabb114d6f1bcd907e98b4de3756a4a7
tag name:             v2.4.1
tag target type:      commit
tag target commit:    4c105bad936479690711c03f3e349db36fbadaf5
tag message:          Video OS Studio v2.4.1
```

Independent verification also confirmed `v2.4.0` still targets:

`da22a5415cbf8ad2a9ce93b912b41b787b29a9b1`

## Final release verdict

```text
V2_4_1_RELEASE = COMPLETE
LOCAL_WINDOWS_V2_4_1_GATE = PASS
RELEASE_PR_EXACT_HEAD_CI = PASS
RELEASE_MAIN_EXACT_SHA_CI = PASS
IMMUTABLE_ANNOTATED_TAG = VERIFIED
```

V2.4.1 is now the immutable current release. Any future V2.4.x or V2.5 work must begin from a separately approved workstream and must never move or recreate released tags.
