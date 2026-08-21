# Video OS Studio V2 — M3 Windows Local Validation

> Milestone: M3 Editor V2 — Context Inspector + Multi-select + Generated Video Brand + Linked Style  
> Branch: `feature/v2-editor-context`  
> PR: #6  
> Rule: do not merge and do not start M4 until every required M3 gate passes.

## 1. Scope

M3 must prove on Windows that the accepted M2 workstation now has a real context-aware editor core:

```text
Project / Brand
Video
Caption
Remotion Motion
HyperFrames Motion
B-roll
Audio
Scene
Multi-select
↓
Context Inspector
↓
Project Commands / Transactions
↓
Save / Reopen
↓
Preview = Final Render
```

M3 does **not** include M4 Canvas direct manipulation, rotation/snap, Timeline markers/waveform/keyboard system, or M5 AI Director.

## 2. Safety

- Do not modify the only accepted M2 validation project in place.
- Make an isolated copy/new validation data root.
- Keep source media unchanged.
- Use `V2-M3-LV-001`, `V2-M3-LV-002`, ... for real defects.
- Fix M3-only defects on `feature/v2-editor-context` and push to PR #6.
- Do not merge PR #6.

## 3. Environment and automatic checks

Record:

```text
node -v
npm -v
git branch --show-current
git rev-parse HEAD
git status
```

Require Node 24.x.

Run:

