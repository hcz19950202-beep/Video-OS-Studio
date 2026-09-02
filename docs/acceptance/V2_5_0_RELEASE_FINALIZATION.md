# Video OS Studio V2.5.0 — Release Finalization

## Status

`V2_5_0_RELEASE = COMPLETE`

V2.5 product engineering, C7 cloud acceptance, mandatory Local Windows S01–S16 acceptance, release-finalization CI, immutable annotated tag creation, and independent Git Data verification are complete. The released package version is `2.5.0`; Project Schema remains `2.0.0`.

Project Schema remains `2.0.0`.

---

## Immutable previous release truth

The newest immutable release before V2.5.0 is V2.4.2.

```text
v2.4.0 tag object:  96ebdd67e2412ed4d25be36cc6120f1bba8a8734
v2.4.1 tag object:  9f3d06d8eabb114d6f1bcd907e98b4de3756a4a7
v2.4.2 tag object:  2c9b0ca2401f547066c6a51ff0ec60a641cfce35
v2.4.2 target:      79e48b068f701bba3f1c826710337a82f0a64760
```

These tags are immutable and must never be moved or recreated.

At release-finalization start, `refs/tags/v2.5.0` does not exist.

---

## Accepted V2.5 engineering boundary

```text
engineering/audit PR:         #112 / CLOSED UNMERGED
accepted merge PR:            #113
accepted exact source head:   58d303db9f39b24b5883a4d408d523d5f3617279
engineering merge main:       79867fa26d837fb4f36dc2c60dd07c15ee88c4fd
package version before sync:   2.4.2
release package version:       2.5.0
Project Schema:                2.0.0
Node:                          24.x
Remotion:                      4.0.513
HyperFrames:                   0.8.10
Playwright:                    1.62.1
Prettier:                      3.8.1
```

Draft PR #112 preserves the complete C7 engineering, rejected-candidate, lock/runtime and S12 failure-analysis record. After exact source acceptance, #112 was closed without merge and non-Draft replacement PR #113 was created from the identical source branch and exact accepted head with zero source delta. PR #113 was merged only after replacement exact-head gates passed, using `expected_head_sha=58d303db9f39b24b5883a4d408d523d5f3617279`.

---

## V2.5 product boundary

V2.5 changes Video OS Studio from a collection of production surfaces into an Agent-native local workspace while preserving Project truth and V2.4 production behavior.

Accepted capability boundary includes:

- Agent-native workspace shell with Agent / Viewer / Context / Timeline information architecture;
- one unified Agent conversation surface instead of disconnected top-level Mission/Agent/Workflow modes;
- precise Selection Mode and ContextReference support for Project, Scene, Clip, Asset, TranscriptRange, TimelinePoint, ViewerRegion and production references;
- stale-reference semantics instead of silently resolving against changed Project truth;
- shared application Tool Registry used by built-in Agent and MCP transports;
- loopback-authenticated Local MCP bridge without generic shell/filesystem/Git authority;
- read tools for Project, Timeline and Transcript truth;
- reviewable external-agent proposals and explicit approval before accepted Project mutation;
- expected-revision and idempotency boundaries for external Apply;
- durable History attribution for human, built-in-agent and external-agent operations where evidence exists;
- durable Job truth across bridge restart/reconnect;
- Mission / QA / Campaign production surfaces integrated into the Agent-native workspace without duplicating truth;
- C7 hardening for workflow-runner startup failures, Project/operation lock amplification, owned lock exit cleanup, durable Job finalization, browser runtime cleanup and shared-proposal equivalence;
- AI-workspace Caption editing contract where a new explicit clip selection reopens the collapsed Context Dock and exposes the correct Inspector while preserving Scene + Clip compound Agent context.

No Project Schema migration is introduced.

---

## Rejected C7 candidates and preserved failures

The following candidates were rejected and must never be reused as release candidates:

```text
60eb1577c9572cca86e642cfd483a11fac396962
ed5b074306e248b314adeb79f285d5f7b8cb9eeb
4aeb69f3deb08928cabac197304e4fa6a543c2af
```

The failures were preserved rather than waived. They included a real prolonged workflow-runner/lock interaction, Windows residue/startup correctness issues, and the real AI-first W4 path where the Context Dock remained collapsed after selecting a workflow-generated Caption. The final accepted candidate repaired these boundaries and added permanent cloud regressions before being re-frozen.

