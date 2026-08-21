# Video OS Studio V2 — M5 Windows Local Validation

> Milestone: M5 AI Director V2  
> Branch: `feature/v2-ai-director`  
> PR: #8  
> Rule: do not merge PR #8 and do not start post-Core work until every required M5 gate passes.

## 1. M5 Product Contract

M5 validates the AI-native orchestration layer built on top of the already accepted Script / Scene / Editor / Canvas / Timeline architecture.

Canonical flow:

```text
Analyze
↓
Suggest
↓
Explain
↓
Preview Diff
↓
User Review / Deselect
↓
Confirm
↓
One Project Command Transaction
↓
Undo / Redo
↓
Final Render
```

The Director must **not** mutate Project state during Analyze, Suggest, Explain, or Preview Diff.

M5 includes:

- Scene-aware visual planning;
- Spoken Text grounding;
- semantic visual suggestion type;
- Recommendation;
- Reason;
- Confidence;
- Alternatives;
- density-aware restraint;
- explicit `none` / Density Hold recommendations;
- Change Preview;
- per-suggestion deselection;
- one Apply = one Project Transaction = one durable revision;
- one Undo / Redo for the whole AI batch;
- idempotent re-apply protection.

M5 does **not** include:

- AI Command Bar;
- Project Package ZIP import/export;
- multi-language content tracks;
- new Effect Pack development;
- AI Avatar / Lip Sync / Text-to-video;
- unrelated HyperFrames renderer replacement.

## 2. Important Source Truth

Current M5 runtime source at cloud handoff is the deterministic Scene-aware `rules` adapter.

The schema and adapter boundary support `rules | provider`, but this milestone must not pretend that a cloud LLM provider is already connected if it is not.

The acceptance target is the AI Director product contract:

```text
Scene-aware recommendation quality
+ explainability
+ density restraint
+ reviewable Diff
+ safe transactional Apply
```

not a particular model vendor.

## 3. Safety

- Do not mutate the accepted M4 validation root in place.
- Use an isolated worktree and isolated `VIDEO_OS_DATA_ROOT`.
- Copy the complete accepted M4 project directory.
- Do not hand-edit `project.json` to fabricate M5 states.
- Do not fabricate Scene / Caption / Motion state outside supported UI / API / Project Command boundaries.
- Analyze / Preview must not change Project revision.
- Apply must use the M5 transactional path.
- Fix M5-only defects on `feature/v2-ai-director`.
- Use `V2-M5-LV-001`, `V2-M5-LV-002`, ... for new local defects.
- Do not merge PR #8.
- Do not start AI Command Bar or other post-Core work.

Known existing follow-up:

`V2-M3-LV-001` — fresh HyperFrames VP9 alpha output can fail Windows Remotion composition with `No frame found`. This is not automatically an M5 regression. Do not rewrite the HyperFrames renderer inside M5 unless M5 demonstrably breaks the previously accepted path.

## 4. Environment

Recommended worktree:

```powershell
cd E:\Video-OS-Studio
git fetch origin
git worktree add E:\Video-OS-Studio-v2-m5-validation origin/feature/v2-ai-director
cd E:\Video-OS-Studio-v2-m5-validation
```

If it already exists, update it safely rather than force-overwriting unrelated work.

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

```powershell
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

Cloud code baseline before final handoff docs:

```text
8ae8f713d72f4767c849a5661e4d7533890b41e9
```

Cloud baseline at that commit:

```text
Install dependencies  PASS
Lint                  PASS — 0 errors, two pre-existing <img> warnings
Typecheck              PASS
Unit tests             PASS — 28 files / 93 tests
Production build       PASS
```

Documentation commits may advance the branch. Validate the newest PR #8 head whose CI succeeds.

## 5. Isolated M5 Data Root

Use the accepted M4 project as source content, but copy it into a new M5 root.

Accepted M4 project:

```text
Project ID:
m2-script-scene-e19978c4

