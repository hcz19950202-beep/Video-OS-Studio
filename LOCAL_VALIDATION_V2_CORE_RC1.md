# Video OS Studio V2 — Core Final Acceptance / RC1

> Release candidate: V2 Core RC1  
> Branch: `release/v2-core-rc1`  
> Base: accepted M5 `main`  
> Rule: this is an end-to-end product acceptance pass, not a new feature milestone.

## 1. Purpose

M0–M5 have each passed their own cloud and Windows acceptance. RC1 now answers a different question:

> Can a user start from a new real talking-head video and complete an entire publishable video inside Video OS Studio V2 without understanding Remotion, HyperFrames, EDL, Project JSON, or internal frame math?

This validation must exercise the canonical V2 product flow as one continuous workflow:

```text
New Project
↓
Import real talking-head MP4
↓
video-use / transcript
↓
Script editing
↓
Scene structure
↓
Caption
↓
AI Director Analyze / Review / Apply
↓
Brand / Linked Style
↓
Canvas direct manipulation
↓
Timeline refinement
↓
B-roll / Audio / Marker / Waveform
↓
Final Render
↓
Stop / Restart / Reopen
↓
Second edit
↓
Second Final Render
```

The RC is accepted only if this whole journey works on one newly created Project.

## 2. Scope Boundary

RC1 may fix only cross-milestone integration/release-blocking defects found while executing the accepted V2 Core workflow.

RC1 must **not** add:

- AI Command Bar;
- a cloud LLM provider;
- Project Package ZIP;
- multi-language content tracks;
- new Effect Packs;
- AI avatar / lip sync / text-to-video;
- unrelated editor features;
- large renderer rewrites.

If a product limitation is real but not release-blocking, record it as a Post-Core follow-up instead of expanding RC scope.

## 3. Release Candidate Truth

Accepted V2 Core architecture before RC1:

```text
M0 baseline/document truth      PASS
M1 Project 2.0 / migration      PASS
M2 Script + Scene               PASS
M3 Editor Core                  PASS
M4 Canvas + Timeline V2         PASS
M5 AI Director V2               PASS
```

Current Project version:

```text
2.0.0
```

Core abstraction:

```text
Words → Meaning → Scenes → Visual Decisions → Clips → Render
```

Non-negotiable implementation rules remain:

- canonical time = frames;
- durable Project state changes go through validated Command / Transaction / bounded service boundaries;
- AI does not hand-edit Project JSON;
- Remotion is Master Composition;
- HyperFrames / video-use / FFmpeg remain behind adapters/services;
- Studio Theme / locale are local UI preferences and distinct from Generated Video Brand;
- `REUSE > MODIFY > CREATE`.

## 4. Isolation and Safety

Use a dedicated RC worktree and data root.

Recommended worktree:

```text
E:\Video-OS-Studio-v2-core-rc1
```

Recommended data root:

```text
E:\Video-OS-Data\v2-core-rc1-YYYYMMDD-HHMMSS
```

Do not mutate accepted M1–M5 validation roots.

Do not hand-edit `project.json` to create acceptance states.

Do not copy the final M5 Project and claim end-to-end acceptance. RC1 must create a **new Project from a raw source video**.

## 5. Source Media Requirement

Use a real talking-head source that was **not** the previously accepted `m2-talking-head-source.mp4` / `m2-script-scene-e19978c4` workflow.

Preferred source characteristics:

- 45–120 seconds;
- real human speech;
- one clear business/topic narrative;
- at least one concrete number or percentage if possible;
- at least one problem/pain statement;
- at least one solution/process/proof statement;
- one CTA if possible;
- normal audible speech;
- real MP4/MOV source, not a generated test fixture.

Local Codex should search safe user media locations such as the configured `VIDEO_OS_DATA_ROOT`, `E:\Video-OS-Data\raw`, or another user-provided media folder.

If no new suitable real source exists, stop before product validation and ask the user to provide one. Do not reuse the M2/M3/M4/M5 source merely to avoid this requirement.

Record:

- source path;
- SHA256;
- file size;
- codec;
- audio codec;
- resolution;
- FPS;
- duration.

## 6. Environment Gate

Record:

```text
node -v
npm -v
git branch --show-current
git rev-parse HEAD
git status
```

Require Node 24.x.

Before UI acceptance run:

