# Video OS Studio V2.4.1 — Release Finalization

## Status

`V2_4_1_RELEASE = CANDIDATE_NOT_YET_TAGGED`

V2.4.1 is a metadata/docs-only release candidate over the already accepted engineering-hardening product boundary. Until the final release merge, exact-main CI and annotated-tag verification complete, `v2.4.0` remains the immutable current release.

## Accepted hardening boundary

```text
engineering/audit PR:       #82
accepted merge PR:          #84
accepted exact head:        0560280cfe0701444198e38b34f82f132762d246
hardening merge main:        d868f7dd02c71577bab16029fa9cec2ae28bdf4e
Project Schema:              2.0.0
Node:                        24.x
Remotion:                    4.0.513
HyperFrames:                 0.8.10
```

PR #84 merged the exact same tested commit as PR #82 after the connected draft-to-ready mutation failed at the connector layer. The merge used expected-head protection on `0560280cfe0701444198e38b34f82f132762d246`; no replacement product code was introduced.

## Exact-SHA cloud evidence

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

Sync workflow run `33309439413` passed structural guards proving no dependency, devDependency, engine, package-tree or lock-integrity drift. The temporary workflow removed itself and is not part of the final release diff.

## Release rule

The finalization PR may merge only after all six CI gates pass on its exact frozen head. After merge:

1. verify `main` equals the resulting release merge commit;
2. require all six exact-main CI gates to pass;
3. create an **annotated immutable** tag `v2.4.1` targeting that exact release commit;
4. independently verify tag object type `tag`, target type `commit`, and exact dereferenced target;
5. verify `v2.4.0` still dereferences to `da22a5415cbf8ad2a9ce93b912b41b787b29a9b1`;
6. open a docs-only post-release truth-sync PR recording release commit/tag/tag-object evidence.

No additional Local Codex product gate is required for this metadata/docs-only finalization. The final exact-SHA Local Windows gate has already passed on the accepted product head, and release CI re-runs the Windows media/B6/B7 gates after the metadata bump.
