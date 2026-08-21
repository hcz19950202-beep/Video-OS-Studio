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
