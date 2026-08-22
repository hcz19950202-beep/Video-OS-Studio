# Video OS Studio V2.1 — UI Redesign Acceptance Contract

> Branch: `feature/v2.1-ai-first-ui`
> Base: accepted `v2.0.0`
> Scope: UI-1 through UI-8 only
> Rule: preserve V2.0 product semantics and render pipeline.

## 1. Global invariants

Every UI phase must prove:

- existing V2.0 Project opens without destructive migration;
- durable edits still go through Project Commands / Transactions;
- workspace/theme/locale/panel-size changes do not increment Project revision;
- Viewer / Timeline / Inspector selection remain synchronized;
- Script / Scene / AI Director / Brand / Linked Style semantics remain intact;
- final render path remains valid;
- no competitor code/assets/branding are copied.

## 2. Required environments

Cloud:

```text
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

Interaction-heavy phases additionally require Windows local browser validation.

Use isolated worktree/data roots for local acceptance.

## 3. UI-1 — Shell / Workspaces

Validate:

- Top Bar simplified;
- 48px icon rail placeholder/rail shell;
- Content / Viewer / Inspector / Timeline resizable layout;
- four official workspaces: Edit / AI / Script / Motion;
- panel min/max widths/heights respected;
- collapse/restore;
- layout persistence after refresh;
- Reset Workspace;
- Project revision unchanged across all layout operations;
- 1366×768 usable;
- 1920×1080 usable.

Evidence:

- screenshots of four workspaces;
- revision before/after layout operations;
- persisted local preference state.

## 4. UI-2 — Rail / Content Panels

Validate all accepted V2.0 capabilities remain reachable through:

```text
Script
Scenes
AI
Media
Captions
Effects
Brand
Project
```

Validate:

- rail tooltips;
- active state;
- Media `Assets / Transcript / Library` group;
- no duplicated project state;
- empty states;
- Import reachable from Media;
- JSON export still reachable from Project/Advanced;
- theme/locale reachable from settings.

## 5. UI-3 — Viewer / Inspector

Validate:

- Viewer remains visually central;
- transport/timecode/fit/fullscreen usable;
- Canvas mode remains functional;
- Video / Caption / Remotion / HyperFrames / B-roll / Audio / Scene / Multi / Project inspector contexts all remain reachable;
- Inspector section navigation does not lose fields;
- Canvas select/drag/resize/rotate/snap/layer preserved;
- Canvas ↔ Inspector round trip preserved;
- one representative Preview ↔ Render smoke.

## 6. UI-4 — Timeline redesign

Validate:

- Scene Strip remains above Timeline;
- five track types remain clear;
- waveform remains real;
- markers remain usable;
- snap remains usable;
- split source continuity remains valid;
- Shift multi-select remains valid;
- global shortcut input guards remain valid;
- Undo/Redo revision semantics unchanged.

No Timeline engine rewrite is accepted merely for visual redesign.

## 7. UI-5 — AI Workspace / Composer

Validate AI Workspace with real Project content.

References must resolve safely for supported types:

```text
Scene
Script segment / transcript selection
Clip
Asset
Current time
Canvas-selected clip
```

Validate:

- opening AI Workspace preserves selection;
- references render as chips/tokens;
- actual AI Director state is visible;
- no fake tool-call states;
- Analyze does not change revision;
- recommendation cards show Scene / Spoken Text / Reason / Confidence / Alternatives;
- deselection updates Change Preview without Project mutation;
- Apply Selected is one transaction;
- one Undo removes whole AI batch;
- errors expose retry/recovery where current backend supports it;
- zh-CN/en-US.

## 8. UI-6 — Script / Scenes

Script:

- text → Player seek;
- Player → current highlight;
- Remove / Restore visually explicit;
- semantic chips visible;
- Ask AI adds a stable reference;
- SCRIPT workspace expands text area;
- source continuity unchanged.

Scenes:

- cards show number/name/semantic/time/summary;
- density/intensity/status shown when data exists;
- click → Viewer/Timeline seek;
- Scene Inspector opens;
- Ask AI adds Scene reference;
- Scene Strip stays synchronized.

## 9. UI-7 — Home / Scenario Starter

Validate:

- recent projects;
- blank project;
- talking-head ad starter;
- educational starter;
- product ad starter;
- long-to-short starter;
- motion starter;
- starter may choose workspace/default prompt/settings but must not create hidden durable content edits;
- blank project advanced settings remain available;
- Project Schema remains 2.0.0 unless separately amended.

## 10. UI-8 — Polish / Persistence / i18n

Validate:

- every primary new string in zh-CN/en-US;
- locale persists;
- Dark/Light persists and remains separate from Brand;
- workspace persists;
- selected/active/focus states clear;
- icon-only actions have tooltips;
- input fields suppress destructive global shortcuts;
- empty/loading/error states are deliberate;
- no unusable panel overlap at 1366×768;
- no excessive orange CTA competition;
- no major card-within-card visual clutter.

## 11. Final V2.1 end-to-end validation

Use a real talking-head Project and execute:

```text
Open Project
→ Script edit
→ Scene navigation
→ AI Workspace Analyze / Review / Apply
→ Media/B-roll
→ Caption
→ Canvas edit
→ Timeline edit
→ Inspector edit
→ Brand / Linked Style
→ Save
→ Stop / Restart / Reopen
→ Final Render
```

Required:

- H.264 + AAC where audio exists;
- Preview materially matches Final Render;
- no material durable state lost;
- layout/theme/locale changes never mutate Project revision;
- all four workspaces usable;
- no engineering-only fallback for canonical workflow.

## 12. Visual evidence set

At minimum capture:

1. Edit workspace;
2. AI workspace;
3. Script workspace;
4. Motion workspace;
5. Media panel;
6. Script panel;
7. Scene panel;
8. AI Composer with references;
9. AI Change Preview;
10. Viewer/Canvas selected visual;
11. Context Inspector sections;
12. redesigned Timeline;
13. zh-CN;
14. en-US;
15. 1366×768;
16. 1920×1080;
17. restarted/reopened project;
18. final rendered representative frame.

## 13. Defect IDs

Use:

```text
V2-UI-LV-001
V2-UI-LV-002
...
```

Each defect records:

- Phase;
- Reproduction;
- Expected;
- Actual;
- Root Cause;
- Fix;
- Commit;
- Evidence.

## 14. Phase gates

Every phase:

```text
CODE COMPLETE: PASS / FAIL
CLOUD VERIFIED: PASS / FAIL
V2.0 REGRESSION: PASS / FAIL
LOCAL UI VERIFIED: PASS / FAIL
VISUAL ACCEPTED: PASS / FAIL
```

Final V2.1:

```text
WORKSPACE ACCEPTED: PASS / FAIL
AI UX ACCEPTED: PASS / FAIL
SCRIPT/SCENE UX ACCEPTED: PASS / FAIL
TIMELINE/CANVAS ACCEPTED: PASS / FAIL
DURABILITY ACCEPTED: PASS / FAIL
RENDER ACCEPTED: PASS / FAIL
I18N ACCEPTED: PASS / FAIL
USABILITY ACCEPTED: PASS / FAIL
```

Do not start unrelated Post-Core capability work during V2.1 UI acceptance.
