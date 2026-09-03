# Video OS Studio V2.5.2 Release Finalization

`V2_5_2_RELEASE = FINALIZATION_IN_PROGRESS`

## 1. Release identity

- Release target: `v2.5.2`
- Package target: `2.5.2`
- Project Schema: unchanged
- Node engine: `24.x`
- Previous immutable release: `v2.5.1`
- Previous V2.5.1 immutable release commit: `b6f30c08c1c85bb80c43385827baa3317c1efbb5`
- Previous V2.5.1 annotated tag object: `d73595ad3a51d010d61df1c096bead911f4a31b5`
- Previous V2.5.1 truth-synced main before this workstream: `72df13be82971843672c1144a340e1c972d37260`

V2.5.2 is a bounded post-V2.5.1 workstream for durable built-in Agent provider/model routing and Composer control. It does not change Project Schema or Project mutation authority.

## 2. Engineering source acceptance

Development was performed in Draft PR #120 from accepted V2.5.1 truth-synced main:

`72df13be82971843672c1144a340e1c972d37260`

Accepted engineering source SHA:

`c93fee31a54c045c9da5fefd5de14cd8437847f3`

Accepted source tree:

`28859a3a549158bd7db43d81d2f1a2a6d1a9227d`

The final source-empty trigger commit `c93fee31...` preserves the exact same source tree as the preceding source commit `81fc137127cc8736c078f15d7bffb124b700551e`; independent compare returned zero changed files.

Delivered source scope:

- built-in provider runtime catalog/resolver for Volcengine Agent Plan, OpenAI Responses and DeepSeek Chat;
- deterministic mock provider remains non-production only;
- unified Composer exposes Provider/Model selection for new Sessions;
- Agent Session durably owns `providerId + model`;
- existing Session provider/model identity is immutable;
- Session reopen and Turn execution resolve persisted Session provider/model rather than current server defaults;
- Turn request schema does not accept client provider/model overrides for the current Session;
- unsupported or unavailable provider/model states fail explicitly instead of silently migrating Session identity;
- model catalog/default handling is normalized across providers;
- provider routing, durable model binding, client contract and browser regression coverage was added;
- existing A4 raw `providerId · model` diagnostics remain intact.

Final engineering source scope was exactly 13 files and contained no package metadata, dependency, Project Schema or Project mutation-path changes.

## 3. Accepted source exact-head cloud gates

Exact source `c93fee31...` passed:

### Standard CI #1432

Run `33752751784`: **7 / 7 PASS**

- ubuntu-verify
- windows-verify
- browser-smoke
- windows-media-smoke
- windows-hyperframes-smoke
- windows-b6-core-acceptance
- windows-b7-campaign-acceptance

### V2.5 Cloud Acceptance #102

Run `33752751759`: **2 / 2 PASS**

- v2-5-cloud-acceptance
- v2-5-windows-full-baseline

The dedicated gate included protocol/authority/stale/history/lifecycle acceptance, Agent workspace/MCP browser acceptance, Windows full unit/build, and C7 residue audit.

## 4. Mandatory Local Windows acceptance

Fresh independent Codex **VERIFY ONLY** acceptance was executed on exact source:

`c93fee31a54c045c9da5fefd5de14cd8437847f3`

Expected and actual source tree:

`28859a3a549158bd7db43d81d2f1a2a6d1a9227d`

Result:

`LOCAL WINDOWS ACCEPTANCE: PASS`

Isolation:

- verification worktree: `E:\_verify_v252`
- `VIDEO_OS_DATA_ROOT`: `E:\_verify_v252_data`
- starting tree clean: YES
- final tree clean: YES
- tracked files changed: NO
- new orphan process: NO
- runtime residue: PASS

Baseline:

- npm ci PASS
- format PASS, H6 28 files
- lint PASS, 0 errors / 14 warnings
- typecheck PASS
- unit PASS, 198 passed / 8 skipped test files; 825 passed / 9 skipped tests
- build PASS

V2.5.2 targeted acceptance:

