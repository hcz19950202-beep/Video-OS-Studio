# Video OS Studio — GPT Web / Local Codex Handoff

> Updated: 2026-08-21 (Asia/Shanghai)  
> This is the current execution handoff.

## 1. Current truth

Repository: `hcz19950202-beep/Video-OS-Studio`

Accepted and merged:

- V1 core PR #1
- V1.1 workstation UI/i18n PR #2
- V2 M0 baseline PR #3
- V2 M1 Project 2.0/migration PR #4
- V2 M2 Script + Scene PR #5

Accepted M2 merge commit on `main`:

`80070a792cc2cffb9fd5e71c5f74431a6b142d73`

M2 passed real Windows Script/Scene/render/visual acceptance before merge.

Current active milestone:

```text
M3 — Editor V2
branch: feature/v2-editor-context
PR: #6
```

Do not restart earlier milestones.

## 2. Non-negotiable architecture

- Node 24 baseline.
- Project version `2.0.0`.
- Internal timing is canonical frames.
- Durable Project changes use validated Commands / Transactions / bounded services.
- UI/AI do not mutate Project JSON directly.
- Remotion remains master compositor.
- HyperFrames / video-use / FFmpeg remain behind adapters.
- repository code and `VIDEO_OS_DATA_ROOT` user/media data stay separate.
- Studio UI theme/locale are local preferences, distinct from generated-video Brand.
- preserve V1.1 and accepted M1/M2 behavior.
- `REUSE > MODIFY > CREATE`.

## 3. Product abstraction

Authoritative PRD:

`Video_OS_Studio_V2_AI_Native_Editor_Master_PRD_Rev2.md`

```text
Words → Meaning → Scenes → Visual Decisions → Clips → Render
```

## 4. Accepted M2 baseline

M2 now provides:

- real video-use word timestamps persisted into editable Script;
- reversible Script sentence cut/restore;
- canonical A-roll rebuild;
- confirmed EDL / Script baseline safety;
- Script ↔ Player synchronization;
- semantic tags;
- auto Scene generation;
- Scene selection / rename / type / split / merge;
- Scene Strip above five media tracks;
- save/restart/reopen persistence;
- zh-CN/en-US workstation.

M3 must extend this baseline, not rebuild it.

## 5. M3 cloud implementation

PR #6 implements:

### Context Inspector

Right panel now dispatches by active selection:

```text
Nothing     → Project / Generated Video Brand
Video       → Video Inspector
Caption     → Caption Inspector
Motion      → Remotion/HyperFrames Motion Inspector
B-roll      → B-roll Inspector
Audio       → Audio Inspector
Scene       → Scene Inspector
Multi       → Common Properties
```

### Contextual media properties

Video:

- Fit
- Volume / Mute
- Timing
- X / Y / Scale / Opacity transform

Caption:

- existing preset/emphasis/keywords
- font family / size / weight
- line height
- max width
- position / alignment
- fill / stroke / shadow / background
- timing
- Linked Style

B-roll:

- Fit
- Volume / Mute
- Fade In / Out
- Timing
- transform

Audio:

- Voice / BGM / SFX role
- Volume / Mute
- Fade In / Out
- Timing

All new fields are additive/optional so accepted V1/M2 clips remain loadable without mass rewriting historical project data.

### Generated Video Brand

Generated-video Brand is separate from Studio UI theme.

Master Composition now consumes Brand for:

- video background/text/body font;
- caption font/text fallback;
- Motion primary accent fallback;
- global Effect Scale;
- Remotion Motion Speed.

The four built-in Remotion Effects receive `motionSpeed` and scale their animation frame progression by Brand speed.

### Linked Style

Motion and Caption clips can reference `linkedStyleId`.

Resolver order for selecting a linked style reference:

```text
direct clip linkedStyleId
→ Scene styleId fallback
→ no linked style
```

A Linked Style is a live reference: updating the shared style changes all bound clips at render time instead of copying edits into every clip.

### Multi-select

Existing V2 Selection Store is now exposed in Timeline:

- Shift+Click toggles clip selection;
- Shift+drag an empty Timeline lane selects clips intersecting that frame range on that track;
- 2+ selected clips enter Multi Inspector;
- Motion Common Properties support Scale / Opacity / Linked Style;
- bulk edit uses the existing `/transactions` API so one user bulk action = one Project revision.

### Rendering

Master Composition now also renders accepted contextual B-roll and Audio properties so Inspector state is not fake UI.

## 6. Cloud tests

New M3 unit coverage proves:

- Video/B-roll/Audio contextual property persistence;
- live Motion Linked Style resolution;
- generated Brand Effect Scale;
- Caption Brand + Linked Style resolution;
- bulk multi-edit = one revision.

The latest successful cloud run before final handoff documentation passed:

- lint;
- typecheck;
- 26 test files / 78 tests;
- production build.

Because the validation/handoff documentation commits advance the branch, Local Codex must use the newest PR #6 head and newest successful CI as the real handoff baseline.

## 7. Current gates

```text
CODE COMPLETE: PASS for M3 cloud scope
CLOUD VERIFIED: PASS before final docs; newest head must also be green
LOCAL VERIFIED: PENDING
PRD ACCEPTED: PENDING
RENDER VERIFIED: PENDING
VISUAL ACCEPTED: PENDING
```

Do not merge PR #6.

## 8. Local Codex ownership now

Local Codex owns `feature/v2-editor-context` after final cloud CI.

Read and execute:

`LOCAL_VALIDATION_V2_M3.md`

Required real-Windows proof includes:

- every Context Inspector type;
- Studio theme vs generated-video Brand isolation;
- Brand primary/font/Motion Speed/Effect Scale in Preview + final render;
- live Linked Style across at least four Motion cards;
- Scene style fallback;
- Shift+Click and Shift+drag multi-select;
- bulk Scale/Opacity/Linked Style = one revision each;
- real Caption styling;
- real B-roll;
- real Audio;
- save/restart/reopen;
- M2/V1.1 regression;
- real H.264/AAC final render;
- visual screenshots/recording.

Local defects use:

```text
V2-M3-LV-001
V2-M3-LV-002
...
```

Fix only M3 defects on the same branch, push to PR #6, and rerun full CI.

## 9. Phase ownership

```text
GPT Web M3 development ✅
→ GitHub CI ✅
→ Local Codex M3 validation ← NEXT
→ local fixes to PR #6
→ final CI
→ GPT Web review
→ merge only after all M3 gates PASS
```

Do not start M4 while M3 local validation is in progress.

## 10. After accepted M3

Only after PR #6 passes all local/render/visual gates and is merged:

```text
M4 — Canvas + Timeline V2
```

M4 includes direct Canvas manipulation, rotation/snap, Timeline markers/shortcuts/waveform and related interaction upgrades. AI Director remains M5.
