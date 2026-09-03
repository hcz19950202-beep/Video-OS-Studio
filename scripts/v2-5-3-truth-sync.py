from pathlib import Path

RELEASE_COMMIT = "c05bf836362ccf19c81bf2023f0838d560808ab4"
TAG_OBJECT = "66c43b7bd861d74f0abe046e063181c948981409"
HOTFIX_SHA = "62cbb9aeebce7efa95ce317c5cc83fb7ad107950"
ENGINEERING_SHA = "b8b0d8e177257b617e1969fc9a1e9ceeae16d5f9"
ENGINEERING_TREE = "a81f64ab4b1edc94f859f0b8285f34dfdf74531e"
ENGINEERING_MAIN = "6d1f5c855b73997a8147e63f240a93b560990ba0"
PRE_HOTFIX_MAIN = "76bf4edb97f7272cf720b6b2e6c9aec8b1bf0c10"
RELEASE_HEAD = "eba15a1abdefbac99b8380af2e3eb14e1b29128b"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one occurrence of {old!r}, found {count}")
    return text.replace(old, new, 1)


def insert_before_once(text: str, marker: str, block: str, label: str) -> str:
    count = text.count(marker)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one marker {marker!r}, found {count}")
    return text.replace(marker, block + marker, 1)


# PROJECT_STATUS.md
status_path = Path("PROJECT_STATUS.md")
status = status_path.read_text(encoding="utf-8")
status = replace_once(status, "released_product_version: 2.5.2", "released_product_version: 2.5.3", "status version")
status = replace_once(status, "released_tag: v2.5.2", "released_tag: v2.5.3", "status tag")
status = replace_once(status, "released_commit: 6b268629dc1fbce9c80a66384cc663be6692eb65", f"released_commit: {RELEASE_COMMIT}", "status commit")
status = replace_once(status, "released_tag_object_sha: 700a4dfbd2dfdee9253b28302b219129227858f9", f"released_tag_object_sha: {TAG_OBJECT}", "status tag object")
status = replace_once(status, "package_json_version: 2.5.2", "package_json_version: 2.5.3", "status package json")
status = replace_once(status, "package_lock_version: 2.5.2", "package_lock_version: 2.5.3", "status package lock")
status = replace_once(status, "active_stage: V2.5.2 RELEASE COMPLETE", "active_stage: V2.5.3 RELEASE COMPLETE", "status stage")
status = replace_once(
    status,
    "next_action: NONE — V2.5.2 is released; future product work requires a separately approved next workstream",
    "next_action: NONE — V2.5.3 is released; future product work requires a separately approved next workstream",
    "status next action",
)

anchor = "v2_5_2_release_tag_object: 700a4dfbd2dfdee9253b28302b219129227858f9\n"
v253_fields = f"""{anchor}v2_5_3_engineering_pr: PR #124
v2_5_3_accepted_source_head: {ENGINEERING_SHA}
v2_5_3_accepted_source_tree: {ENGINEERING_TREE}
v2_5_3_engineering_main: {ENGINEERING_MAIN}
v2_5_3_engineering_main_standard_ci: CI #1457 / run 33768538110 / PASS / 7 of 7
v2_5_3_engineering_main_dedicated_ci: run 33768538291 / PASS / 2 of 2
v2_5_3_local_windows_gate: {ENGINEERING_SHA} / PASS
v2_5_3_release_metadata_sync: run 33769352419 / PASS
v2_5_3_release_finalization_pr: PR #125
v2_5_3_release_pr_frozen_head: {RELEASE_HEAD}
v2_5_3_release_pr_standard_ci: CI #1458 / run 33769529452 / PASS / 7 of 7
v2_5_3_release_pr_dedicated_ci: run 33769529426 / PASS / 2 of 2
v2_5_3_pre_hotfix_release_main: {PRE_HOTFIX_MAIN}
v2_5_3_pre_hotfix_release_main_dedicated_ci: run 33770332176 / PASS / 2 of 2
v2_5_3_pre_hotfix_release_main_standard_ci: CI #1459 / run 33770332085 / Windows runtime-owner timeout recorded twice
v2_5_3_hotfix_pr: PR #126
v2_5_3_hotfix_head: {HOTFIX_SHA}
v2_5_3_hotfix_standard_ci: CI #1460 / run 33771329475 / PASS / 7 of 7
v2_5_3_hotfix_dedicated_ci: run 33771329184 / PASS / 2 of 2
v2_5_3_hotfix_local_windows_gate: {HOTFIX_SHA} / PASS
v2_5_3_release_commit: {RELEASE_COMMIT}
v2_5_3_release_main_standard_ci: CI #1461 / run 33778097197 / PASS / 7 of 7
v2_5_3_release_main_dedicated_ci: run 33778097081 / PASS / 2 of 2
v2_5_3_release_tag_creation: run 33778792113 / PASS
v2_5_3_release_tag_object: {TAG_OBJECT}
"""
status = replace_once(status, anchor, v253_fields, "status V2.5.3 fields")
status = replace_once(status, "v2_5_2_status: RELEASED\n", "v2_5_2_status: RELEASED\nv2_5_3_status: RELEASED\n", "status V2.5.3 state")