```powershell
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

All must PASS.

Any RC fix must rerun the same full gate and push to `release/v2-core-rc1`.

## 7. Create a Brand-New Project

Start the Studio with the isolated data root.

Create a new Project from normal UI / supported API boundary.

Do not clone an accepted Project.

Record:

- new Project ID;
- Project name;
- initial revision;
- Project path;
- canvas size;
- FPS;
- initial duration.

Expected Project schema:

```text
version = 2.0.0
script
scenes
markers
brand
linkedStyles
language
tracks
assets
```

## 8. Import Raw Talking-Head Media

Import the chosen real source through the normal Studio media path.

Verify:

- asset created;
- relative Project media path used;
- Video track receives correct clip;
- Preview plays;
- audio plays;
- duration/FPS align with source;
- Save / reopen at this early stage works.

Record Project revision before/after import.

## 9. video-use → Script

Use the normal Project UI:

```text
video-use
→ Transcribe + Pack
```

Do not inject a transcript manually.

Verify:

- real word-level transcript is written to `project.script`;
- every word has start/end frames;
- Script segments exist;
- `baseSourceRanges` exists;
- transcript artifact still exists;
- Script workspace shows real text.

Record:

- transcript word count;
- Script segment count;
- transcription elapsed time;
- any manual intervention.

## 10. Script Editing as the First Editing Surface

Use the Script UI to make at least two meaningful editorial decisions:

1. remove one complete non-edge sentence;
2. add at least one semantic tag such as Motion / B-roll / CTA / Quote.

Verify:

- Script click → Player seek;
- Player → current word highlight;
- removed text state is visible;
- removing text rebuilds canonical A-roll;
- Project duration shortens correctly;
- source continuity remains correct;
- one Script operation does not create meaningless revision spam.

Then Restore once, verify recovery, and perform the final intended Script cut again.

This proves both Remove and Restore in one new project.

Record before/after duration, clip count, revision, removed source range.

## 11. Scene System

Generate Scenes from the edited Script.

Verify:

- all active Script segments are assigned to a Scene;
- Scene count is sensible for source length;
- semantic types are plausible;
- Scene Strip appears above Timeline;
- clicking a Scene seeks Player;
- Scene Inspector works.

Make at least one manual Scene adjustment:

- rename, and
- either Split or Merge, and
- change one semantic type if the auto classification is clearly improvable.

Record Scene count before/after manual refinement.

## 12. Caption Path

Create/import timed Captions through supported product flow.

The final RC project must contain visible captions.

Verify Caption Inspector:

- preset;
- font/size/weight;
- position/alignment;
- fill/stroke/background;
- number/keyword emphasis where relevant.

Apply one deliberate caption style change and confirm Preview.

## 13. AI Director — First-Pass Visual Direction

Run AI Director only after Script, Scenes, and timed Captions are real.

Record Project revision before Analyze.

Analyze must be read-only:

```text
revision before = revision after
```

Verify the generated plan contains real Scene-grounded suggestions with:

- Scene;
- Spoken Text;
- Recommendation;
- Reason;
- Confidence;
- Alternatives;
- density information.

Review the suggestions as a user would.

Deselect at least one recommendation because it is unnecessary, redundant, or lower-value.

Verify Change Preview recalculates without mutating Project.

Apply at least two accepted suggestions from different Scene/content moments if the Director provides them.

Expected:

```text
one Apply = one Project transaction = revision +1
```

If the real Director correctly recommends few or no additions due to density, do not artificially force many effects. The RC target is good product judgment, not effect count.

## 14. Brand and Linked Styles

Set a Generated Video Brand that is intentionally different from the Studio UI theme.

At minimum adjust:

- primary/accent color;
- caption typography or style choice;
- motion effect scale/speed if appropriate.

Then create/use one Linked Style for multiple compatible Motion or Caption elements when the project has enough elements.

Verify:

- editing the Linked Style updates all bound elements;
- direct Clip style still overrides Scene/shared fallback according to accepted precedence;
- toggling Studio Dark/Light does not mutate Project Brand or revision.

## 15. Canvas Direct Manipulation

Use Canvas Edit on at least two real visual elements.

At minimum perform:

- select;
- drag;
- resize;
- rotate on one supported visual;
- nudge;
- one snap action;
- one layer forward/back action where overlap makes the result visible.

Verify:

- actual Preview content follows while dragging, not just the bounding box;
- pointer-up creates one durable change;
- Inspector values match Canvas result;
- Inspector change also updates Canvas/Preview.

Do not optimize for pixel-perfect beauty; this is a usability/integration check.

## 16. B-roll

The final RC project must contain at least one real B-roll visual.

Use a real user/local video asset, not a fake color block.

Add it through supported UI/API/Project Command boundary.

Verify:

- active only in intended frame range;
- fit/position/scale/opacity work;
- layer order works;
- sourceStartFrame works when relevant;
- optional fade is visually sensible.

If the source narrative does not need B-roll, still use one short relevant insert for product-path acceptance and document that it was added for RC coverage.

## 17. Audio

The final RC project must exercise Audio beyond the A-roll's embedded audio.

Add one real Audio asset as BGM or SFX through supported product path.

Verify:

- role;
- volume;
- mute;
- fade;
- source start;
- audible Preview.

Keep it tasteful; product acceptance does not require loud music.

## 18. Timeline V2 Professional Controls

Exercise at least:

- Snap;
- Marker;
- `S` Split on a disposable/appropriate clip;
- Undo;
- Redo;
- multi-select;
- Duplicate or Delete on a safe element;
- real waveform display.

At least one split must preserve source continuity.

Undo/Redo must preserve monotonic durable revision semantics.

## 19. Save / Stop / Restart / Reopen Before First Final Render

Before rendering, Save and completely stop the dev server.

Restart with the same RC data root.

Open the new RC project from Recent Projects.

Verify durable recovery of the entire editing state:

- Video cut;
- Script;
- Scenes;
- Captions;
- AI Director-applied visuals;
- Brand;
- Linked Styles;
- Canvas transforms;
- rotations/layers;
- B-roll;
- Audio;
- Markers;
- split structure;
- waveform cache.

If any material durable state is lost, RC1 FAIL until fixed.

## 20. First Final Render

Render through normal Studio UI.

Required output:

- H.264;
- AAC when audio exists;
- 1080×1920 unless the source Project intentionally uses another accepted ratio;
- 30 fps unless source Project intentionally uses another accepted FPS;
- correct duration/frame count.

Run ffprobe.

Inspect/listen to the complete rendered MP4, not only two frames.

Record:

- render job ID;
- render elapsed time;
- output path;
- file size;
- codec/audio/resolution/FPS/duration/frame count.

Capture Preview ↔ Final evidence for at least:

1. caption styling;
2. one AI Director visual;
3. B-roll overlap/transform;
4. one Brand/Linked Style visual;
5. one rotated/transformed element if visible.

## 21. Second Edit After Reopen

RC1 must prove the finished Project can continue to be edited.

After the first render:

1. stop/restart/reopen if not already reopened;
2. make one small real edit, such as:
   - move/scale a visual;
   - change a Caption style;
   - adjust BGM volume;
   - change one Marker;
3. Save;
4. render a second Final MP4.

Verify:

- Project remains valid;
- new edit persists;
- second render reflects the change;
- no need to rebuild/re-import the project.

This is a release-critical criterion.

## 22. Language / Theme Product Check

Use both:

- zh-CN;
- en-US.

Verify the main user journey remains understandable in both locales.

At minimum inspect:

- Script;
- Scenes;
- Assets;
- Effects;
- Captions;
- Project;
- Context Inspector;
- Canvas;
- Timeline;
- AI Director;
- Render controls.

Refresh and confirm locale persistence.

Dark / Light Studio theme must remain separate from Generated Video Brand.

## 23. User-Effort / Product-Usability Audit

RC1 is not only technical acceptance. Record how much work a real user had to perform.

Measure approximately:

- Project creation → playable imported media;
- import → transcript complete;
- transcript → finished Script cut;
- Script → Scenes ready;
- Scenes/Captions → first AI Director plan;
- plan review → first usable visual edit;
- first edit → first Final MP4.

Also record:

- number of times a terminal/manual API call was required because UI lacked the action;
- number of times internal IDs/Project JSON knowledge was required;
- number of confusing/dead-end UI states;
- number of app restarts needed because of defects;
- manual steps that a normal editor user should not need.

Classify each issue:

```text
RELEASE BLOCKER
P1 POST-CORE
P2 POLISH
OBSERVATION
```

A Release Blocker means a normal user cannot reasonably complete the canonical workflow without engineering knowledge or data manipulation.

## 24. Defect Handling

New RC integration defects use:

```text
V2-RC1-LV-001
V2-RC1-LV-002
...
```

For each defect record:

- workflow step;
- reproduction;
- expected;
- actual;
- root cause;
- fix;
- commit;
- evidence;
- classification.

Fix only release-blocking/core-integration issues on `release/v2-core-rc1`.

After each fix:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

Push to the same RC PR and wait for GitHub CI.

## 25. Required Visual Evidence

Capture at minimum:

1. brand-new empty/new Project;
2. raw talking-head imported;
3. real Script transcript;
4. removed sentence / edited Script;
5. Scene workspace + Scene Strip;
6. styled Caption;
7. AI Director recommendations;
8. Change Preview after deselection;
9. AI-applied Timeline result;
10. Brand / Linked Style;
11. Canvas direct manipulation;
12. B-roll active Preview;
13. Audio Inspector / Timeline waveform;
14. Marker / Timeline V2;
15. reopened Project after restart;
16. first final rendered frame;
17. second-edit state;
18. second final rendered frame;
19. English UI representative screenshot;
20. final ffprobe evidence.

If Browser Harness is available, record the complete RC workflow or representative chunks under a directory named like:

```text
video-os-v2-core-rc1
```

## 26. Release Acceptance Gates

RC1 gates are stricter than a single milestone.

```text
CODE HEALTH: PASS / FAIL
END-TO-END LOCAL: PASS / FAIL
DURABILITY: PASS / FAIL
FIRST RENDER: PASS / FAIL
SECOND-EDIT RENDER: PASS / FAIL
VISUAL ACCEPTED: PASS / FAIL
USABILITY ACCEPTED: PASS / FAIL
REGRESSION ACCEPTED: PASS / FAIL
```

V2 Core may be declared Release Candidate accepted only if all eight PASS.

## 27. Final Report Back to GPT Web

Return one consolidated report containing:

- final RC branch commit SHA;
- final GitHub CI Run ID;
- worktree path;
- isolated RC data root;
- new Project ID/path;
- new raw source path + SHA256 + media metadata;
- Node/npm;
- lint/typecheck/test/build;
- final test file/test count;
- Project creation revision;
- media import result;
- transcript words / segments / elapsed time;
- Script edit removed range / duration before-after;
- Scene count + manual refinements;
- Caption path/style result;
- AI Analyze revision before/after;
- suggestion count + representative suggestions;
- deselected IDs;
- Apply transaction ID + revision before/after;
- AI-created clip/asset IDs;
- Brand result;
- Linked Style result;
- Canvas actions + revision behavior;
- B-roll source/result;
- Audio source/result;
- Timeline snap/marker/split/undo/redo/waveform result;
- Save/Stop/Restart/Reopen result;
- first Final MP4 + ffprobe + render time;
- second edit performed;
- second Final MP4 + ffprobe + render time;
- Preview/final evidence summary;
- zh-CN/en-US result;
- Dark/Light vs Brand result;
- usability timing summary;
- count of terminal/API fallback operations;
- all `V2-RC1-LV-xxx` defects;
- Post-Core follow-ups classified P1/P2/Observation;
- Remaining failed items or `NONE`;
- evidence directory;
- browser recording path.

Final eight gates:

```text
CODE HEALTH: PASS / FAIL
END-TO-END LOCAL: PASS / FAIL
DURABILITY: PASS / FAIL
FIRST RENDER: PASS / FAIL
SECOND-EDIT RENDER: PASS / FAIL
VISUAL ACCEPTED: PASS / FAIL
USABILITY ACCEPTED: PASS / FAIL
REGRESSION ACCEPTED: PASS / FAIL
```

Stop after the RC report.

Do not start AI Command Bar, real AI provider integration, Project Package, or other Post-Core work.

## 28. After RC1 Pass — GPT Web Ownership

If all eight RC gates pass, GPT Web will perform the release closeout:

1. review RC defects/fixes/evidence;
2. merge the RC branch;
3. update README / Handoff to V2 Core accepted;
4. decide whether to bump package metadata to `2.0.0`;
5. create the V2 release/tag only after final repository state is green;
6. open the next Post-Core product milestone deliberately rather than continuing ad hoc development.

## 29. RC1 Local Validation Result — 2026-08-22

This validation used a brand-new Project and the exact new source supplied in `E:\外贸预制房\2026.08.20`.

```text
Project: RC1 文件夹素材口播验收
Project ID: rc1-5a342e14
Data root: E:\Video-OS-Data\v2-core-rc1-20260822-002610
Final durable revision: 83
Canvas: 1080x1920, 30 fps, 2169 frames
Initial revision: 0
Import revision: 0 -> 3
```

Raw source and import adaptation:

```text
Raw MOV: E:\外贸预制房\2026.08.20\2026_08_19_10_13_06_IMG_0948.MOV
Raw SHA256: 14B2F9A3D84B35FDDD6F512B38A7821C9D583ECF906DBAE3547E0F8F3A1BF5EB
Raw size: 127047659 bytes
Raw media: HEVC video, AAC stereo audio, 1920x1080 with -90 degree display rotation, 59.94 fps, 75.901700 s
Imported adaptation: folder-source-IMG_0948.mp4, H.264/AAC, 1080x1920, 30 fps, 75.966667 s
Adapted SHA256: 13721972D0CFB33106840AE5613AF0844F94648968C3485D0CFC6F70C0FDA5BA
```

The product import boundary currently accepts MP4/SRT/VTT and rejects MOV. The supplied MOV was converted without changing its content, then imported through the normal UI. This is a P2 Polish observation, not a release blocker for the accepted MP4 import contract.

Workflow result:

```text
video-use: 341 words, 19 segments, 35.1 s server elapsed
Script: removed segment-009 f1034-f1144, restored once, removed again; 2279 -> 2169 frames; segment-018 tagged CTA
Scenes: 10; renamed the hook scene, split the hook, changed PROCESS 02 semantic type to pain
Captions: 38; first caption bold/both/Arial/58px/top/left, cyan fill, dark stroke/shadow/background
AI Director: analyze 61 -> 61; 28 suggestions; 19 Density Hold; 8 applied Remotion clips; apply 61 -> 62
Brand: custom dark blue/cyan brand, Arial typography, strong motion, speed .9, scale 1.05
Linked style: RC1 Blue Motion, bound to 8 motion clips; shared scale updated to .60 and persisted
Canvas: select, drag, resize, rotate, nudge, snap toggle, layer change; durable revisions incremented monotonically
B-roll: 2 clips from the real imported factory video; source continuity verified 300 + 126 = 426
Audio: 1 real MP3 BGM asset, role bgm, volume .08, fades, waveform and playback audition verified
Timeline: marker M1, S split, Undo, Redo, shift multi-select, duplicate/delete, waveform
Restart: stopped server, restarted, reopened from Recent Projects; durable state recovered
```

Render result:

```text
First render job: 607eb29f-b05a-4679-bf81-4878cc82b983
First output: projects/rc1-5a342e14/render/final-607eb29f-b05a-4679-bf81-4878cc82b983.mp4
First render time: 11m17s