Source path:
E:\Video-OS-Data\v2-m4-validation-20260821-181100\projects\m2-script-scene-e19978c4
```

Create a new root, for example:

```text
E:\Video-OS-Data\v2-m5-validation-YYYYMMDD-HHMMSS
```

Copy the **complete** M4 project directory to:

```text
<NEW_ROOT>\projects\m2-script-scene-e19978c4
```

Then:

```powershell
$env:VIDEO_OS_DATA_ROOT="<NEW_ROOT>"
npm run dev
```

Open the project from the real Studio UI.

## 6. Baseline Regression Before Director Work

Before M5 actions, confirm the accepted M4 state still exists:

- real A-roll;
- styled Captions;
- Remotion Motion;
- accepted HyperFrames Motion path;
- B-roll;
- Audio;
- Script;
- 10 Scenes;
- Generated Video Brand;
- Motion / Caption Linked Styles;
- Canvas transform / rotation / layer state;
- Timeline Marker / Split structure;
- real waveform cache;
- zh-CN / en-US;
- Dark / Light preferences.

Record initial Project revision.

## 7. Locate AI Director V2

Open the Effects/AI tool area and locate:

```text
AI DIRECTOR · M5
AI Director V2 / AI 导演 V2
```

Expected:

- Analyze Scenes / 分析场景;
- Review Recommendations;
- Change Preview;
- Apply Selected;
- visible plan source (`Rules engine` for current handoff);
- bilingual UI.

Capture a full-workstation screenshot before Analyze.

## 8. Analyze Must Be Read-only

Record Project revision before Analyze.

Click Analyze Scenes.

Expected:

- plan generation succeeds using real timed Captions + Scenes;
- Project revision remains **exactly unchanged**;
- no Motion/B-roll clips are added during Analyze;
- plan artifact may be persisted under project edit/cache-style runtime files without changing durable Project state.

Verify:

```text
<PROJECT_PATH>\edit\ai-director-plan.json
```

Open it and confirm:

```text
version = 2
projectId = m2-script-scene-e19978c4
source = rules (for current handoff)
suggestions = array
densityBefore = object
```

Record revision before / after Analyze.

## 9. Scene-aware Suggestion Grounding

Use real generated suggestions.

For at least three suggestions from different Scenes when available, record:

- suggestion ID;
- Scene ID / Scene name / semantic type;
- startFrame / endFrame;
- Spoken Text;
- semanticType;
- recommendation engine;
- effectId if present;
- reason;
- confidence;
- alternatives.

Expected:

- suggestion belongs to the Scene containing its frame range;
- Spoken Text is grounded in the real Script/Caption content;
- Reason refers to the content/Scene/density logic rather than generic filler;
- Confidence is visible;
- at least one Alternative is visible for actionable recommendations where defined.

Important priority checks:

```text
strong factual evidence (percentage / concrete number)
> Scene template
> ambiguous keywords
> density guard
```

Examples to verify if naturally present:

- a percentage inside a PROCESS Scene should still be allowed to recommend Metric Focus;
- PROCESS Scene meaning should outrank an incidental shipping/logistics word when there is no stronger numeric fact.

Do not rewrite project content solely to force these examples if the real project does not contain them; cloud unit tests already cover the deterministic rule. Local validation should focus on real content behavior.

## 10. Density Guard / Restraint

AI Director must not recommend one animation for every sentence.

Inspect:

- current Motion cards/min;
- peak concurrency;
- Scene intensity;
- visual event spacing;
- Density Hold / `none` suggestions.

Expected:

- current density appears in Change Preview;
- strong content can still be marked as `none` when adding another visual would over-edit the Scene;
- Density Hold recommendation is visible, explained, and non-actionable by default.

If the accepted M4 project naturally produces at least one Density Hold, use it.

If it does not, create a safe density scenario in the **isolated M5 project only** using supported UI/API/Project Command actions (for example adding/moving disposable Motion clips), then Re-analyze and prove Density Hold appears.

Do not hand-edit Project JSON.

Record at least one Density Hold suggestion if feasible.

## 11. Alternatives and Explainability

Expand at least three recommendation detail panels.

Verify each shows:

```text
Reason
Confidence
Alternatives
```

Alternatives may include:

- another Remotion effect;
- HyperFrames;
- B-roll;
- none.

Expected:

- alternatives are explanatory options only;
- selecting/deselecting the primary recommendation is explicit;
- alternatives do not silently mutate Project state.

## 12. Change Preview Is Read-only

Before any Apply, record Project revision.

Observe Change Preview:

```text
Add
Remove
Shorten
Style
Motion density before → after
Peak concurrency before → after
Card count before → after
```

Current M5 implementation may legitimately show zero for Remove / Shorten / Style when the generated plan only proposes additions. Those categories must still be visible.

Expected:

- Preview accurately reflects currently selected actionable suggestions;
- Project revision remains unchanged while reviewing Preview;
- no clips/assets are durably added solely from Preview.

Optional API parity check:

POST the same plan + selected IDs to:

```text
/api/projects/<projectId>/visual-plan/preview
```

and confirm server Diff matches the UI/pure-client Diff for Add counts and density.

## 13. Deselect Suggestions Before Apply

Start with multiple actionable selected suggestions when available.

Record:

```text
selected actionable count
Add count
Density before → after
Peak before → after
```

Deselect at least one actionable suggestion.

Expected:

- selected count decreases;
- Add count decreases when that suggestion was pending;
- densityAfter recalculates;
- deselected suggestion remains visible for review;
- Project revision remains unchanged;
- no durable clip is created.

Capture before/after Change Preview screenshots.

## 14. First Apply — One Transaction / One Revision

Choose a reviewed set containing at least two actionable suggestions when real content permits.

Prefer a mix that includes:

- at least one Remotion suggestion;
- one additional suggestion from another Scene.

If a HyperFrames actionable suggestion is safely available, include it to exercise mixed-engine preparation. If the known Windows fresh-alpha compatibility path makes that unsafe for final render, you may validate HyperFrames transaction behavior separately and use a Remotion-only reviewed set for the final render state.

Record immediately before Apply:

- Project revision;
- selected suggestion IDs;
- selected recommendation engines/effects;
- deselected suggestion IDs;
- pending Add count;
- density before/after.

Click Apply Selected once.

Expected:

```text
revision after Apply = revision before Apply + 1
```

regardless of how many selected suggestions are added.

Also verify:

- one transaction ID is shown/returned;
- every selected actionable suggestion in Diff materializes as the corresponding clip/asset path;
- deselected suggestions do not materialize;
- Density Hold / `none` suggestions do not materialize;
- no partial Project mutation occurs if preparation fails before the transaction.

For Remotion:

- durable Motion clip ID uses deterministic `visual-<suggestionId>`;
- effect and timing match suggestion.

For HyperFrames if applied:

- external asset is prepared first;
- asset metadata and Motion clip enter Project in the same final transaction;
- entire AI Apply still creates only one Project revision.

## 15. Idempotent Re-apply

Without changing the plan or creating new pending selections, attempt to apply the same already-applied suggestion set again if the UI/API allows it.

Expected:

- no duplicate `visual-<suggestionId>` clips;
- no second durable revision for already-applied identical suggestions;
- API result uses `transactionId = null` / empty `appliedIds` when there is nothing new to apply.

If UI disables already-applied suggestions, verify idempotency through the existing Apply API using the same plan and selected IDs.

## 16. One Undo Removes the Whole AI Batch

After a successful multi-suggestion Apply, record:

- applied clip IDs;
- revision;
- Motion card count.

Press:

```text
Ctrl+Z
```

once.

Expected:

- the **entire** AI Apply batch is undone in one action;
- all clips/assets introduced only by that transaction are removed from Project state as represented by the restored snapshot;
- Project ID is unchanged;
- revision advances through validated restore; it does not rewind;
- one Undo is enough; multiple Undos must not be required for one AI Apply.

Then press:

```text
Ctrl+Shift+Z
```

once.

Expected:

- the whole AI batch returns in one action;
- Project revision advances again;
- final state matches the applied batch.

Record exact revision sequence.

## 17. Redo Branch Invalidation

After Undo, make one new normal edit through a supported Project mutation path.

Expected:

- obsolete Redo branch is cleared;
- attempting Redo does not restore the old AI batch over the new branch.

Restore/prepare a sensible final accepted state afterward.

## 18. Analyze / Re-analyze After Apply

With AI-applied Motion clips now present, Re-analyze.

Expected:

- densityBefore reflects the new Motion state;
- already-applied deterministic suggestion IDs are not offered as pending Add changes in Diff;
- Analyze still does not mutate Project revision;
- density guard may become more conservative because the Timeline is now denser.

Record before/after density metrics.

## 19. Save / Stop / Restart / Reopen

Save final reviewed AI-applied state.

Stop dev server.

Restart using the same isolated M5 root.

Open the project from Recent Projects.

Verify durable recovery of:

- AI-applied Motion clips;
- HyperFrames asset/clip if kept in final state;
- deterministic `visual-<suggestionId>` IDs;
- existing M4 Canvas transforms/rotation/layers;
- Script;
- Scenes;
- Brand;
- Linked Styles;
- Markers;
- split source continuity;
- Captions;
- B-roll;
- Audio.

Client Undo/Redo history itself does not need to survive restart. Durable Project state does.

## 20. Final Render

Render the final reviewed M5 project through normal Studio UI.

Required:

- H.264;
- AAC when project contains audio;
- 1080×1920;
- 30 fps;
- expected frame count / duration;
- no accepted-path regression in existing media.

Use ffprobe and retain output.

Capture Preview ↔ Final pairs proving at least:

1. one AI-applied Remotion recommendation;
2. another accepted AI-applied visual from a different Scene when available;
3. existing M3/M4 Caption/Brand/Linked Style visual remains intact;
4. M4 transformed/layered B-roll remains intact.

If a newly prepared HyperFrames VP9 alpha clip hits the known `V2-M3-LV-001` compositor issue:

- do not silently rewrite the renderer;
- record the known follow-up;
- use the accepted Windows-compatible HyperFrames path or a final reviewed set that does not depend on the fresh problematic output;
- M5 must still render a valid final MP4 proving the Director’s accepted Remotion/other safe recommendations.

## 21. zh-CN / en-US

Verify AI Director in both locales.

Primary M5 UI should be understandable in both:

- AI Director V2 / AI 导演 V2;
- Analyze / Re-analyze;
- Spoken Text;
- Reason;
- Confidence;
- Alternatives;
- Density Hold;
- Change Preview;
- Add / Remove / Shorten / Style;
- Apply Selected;
- one Apply = one Undo concept.

Refresh and verify locale persistence.

Dark / Light remains Studio UI only and must not mutate Generated Video Brand.

## 22. Focused M2 / M3 / M4 Regression

Do not rerun every historical acceptance item, but verify the main accepted path remains usable:

- Script word → Player Seek;
- Script editing basic boundary;
- Scene Strip + Scene Inspector;
- Context Inspector;
- Brand;
- Motion / Caption Linked Style;
- Canvas select/drag/rotation smoke;
- Timeline snap/marker/shortcuts smoke;
- waveform visible;
- Video/B-roll/Audio split state preserved;
- five media tracks;
- Effect / HyperFrames libraries;
- Assets;
- Project JSON export;
- zh-CN / en-US;
- Dark / Light.

## 23. Defect Handling

For every real M5 defect:

```text
V2-M5-LV-001
V2-M5-LV-002
...
```

Record:

- reproduction;
- expected;
- actual;
- root cause;
- fix;
- commit;
- evidence.

After every M5 product fix run:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

Push only M5-scope fixes to:

```text
origin/feature/v2-ai-director
```

Wait for PR #8 latest CI to succeed.

Do not merge PR #8.

## 24. Visual Evidence

Capture at minimum:

1. full workstation with AI Director V2;
2. real Scene-grouped recommendations;
3. one expanded Reason / Confidence / Alternatives panel;
4. Density Hold / `none` recommendation if available;
5. Change Preview before deselection;
6. Change Preview after deselection;
7. Apply transaction / resulting Timeline clips;
8. revision proof for one Apply = +1;
9. Undo whole batch result;
10. Redo whole batch result;
11. Re-analyze density after Apply;
12. English AI Director UI;
13. final Preview with AI-applied visual;
14. corresponding final-render frame;
15. final ffprobe evidence.

Prefer 1920×1080 workstation screenshots and record browser acceptance video if Browser Harness is available.

## 25. Final Report Back to GPT Web

Return:

- Final Commit SHA;
- Final GitHub CI Run ID;
- validation worktree path;
- isolated M5 `VIDEO_OS_DATA_ROOT`;
- Validation Project ID/path;
- Node/npm;
- lint/typecheck/test/build;
- final test file/test count;
- initial Project revision;
- Analyze revision before/after;
- plan artifact path + version/source/suggestion count;
- at least three real suggestion records (Scene / spoken text / recommendation / reason / confidence / alternatives);
- Density Hold result;
- initial density metrics;
- Change Preview before deselection;
- deselected suggestion IDs;
- Change Preview after deselection;
- Apply selected IDs;
- Apply transaction ID;
- Apply revision before/after;
- created clip/asset IDs;
- proof deselected/none suggestions were not applied;
- idempotent re-apply result;
- Undo/Redo revision sequence and whole-batch behavior;
- Redo-branch invalidation result;
- Re-analyze density result;
- Save/Stop/Restart/Reopen result;
- zh-CN/en-US result;
- Dark/Light vs Brand result;
- M2/M3/M4 regression smoke;
- Final MP4 path;
- ffprobe;
- Preview/Final comparison;
- evidence directory;
- browser recording path;
- all `V2-M5-LV-xxx` defects;
- Remaining failed items or `NONE`.

Final gates:

```text
CODE COMPLETE: PASS / FAIL
CLOUD VERIFIED: PASS / FAIL
LOCAL VERIFIED: PASS / FAIL
PRD ACCEPTED: PASS / FAIL
RENDER VERIFIED: PASS / FAIL
VISUAL ACCEPTED: PASS / FAIL
```

Stop after the report.

Do not merge PR #8.
Do not start AI Command Bar or post-Core work.