v253_status_section = f"""## Immutable V2.5.3 release truth

Video OS Studio V2.5.3 is released at the independently verified annotated tag `v2.5.3`.

```text
release commit:      {RELEASE_COMMIT}
annotated tag:       v2.5.3
tag object SHA:      {TAG_OBJECT}
tag target type:     commit
dereferenced target: {RELEASE_COMMIT}
tag message:         Video OS Studio v2.5.3
```

V2.5.3 engineering source `{ENGINEERING_SHA}` / tree `{ENGINEERING_TREE}` passed frozen-source Standard #1456 (7/7), Dedicated #126 (2/2), and Mandatory Local Windows acceptance. PR #124 merged with expected-head protection as engineering main `{ENGINEERING_MAIN}`; exact-main Standard #1457 / run `33768538110` passed 7/7 and Dedicated #127 / run `33768538291` passed 2/2.

Release-finalization PR #125 froze `{RELEASE_HEAD}` after guarded version synchronization run `33769352419`; Standard #1458 / run `33769529452` passed 7/7 and Dedicated #128 / run `33769529426` passed 2/2. Its merge produced pre-hotfix release-main `{PRE_HOTFIX_MAIN}`. Dedicated #129 / run `33770332176` passed 2/2, while Standard #1459 / run `33770332085` preserved two Windows-only 5-second timeout failures in the existing 32-concurrent runtime-owner test. The assertions did not fail, but the repeated timing failure was treated as a release blocker rather than waived.

PR #126 changed exactly one test file and only replaced the inherited 5000ms timeout with an explicit 15000ms budget; concurrency and all behavioral/cleanup assertions remained unchanged. Exact hotfix `{HOTFIX_SHA}` passed Standard #1460 / run `33771329475` (7/7), Dedicated #130 / run `33771329184` (2/2), and Mandatory Local Windows VERIFY ONLY. The local focused 32-claim test completed in 1852ms with no timeout, lock residue, temp residue, ENOTEMPTY cleanup error, source modification, or commit.

Expected-head merge of PR #126 produced GitHub-signature-verified formal release commit `{RELEASE_COMMIT}`. Fresh exact-main Standard #1461 / run `33778097197` passed 7/7, and Dedicated #131 / run `33778097081` passed 2/2, including Windows full unit/build/residue and Browser/Media/HyperFrames/B6/B7 acceptance.

Immutable-tag run `33778792113` created `v2.5.3` only after proving `main` still exactly equaled the release commit and the tag did not exist. Independent GitHub Git Data verification proved `refs/tags/v2.5.3` points to object type `tag`, tag object `{TAG_OBJECT}`, which targets the exact release commit with message `Video OS Studio v2.5.3`. The tag object is unsigned; the correct language is **annotated, independently verified immutable tag**.

Authoritative release evidence:

`docs/acceptance/V2_5_3_RELEASE_FINALIZATION.md`

## V2.5.3 accepted product truth

V2.5.3 productizes the built-in Video Skill registry as explicit Agent Composer control. Skill selection is turn-scoped rather than part of durable Provider/Model Session identity; explicit Skills may narrow but never expand the existing Agent tool surface; `reviewRequired=true` can block auto-apply but cannot weaken application approval policy. Provider/Model binding, Project Schema `2.0.0`, and Project mutation authority remain unchanged. The late PR #126 change was test-only timing hardening and did not alter product/runtime behavior.

"""
status = insert_before_once(status, "## Immutable V2.5.2 release truth\n", v253_status_section, "status release section")
status_path.write_text(status, encoding="utf-8")

