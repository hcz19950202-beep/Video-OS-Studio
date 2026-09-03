# Video OS Studio V2.5.1 Release Finalization

`V2_5_1_RELEASE = FINALIZATION IN PROGRESS`

## 1. Release identity

- Release target: `v2.5.1`
- Package target: `2.5.1`
- Project Schema: unchanged
- MCP protocol: `2026-07-28`
- Node engine: `24.x`
- Previous immutable release: `v2.5.0`
- Previous V2.5.0 truth-sync main: `36334af84d8e5a9a7a71bab3c3d6cef5a0e191c4`

## 2. Engineering source acceptance

V2.5.1 engineering work was developed and audited in Draft PR #116 and accepted for merge through replacement PR #117.

Accepted source SHA:

`d6c2f0ae1a7a7d71623731a79e3c3c3759069c38`

Former invalid candidates that must never be reused:

- `2d69ea50908a628ecc8026b7a5f77b7db86ae0f7`
- `8f821914464ac09ea13f19e92d5fc4e9c9950727`
- `7b01cab6208e9bceef6960018b5d83201fb14825`
- `1358f3aff77434c5acbfe7ce44efb27406b5ae9d`

The final source fixes include:

- MCP server metadata aligned with product package metadata;
- authenticated `server/discover` reports product/server version `2.5.0` during engineering phase and MCP protocol `2026-07-28`;
- `DurableJobRuntime` construction made side-effect free with shared lazy initialization/recovery;
- `WorkflowService` construction made side-effect free with cached first-use recovery;
- Permission Center read-only catalog no longer claims runtime ownership merely by importing runtime modules;
- W4 real-render acceptance no longer undercuts the product Remotion timeout;
- durable `.runtime-owner.json` correctly treated as ownership metadata, while transient runtime-owner lock remains a residue gate;
- new Job-to-Workflow restart reconciliation regression proves a dead previous runtime cannot leave FINAL_RENDER permanently running.

## 3. Accepted source exact-head cloud gates

Before Local Windows acceptance, exact source `d6c2f0ae...` passed:

### Standard CI #1416

Run `33731578171`: **7 / 7 PASS**

- ubuntu-verify
- windows-verify
- browser-smoke
- windows-media-smoke
- windows-hyperframes-smoke
- windows-b6-core-acceptance
- windows-b7-campaign-acceptance

### V2.5 Cloud Acceptance #86

Run `33731578117`: **2 / 2 PASS**

Dedicated Windows full suite evidence:

- format PASS
- lint PASS, 0 errors / 13 warnings
- typecheck PASS
- 195 files passed / 8 skipped
- 814 tests passed / 9 skipped
- build PASS
- transient residue audit PASS
- V2.5.1 restart reconciliation PASS on Windows

## 4. Mandatory Local Windows acceptance

Fresh independent Codex VERIFY ONLY acceptance on exact SHA:

`d6c2f0ae1a7a7d71623731a79e3c3c3759069c38`

Result:

`LOCAL WINDOWS ACCEPTANCE: PASS`

Baseline:

- npm ci PASS
- format PASS, 28 files
- lint PASS, 0 errors / 13 warnings
- typecheck PASS
- unit PASS, 195 files passed / 8 skipped; 814 tests passed / 9 skipped
- build PASS

Targeted regressions:

- required 8-file suite: 48 / 48 PASS
- relevant `--maxWorkers=2` suite: 30 files, 138 / 138 PASS
- workflow-runner startup failure regression: 2 / 2 PASS
- Job → Workflow restart reconciliation: PASS

S01–S16:

**ALL PASS**

Real W4 evidence:

- Workflow ID: `804c0921-3197-4a10-bdd8-00b88820953f`
- definition: `video-production-talking-head`
- definition version: `2`
- run status: `completed`
- 16 / 16 stages completed
- FINAL_RENDER attempt: 1
- Final Job ID: `744d4d7b-003d-4c38-aa7b-5fbfff0f829e`
- Final Job status: `completed`
- durable reload/reopen: PASS

Source media:

- size: 15,051,804 bytes
- SHA256: `78a09049c88bf0295692335d8e80a49ef41c76e317f9d3c0a4a86e58139f0e6f`
- H.264, 1920x1080, 29.97 fps
- duration: `166.276009s`
- AAC audio

Product UI Download MP4:

- size: 74,961,956 bytes
- SHA256: `146f79756d347a6321257d6aa62fdb8a20652982d512f25dba21b8c6f78e1556`
- independent ffprobe exit: 0
- duration: `166.314667s`
- H.264, 1920x1080, 30 fps
- AAC audio