- provider routing: 8 / 8 PASS
- durable provider binding: PASS
- durable model binding: PASS
- client Provider/Model contract: 2 / 2 PASS
- unsupported provider/model fail-closed handling: PASS
- A4 Agent workspace browser: PASS
- C2 unified conversation browser: PASS
- current-session pinned identity: PASS
- next-session Provider/Model semantics: PASS
- existing A4 diagnostics: PASS
- Turn ignores server default provider drift: PASS
- Turn uses persisted providerId: PASS
- Turn uses persisted model: PASS
- strict Turn schema rejects client provider/model overrides: PASS
- Session reopen preserves identity: PASS
- silent fallback detected: NO

Provider credentials were not required for deterministic acceptance. Volcengine, OpenAI and DeepSeek were not configured in the isolated verifier; real provider network calls were not run and no secrets were exposed.

Regression acceptance:

- Selection Mode PASS
- Context PASS
- Proposal review/apply PASS
- Workflow Action PASS
- stale guard PASS
- MCP / Agent acceptance PASS

No source modification, commit or push was performed by the Local verifier.

## 5. Replacement engineering PR

Draft PR #120 was updated with the Local Windows PASS and then closed **without merge**.

Replacement PR #121 used the identical accepted source branch/head/tree:

`c93fee31a54c045c9da5fefd5de14cd8437847f3`

Replacement exact-head gates:

- Standard CI #1433 / run `33755472746`: **7 / 7 PASS**
- V2.5 Cloud Acceptance #103 / run `33755472739`: **2 / 2 PASS**

Pre-merge audit proved:

- replacement was open, non-Draft and mergeable;
- head remained the exact Local-accepted SHA;
- base main remained `72df13be82971843672c1144a340e1c972d37260`;
- net source scope remained exactly 13 accepted files.

PR #121 was merged with expected-head protection.

Engineering main merge commit:

`dfb5c0b271742c499a62a5d273fe0df08bc1afda`

Its source tree remains the exact Local-accepted tree:

`28859a3a549158bd7db43d81d2f1a2a6d1a9227d`

## 6. Engineering exact-main acceptance

Exact engineering main `dfb5c0b2...` passed push-triggered gates.

### V2.5 Cloud Acceptance #104

Run `33756286459`: **2 / 2 PASS**

- v2-5-cloud-acceptance PASS
- v2-5-windows-full-baseline PASS
- protocol/authority/stale/history/lifecycle PASS
- Agent workspace/MCP browser acceptance PASS
- full Windows unit suite PASS
- build PASS
- C7 residue audit PASS

### Standard CI #1434

Run `33756286475`: **7 / 7 PASS at attempt 2**

Final passing jobs:

- ubuntu-verify PASS
- windows-verify PASS
- browser-smoke PASS
- windows-media-smoke PASS
- windows-hyperframes-smoke PASS
- windows-b6-core-acceptance PASS
- windows-b7-campaign-acceptance PASS

The first browser-smoke attempt is intentionally retained in the audit record. Its existing C7 MCP browser test reached the bridge-address assertion while the UI address still read `Not running`.

The relevant existing test first waits for bridge status matching:

`/ready|connected|disconnected/`

and then immediately reads the address. Because `disconnected` satisfies that wait, the test may race bridge-address publication during startup. The failure was therefore an existing startup synchronization race rather than a V2.5.2 Provider/Model behavior failure.

Evidence for controlled rerun eligibility:

- the identical engineering main SHA passed the same C7 Agent/MCP browser acceptance in Dedicated #104;
- the same accepted source tree had already passed C7/browser acceptance in source and replacement gates;
- all other Standard #1434 jobs passed on the identical engineering main;
- no source or test modification was made.

After the workflow completed, one controlled rerun of only `browser-smoke` on the identical engineering main SHA passed. The initial failure is not erased from this release record.

Therefore:

`dfb5c0b271742c499a62a5d273fe0df08bc1afda`

is the accepted V2.5.2 engineering main.

## 7. Version synchronization

Release-finalization branch:

`release/v2.5.2-finalization`

was created directly from accepted engineering main:

`dfb5c0b271742c499a62a5d273fe0df08bc1afda`

The package metadata initially remained `2.5.1` in:

- `package.json.version`
- `package-lock.json.version`
- `package-lock.json.packages[""].version`

