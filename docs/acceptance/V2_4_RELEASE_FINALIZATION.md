# Video OS Studio V2.4.0 — Release Finalization

## Status

`V2_4_0_RELEASE = COMPLETE`

Video OS Studio V2.4.0 is released at an independently verified annotated Git tag.

```text
release commit:      da22a5415cbf8ad2a9ce93b912b41b787b29a9b1
release tag:         v2.4.0
tag object SHA:      96ebdd67e2412ed4d25be36cc6120f1bba8a8734
tag object type:     tag
tag target type:     commit
dereferenced target: da22a5415cbf8ad2a9ce93b912b41b787b29a9b1
tag message:         Video OS Studio v2.4.0
```

The tag is immutable. Never move or recreate `v2.4.0`. Previous `v2.3.0` and `v2.3.1` release tags remain immutable as well.

## Accepted product boundary before release metadata

Final accepted V2.4 product main before release metadata:

`fe883ca5581d721e996e833d43d7b7f88faebc41`

This commit merged B7 PR #79 only after the mandatory real-user-media Campaign gate passed.

Resulting exact-main product CI:

```text
CI #969 / run 33291257927
exact SHA: fe883ca5581d721e996e833d43d7b7f88faebc41
ubuntu-verify                    PASS
windows-verify                   PASS
browser-smoke                    PASS
windows-media-smoke              PASS
windows-b6-core-acceptance       PASS
windows-b7-campaign-acceptance   PASS
workflow conclusion              SUCCESS / attempt 1
```

## Mandatory real-user-media B7 acceptance

Frozen B7 product SHA:

`e053cbd953d58c61b4df98bec9e35d60faf1bbaf`

Cloud CI #968 / run `33265665932` passed all six required jobs before Local Windows verification.

Local Codex then ran VERIFY ONLY in a detached clean Windows worktree using two distinct real local MP4 files.

### Source A — exact previously failing long media

```text
input codec:      H.264 / AAC
input resolution: 720x1280
input fps:        30
input size:       89,591,973 bytes
input duration:   583.354921 s
```

The prior B7 candidate had failed this source inside Remotion with:

```text
Could not extract frame from compositor:
No frame found at position 3635200 for source
The proxy returned HTTP 500 at time=2.3666666666666667.
remotion-render exited with code 1.
```

The repaired frozen SHA rendered that same real source successfully:

```text
Project:           b7-real-1-1788025154555
Job:               28e515bd-450a-44ba-b873-e4b74183adb0
output codec:      H.264 / AAC
output resolution: 640x360
output fps:        30
output duration:   583.424 s
output size:       80,167,848 bytes
```

### Source B

```text
input codec:      H.264 / AAC
input resolution: 1024x576
input fps:        30
input size:       4,274,293 bytes
input duration:   65.921451 s
```

Successful output:

```text
Project:           b7-real-2-1788025154870
Job:               4cb999ea-83e2-4b56-86d6-1fdc983cd44d
output codec:      H.264 / AAC
output resolution: 640x360
output fps:        30
output duration:   65.984 s
output size:       14,171,415 bytes
```

Campaign evidence:

```text
Campaign:                        33333333-3333-4333-8333-333333333333
final status:                    completed
configured Mission concurrency:  2
observed Mission concurrency:    2
observed heavy-render limit:     1
distinct Projects:               YES
distinct Jobs:                   YES
distinct output paths:           YES
durable reload:                  completed
cross-Project mutable leakage:   NO
.props.json residue:             NO
.hf-work residue:                NO
stale lock/tmp/temp residue:     NO
new attributable orphan process: NO
primary local worktree preserved: YES
```

## Real-media compatibility repair boundary

The accepted B7 repair does not increase Mission business retry budgets and does not blanket-transcode media.

Bounded behavior:

1. ordinary Project video/B-roll defaults to frame-perfect `OffthreadVideo`;
2. transparent HyperFrames video remains on `OffthreadVideo`;
3. only the exact known Offthread extraction failure containing `No frame found at position` qualifies for compatibility handling;
4. for that failure only, the same Durable Render Job removes partial output, switches ordinary video props to HTML5 compatibility mode and reruns Remotion exactly once;
5. timeout, cancellation and unrelated render failures are not reclassified;
6. a failed compatibility rerun propagates normally with no third render;
7. `.props.json` cleanup remains guaranteed.

Regression coverage includes backend selection, exact-error classification, bounded second attempt, no retry for unrelated errors, cleanup, and a Windows H.264/AAC fixture with a verified multi-second video-frame timestamp gap.

## V2.4 milestone acceptance

```text
R0   COMPLETE / PR #66 / exact-main CI #769 PASS
B0   COMPLETE / PR #67 / exact-main CI #781 PASS
B1   COMPLETE / PR #68 / exact-main CI #792 PASS
B2   COMPLETE / PR #69 / exact-main CI #825 PASS
B3   COMPLETE / PR #70 / exact-main CI #835 PASS
B4   COMPLETE / PR #71 / exact-main CI #840 PASS
B5a  COMPLETE / PR #73 / exact-main CI #845 PASS
B5b  COMPLETE / PR #75 / exact-main CI #856 PASS
B5c  COMPLETE / PR #77 / exact-main CI #894 PASS
B6   COMPLETE / PR #78 / exact-main CI #929 PASS
B7   COMPLETE / PR #79 / exact-main CI #969 PASS / Local Windows real-user-media PASS
```

## Release metadata synchronization

Release branch:

`release/v2.4.0-finalization`

Branch base:

`fe883ca5581d721e996e833d43d7b7f88faebc41`

Package metadata was synchronized from `2.3.1` to `2.4.0` only:

```text
package.json version:                 2.4.0
package-lock.json top-level version:  2.4.0
package-lock packages[""].version:    2.4.0
```

One-shot metadata-sync evidence:

```text
temporary workflow commit: bd23801aef48a6294d8dec844f10f12deb8d2c05
workflow run:              33291616642 / PASS
package sync commit:       ec42381... / release(v2.4.0): sync package metadata
```

The run executed:

```text
npm version 2.4.0 --no-git-tag-version --ignore-scripts
```

and structurally compared parsed package/lock JSON before and after. It failed closed unless these were the only semantic changes:

1. `package.json.version`: `2.3.1 → 2.4.0`;
2. `package-lock.json.version`: `2.3.1 → 2.4.0`;
3. `package-lock.json.packages[""].version`: `2.3.1 → 2.4.0`.

No dependency, devDependency, package-tree, engine, integrity or resolved-URL drift was accepted.

## Release PR exact-head gate

Release-finalization PR:

`PR #80 — release(v2.4.0): finalize autonomous production release`

Frozen exact PR head:

`c4a395f9d3059dab7d2b6794df57fce292e8ea6d`

The net PR diff contained release metadata/docs only:

```text
package.json
package-lock.json
PROJECT_STATUS.md
README.md
docs/acceptance/V2_4_RELEASE_FINALIZATION.md
```

No product implementation, tests, runtime code, Project Schema, dependency tree, or engine pin changed in the release PR.

Exact-head CI #970 / run `33291797863` passed all six current gates:

```text
ubuntu-verify                    PASS
windows-verify                   PASS
browser-smoke                    PASS
windows-media-smoke              PASS
windows-b6-core-acceptance       PASS
windows-b7-campaign-acceptance   PASS
workflow conclusion              SUCCESS
```

## Release merge and resulting main CI

PR #80 left Draft only after exact-head CI passed and merged using expected-head protection on the exact frozen SHA.

Release merge commit:

`da22a5415cbf8ad2a9ce93b912b41b787b29a9b1`

Independent branch inspection confirmed `main` pointed exactly to this commit and GitHub verified the merge commit signature.

The release PR frozen head and resulting merge commit had the identical Git tree:

`4c034eb056ea75f186ba388fa31d0a9108c5db96`

Resulting main CI:

`CI #971 / run 33292090068`

### Attempt 1

