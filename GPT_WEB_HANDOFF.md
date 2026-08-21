# Video OS Studio — GPT Web / Local Codex Handoff

> Updated: 2026-08-22 (Asia/Shanghai)  
> Current execution handoff: **V2 Core Final Acceptance / RC1**.

## 1. Current Truth

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

Accepted V2 Core main commit after M5:

```text
63403b64cb8cf6a67d64b47402c7d034db77b166
```

All M1–M5 milestone gates passed cloud + Windows acceptance before merge.

Current active phase:

```text
V2 Core Final Acceptance / RC1
branch: release/v2-core-rc1
```

This is not a new feature milestone.

Do not start AI Command Bar, real AI provider integration, Project Package, multi-language content tracks, or other Post-Core development during RC1.

## 2. Why RC1 Exists

Milestone acceptance proved each subsystem independently.

RC1 must prove one complete product journey on a **new Project created from a new real raw talking-head video**:

```text
New Project
↓
Import raw talking-head MP4
↓
video-use / transcript
↓
Script editing
↓
Scenes
↓
Captions
↓
AI Director Analyze / Review / Apply
↓
Brand / Linked Style
↓
Canvas refinement
↓
Timeline refinement
↓
B-roll / Audio
↓
Final Render
↓
Stop / Restart / Reopen
↓
Second edit
↓
Second Final Render
```

The acceptance question is now:

> Can a normal user complete a publishable video without knowing Remotion, HyperFrames, EDL, internal frame math, or Project JSON?

## 3. Authoritative Contract

Local Codex must read and execute:

```text
LOCAL_VALIDATION_V2_CORE_RC1.md
```

This contract supersedes milestone-specific validation instructions for the RC run.

The V2 Master PRD remains:

```text
Video_OS_Studio_V2_AI_Native_Editor_Master_PRD_Rev2.md
```

Product abstraction:

```text
Words → Meaning → Scenes → Visual Decisions → Clips → Render
```

## 4. Non-negotiable Architecture

- Node 24 baseline.
- Project version `2.0.0`.
- canonical internal time = frames.
- durable Project changes use validated Commands / Transactions / bounded services.
- AI does not hand-edit Project JSON.
- Remotion remains Master Composition.
- HyperFrames / video-use / FFmpeg remain behind adapters/services.
- repository code and runtime media remain separate via `VIDEO_OS_DATA_ROOT`.
- Studio Theme / locale remain separate from Generated Video Brand.
- `REUSE > MODIFY > CREATE`.

RC fixes must preserve these rules.

## 5. Accepted V2 Core Capabilities Under RC

### Project / durability

- Project Schema 2.0;
- V1→V2 migration;
- Commands / Transactions;
- bounded History / Undo / Redo;
- atomic save / reopen.

### Text-native editing

- word-level Script;
- Script↔Player synchronization;
- Remove / Restore sentence;
- canonical A-roll rebuild;
- Scene system / Scene Strip.

### Editor Core

- Context Inspector;
- Generated Video Brand;
- Motion/Caption Linked Styles;
- multi-select;
- B-roll / Audio.

### Canvas / Timeline

- direct select / drag / resize / rotate;
- live Preview during gesture;
- snap / guides;
- layers;
- Markers;
- source-aware Split;
- real FFmpeg waveform;
- shortcuts;
- Undo / Redo.

### AI Director

- Scene-grounded recommendations;
- Spoken Text / Reason / Confidence / Alternatives;
- Density Hold;
- Change Preview;
- per-suggestion deselection;
- one Apply = one Project Transaction;
- whole-batch Undo/Redo;
- idempotent re-apply.

Current Director runtime source remains honestly:

```text
rules
```

Provider integration is Post-Core.

## 6. RC Isolation

Recommended worktree:

```text
E:\Video-OS-Studio-v2-core-rc1
```

Recommended isolated data root:

```text
E:\Video-OS-Data\v2-core-rc1-YYYYMMDD-HHMMSS
```

RC1 must create a new Project from a new raw source video.

Do **not** copy `m2-script-scene-e19978c4` and call that end-to-end acceptance.

Do not modify accepted M1–M5 validation roots.

## 7. Source Video Rule

Use a real talking-head MP4/MOV that was not the previous M2–M5 validation talking-head source.

Preferred:

- 45–120 seconds;
- real speech;
- coherent business/topic narrative;
- numbers/proof/process/CTA when naturally available.

Local Codex may search safe local media locations such as:

```text
E:\Video-OS-Data\raw
configured VIDEO_OS_DATA_ROOT
other user media folders
```

If no suitable new source exists, stop and ask the user to provide one. Do not silently reuse the old acceptance source.

## 8. RC Defect Ownership

Cross-milestone release defects use:

```text
V2-RC1-LV-001
V2-RC1-LV-002
...
```

Fix only release-blocking/core integration defects on:

```text
release/v2-core-rc1
```

After every fix run:

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

Push fixes to the same RC branch/PR.

Do not reopen M1–M5 feature branches.

## 9. Usability Is a Release Gate

RC1 must record not only technical PASS/FAIL but also user effort:

- time to import/playable media;
- time to transcript;
- time to Script cut;
- time to Scenes/Caption;
- time to first AI Director plan;
- time to first usable visual edit;
- time to first Final MP4;
- number of terminal/API fallbacks caused by missing UI;
- internal IDs/Project JSON knowledge required;
- confusing/dead-end product states.

Classify findings:

```text
RELEASE BLOCKER
P1 POST-CORE
P2 POLISH
OBSERVATION
```

A normal user needing engineering knowledge to complete the canonical journey is a release blocker.

## 10. RC Final Gates

RC1 uses eight product-level gates:

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

All eight must PASS before GPT Web declares V2 Core accepted.

## 11. After RC Pass

GPT Web owns release closeout after Local Codex returns the complete RC report:

1. review all RC evidence and fixes;
2. verify final GitHub CI;
3. merge the RC branch;
4. update README/Handoff to V2 Core accepted;
5. decide and apply package version `2.0.0` release metadata;
6. create a release/tag only after final repository state is green;
7. then open one deliberate Post-Core milestone.

Until then:

```text
V2 Core development        COMPLETE
RC1 end-to-end acceptance  NEXT
Post-Core development      NOT STARTED
```