---

## Final accepted source candidate

Exact accepted source head:

`58d303db9f39b24b5883a4d408d523d5f3617279`

### Source cloud acceptance

Dedicated V2.5 Cloud Acceptance #51 / run `33648285273`: **PASS**.

Standard source CI #1381 / run `33648285134`: **7/7 PASS**.

```text
ubuntu-verify                    PASS
windows-verify                   PASS
browser-smoke                    PASS
windows-media-smoke              PASS
windows-hyperframes-smoke        PASS
windows-b6-core-acceptance       PASS
windows-b7-campaign-acceptance   PASS
```

### Replacement merge-path acceptance

Dedicated V2.5 Cloud Acceptance #52 / run `33669242628`: **PASS**.

Standard replacement CI #1382 / run `33669242567`: **SUCCESS** after an evidence-preserving controlled rerun of one isolated A5 browser timing failure.

The initial replacement Browser job timed out while polling for the A5 durable Workflow after explicit confirmation. The same accepted source tree had passed A5 in the preceding source CI, the Draft and replacement PR temporary merge commits compared with zero file/content delta, all other browser tests passed, and all real Windows engine gates remained green. No source/test patch was made. A single controlled rerun on the identical PR merge tree passed, and the failure remains part of the audit trail rather than being erased.

---

## Mandatory Local Windows acceptance

Final accepted SHA:

`58d303db9f39b24b5883a4d408d523d5f3617279`

Final verdict:

`V2.5 C7 MANDATORY LOCAL WINDOWS ACCEPTANCE: PASS`

Fresh isolated VERIFY ONLY acceptance proved:

```text
exact SHA verified:              YES
npm ci:                          PASS
format:                          PASS
lint:                            PASS / 0 errors / 13 warnings
typecheck:                       PASS
full unit:                       PASS / 193 files passed / 8 skipped / 811 tests passed / 9 skipped
build:                           PASS
S01-S16:                         ALL PASS
source modifications:            0
local commits:                    0
local pushes:                     0
primary worktree:                 byte-for-byte unchanged
```

Real W4 evidence:

```text
Workflow ID:      328d7d6d-1f74-40b0-8ee6-cd79ccfb6f42
Definition:       video-production-talking-head / 2
Final Job:        a7b058b7-a432-48ed-9938-4986e702b075
Final MP4 bytes:  23,621,742
Final SHA256:     11D20191CDB18919EE0DE6BBC7A84E83DBBBEEF020D1C9F9108838910375C5A6
Duration:         34.858667s
Video:            H.264 / 1920x1080 / 30fps
Audio:            AAC
```

The real AI-first W4 path proved:

```text
AI workspace
→ Context Dock initially collapsed
→ CONTENT_REVIEW
→ real wf-caption-* selected
→ Context Dock automatically reopened
→ Caption Typography visible
→ Font Size = 60
→ Project revision advanced
→ CONTENT_REVIEW approved
→ ASSEMBLY_REVIEW approved
→ FINAL_RENDER completed
→ durable reload/reopen preserved truth
→ Download MP4 succeeded
→ ffprobe succeeded
```

Final cleanup proved zero `.runtime-owner.lock`, `.workflow-run.lock`, `project.json.lock`, `operations.jsonl.lock`, `*.props.json`, `.hf-work`, stale product temp residue, attributable orphan processes and acceptance listeners.

---

## Engineering merge and exact-main proof

PR #113 merged the exact accepted source head with expected-head protection as engineering main:

`79867fa26d837fb4f36dc2c60dd07c15ee88c4fd`

Push-triggered exact-main acceptance on that merge commit completed successfully:

### Dedicated V2.5 Cloud Acceptance #53

Run `33670276121`: **PASS**.

- V2.5 cloud/browser acceptance — PASS
- Windows full baseline — PASS
- exact SHA checkout/verify — PASS
- full unit/build — PASS
- C7 residue audit — PASS

### Standard exact-main CI

Run `33670276165`: **7/7 PASS**.

```text
ubuntu-verify                    PASS
windows-verify                   PASS
browser-smoke                    PASS
windows-media-smoke              PASS
windows-hyperframes-smoke        PASS
windows-b6-core-acceptance       PASS
windows-b7-campaign-acceptance   PASS
```

