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