Hygiene:

- bearer token occurrences: 0
- secret pattern occurrences: 0
- durable-boundary absolute-path leaks: 0
- `.props.json`: 0
- `.runtime-owner.lock`: 0
- `.hf-work`: 0
- stale temp: 0
- attributable processes: 0
- attributable listeners: 0
- primary manifest: 38,971 files, missing 0, added 0, changed 0
- source modifications during Local verification: 0
- commits/pushes during Local verification: 0

## 5. Replacement engineering PR

Draft PR #116 was closed without merge after Local Windows acceptance was recorded.

Replacement PR #117 used the identical accepted source head:

`d6c2f0ae1a7a7d71623731a79e3c3c3759069c38`

Replacement exact-head gates:

- Standard CI #1417 / run `33742570147`: **7 / 7 PASS**
- V2.5 Cloud Acceptance #87 / run `33742570138`: **2 / 2 PASS**

Pre-merge audit:

- PR #117 open, non-Draft, mergeable
- head exact accepted SHA
- main exact `36334af84d8e5a9a7a71bab3c3d6cef5a0e191c4`
- ahead 25 / behind 0
- net diff exactly 12 accepted engineering files

PR #117 was merged with expected-head protection.

Engineering main merge commit:

`d74da28c1548c8aec7e9dd3d62f3b7fcd06d1b9b`

## 6. Engineering exact-main acceptance

Exact main `d74da28c...` passed push-triggered gates:

### V2.5 Cloud Acceptance #88

Run `33743200284`: **2 / 2 PASS**

- v2-5-cloud-acceptance PASS
- v2-5-windows-full-baseline PASS
- full unit PASS
- build PASS
- Windows transient residue audit PASS

### Standard CI #1418

Run `33743200058`: **7 / 7 PASS**

- ubuntu-verify PASS
- windows-verify PASS
- browser-smoke PASS
- windows-media-smoke PASS
- windows-hyperframes-smoke PASS
- windows-b6-core-acceptance PASS
- windows-b7-campaign-acceptance PASS

Therefore:

`d74da28c1548c8aec7e9dd3d62f3b7fcd06d1b9b`

is the accepted V2.5.1 engineering main.

## 7. Version synchronization

Release branch:

`release/v2.5.1-finalization`

was created directly from accepted engineering main `d74da28c...`.

A one-shot release workflow adapted from the accepted V2.4.2/V2.5.0 release pattern was used.

Workflow:

`V2.5.1 Release Version Sync`

Run:

`33743797484`

Result:

**PASS**

The helper proved:

- accepted engineering base is an ancestor;
- before execution the only branch change was the helper workflow itself;
- package.json version started at `2.5.0`;
- package-lock root version started at `2.5.0`;
- package-lock root package version started at `2.5.0`;
- package and lock structures were snapshotted with only allowed version fields removed;
- `npm version 2.5.1 --no-git-tag-version` succeeded;
- all three target version fields became `2.5.1`;
- stripped package/lock structures remained identical;
- unstaged version diff was bounded to `package.json` and `package-lock.json`;
- the helper workflow self-deleted;
- the version sync commit was pushed.

Version-sync branch commit:

`20f1157109c0b0d8b53f425c0f1b865c81f4d821`

Net compare accepted engineering main → version-sync commit:

- `package.json`: 1 addition / 1 deletion
- `package-lock.json`: 2 additions / 2 deletions

No helper workflow remains in the net diff.

## 8. Release gates still required

Do not create tag `v2.5.1` yet.

The following remain mandatory:

1. formal non-Draft release PR from `release/v2.5.1-finalization`;
2. release PR exact-head Standard CI 7 / 7 PASS;
3. release PR exact-head V2.5 Cloud Acceptance 2 / 2 PASS;
4. release PR head and main exact-SHA drift audit;
5. expected-head merge;
6. release commit exact-main Standard CI 7 / 7 PASS;
7. release commit exact-main V2.5 Cloud Acceptance 2 / 2 PASS;
8. prove main remains exact release commit;
9. prove `v2.5.1` tag does not yet exist;
10. create annotated immutable tag `v2.5.1` with message exactly `Video OS Studio v2.5.1`;
11. independently verify tag ref object type `tag`, tag target type `commit`, exact release commit target, and exact message;
12. perform docs-only post-release truth sync without moving the immutable tag.

## 9. Local Windows rule after engineering acceptance

No additional Local Windows gate is required for version metadata / release evidence / post-release truth-sync changes, provided product/runtime/source files are not changed after accepted engineering main.

Any new product/runtime source modification invalidates this release boundary and requires re-evaluation.