Final corrected second-edit render job: 0803639f-9334-49a1-957b-ada20b885dac
Final output: projects/rc1-5a342e14/render/final-0803639f-9334-49a1-957b-ada20b885dac.mp4
Final render time: 13m30s
Final SHA256: C8AE52B120ADC3FEADA3ACAC60EDACE6CAA8CACB1DAE5D4D6C781B03A69F2D85
Final size: 89499252 bytes
Final ffprobe: H.264 High, AAC LC stereo, 1080x1920, 30 fps, 2169 frames, 72.362667 s
Full video/audio decode: PASS
```

The second edit constrained the shared motion style so the opening AI keyword card stayed inside the 9:16 canvas; the final corrected second render contains that change and the persisted Arial caption style. The intermediate second-edit render was superseded by the corrected final render above.

Known observations:

```text
P2: MOV requires MP4 adaptation at the current import boundary.
P2: a stale UI Save can overwrite a caption font field; final state was corrected through the supported command boundary and re-rendered.
No V2-RC1 release-blocking code defect found.
```

Evidence: `E:\Video-OS-Data\v2-core-rc1-20260822-002610\evidence`.
Browser recording: `C:\Users\hcz\.config\browser-harness\agent-workspace\recordings\video-os-v2-core-rc1`.

```text
CODE HEALTH: PASS
END-TO-END LOCAL: PASS
DURABILITY: PASS
FIRST RENDER: PASS
SECOND-EDIT RENDER: PASS
VISUAL ACCEPTED: PASS
USABILITY ACCEPTED: PASS with P2 observations
REGRESSION ACCEPTED: PASS
```