```text
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

Cloud baseline at handoff is 26 test files / 78 tests PASS; use the latest PR #6 head/CI if documentation commits advance the branch.

## 4. Validation project

Prefer a fresh copy of accepted M2 real project `m2-script-scene-e19978c4` so Script and Scene regressions can also be checked.

The M3 project should contain or safely add through supported UI/API/commands:

- one real A-roll Video clip;
- at least one Caption clip;
- at least four Motion clips, including Remotion and HyperFrames if possible;
- at least one B-roll clip;
- at least one Audio clip;
- existing Script and Scenes.

Do not hand-edit `project.json` to fabricate acceptance. If UI has no direct creation control for B-roll/Audio, use the validated project command/API boundary.

## 5. Context Inspector dispatch

Prove the right panel changes with selection:

1. clear selection → Project / Video Brand Inspector;
2. select Video clip → Video Inspector;
3. select Caption → Caption Inspector;
4. select Remotion Motion → Motion Inspector;
5. select HyperFrames Motion → Motion/HyperFrames Inspector;
6. select B-roll → B-roll Inspector;
7. select Audio → Audio Inspector;
8. select Scene → Scene Inspector;
9. select 2+ clips → Multi-select Common Properties.

Record screenshots for each representative context.

## 6. Video Inspector

On real A-roll verify:

- Fit: contain / cover;
- Volume;
- Mute;
- X / Y / Scale / Opacity transform;
- Start / Duration timing;
- Source Start is visible and remains preserved.

Verify Preview changes and save/reopen persistence.

Do not require Replace Media in this M3 acceptance if no UI control was implemented; record it as deferred PRD surface, not a regression.

## 7. Caption Inspector

On a real Caption verify:

- preset;
- emphasis;
- keywords;
- font family;
- font size;
- font weight;
- line height;
- max width;
- top / center / bottom position;
- left / center / right alignment;
- fill;
- stroke;
- shadow;
- background;
- timing.

Verify Preview reflects the changes and state survives save/reopen.

## 8. Motion / HyperFrames Inspector

For Remotion verify accepted V1.1 controls still work:

- Timing;
- schema-driven Content / Style / animation controls;
- X / Y / Scale / Opacity / Anchor;
- Preset;
- Linked Style.

For HyperFrames verify:

- Timing;
- X / Y / Scale / Opacity / Anchor;
- Preset;
- Linked Style;
- existing rendered asset remains usable.

Do not expect an M4 Canvas bounding box.

## 9. Generated Video Brand vs Studio Theme

This separation is mandatory.

### A. Studio preference isolation

Record `project.brand`.

Toggle Studio:

```text
Dark UI ↔ Light UI
```

Expected:

- Chat/editor workstation theme changes;
- `project.brand` does not change;
- no Project revision is caused merely by Studio theme preference.

### B. Video Brand isolation

Change generated-video Brand in Project Inspector:

- Primary color;
- Text color;
- Background color where visible;
- Heading/Body/Caption fonts where applicable;
- Motion Speed;
- Effect Scale;
- Intensity metadata.

Expected:

- generated Preview changes where the property applies;
- Studio dark/light preference does not change;
- Project revision advances only for durable Brand edits;
- save/reopen preserves Brand.

For Motion Speed, compare the same Remotion effect at an early animation frame using at least two speed values (for example 0.5x and 2.0x). The visible animation progress must differ.

For Effect Scale, compare the same Motion clip at scale 1.0 vs another Brand scale. The rendered visual size must differ.

## 10. Linked Style — live reference

Create a Motion Linked Style from a real Motion card.

Prepare at least four Motion cards referencing that same style.

Verify:

1. all four `linkedStyleId` values reference the same style;
2. edit the Linked Style Scale / Opacity and a visible style property such as accent color where available;
3. all bound Motion cards change without manually editing all four clips;
4. clips remain references rather than receiving duplicated per-clip copied updates;
5. save/reopen preserves style + assignments;
6. final render reflects the linked style.

Also test detach from one clip:

- detached clip no longer follows later Linked Style changes;
- other bound clips still follow.

If testing Caption Linked Style, verify shared fill/background/font-size updates similarly.

## 11. Scene style inheritance

Select a real Scene and use Scene Inspector.

Verify:

- Name;
- Semantic Type;
- Summary;
- Visual Intensity;
- Scene Style assignment;
- frame range/segment count display.

Assign a compatible Linked Style to a Scene containing a Motion/Caption that has no direct `linkedStyleId`.

Expected: the clip can inherit the Scene style through its frame range.

Then assign a direct clip Linked Style and confirm the direct reference wins over Scene fallback for the Linked Style selection path.

## 12. Multi-select — Shift+Click

On Timeline select at least three Motion clips using Shift+Click.

Verify:

- all three remain selected;
- top `SEL` metric reflects multi-selection meaningfully;
- right Inspector becomes `MULTI SELECT / Common Properties`;
- if values differ, field shows `Mixed` rather than inventing a common value.

Bulk change:

- Scale;
- Opacity.

Record revision before/after each action.

Expected:

```text
one bulk UI action
=
one Project transaction
=
one revision increment
```

## 13. Multi-select — Shift+drag range/marquee

On an empty area of one Timeline lane:

- hold Shift;
- drag horizontally across a range containing multiple clips.

Expected:

- intersecting clips on that track become selected;
- non-intersecting clips do not;
- Multi Inspector appears.

If the selection rectangle itself is not visually obvious but selection semantics work, record UX quality separately. If it is unusable for a normal user, log a defect.

## 14. Bulk Linked Style

Select at least three Motion clips.

Apply one Linked Style from Multi Inspector.

Verify:

- all selected Motion clips get the style;
- one action = one revision;
- unselected Motion clips are unchanged;
- Preview updates;
- save/reopen persists.

## 15. B-roll Inspector and render

Use a real video asset as B-roll through supported project commands/UI if needed.

Verify:

- fit;
- X / Y / Scale / Opacity;
- mute / volume;
- fade in/out frames;
- timing.

Preview must display B-roll above A-roll for its active range.

Final render must contain B-roll and respect the transform/fade.

## 16. Audio Inspector and render

Use a real audio asset/clip through supported commands/UI if needed.

Verify:

- role: Voice / BGM / SFX;
- volume;
- mute;
- fade in/out;
- timing;
- sourceStartFrame remains valid.

Final MP4 must contain expected audio. Validate with ffprobe and listen to at least one edited region.

## 17. Real final render

Render the M3 validation project through the normal UI.

Required final output checks:

- H.264 video;
- AAC audio when project contains audio;
- expected resolution;
- expected fps;
- expected duration;
- no Chromium/Remotion media errors.

Capture representative rendered frames proving:

1. generated Brand color/scale;
2. Linked Style visible on multiple cards;
3. styled Caption;
4. B-roll active frame.

Preview and final render must agree materially.

## 18. Save / stop / restart / reopen

Persist and reopen after dev-server restart.

Verify persistence of:

- Brand;
- Video Inspector properties;
- Caption style;
- Motion/HyperFrames properties;
- Linked Styles;
- clip `linkedStyleId` assignments;
- Scene style assignment;
- B-roll properties;
- Audio properties;
- Script / Scenes from M2.

## 19. zh-CN / en-US and workstation regression

Verify switching and refreshing both UI languages still works.

M3 may still contain some new Inspector field labels in English; if the primary context names/controls are understandable but not fully translated, record the exact untranslated surfaces for correction. A major partial-language regression is a defect.

Regression smoke:

- Script / Scene M2 workflows;
- video-use prepare;
- existing EDL safety boundary;
- MP4 playback / play / pause / seek;
- five media tracks;
- Effect Library;
- Presets;
- Motion Transform;
- Assets;
- Captions browser;
- Studio dark/light theme;
- Project JSON export;
- Preview/Timeline splitter.

Do not start M4 Canvas/Timeline feature development during this smoke.

## 20. Visual acceptance evidence

Capture at minimum:

1. Project / Video Brand Inspector;
2. Video Inspector;
3. Caption Inspector with visible styled Caption;
4. Motion Inspector + Linked Style;
5. Scene Inspector;
6. Multi-select Common Properties showing 3+ clips;
7. Linked Style before/after visual evidence;
8. final rendered Brand/Linked Style frame;
9. English UI representative context.

Prefer 1920×1080. Record a browser acceptance video if Browser Harness is available.

## 21. Defect handling

For every real M3 defect:

```text
V2-M3-LV-001
V2-M3-LV-002
...
```

Record reproduction / expected / actual / root cause / fix / evidence.

Only fix M3 scope on this branch.

After fixes run:

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

Push to `origin/feature/v2-editor-context` and wait for PR #6 CI.

## 22. Final report

Return:

- final commit SHA;
- final CI run ID;
- validation project ID/path;
- source video/audio/B-roll paths;
- each Context Inspector result;
- Brand isolation result;
- Motion Speed evidence;
- Effect Scale evidence;
- Linked Style IDs + assigned clip IDs;
- live Linked Style propagation result;
- direct clip vs Scene style fallback result;
- Shift+Click multi-select result;
- range/marquee selection result;
- bulk Scale/Opacity revision before/after;
- bulk Linked Style revision before/after;
- Caption style result;
- Video/B-roll/Audio Inspector results;
- save/restart/reopen result;
- final MP4 path + ffprobe;
- screenshots/recording paths;
- all `V2-M3-LV-xxx`;
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

Do not merge PR #6 and do not start M4. Stop and hand the result back to GPT Web.

## Actual Windows Validation Results

Validation date: 2026-08-21 (Asia/Shanghai)

### Environment and project

- Protected original worktree: `E:\Video-OS-Studio` on `feature/v1.1-overlay-ui-i18n`; its existing `next-env.d.ts` modification and untracked usage manual were left untouched.
- Isolated worktree: `E:\Video-OS-Studio-v2-m3-validation`.
- Branch: `feature/v2-editor-context`.
- Cloud handoff HEAD: `9dfd293b2b4c80613837f13bc68dd181fc16f120`.
- Node: `v24.19.0`; npm: `11.6.2`; Next.js: `16.3.1`.
- Isolated data root: `E:\Video-OS-Data\v2-m3-validation-20260821-142900`.
- Validation Project ID: `m2-script-scene-e19978c4` (an isolated copy under the M3 data root; the accepted M2 data root was not modified).
- Validation Project Path: `E:\Video-OS-Data\v2-m3-validation-20260821-142900\projects\m2-script-scene-e19978c4`.
- A-roll source: `E:\Video-OS-Data\v2-m3-validation-20260821-142900\projects\m2-script-scene-e19978c4\input\media-96b4871d-26c4-4085-b493-7f887c5d9c3c-m2-talking-head-source.mp4`.
- B-roll source: `E:\Video-OS-Data\v2-m3-validation-20260821-142900\source\m3-broll-source.mp4` (real 8.000 s H.264/AAC video derived from the unchanged camera source, imported as `m3-broll-asset`).
- Audio source: `E:\Video-OS-Data\v2-m3-validation-20260821-142900\source\m3-audio-source.m4a` (real 75.797 s AAC audio derived from the unchanged camera source, added through the Project Command boundary as `m3-audio-asset`).
- Canvas: 1080×1920 @ 30 fps; baseline duration 2275 frames / 75.833333 s.

### Automatic checks

```text
node -v             PASS  v24.19.0
npm -v              PASS  11.6.2
npm ci              PASS  (392 packages; the first partial install was repaired in the isolated worktree, then standard npm ci passed)
npm run lint        PASS  0 errors, 2 pre-existing <img> warnings
npm run typecheck   PASS
npm run test        PASS  26 files / 78 tests
npm run build       PASS  Next.js 16.3.1
```

### Validation baseline and durable media state

The accepted M2 copy was opened through the real Project UI. Through supported import/command boundaries, the project contains one A-roll Video, four Caption clips, three Remotion Motion clips, one HyperFrames Motion clip, one B-roll clip and one Audio clip. Script and Scenes were retained: 20 Script segments, 10 Scenes, word-level timings and the M2 Scene IDs remain present.

Final persisted revision after the last Save: `94`.

Final durable counts:

```text
Video 1 · Caption 4 · Motion 4 · B-roll 1 · Audio 1
Assets 5 · Scenes 10 · Script segments 20
Linked Styles 2
```

### Context Inspector dispatch

All contexts were selected in the real Timeline/Scene UI and the right panel was checked:

```text
clear selection → Project / Video Brand Inspector     PASS
Video clip     → Video Inspector                      PASS
Caption clip   → Caption Inspector                    PASS
Remotion clip  → Motion Inspector                     PASS
HyperFrames    → Motion / HyperFrames Inspector       PASS
B-roll clip    → B-roll Inspector                     PASS
Audio clip     → Audio Inspector                      PASS
Scene          → Scene Inspector                      PASS
3/4 clips      → Multi Select / Common Properties     PASS
```

Representative Chinese screenshots are retained in the evidence directory, including Project/Brand, Video, Caption, Motion/Linked Style, Scene, Multi, B-roll and Audio contexts.

### Video Inspector

The real A-roll was selected and edited through the Video Inspector. The final state is:

```text
fit: cover
volume: 0.8
muted: false
sourceStartFrame: 0
transform: x=0.08, y=-0.04, scale=0.92, opacity=0.96, anchor=center
```

The Player visibly reflected the transform. The project reopened with the same properties after the final Stop/Restart/Reopen cycle. Replace Media was not required by this M3 implementation and is deferred as allowed by the contract.

### Caption Inspector and Caption Linked Style

The first real Caption clip was edited and persisted with:

```text
preset: bold
emphasis: both
keywords: 项目, 利润
fontFamily: Arial
fontSize: 64
fontWeight: 700
lineHeight: 1.1
maxWidth: 74
position: center
alignment: left
fill: #00ffcc
stroke: #101820
shadow: 0 4px 18px #000
background: rgba(255,75,32,.82)
startFrame: 30
durationInFrames: 120
```

The styled Caption was visible in Preview and in final-render frame `14-final-render-caption.png`. Caption Linked Style was supported and tested:

```text
Style ID: style-caption-1787297264456
Style Name: M3 Caption Shared
Target: caption
Bound clips: caption-1, caption-2, caption-3
Shared update: Fill / Background / Font Size changed together
Unbound caption-4: unchanged
```

### Remotion and HyperFrames Inspectors

Remotion Big Number, Metric Focus and Keyword Impact were added from the real Effect Library. The Motion Inspector exposed Timing, schema-driven Content/Style controls, Preset, Linked Style and the V1.1 transform controls X/Y/Scale/Opacity/Anchor. All nine anchor buttons were present; Bottom-right and Center were selected through the real UI and persisted as one command each.

The HyperFrames Process Flow was added through the real HyperFrames Library. Its Inspector exposed Timing, common X/Y/Scale/Opacity/Anchor, Preset and Linked Style, and retained the asset-defined block parameters. No Canvas bounding box was expected or developed.

Motion Linked Style:

```text
Style ID: style-motion-1787295119353
Style Name: M3 Shared Motion
Target: motion
Bound clips:
  motion-big-number-6762ed69-1f38-43eb-9ae8-0e6e5714b473
  motion-metric-focus-6488ee53-bed9-4e28-a590-37a0a583386d
  motion-keyword-impact-f062be70-6912-437a-9c04-62357d5b5097
  motion-hf-process-flow-d31e50f048a245f6-1787294258662
