# Video OS Studio V2 — M2 Local Validation

> Milestone: M2 Text-native Editing — Script Editor + Scene System  
> Branch: `feature/v2-text-editing`  
> PR: #5  
> Rule: do not merge and do not start M3 until all required M2 gates pass.

## 1. Scope

Validate on Windows with a **fresh validation project copied from or created with a real 60–90 second talking-head MP4**.

M2 must prove:

```text
real MP4
→ video-use Transcribe + Pack
→ editable Script
→ Script word seek / Player current-word sync
→ reversible sentence cut
→ canonical A-roll rebuild
→ Scene generation / edit / split / merge
→ Scene Strip
→ save / restart / reopen
→ final MP4
```

Do not validate M3/M4/M5 features here.

## 2. Safety

- Do not overwrite the only accepted V1/M1 project.
- Use an isolated project/data copy.
- Keep source media unchanged.
- Use issue IDs `V2-M2-LV-001`, `V2-M2-LV-002`, ... for every defect.
- M2 defects may be fixed only on `feature/v2-text-editing` and pushed back to PR #5.
- Do not merge PR #5.

## 3. Environment / automatic checks

Record:

```text
node -v
npm -v
git branch --show-current
git rev-parse HEAD
git status
```

Run:

```text
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

Expected cloud baseline before local fixes: 25 test files / 74 tests PASS.

## 4. Create a clean real M2 project

Use a real talking-head MP4. Prefer 60–90 seconds and spoken Chinese if available.

Before M2 spoken-content editing, the project must have:

- Video source imported;
- no Scene;
- no Caption clips;
- no Motion clips;
- no B-roll clips;
- no Audio clips.

This is intentional: M2 Script cuts happen before timing-dependent design.

Record project ID, source MP4 path, duration, fps and resolution.

## 5. Real video-use → Script

From Project tools run **Transcribe + Pack** through the normal UI/API.

Verify:

- `project.script.segments.length > 0`;
- `project.script.baseSourceRanges` matches the current Video Track source ranges;
- Script words contain frame-based `startFrame/endFrame`;
- `takes_packed.md` still exists;
- Script tab shows segment count and word count;
- Chinese/English UI both render the Script interface.

Record word count and segment count.

## 6. Script ↔ Player synchronization

Verify in browser:

1. click a word in Script;
2. Player seeks to the expected spoken moment;
3. Timeline playhead follows;
4. play through several words;
5. current transcript word highlight advances with Player;
6. seek Timeline to another kept range;
7. Script highlight follows the corresponding source word.

Check at least 5 word/frame samples and record observed error in frames/seconds.

## 7. Semantic tags

On at least two Script segments toggle:

- Motion;
- B-roll;
- CTA or Quote.

Verify persistence after save/reopen.

These tags do not yet automatically create visual clips in M2.

## 8. Reversible sentence cut

Choose one clearly audible Script segment away from the first/last frame.

Before deletion record:

- segment ID/text;
- source start/end frame;
- project duration;
- Video Track clip count;
- revision.

Click **Remove Sentence**.

Verify:

- segment status becomes `removed`;
- removed text is visually distinct;
- Video Track is rebuilt into kept source ranges;
- project duration decreases by the removed source duration;
- source→timeline mapping is correct after the cut;
- Player no longer plays the removed sentence;
- one user action creates one durable transaction/revision, not many meaningless revisions.

Save and reopen. Verify removed state and A-roll remain identical.

## 9. Real render of removed sentence

Render a real final MP4 from the cut project.

Verify with ffprobe:

- H.264 video;
- AAC audio;
- expected width/height;
- expected fps;
- shorter duration.

Inspect frames before/after the removed range and listen/inspect the relevant spoken transition. The removed sentence must not be present.

Record output path and ffprobe evidence.

## 10. Restore sentence

Restore the same segment.

Verify:

- status becomes `active`;
- source baseline is reconstructed from `baseSourceRanges`;
- Video Track/duration return to the pre-cut baseline;
- Player contains the sentence again;
- save/reopen remains stable.

A second real full render is optional if Preview + project state prove restoration; perform it if any timing discrepancy appears.

## 11. Downstream design guard

After restoration, add one downstream timing-dependent object, preferably one Caption or Motion clip.

Attempt to remove a Script sentence.

Expected:

- operation is refused;
- error is actionable;
- Video Track does not change;
- downstream clip does not change;
- revision does not change because the mutation is rejected.

Then remove the temporary downstream test object before Scene testing.

## 12. Confirmed EDL baseline safety

Use a fresh/duplicate clean project with Script prepared.

Apply a confirmed video-use EDL that removes at least one source interval.

Verify:

- Script `baseSourceRanges` updates to the EDL ranges;
- Script words outside the EDL are removed from the editable Script baseline;
- later Script Remove/Restore cannot resurrect footage that the EDL removed;
- applying a new EDL after Script segments have already been removed is refused.

## 13. Auto Scene generation

On a clean post-Script-cut project with no downstream design, click **Auto Scenes**.

For a 60–90 second real talking-head video, inspect whether the result is useful rather than checking an arbitrary exact count. Normally expect roughly 5–12 Scenes; if the real script produces a clearly unusable count, record it as a product defect instead of forcing the number.

Verify:

- every active Script segment is assigned to a Scene;
- first Scene is a reasonable Hook or manually correctable;
- obvious CTA language such as `私信 / 联系 / 发给我们 / send / contact` can become CTA;
- Scene frame ranges are inside project duration;
- Scene Strip appears above the five media tracks;
- Scene does not become a sixth media track.

## 14. Scene interaction

Verify:

- click Scene in left panel → selection + Player seek;
- click Scene in Timeline strip → same;
- rename Scene;
- change semantic type;
- split a Scene at a Script segment boundary;
- merge it back with the next Scene;
- Script `sceneId` assignments remain correct;
- one split/merge operation is one durable transaction/revision.

## 15. Save / restart / reopen

Save project, stop dev server, restart and reopen.

Verify persistence of:

- Script words;
- `baseSourceRanges`;
- removed/active status;
- semantic tags;
- Scenes;
- Scene names/types/frame ranges;
- Script `sceneId` assignments;
- Video Track;
- Project duration.

## 16. V1.1 regression smoke

On the M2 branch also confirm no regression in:

- MP4 playback;
- play/pause/seek;
- five media tracks;
- Effect Library;
- existing Motion Inspector;
- X/Y/Scale/Opacity/Anchor;
- Assets;
- Captions browser;
- zh-CN/en-US toggle;
- dark/light UI theme;
- Project JSON export;
- resizable Preview/Timeline.

M2 does not implement Scene Inspector on the right — that belongs to M3.

## 17. Visual acceptance evidence

Capture at least:

1. Script workspace with real transcript;
2. removed Script sentence state;
3. Scene workspace with real Scenes;
4. Scene Strip + Preview + Timeline;
5. English UI Script/Scene state.

Use 1920×1080 if possible. Record a short browser acceptance video if available.

## 18. Local defect handling

For every defect:

```text
V2-M2-LV-001
V2-M2-LV-002
...
```

Record:

- reproduction;
- expected;
- actual;
- root cause;
- fix commit;
- regression evidence.

After any fix rerun:

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

Push fixes to `feature/v2-text-editing`, wait for PR #5 CI and update this document.

## 19. Final report

Return:

- final commit SHA;
- final CI run ID;
- validation project ID/path;
- real source MP4;
- transcript word count / Script segment count;
- Script→Player sync evidence;
- remove segment evidence;
- pre/post-cut duration and Video clip count;
- final cut MP4 path + ffprobe;
- restore evidence;
- downstream mutation guard result;
- EDL baseline result;
- Scene count and semantic-type sample;
- Scene split/merge result;
- save/reopen result;
- i18n result;
- screenshots/recording paths;
- every `V2-M2-LV-xxx`;
- remaining failed items or `NONE`.

Final gates:

```text
CODE COMPLETE: PASS / FAIL
CLOUD VERIFIED: PASS / FAIL
LOCAL VERIFIED: PASS / FAIL
PRD ACCEPTED: PASS / FAIL
RENDER VERIFIED: PASS / FAIL
VISUAL ACCEPTED: PASS / FAIL
```

Do not merge PR #5 and do not start M3 after finishing this validation. Stop and hand the result back to GPT Web.

## 20. Codex Windows Local Validation Record — 2026-08-21

This section records the real Windows validation executed from the isolated worktree
`E:\Video-OS-Studio-v2-m2-validation`. The original user worktree was not modified.

### 20.1 Source, branch and environment

- Branch: `feature/v2-text-editing`, initial handoff SHA `9bf1e237c0355073d3a865aeaaacbce7b0a5611c`.
- Repository state at test start: clean, tracking `origin/feature/v2-text-editing`.
- Node: `v24.19.0`; Next.js: `16.3.1`.
- Isolated data root: `E:\Video-OS-Data\v2-m2-validation-20260821-121255`.
- Camera provenance: `E:\外贸预制房\2026.08.19\2026_08_19_10_39_33_IMG_0960.MOV` (original camera file preserved).
- Validation source MP4: `E:\Video-OS-Data\v2-m2-validation-20260821-121255\source\m2-talking-head-source.mp4`, real talking-head footage, H.264/AAC, 1080×1920, 30 fps, 75.833333 s.
- Validation project: `m2-script-scene-e19978c4` at `E:\Video-OS-Data\v2-m2-validation-20260821-121255\projects\m2-script-scene-e19978c4`.

### 20.2 Automated gates

All four commands passed on the M2 branch:

```text
npm ci       PASS
npm run lint PASS (0 errors; 2 existing <img> warnings)
npm run typecheck PASS
npm run test PASS (25 files / 74 tests)
npm run build PASS
```

The build completed with Next.js 16.3.1 compile, typecheck, page generation and optimization successful.

### 20.3 Project and Script baseline

The project was created, named and populated through the real browser UI and the MP4 was imported through the real file picker. Before Script editing it had exactly one Video asset/clip and five media tracks; Caption, Motion, B-roll and Audio clip counts were all zero; Scenes were zero.

Real `video-use -> Transcribe + Pack` completed locally with the configured `video-use` faster-whisper environment. The durable project state contains:

- 20 Script segments and 357 transcript words;
- `script.baseSourceRanges = [{ startFrame: 0, endFrame: 2275 }]`;
- word frame timings attached to the Script;
- `edit\takes_packed.md` and the generated transcript JSON under `edit\transcripts`.

Script→Player was verified by clicking real Script words and checking the Player frame readout:

| word index / sample | source start frame | Player frame | error |
|---|---:|---:|---:|
| 0 / 如果你 | 30 | 30 | 0 |
| 40 / 认 | 268 | 268 | 0 |
| 100 / 团 | 664 | 664 | 0 |
| 180 / 之前 | 1133 | 1133 | 0 |
| 300 / 完全 | 1915 | 1915 | 0 |

Player→Script playback advanced the current word during real playback. Timeline seek to frame 1500 produced the expected Player frame and active Script word.

Semantic tags were set and persisted through the real Script UI: `segment-002 = motion`, `segment-011 = broll`, `segment-019 = cta` (CTA language included `发给我们`).

### 20.4 Script cut, render and restore

The middle sentence `segment-010` was removed through the real Script UI. Its source range was frames 1021–1133.

- Before: revision 7, 2275 frames / 75.833333 s, Video clips 1.
- After: revision 8, 2163 frames / 72.1 s, Video clips 2, removed state visible in Script, A-roll rebuilt into two source-mapped clips.
- Save and reopen restored the removed state and revision 8.
- Restore through the real Script UI produced revision 9, the full 2275-frame duration and one Video clip; the three semantic tags remained.

The real deleted-state MP4 was exported through the UI:

`E:\Video-OS-Data\v2-m2-validation-20260821-121255\projects\m2-script-scene-e19978c4\render\final-6bbddf90-98ba-4e4b-87ab-da686ad25af5.mp4`

`ffprobe` confirmed H.264 High / 1080×1920 / 30 fps / 2163 frames, AAC-LC / 48 kHz / stereo, duration 72.149333 s. Extracted before/after-cut frames show the real talking-head footage without visual corruption. A fresh local transcription of the final render produced 340 words and did not contain the exact deleted sentence; the cut boundary and duration were consistent with the canonical project mapping.

### 20.5 Downstream guard and EDL safety

On the restored clean project, a temporary Remotion Motion card was added through the Effect Library (revision 10). A subsequent Script remove attempt was rejected by the UI/API with HTTP 400 and the expected message that Script cuts must precede Scene/Caption/Motion/B-roll/Audio design. Revision, Video clip count and Script state were unchanged. The temporary Motion card was removed through the real Timeline UI (revision 11), leaving all downstream tracks empty.

The separate clean EDL project was `m2-edl-baseline-safety-497ae276` at `E:\Video-OS-Data\v2-m2-validation-20260821-121255\projects\m2-edl-baseline-safety-497ae276`.

- Confirmed EDL applied through the real UI from ranges `0–35 s` and `45–75.7 s`.
- Result: revision 9, 1971 frames / 65.7 s, Video clips 2, base ranges `[0–1050]` and `[1350–2271]`, 19 Script segments / 316 words.
- The EDL-deleted middle material (`segment-011`) was absent. Script remove/restore of another segment changed only the post-EDL cut and could not restore the EDL-deleted material.
- Applying a new EDL after a Script cut was rejected with the expected “Restore the Script baseline or start from a fresh project first” message; revision, base ranges and cut state were unchanged. The temporary Script cut was restored.

### 20.6 Auto Scenes and Scene editing

Auto Scene generation on the clean post-Script project produced 10 Scenes, 20 active segments with Scene IDs, no out-of-range Scene and no active segment without a Scene ID. The generated sample was:

```text
01 HOOK     f30–252
02 PROCESS  f252–482
03 PAIN     f482–706
04 CUSTOM   f706–907
05 PAIN     f907–1133
06 PROOF    f1133–1393
07 PROOF    f1393–1619
08 REFRAME  f1619–1846
09 PAIN     f1846–2052
10 CTA      f2052–2246
```

The CTA phrase `发给我们` was recognized in the CTA Scene. The Scene Strip appeared above the five media tracks and was verified as a semantic strip, not a sixth media track. Real Scene selection sought the Player to the Scene start and updated the selection metric.

Scene 07 was renamed to `PROOF 07 - 关键数据` and changed to semantic type `solution`; the two updates each persisted as one revision. Splitting at a segment boundary produced revision 15 and 11 Scenes with updated Scene IDs/ranges. Merging the two resulting Scene parts produced revision 16 and restored 10 Scenes. Each transaction advanced exactly one revision.

### 20.7 Save/reopen, i18n and V1.1 smoke

Revision 16 was saved through the real UI. The dev server was stopped, restarted with the same isolated data root, and the project was reopened from Recent Projects. The browser preference persisted as `en-US`; after reopening, the API/UI still showed 20 segments / 357 words, full 2275 frames, 10 Scenes, the renamed/typed Scene 07, the three tags and zero downstream clips. The UI was then returned to `zh-CN`.

V1.1 smoke on the M2 branch covered real MP4 playback, play/pause, timeline seek, five media tracks, Assets, Captions, Effect Library, Motion Inspector, theme toggle, Project JSON export and the Preview/Timeline splitter. A temporary Motion Inspector card exposed `水平位置 X`, `垂直位置 Y`, `缩放`, `透明度` and `锚点`; it was removed through the Timeline. Final clean project state is revision 18, duration 2275, Scenes 10, removed segments 0, Video 1, Motion/Caption/B-roll/Audio 0.

### 20.8 Evidence and defect record

Screenshots are retained under `E:\Video-OS-Data\v2-m2-validation-20260821-121255\evidence`:

```text
01-script-workspace-zh.png
02-removed-sentence-zh.png
03-removed-render-before-cut.png
04-removed-render-after-cut.png
05-english-script-scenes.png
06-scene-workspace-zh.png
07-scene-strip-seek-zh.png
```

Browser recordings:

```text
C:\Users\hcz\.config\browser-harness\agent-workspace\recordings\video-os-v2-m2-local-validation
C:\Users\hcz\.config\browser-harness\agent-workspace\recordings\video-os-v2-m2-regression-smoke
```

Project JSON export was downloaded to `C:\Users\hcz\Downloads\m2-script-scene-e19978c4.json`.

No M2 defect requiring a code fix was found. `V2-M2-LV-xxx`: `NONE`.

The render output file is retained and passed `ffprobe`; the browser render-output registry is in-memory and therefore does not survive the intentional dev-server restart, while the exported MP4 and project state do survive and were independently verified.

Validation-record commit: `7955b38bea797b92e65030a5ce57f115921209d5`. Cloud CI run `32449520494` completed successfully for that commit; Lint, Typecheck, Unit tests and Build were all green. PR #5 was not merged and no M3 work was started.
