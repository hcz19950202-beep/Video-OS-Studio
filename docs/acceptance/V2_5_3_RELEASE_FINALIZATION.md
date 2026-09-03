# Video OS Studio V2.5.3 Release Finalization

`V2_5_3_RELEASE = COMPLETE`

## 1. Release identity

- Release target: `v2.5.3`
- Package target: `2.5.3`
- Project Schema: unchanged
- Node engine: `24.x`
- Previous immutable release: `v2.5.2`
- Previous V2.5.2 truth-synced main before this workstream: `1f88423e729e7147fe76a2c7e0e169252a5c8912`

V2.5.3 is a bounded post-V2.5.2 workstream that productizes the existing built-in Video Skill registry as explicit Agent Composer control. It does not create a second mutation authority and does not change durable Provider/Model Session identity.

## 2. Engineering source acceptance

Development branch:

`feature/v2.5.3-agent-skills`

Engineering PR:

`#124 feat(v2.5.3): add agent skill presets and composer control`

Accepted frozen engineering source SHA:

`b8b0d8e177257b617e1969fc9a1e9ceeae16d5f9`

Accepted frozen source tree:

`a81f64ab4b1edc94f859f0b8285f34dfdf74531e`

Engineering base:

`1f88423e729e7147fe76a2c7e0e169252a5c8912`

Final feature scope was exactly 15 files and contained no package metadata, dependency, Project Schema or mutation-authority expansion.

Delivered behavior:

- reuses the existing built-in Video Skill registry;
- explicit Skill binding injects registered intended use, recipe, QA, fallback and risk policy into provider context;
- a Skill can only narrow the existing Agent tool surface;
- read grounding remains available while unrelated proposal tools, direct mutating-request tools and Skill self-selection tools are excluded from an explicitly bound Skill turn;
- Turn API accepts an optional validated `VideoSkillRef` and rejects unavailable versions before provider execution;
- the validated Skill is threaded through provider binding and durable Runner execution;
- Agent Turn durably records `skill:{id,version}` while the Turn is already `running`, before provider completion;
- interrupted/recovered turns therefore retain Skill attribution;
- `riskPolicy.reviewRequired=true` blocks automatic Apply even when execution mode is `apply-safe-edits`;
- existing application approval policy remains the lower authorization bound for all other cases;
- Session list API exposes the built-in Skill catalog without adding Skill to durable Session identity;
- Composer exposes an `Agent Skill` selector with `Auto · Agent chooses` as the default;
- explicit Skill selection is turn-scoped and may change between sends;
- historical user turns display the bound `skill@version` evidence;
- Provider/Model durable Session binding from V2.5.2 remains unchanged.

Representative built-in Skills include:

- `talking-head-hook@1.0.0`
- `b2b-proof-card@1.0.0`
- `numeric-evidence-emphasis@1.0.0`
- `clean-broll-insert@1.0.0`
- `problem-proof-cta-ad@1.0.0`
- `caption-emphasis@1.0.0`

## 3. Frozen source exact-head cloud acceptance

Exact frozen source:

`b8b0d8e177257b617e1969fc9a1e9ceeae16d5f9`

### Standard CI #1456

Run `33766223564`: **7 / 7 PASS**

- ubuntu-verify PASS
- windows-verify PASS
- browser-smoke PASS
- windows-media-smoke PASS
- windows-hyperframes-smoke PASS
- windows-b6-core-acceptance PASS
- windows-b7-campaign-acceptance PASS

### V2.5 Cloud Acceptance #126

Run `33766223550`: **2 / 2 PASS**

- v2-5-cloud-acceptance PASS
- v2-5-windows-full-baseline PASS

Dedicated acceptance included protocol/authority/stale/history/lifecycle gates, Agent workspace and MCP browser acceptance, Skill selector browser acceptance, full Windows unit/build and residue audit.

## 4. Mandatory Local Windows acceptance

Independent Codex **VERIFY ONLY** acceptance was executed on exact frozen source:

`b8b0d8e177257b617e1969fc9a1e9ceeae16d5f9`

Result:

`V2.5.3 LOCAL WINDOWS ACCEPTANCE: PASS`

Isolation:

- verification worktree: `C:\Users\hcz\AppData\Local\Temp\video-os-v2-5-3-local-acceptance-20260903-223311`
- isolated `VIDEO_OS_DATA_ROOT`: `C:\Users\hcz\AppData\Local\Temp\video-os-v2-5-3-data-20260903-223311`
- starting tree clean: YES
- final tree clean: YES
- final SHA unchanged: YES
- files modified: NONE
- commits created: NONE

Environment and baseline:

- Node `v24.20.0`
- npm `11.19.0`
- npm ci PASS
- format PASS
- lint PASS: 0 errors / 15 warnings
- typecheck PASS
- full unit PASS: 835 passed / 9 skipped / 0 failed
- build PASS

V2.5.3 targeted acceptance:

- Skill runtime PASS
- durable running-turn Skill audit PASS
- server boundary PASS
- client Turn-only Skill contract PASS
- C2 contract PASS
- Chromium C2 acceptance PASS
- Auto Skill default PASS
- explicit `b2b-proof-card` selection PASS
- review-required UI PASS
- switch back to Auto PASS
- Provider/Model identity unaffected PASS

