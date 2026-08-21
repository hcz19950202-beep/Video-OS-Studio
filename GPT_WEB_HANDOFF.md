# Video OS Studio — GPT Web / Local Codex Handoff

> Updated: 2026-08-21 (Asia/Shanghai)  
> Current execution handoff: **V2 M5 AI Director Windows Local Validation**.

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

Accepted M4 merge commit on `main`:

```text
70277477c961c1401f79adeb52a5aebb84308d3c
```

M4 passed Windows local/render/visual acceptance before merge.

Current active milestone:

```text
M5 — AI Director V2
branch: feature/v2-ai-director
PR: #8 (Draft)
```

Do not restart earlier milestones.
Do not merge PR #8 before Windows M5 acceptance.
Do not start AI Command Bar or other post-Core work.

## 2. Non-negotiable Architecture

- Node 24 baseline.
- Project version `2.0.0`.
- Canonical internal time = frames.
- Durable Project changes use validated Commands / Transactions / bounded services.
- AI does not directly mutate Project JSON.
- M5 canonical flow is:

```text
Analyze → Suggest → Explain → Preview Diff → User Confirm → Command Transaction
```

- Analyze / Preview are read-only with respect to Project revision.
- One AI Apply = one Project Command Transaction = one durable revision.
- One AI Apply must be one Undo / Redo unit.
- Remotion remains Master Composition.
- HyperFrames / video-use / FFmpeg remain behind adapters/services.
- repository code and `VIDEO_OS_DATA_ROOT` remain separate.
- Studio Theme/Locale remain distinct from Generated Video Brand.
- preserve M1–M4 and V1.1 accepted behavior.
- `REUSE > MODIFY > CREATE`.

Authoritative PRD:

```text
Video_OS_Studio_V2_AI_Native_Editor_Master_PRD_Rev2.md
```

Product abstraction:

```text
Words → Meaning → Scenes → Visual Decisions → Clips → Render
```

## 3. M5 Scope Boundary

M5 delivers AI Director V2 only:

- Scene-aware visual suggestions;
- Spoken Text grounding;
- semantic type;
- Recommendation;
- Reason;
- Confidence;
- Alternatives;
- density-aware restraint;
- Change Preview;
- per-suggestion deselection;
- one transactional Apply;
- Undo / Redo as one batch;
- idempotent re-apply protection.

M5 does **not** include:

- AI Command Bar;
- multi-language content tracks;
- Project Package ZIP;
- more Effect Packs;
- unrelated HyperFrames renderer rewrite.

## 4. Current Director Source

At this handoff the active runtime source is:

```text
source = rules
```

This is a deterministic Scene-aware Director adapter.

The V2 schema and adapter boundary support:

```text
rules | provider
```

but a cloud LLM provider is not being falsely claimed as connected in M5.

M5 acceptance proves the product contract—Scene semantics, explainability, density discipline, reviewable Diff, transactional Apply—not a specific AI vendor.

## 5. M5 Cloud Implementation

### VisualSuggestion V2

`VisualPlan` is now version 2 and contains:

```text
sceneId
startFrame / endFrame
spokenText
semanticType
recommendation
reason
confidence
alternatives
densityBefore
```

Supported recommendation engine values:

```text
remotion
hyperframes
broll
none
```

### Scene-aware planning priority

Director decision priority is intentionally:

```text
strong factual evidence (percentage / concrete number)
→ explicit Scene meaning
→ ambiguous content keywords
→ density guard
```

Examples covered by tests:

- 90% inside a PROCESS Scene still recommends Metric Focus;
- PROCESS Scene meaning outranks incidental `shipping/logistics` wording when there is no stronger numeric fact.

### Density Guard

Director reads current/proposed:

- Motion card count;
- cards/min;
- peak concurrency;
- average/minimum visual-event gap;
- Scene intensity.

Default minimum start-gap policy:

```text
high intensity    3s
medium intensity  5s
low intensity     7s
```

Guard also blocks additions when projected concurrency/density is excessive.

A blocked but meaningful moment is returned as an explicit visible recommendation:

```text
engine = none
reason = Density guard: ...
```

with the original content-driven recommendation retained as an Alternative.

### Change Preview

Pure deterministic Diff shows:

```text
Add
Remove
Shorten
Style Changes
Density before → after
Peak before → after
Card count before → after
```

Current rules may legitimately produce zero Remove / Shorten / Style changes; those categories remain visible in the UI contract.

Deselecting a suggestion recalculates pending Add and density without mutating Project state.

### Transactional Apply

Selected recommendations are prepared first.

For Remotion:

- effect schema/defaults are validated before transaction.

For HyperFrames:

```text
prepare asset externally
→ do not mutate Project
→ if preparation succeeds, add asset + clip commands to the final transaction
```

If preparation fails before the transaction, Project revision does not advance.

All selected Project mutations are committed through one:

