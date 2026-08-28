# Video OS Studio V2.3.1 — Release Finalization

## Status

`RELEASE_FINALIZATION = COMPLETE`

V2.3.1 product hardening, H5 acceptance, release metadata synchronization, exact-head release CI, final merge, and immutable annotated tag verification are complete.

## Immutable release truth

Release tag:

`v2.3.1`

Annotated tag object SHA:

`b91d0c3adbaef09cd5c323481ec6bb04c516dd6e`

Dereferenced release commit:

`6e07d1dbdd0ec4d64d022f7c821e133ddf207637`

Git object verification confirmed:

- `refs/tags/v2.3.1` points to object type `tag`;
- tag object SHA is `b91d0c3adbaef09cd5c323481ec6bb04c516dd6e`;
- tag name is `v2.3.1`;
- tag message is `Video OS Studio v2.3.1`;
- the tag object targets object type `commit`;
- the target commit is exactly `6e07d1dbdd0ec4d64d022f7c821e133ddf207637`.

The tag is annotated and unsigned. It must never be moved or recreated.

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

Release branch base:

`c78f60aa657fd603397c8e41a170971521d609be`

Package metadata synchronized to:

```text
package.json version:                 2.3.1
package-lock.json top-level version:  2.3.1
package-lock packages[""].version:    2.3.1
```

One-shot metadata-sync evidence:

- temporary workflow commit: `00e4abcdf35de5e9622d94ac0191614d2f46952c`;
- workflow run: `33158443639` — PASS;
- synchronized package commit: `18c6b07e659a3dad9faaf1bfa391a72b38b50ddd`;
- temporary workflow removed by commit: `39aac1149a6e32ef5eea8821caa8023e313dec22`;
- final release PR diff contained no temporary workflow file.

The sync structurally compared package JSON before and after and failed closed unless the only package changes were:

1. `package.json.version`: `2.3.0 → 2.3.1`;
2. `package-lock.json.version`: `2.3.0 → 2.3.1`;
3. `package-lock.json.packages[""].version`: `2.3.0 → 2.3.1`.

No dependency, devDependency, engine, integrity, resolved URL, package tree, or runtime pin drift was permitted.

## Release PR and exact-head gate

Release-finalization PR:

- PR #64: `release(v2.3.1): finalize patch release`;
- base: `main` at `c78f60aa657fd603397c8e41a170971521d609be`;
- frozen final PR head: `2255952ccc2a9a259a9cba64d01b2878bee63831`;
- final PR diff: only `package.json`, `package-lock.json`, `PROJECT_STATUS.md`, and this release-finalization document.

Exact-head PR CI:

- CI #764 / run `33158661973`;
- Ubuntu Verify: PASS;
- Windows Verify: PASS;
- Browser Smoke: PASS;
- Windows Media Smoke: PASS.

PR #64 was merged with expected-head protection using the frozen head above.

Release merge commit:

`6e07d1dbdd0ec4d64d022f7c821e133ddf207637`

Independent main verification confirmed `main` pointed exactly to that commit before tag creation.

## Final release-merge CI

The release merge commit itself was revalidated after merge:

- CI #765 / run `33158996259`;
- exact SHA: `6e07d1dbdd0ec4d64d022f7c821e133ddf207637`;
- Ubuntu Verify: PASS;
- Windows Verify: PASS;
- Browser Smoke: PASS;
- Windows Media Smoke: PASS.

The annotated tag was created only after this exact release-merge CI was fully green.

## Annotated tag creation evidence

Before creation, the remote `refs/tags/v2.3.1` lookup returned not found, so no existing tag was overwritten.

A one-shot release-branch workflow then:

1. verified `origin/main` was exactly `6e07d1dbdd0ec4d64d022f7c821e133ddf207637`;
2. refused to proceed if `v2.3.1` already existed;
3. created `git tag -a v2.3.1` against the exact release commit;
4. verified local object type `tag` and local dereference;
5. pushed only `refs/tags/v2.3.1`;
6. verified the remote tag object and remote `^{}` dereference.

Tag workflow run:

`33161046546` — PASS

The temporary tag workflow was then deleted from the release branch. It never modified `main` and does not belong to the immutable release commit.

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

## Local gate policy

No additional Local Codex product gate was required for the metadata/docs-only release-finalization PR. H5 already supplied exact-product Windows runtime acceptance, and both the release PR head and final release merge commit passed the complete cloud four-gate matrix.

## Final decision

```text
V2.3.1_H5_LOCAL_GATE = PASS
V2.3.1_RELEASE_FINALIZATION = PASS
V2.3.1_ANNOTATED_TAG = PASS
V2.3.1_RELEASE = COMPLETE
```

V2.4 remains **NOT STARTED**. Any V2.4 work must begin as a separate explicit workstream and must not move or recreate `v2.3.0` or `v2.3.1`.