The exact-main Browser run passed without reproducing the isolated replacement A5 timeout.

This freezes the accepted V2.5 product-engineering main boundary before release metadata synchronization.

---

## Release metadata synchronization

Release branch:

`release/v2.5.0-finalization`

Accepted engineering main baseline:

`79867fa26d837fb4f36dc2c60dd07c15ee88c4fd`

One-shot version-sync run:

`33671108580` — **PASS**.

The one-shot guard verified provenance from the accepted engineering main, required all starting package versions to equal `2.4.2`, snapshotted package/lock JSON structure, ran `npm version 2.5.0 --no-git-tag-version`, verified structure after removing only the allowed version fields, verified a bounded two-file diff, committed the metadata change, and removed its temporary workflow from the release branch.

Allowed version changes only:

```text
package.json.version:                    2.4.2 -> 2.5.0
package-lock.json.version:               2.4.2 -> 2.5.0
package-lock.json.packages[""].version:  2.4.2 -> 2.5.0
```

Version-sync head before this release document:

`a30eb1a8145f1e0d980f4f0c1f5bb892586439ed`

Independent comparison against engineering main proved the net version-sync diff contained only:

```text
package.json       1 addition / 1 deletion
package-lock.json  2 additions / 2 deletions
```

No dependency, devDependency, engine, package tree, lock integrity, Project Schema or product/runtime source changed.

---

## Release completion evidence

Release-finalization PR #114 froze exact head:

`3d23c55de780b8b028b0665c14d99b0cc148f4fe`

Dedicated V2.5 Cloud Acceptance #54 / run `33671444645` passed both jobs on that exact head. Standard CI #1384 / run `33671444664` passed all seven gates. PR #114 then merged with expected-head protection as release commit:

`df54e10e38ee2793e8fdf285ea2c216fe8c65478`

Release exact-main Dedicated V2.5 Cloud Acceptance #55 / run `33672088362` passed both jobs. Release exact-main Standard run `33672088402` completed with all seven gates passing:

```text
ubuntu-verify                    PASS
windows-verify                   PASS
browser-smoke                    PASS
windows-media-smoke              PASS
windows-b6-core-acceptance       PASS
windows-b7-campaign-acceptance   PASS
windows-hyperframes-smoke        PASS
```

Isolated tag creation run `33673004195` created `v2.5.0` only after proving `origin/main` still exactly equaled the release commit, package metadata was exactly `2.5.0`, the tag did not already exist locally or remotely, and immutable `v2.4.2` remained unchanged. The one-shot workflow then removed itself from the isolated tagging branch.

Independent GitHub Git Data verification confirmed:

```text
ref:                 refs/tags/v2.5.0
ref object type:     tag
tag object SHA:      bff4bf67edc95dbf4cc78019f6795c94a4e59ea5
tag target type:     commit
tag target commit:   df54e10e38ee2793e8fdf285ea2c216fe8c65478
tag message:         Video OS Studio v2.5.0
```

Independent re-verification also confirmed:

```text
v2.4.2 tag object:   2c9b0ca2401f547066c6a51ff0ec60a641cfce35
v2.4.2 target:       79e48b068f701bba3f1c826710337a82f0a64760
v2.4.1 tag object:   9f3d06d8eabb114d6f1bcd907e98b4de3756a4a7
v2.4.1 target:       4c105bad936479690711c03f3e349db36fbadaf5
v2.4.0 tag object:   96ebdd67e2412ed4d25be36cc6120f1bba8a8734
v2.4.0 target:       da22a5415cbf8ad2a9ce93b912b41b787b29a9b1
```

## Release contract

```text
v2.5.0 tag:        v2.5.0 / annotated / verified
release commit:    df54e10e38ee2793e8fdf285ea2c216fe8c65478
tag object:        bff4bf67edc95dbf4cc78019f6795c94a4e59ea5
release status:    COMPLETE
product work:      UNFROZEN FOR A SEPARATELY APPROVED NEXT WORKSTREAM
schema changes:    NONE
local action:      NONE
```

This docs-only release-truth sync does not create, move, or recreate the release tag. The immutable `v2.5.0` tag remains on `df54e10e38ee2793e8fdf285ea2c216fe8c65478` even after `main` advances through documentation-only merge commits.