```text
ProjectCommandTransaction
```

Therefore:

```text
one Apply = +1 Project revision
```

regardless of selected suggestion count.

### Deterministic IDs / idempotency

AI-applied clips use:

```text
visual-<suggestionId>
```

Re-applying an already-applied identical plan does not add duplicates or create another revision.

### Undo / Redo

The AI Director panel pushes the whole successful Apply into the accepted M4 History Store as one History entry.

Expected:

```text
Ctrl+Z once
→ undo whole AI batch

Ctrl+Shift+Z once
→ redo whole AI batch
```

Validated snapshot restore continues to advance revision rather than rewinding it.

### Review UI

AI Director V2 UI is grouped by Scene and shows for every suggestion:

- semantic type;
- Recommendation;
- Spoken Text;
- frame range;
- Reason;
- Confidence;
- Alternatives;
- Density Hold status;
- applied status.

Users can deselect actionable suggestions before Apply.

## 6. Cloud Verification

Final M5 code baseline before handoff documentation:

```text
8ae8f713d72f4767c849a5661e4d7533890b41e9
```

Successful GitHub Actions run:

```text
32490394830 — SUCCESS
```

Checks:

```text
Install dependencies  PASS
Lint                  PASS — 0 errors, 2 pre-existing <img> warnings
Typecheck              PASS
Unit tests             PASS — 28 files / 93 tests
Production build       PASS — Next.js 16.3.1
```

M5 unit coverage includes:

- Scene-aware explainable suggestions;
- strong numeric evidence vs Scene template priority;
- explicit Density Hold / `none` recommendation;
- reviewed-selection Change Preview;
- density before → after;
- mixed Remotion + HyperFrames Apply = one revision;
- idempotent second Apply = no new revision.

This handoff/docs commit advances the branch. Local Codex must use the **newest PR #8 head whose CI is successful**, not an older SHA.

## 7. Windows Validation Contract

Authoritative file:

```text
LOCAL_VALIDATION_V2_M5.md
```

Use an isolated worktree and data root.

Accepted M4 source project to copy, never modify in place:

```text
Project ID:
m2-script-scene-e19978c4

Source path:
E:\Video-OS-Data\v2-m4-validation-20260821-181100\projects\m2-script-scene-e19978c4
```

Recommended worktree:

```text
E:\Video-OS-Studio-v2-m5-validation
```

Recommended isolated root:

```text
E:\Video-OS-Data\v2-m5-validation-YYYYMMDD-HHMMSS
```

Copy the complete project directory so all project-relative assets remain valid.

## 8. Local Codex Ownership Now

Local Codex owns **M5 Windows acceptance and M5-only fixes** on:

```text
feature/v2-ai-director
PR #8
```

Required proof is fully defined in `LOCAL_VALIDATION_V2_M5.md`.

Critical acceptance points:

- Analyze does not change Project revision;
- real Scene-grouped suggestions;
- real Spoken Text / Reason / Confidence / Alternatives;
- Density Hold / restraint;
- Change Preview is read-only;
- deselection changes Diff before Apply;
- selected Apply = exactly +1 revision;
- deselected and `none` suggestions do not apply;
- idempotent re-apply creates no duplicate/revision;
- Ctrl+Z once undoes whole AI batch;
- Ctrl+Shift+Z once restores whole batch;
- Re-analyze reflects new density;
- Save/Stop/Restart/Reopen;
- real final H.264/AAC render;
- zh-CN/en-US;
- focused M2/M3/M4 regression.

Local defects:

```text
V2-M5-LV-001
V2-M5-LV-002
...
```

Fix only M5 defects on the same branch and rerun:

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

## 9. Known Existing Follow-up

`V2-M3-LV-001` remains a separate known issue:

fresh HyperFrames VP9 alpha output can fail Windows Remotion composition with `No frame found`.

M5 HyperFrames preparation must not be confused with rewriting that renderer path.

For final M5 render, the accepted Windows-compatible HyperFrames path may be used if needed, while still validating M5 transactional behavior separately.

## 10. Current Gates

```text
CODE COMPLETE: PASS for M5 cloud scope
CLOUD VERIFIED: PASS for code baseline; final handoff-doc head must also be green
LOCAL VERIFIED: PENDING Local Codex
PRD ACCEPTED: PENDING Local Codex
RENDER VERIFIED: PENDING real Windows render
VISUAL ACCEPTED: PENDING browser acceptance
```

PR #8 remains Draft and unmerged.

## 11. Phase Ownership

```text
GPT Web M5 development        ✅
Cloud code CI                 ✅ 28 files / 93 tests
Final handoff-doc CI          ← verify newest head
Windows Local Codex M5        ← NEXT
M5-only local fixes to PR #8
Final CI
GPT Web review
Merge PR #8 only after all six M5 gates PASS
Post-Core work starts only after M5 acceptance
```
