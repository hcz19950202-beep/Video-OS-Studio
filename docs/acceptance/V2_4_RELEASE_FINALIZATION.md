# Video OS Studio V2.4.0 — Release Finalization

## Status

`RELEASE_FINALIZATION = IN PROGRESS`

V2.4 product implementation, B6 single-video acceptance, B7 Campaign/batch acceptance, the real-user-media repair, and resulting exact-main CI are complete. This document records the metadata/docs-only release-finalization boundary before the immutable annotated `v2.4.0` tag is created.

## Accepted product boundary

Final accepted V2.4 product main before release metadata:

`fe883ca5581d721e996e833d43d7b7f88faebc41`

This commit is the merge of PR #79 after the mandatory real-user-media B7 gate passed.

Resulting exact-main CI:

- CI #969 / run `33291257927`;
- exact SHA `fe883ca5581d721e996e833d43d7b7f88faebc41`;
- Ubuntu Verify: PASS;
- Windows Verify: PASS;
- Browser Smoke: PASS;
- Windows Media Smoke: PASS;
- Windows B6 Core Acceptance: PASS;
- Windows B7 Campaign Acceptance: PASS;
- workflow conclusion: SUCCESS at attempt 1.

## Mandatory real-user-media B7 acceptance

Frozen product SHA:

`e053cbd953d58c61b4df98bec9e35d60faf1bbaf`

Cloud CI #968 / run `33265665932` passed all six required jobs on the frozen SHA before Local Windows verification.

Local Codex then ran VERIFY ONLY in a detached clean Windows worktree using two distinct real local MP4 files.

### Source A — previously failing real media

```text
codec:      H.264 / AAC
resolution: 720x1280
fps:        30
size:       89,591,973 bytes
duration:   583.354921 s
```

The previous candidate had failed this source with:

```text
Could not extract frame from compositor:
No frame found at position 3635200 for source
The proxy returned HTTP 500 at time=2.3666666666666667.
remotion-render exited with code 1.
```

The repaired frozen SHA rendered the same source successfully:

```text
Project:    b7-real-1-1788025154555
Job:        28e515bd-450a-44ba-b873-e4b74183adb0
output:     H.264 / AAC
resolution: 640x360
fps:        30
duration:   583.424 s
size:       80,167,848 bytes
```

### Source B

```text
codec:      H.264 / AAC
resolution: 1024x576
fps:        30
size:       4,274,293 bytes
duration:   65.921451 s
```

Successful result:

```text
Project:    b7-real-2-1788025154870
Job:        4cb999ea-83e2-4b56-86d6-1fdc983cd44d
output:     H.264 / AAC
resolution: 640x360
fps:        30
duration:   65.984 s
size:       14,171,415 bytes
```

Campaign proof:

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
```

Primary local worktree HEAD and complete Git status were preserved exactly.

## Real-media repair boundary

The accepted repair does not increase Mission-level business retry budgets and does not blanket-transcode media.

Bounded behavior:

1. ordinary Project video/B-roll defaults to frame-perfect `OffthreadVideo`;
2. transparent HyperFrames video remains on `OffthreadVideo`;
3. only a normal `ToolRunError` containing exact signature `No frame found at position` is classified as the compatibility case;
4. for that exact failure only, the same Durable Render Job removes partial output, switches ordinary video props to HTML5 compatibility mode and reruns Remotion exactly once;
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

Package metadata is synchronized to:

```text
package.json version:                 2.4.0
package-lock.json top-level version:  2.4.0
package-lock packages[""].version:    2.4.0
```

One-shot metadata-sync workflow evidence:

- temporary workflow commit: `bd23801aef48a6294d8dec844f10f12deb8d2c05`;
- workflow run: `33291616642` — PASS;
- synchronized package commit: `ec42381` (`release(v2.4.0): sync package metadata`);
- temporary workflow removed in the synchronized package commit;
- net release-branch diff contains no temporary workflow file.

The sync run executed:

```text
npm version 2.4.0 --no-git-tag-version --ignore-scripts
```

and structurally compared parsed JSON before and after. It failed closed unless the only semantic package changes were:

1. `package.json.version`: `2.3.1 → 2.4.0`;
2. `package-lock.json.version`: `2.3.1 → 2.4.0`;
3. `package-lock.json.packages[""].version`: `2.3.1 → 2.4.0`.

It separately asserted the accepted runtime pins.

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

No product implementation, dependency tree, engine pin, Project Schema, provider architecture, Workflow/Job model, or accepted B7 runtime behavior may change in release finalization.

## Final release gate

Before `v2.4.0` may be created:

1. complete the metadata/docs-only release-finalization PR against `main`;
2. audit the final PR diff;
3. freeze exact final PR head;
4. require the repository's exact-head CI to pass on that SHA;
5. at minimum the four historic release gates must pass:
   - Ubuntu Verify;
   - Windows Verify;
   - Browser Smoke;
   - Windows Media Smoke;
6. because the current V2.4 CI also carries B6/B7 Windows acceptance jobs, those must remain green rather than being bypassed;
7. merge with expected-head protection;
8. independently verify `main` points to the resulting release merge commit;
9. require resulting exact-main CI to complete successfully;
10. create an **annotated immutable** tag `v2.4.0` pointing to that exact release merge commit;
11. independently verify Git object type `tag`, tag target type `commit`, and exact dereferenced commit;
12. never move/recreate `v2.3.0`, `v2.3.1`, or `v2.4.0` after verification;
13. open a separate documentation-only post-release truth-sync PR recording the immutable tag object SHA and dereferenced release commit.

## Local gate policy

No additional Local Codex product gate is required for this metadata/docs-only release-finalization branch unless release CI or diff audit exposes a product/runtime defect.

B6 and B7 already supplied exact-SHA Windows real-media/runtime acceptance. The current CI revalidates package-lock consistency, build, browser behavior, Windows media, B6 and B7 runtime gates after the version metadata change.

## Release truth before tag creation

Until final release PR merge, resulting exact-main CI, annotated tag creation and independent tag verification are all complete:

- immutable released product remains `v2.3.1`;
- V2.4.0 is a release candidate only;
- package metadata may say `2.4.0` on the release branch without implying an immutable release;
- no V2.4.x or V2.5 workstream may treat `v2.4.0` as an immutable baseline before tag verification.