Real Windows engine acceptance:

- real media PASS
- HyperFrames diagnostics PASS
- HyperFrames real render PASS
- B6 real-engine PASS
- B7 real-batch PASS

Cleanup:

- runtime residue NONE
- `.props.json` residue NONE
- `.hf-work` residue NONE
- new orphan process NO

No additional Local Windows gate is required for the release metadata/docs-only phase unless product/runtime/test source changes.

## 5. Engineering merge

PR #124 was promoted from Draft only after Local Windows PASS and was merged with expected-head protection on:

`b8b0d8e177257b617e1969fc9a1e9ceeae16d5f9`

Engineering main merge commit:

`6d1f5c855b73997a8147e63f240a93b560990ba0`

GitHub verification for the merge commit is valid.

Its tree is exactly the frozen accepted engineering tree:

`a81f64ab4b1edc94f859f0b8285f34dfdf74531e`

Parents:

1. `1f88423e729e7147fe76a2c7e0e169252a5c8912`
2. `b8b0d8e177257b617e1969fc9a1e9ceeae16d5f9`

## 6. Engineering exact-main acceptance

Exact engineering main:

`6d1f5c855b73997a8147e63f240a93b560990ba0`

### Standard CI #1457

Run `33768538110`: **7 / 7 PASS**

- ubuntu-verify PASS
- windows-verify PASS
- browser-smoke PASS
- windows-media-smoke PASS
- windows-hyperframes-smoke PASS
- windows-b6-core-acceptance PASS
- windows-b7-campaign-acceptance PASS

### V2.5 Cloud Acceptance #127

Run `33768538291`: **2 / 2 PASS**

- v2-5-cloud-acceptance PASS
- v2-5-windows-full-baseline PASS

The engineering merge-main is therefore accepted as the source boundary for V2.5.3 release finalization.

## 7. Release version synchronization

Release-finalization branch:

`release/v2.5.3-finalization`

was created directly from accepted engineering main:

`6d1f5c855b73997a8147e63f240a93b560990ba0`

Target synchronization:

`2.5.2 → 2.5.3`

Allowed version fields:

- `package.json` root `version`
- `package-lock.json` root `version`
- `package-lock.json` root package `packages[""] .version`

A guarded one-shot workflow was used solely to perform and prove version synchronization.

### Guard run #1

Run `33769273505`: **FAILED before commit**.

Successful steps before the failure proved:

- exact engineering-main ancestry guard PASS;
- starting versions were exactly `2.5.2` PASS;
- `npm version 2.5.3 --no-git-tag-version --ignore-scripts` PASS;
- package and lock structure remained unchanged beyond allowed version fields PASS.

The failure was in the helper's own temporary worktree-scope assertion: after self-deletion, the assertion allowed only the two package files and incorrectly omitted the expected deleted helper path from temporary `git status`. No version commit or product/source change was produced by this failed run.

### Guard run #2

Run `33769352419`: **PASS**.

The corrected guard proved:

- accepted engineering-main ancestry PASS;
- starting versions exactly `2.5.2` PASS;
- target versions exactly `2.5.3` PASS;
- package structure unchanged beyond version PASS;
- package-lock structure unchanged beyond the two allowed version fields PASS;
- temporary worktree scope exactly package files plus helper self-deletion PASS;
- helper self-deletion PASS;
- version synchronization commit and push PASS.

Version-sync commit:

`e1b7c3a2de19f7f550ff4ed62c2b85592805f2c3`

Independent compare engineering main → version-sync commit proves exactly two changed files:

1. `package.json`
2. `package-lock.json`

Diff size:

- `package.json`: 1 addition / 1 deletion
- `package-lock.json`: 2 additions / 2 deletions

No dependency, engine, Project Schema, product/runtime/test or workflow file remains changed in the net result.

## 8. Strict release-finalization scope

This evidence document is the only third allowed release-finalization file.

Final release candidate must therefore differ from accepted engineering main by exactly:

1. `docs/acceptance/V2_5_3_RELEASE_FINALIZATION.md`
2. `package-lock.json`
3. `package.json`

Forbidden in release-finalization net scope:

- product/runtime source changes
- test changes
- workflow/helper files
- dependency changes
- engine changes
- Project Schema changes
- mutation-authority changes

## 9. Release PR gates

Before merge, the exact release-finalization candidate must independently pass:

- Standard CI: 7 / 7 PASS
- V2.5 Cloud Acceptance: 2 / 2 PASS
- head remains exact release candidate SHA
- base main remains exact accepted engineering main `6d1f5c855b73997a8147e63f240a93b560990ba0`
- net diff remains exactly the three approved release-finalization files

Merge must use expected-head protection.

After release-finalization merge:

1. record exact release main SHA;
2. require fresh exact-main Standard 7 / 7 PASS;
3. require fresh exact-main V2.5 Cloud Acceptance 2 / 2 PASS;
4. independently prove package version is exactly `2.5.3`;
5. independently prove tag `v2.5.3` does not already exist;
6. only then create immutable annotated tag `v2.5.3` at the accepted release commit;
7. independently re-read the tag object and target;
8. never move the immutable release tag after creation;
9. synchronize repository truth documents afterward in a docs-only phase;
10. run fresh post-truth Standard + Dedicated acceptance.

