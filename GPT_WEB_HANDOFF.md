# Video OS Studio — GPT Web / Local Codex Handoff

> Updated: 2026-08-22 (Asia/Shanghai)  
> Current execution handoff: **V2.0.0 release closeout**.

## 1. Current truth

Repository:

```text
hcz19950202-beep/Video-OS-Studio
```

Accepted and merged:

- V1 core PR #1
- V1.1 workstation UI/i18n PR #2
- V2 M0 baseline PR #3
- V2 M1 Project 2.0/migration PR #4
- V2 M2 Script + Scene PR #5
- V2 M3 Editor Core PR #6
- V2 M4 Canvas + Timeline V2 PR #7
- V2 M5 AI Director V2 PR #8
- V2 Core Final Acceptance / RC1 PR #9

Accepted RC1 merge commit on `main`:

```text
d1f45777d8e70f366f665a4dae7ba534096dda9e
```

All milestone gates and all eight RC1 product gates passed.

Current release-closeout branch:

```text
release/v2.0.0
```

Do not add product features on this branch.

## 2. V2.0 Core status

V2 Core is accepted.

Canonical product path:

```text
New Project
→ Import
→ video-use transcript
→ Script editing
→ Scenes
→ Captions
→ AI Director
→ Brand / Linked Style
→ Canvas
→ Timeline
→ B-roll / Audio
→ Final Render
→ Restart / Reopen
→ Second Edit
→ Second Final Render
```

RC1 proved this flow using a brand-new real Project and new real talking-head source, not a copied milestone fixture.

## 3. Accepted architecture

- Node 24 baseline.
- Project version `2.0.0`.
- canonical internal time = frames.
- durable Project changes use validated Commands / Transactions / bounded services.
- Project JSON remains source of truth.
- AI does not hand-edit Project JSON.
- Remotion remains Master Composition.
- HyperFrames / video-use / FFmpeg remain behind adapters/services.
- repository code and runtime media stay separate through `VIDEO_OS_DATA_ROOT`.
- Studio Theme / locale remain separate from Generated Video Brand.
- `REUSE > MODIFY > CREATE`.

## 4. Accepted V2 Core capabilities

### Project / durability

- Schema 2.0
- V1→V2 migration
- Commands / Transactions
- atomic save / reopen
- Undo / Redo

### Text-native editing

- word-level Script
- Script ↔ Player synchronization
- Remove / Restore
- canonical A-roll rebuild
- semantic tags
- Scenes / Scene Strip

### Editor Core

- Context Inspector
- Generated Video Brand
- Motion / Caption Linked Styles
- multi-select
- B-roll / Audio

### Canvas / Timeline

- direct drag / resize / rotate
- live Preview during gesture
- snap / guides
- layer ordering
- Markers
- source-aware Split
- real FFmpeg waveform
- shortcuts
- Undo / Redo

### AI Director

- Scene-grounded suggestions
- Spoken Text / Reason / Confidence / Alternatives
- Density Hold
- Change Preview
- per-suggestion review/deselection
- one Apply = one Project Transaction
- whole-batch Undo / Redo
- idempotent re-apply

Current Director runtime source remains:

```text
rules
```

A real AI provider is Post-Core and must be introduced as a separate milestone.

## 5. RC1 acceptance summary

Accepted new-project RC:

```text
Project ID: rc1-5a342e14
Final revision: 83
```

Coverage included:

- raw talking-head import path
- video-use: 341 words / 19 segments
- Script cut: 2279 → 2169 frames
- 10 Scenes
- 38 Captions
- AI Director: 28 suggestions / 19 Density Hold / 8 applied visuals
- custom Brand
- Linked Style across 8 Motion clips
- Canvas direct manipulation
- real B-roll with split continuity
- real BGM + waveform
- Timeline V2 controls
- Save / Stop / Restart / Recent Project reopen
- first Final MP4
- second edit after reopen
- second Final MP4

Final corrected output passed:

```text
H.264 High
AAC LC stereo
1080×1920
30 fps
2169 frames
~72.36 s
```

All eight RC gates:

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

## 6. Known non-blocking follow-ups

P2 polish:

1. MOV is not accepted by the current Studio import boundary; RC adapted the source to MP4 before UI import.
2. RC observed one stale UI Save overwriting a Caption font field. Final state was repaired through the supported command boundary and re-rendered. This should be investigated post-release without blocking V2.0.

These are not release blockers.

## 7. Release closeout now

Release branch:

```text
release/v2.0.0
```

Release-closeout work only:

- package version metadata → `2.0.0`;
- synchronize `package-lock.json` through npm, not hand edits;
- README / Handoff truth;
- `RELEASE_NOTES_V2.0.0.md`;
- full lint/typecheck/test/build;
- merge release branch;
- create `v2.0.0` tag/release only after final main is green.

No post-Core feature may enter this branch.

## 8. Next Post-Core decision

Do not automatically continue development after release.

Recommended priority order to decide explicitly after V2.0 is tagged:

1. real AI Provider for AI Director;
2. AI Command Bar;
3. Project Package / portability;
4. multi-language content tracks;
5. additional effect packs.

The next milestone should be opened deliberately with a new PRD/branch.
