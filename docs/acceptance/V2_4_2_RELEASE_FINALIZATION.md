# Video OS Studio V2.4.2 — Release Finalization

## Status

`V2_4_2_RELEASE = FINALIZATION IN PROGRESS`

V2.4.2 product engineering and mandatory Local Windows acceptance are complete. The accepted product patch has been merged to `main`; package release metadata is synchronized to `2.4.2`. The immutable annotated `v2.4.2` tag must not be created until the release-finalization PR and the resulting exact-main release CI both pass all seven gates.

## Immutable previous release truth

V2.4.2 is a patch after immutable V2.4.1. Previous release tags must never be moved or recreated.

```text
v2.4.0 target:      da22a5415cbf8ad2a9ce93b912b41b787b29a9b1
v2.4.0 tag object:  96ebdd67e2412ed4d25be36cc6120f1bba8a8734

v2.4.1 target:      4c105bad936479690711c03f3e349db36fbadaf5
v2.4.1 tag object:  9f3d06d8eabb114d6f1bcd907e98b4de3756a4a7
```

Project Schema remains `2.0.0`.

## Accepted V2.4.2 engineering boundary

```text
engineering/audit PR:        #87
accepted merge PR:           #88
accepted exact head:         c3825fe42e77c4369ec6e03d89204161764667e9
engineering merge main:      8e8f63cd570af460a53199f45a139ee78c3a4dcb
Project Schema:              2.0.0
Node:                        24.x
Remotion:                    4.0.513
HyperFrames:                 0.8.10
Playwright:                  1.62.1
Prettier:                    3.8.1
```

PR #87 remains the engineering/audit record. The connected Draft-to-Ready mutation failed at the connector layer on an invalid GitHub GraphQL field, so non-Draft PR #88 was created from the exact same accepted head with zero source delta. PR #88 was merged with `expected_head_sha=c3825fe42e77c4369ec6e03d89204161764667e9`.

## V2.4.2 patch contents

This is a bounded correctness/liveness patch rather than a feature release. Accepted corrections include:

- truthful autonomous repair mutation/protection scope and fail-closed edit-protection behavior;
- exclusive-lock liveness and stronger process-identity handling;
- Agent Apply durable finalization and claim recovery;
- single active-Project publication boundaries;
- export/render correctness and structured fallback evidence;
- bounded Campaign persistence recovery;
- Browser teardown recovery that only removes a strictly proven dead/PID-reused runtime-owner lock after Playwright/web-server teardown;
- corrected B6 real-source acceptance construction so the intended first render is bounded to 180 frames rather than accidentally rendering a full long source;
- deterministic HyperFrames built-in templates without render-time CDN dependency;
- `data-no-timeline` compliance for built-in HyperFrames compositions;
- idempotent HyperFrames browser provisioning through `hyperframes browser ensure`;
- permanent Windows HyperFrames real-render CI coverage with lint/check/render/ffprobe/cleanup verification.

No Project Schema migration is introduced.

## Rejected candidates and preserved failures

### Candidate `a8d67e109787419603b2b2b0c2b6ced12be0aa23`

Cloud CI passed, but mandatory Local Windows acceptance rejected the candidate because Browser teardown left a `.runtime-owner.lock` associated with a dead PID. The failure scene was preserved and no acceptance waiver was used.

### Candidate `85c229c7409ddb1e4f9b148e339bebfa763b58d9`

Cloud CI passed, but mandatory Local Windows B6 failed on the real 583-second Source A. `MediaImportService` expanded the Project and created a full-length source clip; the B6 harness then added a 180-frame clip without removing the full-length clip or restoring Project duration. The first render therefore attempted approximately 17,501 frames, timed out at the 20-minute outer gate, and left an incomplete MP4 without a `moov` atom. The renderer timeout was not raised; the acceptance harness was corrected instead.

### Candidate `8c103f915adf51f1552f71af17443051c16dfcdf`

The bounded B6 repair was correct and passed B6/B7/Remotion evidence, but the independent Local Windows HyperFrames reality check exposed a real HyperFrames execution gap. The candidate was rejected until deterministic templates, browser provisioning, and a permanent HyperFrames CI gate were added.

## Final accepted cloud candidate

Exact accepted head:

`c3825fe42e77c4369ec6e03d89204161764667e9`

Cloud CI #1089 / run `33329513152` passed all seven gates on the exact accepted head.

Replacement merge-path CI #1090 / run `33332846468` then passed all seven gates again on the same exact head, including a first-attempt PASS for Windows verify.

Required gates:

```text
ubuntu-verify                    PASS
windows-verify                   PASS
browser-smoke                    PASS
windows-media-smoke              PASS
windows-b6-core-acceptance       PASS
windows-b7-campaign-acceptance   PASS
windows-hyperframes-smoke        PASS
```

## Mandatory Local Windows acceptance

Final accepted SHA:

`c3825fe42e77c4369ec6e03d89204161764667e9`

Final verdict:

```text
LOCAL WINDOWS TARGETED HYPERFRAMES GATE: PASS
LOCAL WINDOWS ACCEPTANCE: PASS
```

The final targeted HyperFrames recertification was run in a clean detached worktree on Windows 10 build `10.0.19045` with Node `v24.20.0`, npm `11.19.0`, FFmpeg/ffprobe `8.1.1`, HyperFrames `0.8.10`, and system Chrome `151.0.7922.174`.

HyperFrames evidence:

```text
adapter browser ensure:        PASS
provisioned runtime browser:   Headless Shell 152.0.7977.30
lint:                          ok=true / 0 errors / 0 warnings
check lint/runtime/layout:     PASS / PASS / PASS
composition duration:          1 second
real frame progress:           Streaming frame 30/30
render completion:             Render complete
runtime browser:               HeadlessChrome/152.0.7977.30
output:                        WebM / 320x180 / 30fps / ~1.0s / no audio
ffprobe:                       PASS
.hf-work residue:              0
*.tmp residue:                 0
stale lock:                    0
partial media:                 0
attributable orphan process:   0
listener residue:              0
primary worktree:              preserved exactly
```

The acceptance contract carried forward the preceding exact-candidate B6/B7/Remotion evidence because the post-rejection delta was confined to HyperFrames templates, adapter/browser provisioning, smoke coverage, and CI plumbing.

## Engineering merge and exact-main proof

PR #88 merged the accepted exact head with expected-head protection as:

`8e8f63cd570af460a53199f45a139ee78c3a4dcb`

Exact-main CI #1091 / run `33333104052` completed `SUCCESS` on that merge commit. All seven gates passed at attempt 1:

```text
ubuntu-verify                    PASS
windows-verify                   PASS
browser-smoke                    PASS
windows-media-smoke              PASS
windows-b6-core-acceptance       PASS
windows-b7-campaign-acceptance   PASS
windows-hyperframes-smoke        PASS
```

This freezes the accepted product-engineering main boundary before release metadata synchronization.

## Release metadata synchronization

Release branch:

`release/v2.4.2-finalization`

Accepted engineering main baseline:

`8e8f63cd570af460a53199f45a139ee78c3a4dcb`

One-shot version synchronization changed only:

```text
package.json.version:                    2.4.1 -> 2.4.2
package-lock.json.version:               2.4.1 -> 2.4.2
package-lock.json.packages[""].version:  2.4.1 -> 2.4.2
```

The first helper run `33333378542` failed before executing `npm version` because a temporary Node script resolved `require('./package.json')` relative to the runner temp-script directory. It made no package metadata change and no release commit.

Corrected one-shot run `33333443237` passed. Its structural guard proved that `package.json` and `package-lock.json`, after removing only the allowed version fields from comparison, were byte-equivalent as JSON structures to their pre-sync shapes. Independent GitHub comparison from the engineering baseline to version-sync head `08447c1a1e9f235e23060425689291896a3f77ea` showed only:

```text
package.json       1 addition / 1 deletion
package-lock.json  2 additions / 2 deletions
```

The temporary version-sync workflow removed itself and is absent from the net release diff.

## Release-finalization gates still required

Before creating `v2.4.2`, the following must all complete:

1. Release-finalization PR exact-head CI — all seven gates PASS.
2. Release-finalization PR merge with expected-head protection.
3. Exact-main CI on the resulting release commit — all seven gates PASS.
4. Independent check that `v2.4.2` does not already exist.
5. Annotated tag creation with exact message `Video OS Studio v2.4.2` targeting the exact release commit.
6. Independent GitHub Git Data verification that `refs/tags/v2.4.2` points to an object of type `tag` and that the tag object targets the exact release commit.
7. Re-verification that immutable `v2.4.0` and `v2.4.1` still dereference to their original release commits.

## Release contract

Until all remaining gates pass:

```text
v2.4.2 tag:        MUST NOT EXIST
release status:    FINALIZATION IN PROGRESS
product work:      FROZEN
schema changes:    NONE
local action:      NONE
```

After the annotated tag is independently verified, this document, `PROJECT_STATUS.md`, and `README.md` must be updated in a docs-only release-truth sync. The immutable release tag must remain on the release commit even if `main` subsequently advances through that documentation-only merge.