# README.md
readme_path = Path("README.md")
readme = readme_path.read_text(encoding="utf-8")
readme = replace_once(readme, "**Video OS Studio v2.5.2 is released.**", "**Video OS Studio v2.5.3 is released.**", "readme release banner")
readme = replace_once(readme, "Product version: 2.5.2", "Product version: 2.5.3", "readme product version")
readme = replace_once(readme, "Release commit: 6b268629dc1fbce9c80a66384cc663be6692eb65", f"Release commit: {RELEASE_COMMIT}", "readme commit")
readme = replace_once(readme, "Release tag: v2.5.2 (annotated, independently verified)", "Release tag: v2.5.3 (annotated, independently verified)", "readme tag")
readme = replace_once(readme, "Tag object: 700a4dfbd2dfdee9253b28302b219129227858f9", f"Tag object: {TAG_OBJECT}", "readme tag object")
readme = replace_once(
    readme,
    "The annotated `v2.5.2` tag is the immutable current release boundary. Previous `v2.3.0`, `v2.3.1`, `v2.4.0`, `v2.4.1`, `v2.4.2`, `v2.5.0`, and `v2.5.1` release tags remain immutable evidence and must never be moved or recreated.",
    "The annotated `v2.5.3` tag is the immutable current release boundary. Previous `v2.3.0`, `v2.3.1`, `v2.4.0`, `v2.4.1`, `v2.4.2`, `v2.5.0`, `v2.5.1`, and `v2.5.2` release tags remain immutable evidence and must never be moved or recreated.",
    "readme boundary",
)
readme = replace_once(readme, "[`docs/acceptance/V2_5_2_RELEASE_FINALIZATION.md`](docs/acceptance/V2_5_2_RELEASE_FINALIZATION.md)", "[`docs/acceptance/V2_5_3_RELEASE_FINALIZATION.md`](docs/acceptance/V2_5_3_RELEASE_FINALIZATION.md)", "readme evidence link")

what_v253 = """## What V2.5.3 adds

V2.5.3 productizes the existing built-in Video Skill registry as turn-scoped Agent Composer control while preserving V2.5.2 durable Provider/Model identity:

```text
Auto · Agent chooses
or explicit Video Skill
→ validated turn-scoped VideoSkillRef
→ Skill-aware provider context and narrowed tool surface
→ durable per-Turn skill attribution
→ reviewRequired can block auto-apply
→ Provider/Model Session identity unchanged
```

Explicit Skills can narrow the existing Agent tool surface but cannot grant new tools or bypass application approval, revision, idempotency, execution-mode, or mutation safeguards. Project Schema stays `2.0.0`, and Project mutation authority is unchanged.

"""
readme = insert_before_once(readme, "## What V2.5.2 adds\n", what_v253, "readme V2.5.3 product section")
readme = replace_once(
    readme,
    "V2.5.2\nDurable Agent Provider/Model Routing + Composer Control\n        ✅ RELEASED\n",
    "V2.5.2\nDurable Agent Provider/Model Routing + Composer Control\n        ✅ RELEASED\n\nV2.5.3\nAgent Skill Presets + Turn-Scoped Composer Control\n        ✅ RELEASED\n",
    "readme roadmap",
)

verify_v253 = f"""## V2.5.3 release verification

Accepted engineering source `{ENGINEERING_SHA}` / tree `{ENGINEERING_TREE}` passed Standard #1456 (7/7), Dedicated #126 (2/2), and Mandatory Local Windows acceptance. PR #124 merged with expected-head protection as engineering main `{ENGINEERING_MAIN}`; exact-main Standard #1457 / run `33768538110` passed 7/7 and Dedicated #127 / run `33768538291` passed 2/2.

Release-finalization PR #125 froze `{RELEASE_HEAD}` after version-sync run `33769352419`. Standard #1458 / run `33769529452` passed 7/7 and Dedicated #128 / run `33769529426` passed 2/2. The resulting pre-hotfix release-main `{PRE_HOTFIX_MAIN}` passed Dedicated #129 / run `33770332176` 2/2, but Standard #1459 / run `33770332085` recorded the same Windows-only default-5-second timeout twice in the existing 32-concurrent runtime-owner test. The release was blocked rather than waiving the repeated timing failure.

PR #126 kept the same 32 concurrent claims and all assertions, changing only that test's timeout budget to 15000ms. Exact hotfix `{HOTFIX_SHA}` passed Standard #1460 / run `33771329475` 7/7, Dedicated #130 / run `33771329184` 2/2, and Mandatory Local Windows VERIFY ONLY; its focused local run completed in 1852ms with clean residue and no tracked changes.

Expected-head merge produced formal release commit `{RELEASE_COMMIT}`. Fresh exact-main Standard #1461 / run `33778097197` passed 7/7 and Dedicated #131 / run `33778097081` passed 2/2. Immutable-tag run `33778792113` then created `v2.5.3`. Independent GitHub Git Data verification confirmed:

```text
tag ref:             refs/tags/v2.5.3
tag object type:     tag
tag object SHA:      {TAG_OBJECT}
tag target type:     commit
dereferenced commit: {RELEASE_COMMIT}
tag message:         Video OS Studio v2.5.3
```

The tag object is unsigned; it is an annotated, independently verified immutable tag.

"""
readme = insert_before_once(readme, "## V2.5.2 release verification\n", verify_v253, "readme V2.5.3 verification")
readme_path.write_text(readme, encoding="utf-8")

