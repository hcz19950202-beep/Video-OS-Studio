# Video OS Studio V2.3.1 — Release Finalization

## Status

`RELEASE_FINALIZATION = IN PROGRESS`

V2.3.1 product hardening and H5 acceptance are complete. This document records the metadata-only release-finalization boundary before the immutable `v2.3.1` tag is created.

## Accepted product boundary

Final H5 accepted product SHA:

`e5d449b3eb3b69fca23113c2fe75a905049578ea`

H5 report-only merge/main commit:

`c78f60aa657fd603397c8e41a170971521d609be`

Acceptance evidence:

- exact-main CI #760 / run `33155438036`: Ubuntu / Windows / Browser / Windows Media all PASS;
- full Windows H5 A–E on exact product SHA `e5d449b...`: PASS;
- H5 report-only PR #61 CI #762: PASS;
- H5 PR #61 merged as `c78f60aa657fd603397c8e41a170971521d609be`.

Detailed H5 evidence:

`docs/acceptance/V2_3_1_H5_PATCH_ACCEPTANCE.md`

## Release metadata synchronization

Release branch:

`release/v2.3.1`

Branch base:

`c78f60aa657fd603397c8e41a170971521d609be`

Package metadata is now synchronized to:

```text
package.json version:                 2.3.1
package-lock.json top-level version:  2.3.1
package-lock packages[""].version:    2.3.1
```

One-shot metadata-sync workflow evidence:

- temporary workflow commit: `00e4abcdf35de5e9622d94ac0191614d2f46952c`;
- workflow run: `33158443639` — PASS;
- synchronized package commit: `18c6b07e659a3dad9faaf1bfa391a72b38b50ddd`;
- temporary workflow removed by commit: `39aac1149a6e32ef5eea8821caa8023e313dec22`;
- final branch diff after workflow removal contains no temporary workflow file.

The sync run structurally compared JSON before and after the version command and failed closed unless the only package changes were:

1. `package.json.version`: `2.3.0 → 2.3.1`;
2. `package-lock.json.version`: `2.3.0 → 2.3.1`;
3. `package-lock.json.packages[""].version`: `2.3.0 → 2.3.1`.

No dependency, devDependency, engine, integrity, resolved URL, package tree, or runtime pin drift was permitted.

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

V2.4 remains NOT STARTED.

## Final release gate

Before `v2.3.1` may be created:

1. open the release-finalization PR against `main`;
2. freeze its exact final head after metadata/docs changes;
3. run the repository's four release gates on that exact head:
   - Ubuntu Verify;
   - Windows Verify;
   - Browser Smoke;
   - Windows Media Smoke;
4. verify the PR diff contains only release metadata/docs and no product implementation drift;
5. merge with expected-head protection;
6. independently verify `main` points to the resulting release merge commit;
7. create an **annotated** tag `v2.3.1` pointing to that exact release merge commit;
8. independently verify the tag object and dereferenced commit;
9. never move/recreate `v2.3.0` or `v2.3.1`.

## Local gate policy

No new Local Codex product gate is required for the metadata/docs-only finalization unless cloud CI or diff review exposes a release defect. H5 already supplied the exact-product Windows runtime acceptance. `npm ci`, package/lock consistency, build, browser, and Windows media behavior are revalidated by the final exact-head cloud CI.

## Release truth before tag creation

Until the final merge and annotated tag complete:

- currently released immutable version remains `v2.3.0`;
- V2.3.1 is a release candidate with package metadata `2.3.1`;
- no claim of an immutable V2.3.1 release is valid yet.

After the final tag is independently verified, this release is complete and a post-release truth update may record the immutable tag object SHA without moving the tag.
