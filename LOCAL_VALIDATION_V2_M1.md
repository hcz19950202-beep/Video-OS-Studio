# Video OS Studio V2 — Milestone 1 Local Validation

> Branch: `feature/v2-foundation`
> PR: #4
> Scope: Project Schema 2.0 + V1→V2 Migration foundation only.
> Do not develop Script UI, Scene UI, Canvas UI, Timeline V2 or AI Director during this validation.
> Do not merge PR #4.

## 1. Baseline

```powershell
cd E:\Video-OS-Studio
git fetch origin
git checkout feature/v2-foundation
git pull origin feature/v2-foundation
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

Use Node 24 as the acceptance runtime.

## 2. Primary real project

Use the previously accepted V1.1 project under:

```text
E:\Video-OS-Data\projects\v1-rough-cut-validation-98c8f21e
```

Before opening it with V2 code:

1. copy the entire project directory to a new validation project directory or retain a verified backup;
2. record the original `project.json` SHA256/hash;
3. record original project version, revision, canvas, assets and all track/clip counts;
4. do not destroy the only V1.1 evidence project.

Recommended copy:

```text
E:\Video-OS-Data\projects\v2-m1-migration-validation-<suffix>
```

If changing the copied project ID is necessary, do so only through a controlled validation step and document it. Never hand-edit machine absolute media paths into Project JSON.

## 3. Migration checks

Open/load the copied historical V1/V1.1 `1.0.0` Project through the normal repository/serialization path.

Required:

- [ ] old `1.0.0` Project is accepted by `LegacyProjectV1Schema`
- [ ] load path returns `version: 2.0.0`
- [ ] project ID and name preserved
- [ ] revision preserved by migration itself
- [ ] createdAt / updatedAt preserved by migration itself
- [ ] canvas width/height/fps/duration preserved
- [ ] all assets preserved
- [ ] asset relative POSIX paths preserved
- [ ] no machine absolute path introduced
- [ ] five tracks preserved
- [ ] Video clips preserved including `sourceStartFrame` / volume
- [ ] Caption clips preserved including preset/emphasis/keywords
- [ ] Remotion Motion clips preserved
- [ ] HyperFrames Motion clips preserved
- [ ] Motion `transform` X/Y/Scale/Opacity/Anchor preserved
- [ ] B-roll clips preserved
- [ ] Audio clips preserved

New V2 fields must exist after migration:

- [ ] `script.segments = []`
- [ ] `scenes = []`
- [ ] `markers = []`
- [ ] `linkedStyles = []`
- [ ] `language.sourceLanguage = "unknown"`
- [ ] `language.captionTracks = []`
- [ ] generated-video `brand` defaults exist

## 4. Persistence / reopen

After migration:

1. save through the normal Project repository path;
2. confirm atomic save and backup behavior still works;
3. restart the app/server;
4. reopen the migrated project;
5. confirm it remains `2.0.0` and does not run migration again;
6. confirm no asset/track/clip loss after reopen.

Required:

- [ ] V2 save succeeds
- [ ] project backup exists/behaves normally
- [ ] restart/reopen succeeds
- [ ] second load is idempotent
- [ ] revision changes only when a real durable command/save path requires it; migration itself must not fabricate edit revisions

## 5. V1.1 regression smoke after migration

Do not repeat full V1/V1.1 acceptance, but verify the migrated real project still supports the accepted runtime surfaces:

- [ ] project opens in the V1.1 workstation
- [ ] real A-roll Preview loads
- [ ] play / pause / seek work
- [ ] Timeline tracks/clips appear
- [ ] existing Motion selection works
- [ ] Inspector reads existing Motion Transform
- [ ] existing Caption selection works
- [ ] Assets workspace resolves media
- [ ] Project JSON export returns V2 Project JSON

## 6. Render smoke

Because M1 changes durable Project serialization, perform one short real render regression from the migrated project.

Required:

- [ ] final MP4 render starts and completes
- [ ] ffprobe confirms playable H.264/AAC output, expected dimensions/fps and plausible duration
- [ ] inspect at least 2 rendered frames
- [ ] existing Motion placement still agrees with Preview

Alpha WebM full revalidation is not required unless the migration or schema change causes an overlay regression. If an overlay problem appears, record and test it.

## 7. Selection foundation smoke

This is not a user-facing multi-select release yet. Validate only foundation behavior in browser/dev tools or focused test harness if practical:

- [ ] existing single clip selection still works through `selectedClipId`
- [ ] no V1.1 Inspector/Timeline regression from the compatibility surface

Do not build multi-select UI in M1.

## 8. Issues

Use Milestone-scoped IDs:

```text
V2-M1-LV-001
V2-M1-LV-002
V2-M1-LV-003
```

Fix only genuine M1 migration/foundation defects on `feature/v2-foundation` and push them back to PR #4.

Do not expand scope into M2.

## 9. After any local fix

Run again:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

Push to the same branch and wait for GitHub CI.

## 10. Final report

Return:

- final commit SHA
- GitHub CI run ID
- real source project/copy path used
- original V1 project version + migrated V2 version
- asset counts before/after
- track and clip counts before/after
- Motion Transform preservation result
- save/reopen result
- real MP4 render result + ffprobe summary
- all `V2-M1-LV-xxx` issues/fixes
- any unchecked item

Final gate must be reported as:

```text
CODE COMPLETE: PASS
CLOUD VERIFIED: PASS
MIGRATION VERIFIED: PASS / FAIL
LOCAL VERIFIED: PASS / FAIL
PRD ACCEPTED: PASS / FAIL
RENDER VERIFIED: PASS / FAIL
```

Only after all required M1 gates pass should PR #4 be eligible to merge.