# V2.5.3 release evidence
evidence_path = Path("docs/acceptance/V2_5_3_RELEASE_FINALIZATION.md")
evidence = evidence_path.read_text(encoding="utf-8")
evidence = replace_once(evidence, "`V2_5_3_RELEASE = FINALIZATION_IN_PROGRESS`", "`V2_5_3_RELEASE = COMPLETE`", "evidence status")
append_marker = "## 10. Final release acceptance, hotfix, and immutable tag"
if append_marker in evidence:
    raise RuntimeError("V2.5.3 final truth section already exists")

evidence += f"""

## 10. Final release acceptance, hotfix, and immutable tag

Release-finalization PR #125 exact head `{RELEASE_HEAD}` passed Standard CI #1458 / run `33769529452` **7 / 7 PASS** and V2.5 Cloud Acceptance #128 / run `33769529426` **2 / 2 PASS**. Expected-head merge produced pre-hotfix release-main `{PRE_HOTFIX_MAIN}`.

On that exact pre-hotfix main, Dedicated #129 / run `33770332176` passed **2 / 2**. Standard CI #1459 / run `33770332085` preserved a real release-gate stability defect: the existing test `serializes 32 concurrent claims into one runtime epoch` exceeded Vitest's inherited 5000ms timeout twice on Windows, first at roughly 5245ms and again on a targeted identical-SHA rerun at roughly 5142ms. Its behavioral assertions did not fail and the remaining 834 tests passed, but the repeated timeout was not waived. Immutable tag creation remained blocked.

PR #126 `test(v2.5.3): harden runtime-owner Windows timeout` changed exactly one file, `tests/runtime-owner-concurrency.test.ts`, with +1 / -1. It preserved all 32 concurrent claims and all runtimeId, runtimeEpoch, isNewRuntime, owner-file, lock-cleanup and temp-cleanup assertions; the only semantic change was an explicit `15_000ms` timeout instead of Vitest's inherited 5000ms default. No product/runtime, package, dependency, Project Schema, mutation-authority, or assertion change was made.

Exact hotfix SHA `{HOTFIX_SHA}` passed:

- Standard CI #1460 / run `33771329475`: **7 / 7 PASS**;
- V2.5 Cloud Acceptance #130 / run `33771329184`: **2 / 2 PASS**;
- Mandatory Local Windows VERIFY ONLY: **PASS**.

The hotfix Local Windows gate used Node `v24.20.0` / npm `11.19.0`, passed npm ci, format, lint (0 errors / 15 warnings), typecheck, 835 passed / 9 skipped / 0 failed unit tests, build, Skill regressions, Chromium C2, real Media, HyperFrames, B6 and B7. The focused 32-claim test completed in **1852ms**, with one runtimeId, one runtimeEpoch, exactly one new runtime, no timeout, no lock/temp residue, no ENOTEMPTY cleanup error, clean final tree, no modified files and no commits.

PR #126 merged with `expected_head_sha={HOTFIX_SHA}` as GitHub-signature-verified formal release commit:

`{RELEASE_COMMIT}`

Fresh exact-main acceptance on that release commit:

- Standard CI #1461 / run `33778097197`: **7 / 7 PASS**;
- V2.5 Cloud Acceptance #131 / run `33778097081`: **2 / 2 PASS**.

These gates included Windows full unit/build/residue, Browser, real Media, HyperFrames, B6 and B7 acceptance. No additional source change followed the accepted hotfix.

Immutable-tag workflow `V2.5.3 Immutable Tag Hotfix` run `33778792113`: **PASS**. It proved `main` still exactly equaled `{RELEASE_COMMIT}`, proved `refs/tags/v2.5.3` did not exist, created an annotated tag with message exactly `Video OS Studio v2.5.3`, and independently verified remote tag object and peeled target.

Independent GitHub Git Data verification:

```text
tag ref:             refs/tags/v2.5.3
tag object type:     tag
tag object SHA:      {TAG_OBJECT}
tag target type:     commit
dereferenced target: {RELEASE_COMMIT}
tag message:         Video OS Studio v2.5.3
verification:        unsigned
```

The correct release language is **annotated, independently verified immutable tag**. The tag must never be moved, recreated, or retargeted.

## 11. Final release contract

`V2_5_3_RELEASE = COMPLETE`

Formal product/source release commit:

`{RELEASE_COMMIT}`

Immutable annotated tag:

`v2.5.3`

Tag object:

`{TAG_OBJECT}`

V2.5.3 adds turn-scoped Agent Skill presets and Composer control while preserving durable Provider/Model Session identity, Project Schema `2.0.0`, and the existing Project mutation authority. PR #126 is test-only Windows timing hardening and does not alter accepted product/runtime behavior.

Post-release repository truth synchronization is documentation-only. It may update `PROJECT_STATUS.md`, `README.md`, and this evidence file, but it must not move `v2.5.3` away from `{RELEASE_COMMIT}` and requires no additional Local Windows gate.
"""
evidence_path.write_text(evidence, encoding="utf-8")

print("V2.5.3 release truth documents synchronized deterministically.")