Five gates passed. Browser Smoke had one failure in the legacy H1 editing-boundary test:

```text
expected heading font after Undo: system-ui
observed after 10-second poll:     system-ui H1 Draft
```

The failure was not silently ignored. Before any rerun, the release PR exact-head and release merge commit were compared and independently confirmed to have the same Git tree. The same tree had passed Browser Smoke in exact-head CI #970. All other #971 runtime gates passed.

Therefore the failure was treated only as a timing-flake candidate, not as a proven environment issue or product success.

### Browser-only rerun

The failed Browser job alone was rerun on the unchanged exact main SHA after the rest of the workflow completed.

```text
browser-smoke rerun job: 99206743880
Playwright H6 smoke:     PASS
exact main SHA:          da22a5415cbf8ad2a9ce93b912b41b787b29a9b1
product changes:         NONE
```

Workflow run #971 attempt 2 then completed:

`SUCCESS`

The accepted resulting-main gate therefore consists of the unchanged exact release SHA with five original successful gates plus the successful Browser-only rerun. No code or metadata change was used to convert the failure into success.

## Annotated tag creation

One-shot tag workflow branch:

`release/v2.4.0-finalization`

Workflow commit:

`12482f4a72507848383539110f9ef16775d5ddc1`

Workflow run:

`33292747452 — PASS`

The workflow had `contents: write` and failed closed unless:

1. `origin/main` still exactly equaled `da22a5415cbf8ad2a9ce93b912b41b787b29a9b1`;
2. remote `refs/tags/v2.4.0` did not already exist.

It then executed the equivalent of:

```text
git tag -a v2.4.0 da22a5415cbf8ad2a9ce93b912b41b787b29a9b1 -m "Video OS Studio v2.4.0"
```

Before push it asserted:

```text
git cat-file -t v2.4.0 = tag
git rev-parse v2.4.0^{} = da22a5415cbf8ad2a9ce93b912b41b787b29a9b1
```

After push it independently checked the remote tag object and dereferenced commit and emitted:

```text
V240_TAG_OBJECT=96ebdd67e2412ed4d25be36cc6120f1bba8a8734
V240_DEREFERENCED_COMMIT=da22a5415cbf8ad2a9ce93b912b41b787b29a9b1
V240_ANNOTATED_TAG=PASS
```

The one-shot workflow was subsequently removed from the release branch. It was never merged to `main`.

## Independent GitHub Git Data verification

Tag ref inspection returned:

```text
ref:         refs/tags/v2.4.0
object SHA:  96ebdd67e2412ed4d25be36cc6120f1bba8a8734
object type: tag
```

Direct inspection of tag object `96ebdd67e2412ed4d25be36cc6120f1bba8a8734` returned:

```text
tag:         v2.4.0
message:     Video OS Studio v2.4.0
target SHA:  da22a5415cbf8ad2a9ce93b912b41b787b29a9b1
target type: commit
```

This independently proves that `v2.4.0` is an annotated tag and dereferences exactly to the accepted release commit.

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

No additional Local Codex product gate was required for the metadata/docs-only release-finalization changes. B6/B7 had already supplied exact-SHA Windows real-media/runtime acceptance, and exact-head/resulting-main cloud CI revalidated package-lock consistency, build, browser behavior, Windows media, B6 and B7 runtime gates after the version bump.

## Final release boundary

V2.4.0 is released and immutable.

```text
V2.4.0 package metadata: 2.4.0
Project Schema:          2.0.0
immutable tag:           v2.4.0
annotated tag object:    96ebdd67e2412ed4d25be36cc6120f1bba8a8734
release commit:          da22a5415cbf8ad2a9ce93b912b41b787b29a9b1
```

Rules after release:

- never move or recreate `v2.4.0`;
- never move or recreate `v2.3.0` or `v2.3.1`;
- post-release documentation commits do not alter the tagged release contents;
- no V2.4.x or V2.5 product workstream starts implicitly from this truth-sync work;
- any next product workstream must be separately planned and approved from the immutable V2.4.0 baseline.