If the annotated tag object is unsigned, it must be described as an **annotated, independently verified immutable tag**, not as a cryptographically signed tag.


## 10. Final release acceptance, hotfix, and immutable tag

Release-finalization PR #125 exact head `eba15a1abdefbac99b8380af2e3eb14e1b29128b` passed Standard CI #1458 / run `33769529452` **7 / 7 PASS** and V2.5 Cloud Acceptance #128 / run `33769529426` **2 / 2 PASS**. Expected-head merge produced pre-hotfix release-main `76bf4edb97f7272cf720b6b2e6c9aec8b1bf0c10`.

On that exact pre-hotfix main, Dedicated #129 / run `33770332176` passed **2 / 2**. Standard CI #1459 / run `33770332085` preserved a real release-gate stability defect: the existing test `serializes 32 concurrent claims into one runtime epoch` exceeded Vitest's inherited 5000ms timeout twice on Windows, first at roughly 5245ms and again on a targeted identical-SHA rerun at roughly 5142ms. Its behavioral assertions did not fail and the remaining 834 tests passed, but the repeated timeout was not waived. Immutable tag creation remained blocked.

PR #126 `test(v2.5.3): harden runtime-owner Windows timeout` changed exactly one file, `tests/runtime-owner-concurrency.test.ts`, with +1 / -1. It preserved all 32 concurrent claims and all runtimeId, runtimeEpoch, isNewRuntime, owner-file, lock-cleanup and temp-cleanup assertions; the only semantic change was an explicit `15_000ms` timeout instead of Vitest's inherited 5000ms default. No product/runtime, package, dependency, Project Schema, mutation-authority, or assertion change was made.

Exact hotfix SHA `62cbb9aeebce7efa95ce317c5cc83fb7ad107950` passed:

- Standard CI #1460 / run `33771329475`: **7 / 7 PASS**;
- V2.5 Cloud Acceptance #130 / run `33771329184`: **2 / 2 PASS**;
- Mandatory Local Windows VERIFY ONLY: **PASS**.

The hotfix Local Windows gate used Node `v24.20.0` / npm `11.19.0`, passed npm ci, format, lint (0 errors / 15 warnings), typecheck, 835 passed / 9 skipped / 0 failed unit tests, build, Skill regressions, Chromium C2, real Media, HyperFrames, B6 and B7. The focused 32-claim test completed in **1852ms**, with one runtimeId, one runtimeEpoch, exactly one new runtime, no timeout, no lock/temp residue, no ENOTEMPTY cleanup error, clean final tree, no modified files and no commits.

PR #126 merged with `expected_head_sha=62cbb9aeebce7efa95ce317c5cc83fb7ad107950` as GitHub-signature-verified formal release commit:

`c05bf836362ccf19c81bf2023f0838d560808ab4`

Fresh exact-main acceptance on that release commit:

- Standard CI #1461 / run `33778097197`: **7 / 7 PASS**;
- V2.5 Cloud Acceptance #131 / run `33778097081`: **2 / 2 PASS**.

These gates included Windows full unit/build/residue, Browser, real Media, HyperFrames, B6 and B7 acceptance. No additional source change followed the accepted hotfix.

Immutable-tag workflow `V2.5.3 Immutable Tag Hotfix` run `33778792113`: **PASS**. It proved `main` still exactly equaled `c05bf836362ccf19c81bf2023f0838d560808ab4`, proved `refs/tags/v2.5.3` did not exist, created an annotated tag with message exactly `Video OS Studio v2.5.3`, and independently verified remote tag object and peeled target.

Independent GitHub Git Data verification:

```text
tag ref:             refs/tags/v2.5.3
tag object type:     tag
tag object SHA:      66c43b7bd861d74f0abe046e063181c948981409
tag target type:     commit
dereferenced target: c05bf836362ccf19c81bf2023f0838d560808ab4
tag message:         Video OS Studio v2.5.3
verification:        unsigned
```

The correct release language is **annotated, independently verified immutable tag**. The tag must never be moved, recreated, or retargeted.

## 11. Final release contract

`V2_5_3_RELEASE = COMPLETE`

Formal product/source release commit:

`c05bf836362ccf19c81bf2023f0838d560808ab4`

Immutable annotated tag:

`v2.5.3`

Tag object:

`66c43b7bd861d74f0abe046e063181c948981409`

V2.5.3 adds turn-scoped Agent Skill presets and Composer control while preserving durable Provider/Model Session identity, Project Schema `2.0.0`, and the existing Project mutation authority. PR #126 is test-only Windows timing hardening and does not alter accepted product/runtime behavior.

Post-release repository truth synchronization is documentation-only. It may update `PROJECT_STATUS.md`, `README.md`, and this evidence file, but it must not move `v2.5.3` away from `c05bf836362ccf19c81bf2023f0838d560808ab4` and requires no additional Local Windows gate.
