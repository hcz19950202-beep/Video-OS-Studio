# Video OS Studio — GPT Web / Local Codex Handoff

> Updated: 2026-08-21 (Asia/Shanghai)  
> This is the current execution handoff. It supersedes old V1/Phase-0 branch instructions.

## 1. Current truth

Repository: `hcz19950202-beep/Video-OS-Studio`

Accepted/merged:

- V1 core PR #1 — MERGED
- V1.1 workstation UI/i18n PR #2 — MERGED
- V2 M0 baseline PR #3 — MERGED
- V2 M1 Project 2.0/migration PR #4 — MERGED

V2 M1 merge commit on `main`:

`cbed17c179c8fb6ace4ba35301f6be17aa232704`

M1 passed real Windows migration/browser/render acceptance before merge.

Current active milestone:

```text
M2 — Text-native Editing
branch: feature/v2-text-editing
PR: #5
```

Do not restart V1 or M1.

## 2. Non-negotiable architecture

- Node 24 baseline.
- Durable Project version is `2.0.0`.
- Internal timing is canonical frames; external seconds only at adapters.
- UI/AI do not mutate Project JSON directly.
- Durable changes use validated Project Commands / transactions / bounded services.
- Remotion is master compositor.
- HyperFrames, video-use and FFmpeg remain behind adapters.
- repository code and `VIDEO_OS_DATA_ROOT` user/media data stay separate.
- project paths remain project-relative POSIX paths.
- Studio UI theme/locale are preferences, not generated-video Brand state.
- preserve all accepted V1.1 Preview/Timeline/Effect/Render behavior.
- `REUSE > MODIFY > CREATE`.

## 3. V2 product abstraction

Authoritative PRD:

`Video_OS_Studio_V2_AI_Native_Editor_Master_PRD_Rev2.md`

Product direction:

```text
Words
↓
Meaning
↓
Scenes
↓
Visual Decisions
↓
Clips
↓
Render
```

## 4. Accepted M1 foundation

Project V2 already contains:

- Script / Transcript Word schema
- Scene schema
- Marker schema
- generated-video Brand schema
- Linked Style schema
- Content Language schema
- V1 → V2 migration
- multi-context Selection foundation
- Project Command Transaction / History foundation

Do not redesign these in M2.

## 5. M2 cloud implementation

Current branch `feature/v2-text-editing` implements:

### Script source model

`project.script` now contains stable `baseSourceRanges` plus transcript segments.

This exists so delete/restore is reversible without restoring footage that a confirmed EDL intentionally removed.

`lib/script/model.ts` provides:

- video source-range extraction/merge/subtraction
- real video-use word seconds → frame-based Script
- Script sentence grouping
- source-frame ↔ output-timeline-frame mapping
- Script segment timeline ranges

### video-use → Script

`VideoUseService.prepare()` now persists a real editable Script from video-use word timestamps.

Confirmed EDL application:

- updates the Script source baseline to the EDL ranges;
- filters Script words outside the EDL;
- refuses a new EDL after Script cuts already exist;
- refuses EDL changes after Scene design begins.

### Reversible spoken-content cuts

`lib/script/editing.ts` rebuilds the canonical Video Track from the Script baseline in one transaction.

A Script sentence can be:

```text
active → removed → active
```

Delete/restore is deliberately refused after timing-dependent downstream design exists:

- Scene
- Caption
- Motion
- B-roll
- Audio

This avoids silently corrupting downstream timing.

### Script Editor UI

- Script left workspace
- segment/word counts
- word click → Player seek
- Player frame → current-word highlight
- show/hide removed
- Remove Sentence / Restore Sentence
- semantic tags: Keep / Motion / B-roll / Quote / CTA
- zh-CN / en-US labels

### Scene System

- automatic semantic Scene generation from active Script
- Hook/Pain/Solution/Reframe/Proof/Process/Comparison/CTA/Custom types
- Scene name/type editing
- Scene selection → Player seek
- Scene split at Script segment boundary
- merge with next Scene
- Script `sceneId` assignments updated atomically
- Scene Strip above the existing five media tracks
- Scene is semantic metadata, **not a sixth media track**

### Existing workstation reused

M2 extends the V1.1 shell:

```text
Script / Scenes / Assets / Effects / Captions / Project
```

Preview, Effect Library, Motion Inspector and base Timeline remain reused rather than rebuilt.

Right-side Scene Inspector is intentionally **not** part of M2; it belongs to M3.

## 6. Cloud verification

PR #5 latest cloud-success run before handoff documentation:

`32443336571`

Results:

- install PASS
- lint PASS — 0 errors, two existing `<img>` warnings only
- typecheck PASS
- tests PASS — **25 files / 74 tests**
- production build PASS

Cloud CI caught and closed during M2 development:

1. Script default/test fixtures missing new `baseSourceRanges`;
2. old migration assertion not expecting `baseSourceRanges: []`;
3. Chinese CTA classification missing natural phrase `发给我们`;
4. video-use Prepare did not previously have a regression proving Script persistence — regression added.

After the documentation commits, use the newest PR #5 head/CI as the actual handoff baseline.

## 7. Current gates

```text
CODE COMPLETE: PASS for M2 cloud scope
CLOUD VERIFIED: PASS before final docs; newest head must also be green
LOCAL VERIFIED: PENDING
PRD ACCEPTED: PENDING
RENDER VERIFIED: PENDING
VISUAL ACCEPTED: PENDING
```

Do not merge PR #5 yet.

## 8. Local Codex ownership now

Local Codex should now own this branch until M2 validation returns.

Read and execute:

`LOCAL_VALIDATION_V2_M2.md`

Required real-Windows proof includes:

- real talking-head MP4
- real video-use Transcribe + Pack
- populated Script
- Script ↔ Player sync
- real sentence remove
- shorter A-roll/final MP4
- sentence restore
- downstream timing guard
- confirmed EDL baseline safety
- real Scene generation
- Scene Strip
- rename/type/split/merge
- save/restart/reopen
- V1.1 regression smoke
- bilingual UI screenshots

Local defects use:

```text
V2-M2-LV-001
V2-M2-LV-002
...
```

Fix M2-only defects on the same branch and push back to PR #5. Rerun full CI.

## 9. Phase ownership rule

Do not let GPT Web and Local Codex concurrently modify the M2 branch.

```text
GPT Web development ✅
→ Cloud CI ✅
→ Local Codex validation ← NOW
→ local fixes to same PR
→ final CI
→ GPT Web review
→ merge only after all M2 gates PASS
```

Do not start M3 during M2 local validation.

## 10. Next milestone after accepted M2

Only after PR #5 is accepted and merged:

```text
M3 — Editor V2
```

M3 scope:

- context-aware Inspector for Video / Caption / Motion / HyperFrames / B-roll / Audio / Scene
- multi-select common properties
- generated-video Brand UI/inheritance
- Linked Styles

Canvas direct manipulation and Timeline V2 remain M4. AI Director remains M5.