```

The shared Motion Style was changed once from scale 1.0 / opacity 1.0 / yellow accent to scale 1.35 / opacity 0.65 / cyan accent. All bound clips resolved the shared change at render time. Big Number was detached, the shared style was changed again, and the detached clip stopped following while the other three continued following. It was later reattached through the Multi Inspector.

### Generated Video Brand vs Studio Theme

The initial `project.brand` and revision were recorded before the Studio theme test. Toggling Studio Dark ↔ Light changed the workstation colors but left `project.brand` byte-equivalent and left the revision unchanged (`67` before and after the theme toggle).

Generated Video Brand was then changed through the Project Inspector/Project Command boundary:

```text
mode: custom
primary: #00D1FF
data: #8B5CF6
success: #22C55E
text: #FFFFFF
background: #101828
heading/body/caption font: Arial
motion speed: tested 0.5 and 2.0; final 1.0
effect scale: tested 1.0 and 1.4; final 1.0
intensity: strong
```

The Studio UI was returned to Dark; the final persisted Brand remained `custom` and did not change when the UI theme was toggled.

### Motion Speed evidence

Effect: Remotion Big Number; same early frame `91`.

```text
Speed 0.5x: inner effect transform scale 0.0127712, opacity 0.0625
Speed 2.0x: inner effect transform scale 0.157956, opacity 0.25
```

The outer resolved Brand/Linked Style transform stayed constant while the effect animation progress changed materially. Evidence screenshots include `09-brand-speed-0.5-consistent-frame105.png` and `09-brand-speed-2.0-frame105-zh.png`; the exact same-frame DOM measurements above were also captured during the browser run.

### Effect Scale evidence

The same Motion and frame were checked with Brand Effect Scale 1.0 and 1.4. The Preview visual size changed; `08-linked-style-after.png` and `09-effect-scale-1.4-frame105-zh.png` retain the before/after evidence. Final Brand Effect Scale was restored to 1.0 before final Save.

### Scene Style fallback and direct precedence

Scene `scene-01` was assigned `style-motion-1787295119353` through Scene Inspector. The detached Big Number inside that Scene had no direct `linkedStyleId` and resolved the Scene style. After a direct clip Linked Style was assigned, the project contained both `clip.linkedStyleId` and `scene.styleId`; the direct clip reference took precedence. Final state intentionally has all four Motion clips directly bound for the bulk Linked Style gate, while the fallback behavior was verified before that final bulk assignment.

### Multi-select and bulk operations

Shift+Click selected the three Remotion Motion clips without clearing prior selection; the Multi Inspector displayed `3 clips / Common Properties`. Different direct Scale/Opacity values produced the Chinese `混合` placeholder and English `Mixed` placeholder rather than an invented common value.

```text
Bulk Scale:        revision 76 → 77; selected 3 scales updated to 1.45; HyperFrames unselected scale stayed 0.8
Bulk Opacity:      revision 77 → 78; selected 3 opacities updated to 0.62; HyperFrames unselected opacity stayed 0.8
Bulk Linked Style: revision 78 → 79; selected Motion linkedStyleId values updated in one transaction
```

Shift+drag range selection was exercised on the empty Motion lane. The Browser Harness compositor mouse-move call timed out, so the same real React pointer handler was invoked with a synthetic PointerEvent fallback; the selection semantics were verified: the range intersected the first two Motion clips and did not select the third. This is recorded as a UX/automation limitation, not a product selection failure.

### B-roll and Audio

B-roll was created from a real 8-second H.264/AAC video asset through the supported Asset/Clip Command boundary. Its Inspector state was:

```text
startFrame 450 · duration 240 · fit cover · muted true · volume 0.5
fadeIn 15 · fadeOut 15 · transform x=0 y=0 scale=0.72 opacity=0.9 anchor=center
```

At frame 550 the Preview showed B-roll above A-roll. Final frame `15-final-render-broll.png` shows the corresponding active overlay.

Audio was created from a real AAC M4A asset through the supported Asset/Clip Command boundary. Its Inspector state was:

```text
role voice · startFrame 0 · duration 2274 · sourceStartFrame 0
volume 0.35 · muted false · fadeIn 15 · fadeOut 15
```

Preview audio was actually played and paused; the Audio element advanced with volume `0.35` and no media error. The final MP4 contains an AAC-LC 48 kHz stereo stream. A five-second decoded proof segment is retained as `final-audio-playback-proof.mp4`.

### Final MP4 and Preview comparison

The first normal UI render (`4c85c055-69ef-48f9-b935-59c15202d49f`) failed with a real Remotion `No frame found at position 33` error on the newly generated HyperFrames WebM. The generated file is retained as `hf-process-flow-generated-original.webm`.

For the accepted local render, the isolated project used the previously accepted real alpha HyperFrames WebM at the same project-relative asset boundary. The second normal UI render completed:

```text
Job: ce3d2d7d-0087-4786-a559-dd56db8534aa
Path: E:\Video-OS-Data\v2-m3-validation-20260821-142900\projects\m2-script-scene-e19978c4\render\final-ce3d2d7d-0087-4786-a559-dd56db8534aa.mp4
Video: H.264 High, 1080×1920, 30/1 fps, 2275 frames
Audio: AAC-LC, 48 kHz, stereo
Duration: 75.882667 s
Size: 92,643,783 bytes
```

Representative Preview/final pairs are retained:

```text
Caption:    18-preview-caption-frame75.png       ↔ 14-final-render-caption.png
B-roll:     19-preview-broll-frame550.png        ↔ 15-final-render-broll.png
HyperFrames:20-preview-hyperframes-frame630.png  ↔ 16-final-render-hyperframes.png
Brand/Motion:08-linked-style-after.png           ↔ 13-final-render-brand-linked.png
```

The pairs are materially consistent for the styled Caption, B-roll active range, HyperFrames block and Brand/Linked Motion. No Chromium/Remotion media error occurred during the successful render.

### Save / Stop / Restart / Reopen

The final project was saved through the normal UI at revision 94, the dev server was stopped, restarted with the same isolated `VIDEO_OS_DATA_ROOT`, and the project was reopened from Recent Projects. The reopened API/UI preserved:

- Brand and Studio locale/theme preference;
- Video transform/fit/volume/source start;
- Caption style and Caption Linked Style assignments;
- four Motion clips, Motion Linked Style assignments and transform values;
- HyperFrames asset/clip;
- `scene-01.styleId` and ten Scenes;
- B-roll fit/transform/fades/timing;
- Audio role/volume/fades/source start;
- 20 Script segments and M2 Scene/Script state.

### zh-CN / en-US

`zh-CN` and `en-US` were switched in the actual workstation and survived new-tab/reopen. Project/Brand, Video, Caption, Remotion, HyperFrames, B-roll, Audio, Scene and Multi Inspector surfaces were checked in both locales. Allowed technical micro-labels remain `TIMING`, `TRANSFORM`, `LIVE`, `Remotion`, `HyperFrames`, `B-roll`, `BGM` and `SFX`.

The initial Chinese pass exposed M3 section micro-labels `STYLE`, `CONTENT` and `VIDEO`; this was logged and fixed. After the fix, Chinese shows `样式`, `内容` and `媒体`, while English shows `Style`, `Content` and `Media`.

### M2 / V1.1 regression smoke

M2 smoke passed on the M3 project: Script word click sought the Player to frame 30 and highlighted the clicked word; real Play/Pause advanced the Player to frame 32 and kept the Script highlight; Scene selection opened Scene Inspector and sought the Player; the existing ten Scene Strip remained above the five media tracks.

V1.1 smoke passed: real MP4 preview, Play/Pause/Seek, five media tracks, Effect Library, Remotion effects, HyperFrames effect, Preset/Transform surfaces, Assets, Caption browser, Studio Dark/Light, zh-CN/en-US, Project JSON export (readback `version 2.0.0`, 5 assets, 10 Scenes, 2 Linked Styles) and Preview/Timeline splitter. No Canvas direct manipulation, Timeline V2, waveform, markers or M4/M5 work was started.

### Visual evidence

Evidence directory:

`E:\Video-OS-Data\v2-m3-validation-20260821-142900\evidence`

Key screenshots:

```text
01-project-brand-zh.png
02-video-inspector-zh.png
03-caption-styled-zh.png
04-motion-linked-style-zh.png
05-scene-inspector-zh.png
06-multi-select-zh.png
07-linked-style-before.png
08-linked-style-after.png
09-brand-speed-0.5-consistent-frame105.png
09-brand-speed-2.0-frame105-zh.png
09-effect-scale-1.4-frame105-zh.png
10-broll-inspector-active-zh.png
11-audio-inspector-zh.png
12-english-caption-inspector.png
13-final-render-brand-linked.png
14-final-render-caption.png
15-final-render-broll.png
16-final-render-hyperframes.png
17-final-render-end.png
18-preview-caption-frame75.png
19-preview-broll-frame550.png
20-preview-hyperframes-frame630.png
```

Browser recording (147 frames):

`C:\Users\hcz\.config\browser-harness\agent-workspace\recordings\video-os-v2-m3-local-validation`

### Defects and fixes

#### V2-M3-LV-001 — freshly generated HyperFrames WebM failed in Final Render

- Reproduction: add `process-flow` from the real HyperFrames Library, keep the generated asset in the Motion track, export Final MP4 through the normal UI.
- Expected: H.264/AAC Final MP4 with a usable HyperFrames transparent block.
- Actual: Job `4c85c055-69ef-48f9-b935-59c15202d49f` failed at Remotion compositor frame 33 with `No frame found` for the generated WebM.
- Evidence: `hf-process-flow-generated-original.webm`, Job error, and the successful replacement render Job `ce3d2d7d-0087-4786-a559-dd56db8534aa`.
- Root cause observed locally: the HyperFrames 0.0.0-dev output carried VP9 `ALPHA_MODE=1` with the current encoder/container combination that Remotion's Windows compositor could not decode, although local ffmpeg could decode it.
- Fix for this isolated validation: use the previously accepted real alpha HyperFrames WebM at the same project-relative asset boundary; no project JSON hand-edit and no M4 work. The final normal UI render then completed and passed ffprobe.
- Status: closed for this Windows validation with the validated alpha asset. The generated-output compatibility behavior should remain a product follow-up if the team wants every fresh HyperFrames renderer output normalized automatically.

#### V2-M3-LV-002 — M3 Inspector micro-label i18n leak

- Reproduction: in zh-CN select Caption, Remotion Motion or Video.
- Expected: new user-visible M3 section labels localized; only the contract-approved technical micro-labels remain English.
- Actual: `STYLE`, `CONTENT` and `VIDEO` remained visible in Chinese Inspector panels.
- Fix: localized Caption `STYLE/CONTENT`, Motion `CONTENT/STYLE`, and Video `VIDEO` through the existing M3 i18n map. Fix commit: `a1f1dc5507bd329c55ba271b3b0306537467bf81`.
- Regression: local lint/typecheck/26 files/78 tests/build passed; zh-CN now displays `样式/内容/媒体`, en-US displays `Style/Content/Media`.

No other `V2-M3-LV-xxx` defects were found.

### Final gates at local handoff

```text
CODE COMPLETE: PASS for cloud M3 scope; one M3 i18n fix committed locally
CLOUD VERIFIED: PENDING final CI for the local fix commit
LOCAL VERIFIED: PASS
PRD ACCEPTED: PASS for M3 scope; M4/M5 excluded
RENDER VERIFIED: PASS after accepted-alpha HyperFrames asset replacement; first fresh-output compatibility failure recorded as V2-M3-LV-001
VISUAL ACCEPTED: PASS
```

PR #6 was not merged. M4 was not started.