An isolated one-shot helper performed the release version synchronization.

Workflow:

`V2.5.2 Release Version Sync`

Run:

`33757369315`

Result:

**PASS**

The helper proved:

- its parent was exact accepted engineering main `dfb5c0b2...`;
- `refs/tags/v2.5.2` did not exist before version synchronization;
- Node 24 was used;
- all three package version fields started at `2.5.1`;
- package and lock JSON structures were snapshotted with only the allowed version fields removed;
- `npm version 2.5.2 --no-git-tag-version` succeeded;
- all three target version fields became `2.5.2`;
- stripped package/lock structures remained identical;
- the one-shot helper self-deleted;
- net diff against accepted engineering main was required to contain exactly `package-lock.json` and `package.json`;
- the bounded version-sync commit was pushed.

Version-sync commit:

`9f3658723c47b4263a811db406d0dc67ba001757`

Independent compare accepted engineering main → version-sync commit confirmed:

- `package-lock.json`: 2 additions / 2 deletions
- `package.json`: 1 addition / 1 deletion
- no other net files

Independent repository reads confirmed package version `2.5.2`, lockfile top-level version `2.5.2`, and lockfile root package version `2.5.2`.

The helper workflow is absent from the version-sync tree.

## 8. Release-finalization candidate

This evidence file is the only additional file allowed beyond the two bounded version metadata files.

Required net release-finalization scope relative to accepted engineering main:

1. `package.json`
2. `package-lock.json`
3. `docs/acceptance/V2_5_2_RELEASE_FINALIZATION.md`

No product/runtime/test/workflow source change is permitted in this release-finalization phase.

Release-finalization PR exact head: **PENDING**

Release-finalization PR Standard CI: **PENDING**

Release-finalization PR V2.5 Cloud Acceptance: **PENDING**

Release merge commit: **PENDING**

Release exact-main Standard CI: **PENDING**

Release exact-main V2.5 Cloud Acceptance: **PENDING**

## 9. Immutable release tag boundary

Before tag creation, all of the following must be true:

- release-finalization PR merged using expected-head protection;
- release exact-main Standard CI = 7 / 7 PASS;
- release exact-main V2.5 Cloud Acceptance = 2 / 2 PASS;
- main independently rechecked to equal the accepted release commit;
- `refs/tags/v2.5.2` independently rechecked absent.

Only then may the immutable annotated tag be created:

`v2.5.2`

with tag message:

`Video OS Studio v2.5.2`

The release record must independently verify the tag ref, tag object SHA, target type, exact target commit and tag message. An unsigned annotated tag must be described as an **annotated, independently verified immutable tag**, not as cryptographically signed.

Current tag state at version-finalization start:

`refs/tags/v2.5.2 = ABSENT`

Immutable tag creation: **PENDING**

Tag object SHA: **PENDING**

Tag target release commit: **PENDING**

## 10. Post-release truth synchronization

After immutable tag creation, a separate documentation-only truth-sync PR must update the repository's current status/reference documents without moving, recreating or retargeting `v2.5.2`.

Post-release truth-sync PR: **PENDING**

Truth-synced main: **PENDING**

Post-truth-main gates: **PENDING**

Post-truth tag re-verification: **PENDING**

## 11. Local Windows rule after engineering acceptance

No additional Local Windows gate is required for package version metadata, release evidence, immutable-tag operations or post-release documentation-only truth synchronization, provided no product/runtime/test source is modified after accepted engineering main.

Any new product/runtime/test source modification invalidates this release boundary and requires re-evaluation.

## 12. Current release contract

```text
release target:       v2.5.2
package version:      2.5.2
accepted source:      c93fee31a54c045c9da5fefd5de14cd8437847f3
accepted source tree: 28859a3a549158bd7db43d81d2f1a2a6d1a9227d
engineering main:     dfb5c0b271742c499a62a5d273fe0df08bc1afda
version-sync commit:  9f3658723c47b4263a811db406d0dc67ba001757
release commit:       PENDING
v2.5.2 tag:           PENDING
release status:       FINALIZATION_IN_PROGRESS
schema changes:       NONE
additional local gate:NONE
```
