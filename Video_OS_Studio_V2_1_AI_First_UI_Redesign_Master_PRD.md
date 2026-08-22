# Video OS Studio V2.1 — AI-First UI Redesign Master PRD

> Status: UI-0 product contract
> Base release: Video OS Studio V2.0.0 (`v2.0.0`, main `64da5ec6539a787f4d2f3750b3c5cea0273255ce`)
> Development branch: `feature/v2.1-ai-first-ui`
> Product principle: **OpenCut supplies the professional editor shell; ChatCut supplies AI-first workspace patterns; Video OS keeps its own Script / Scene / AI Director / Command / Transaction core.**

---

## 1. Purpose

Video OS Studio V2.0.0 proved the complete product workflow:

```text
Raw Talking Head
→ Import / video-use
→ Script
→ Scenes
→ Captions
→ AI Director
→ Brand / Linked Style
→ Canvas
→ Timeline
→ B-roll / Audio
→ Final Render
→ Restart / Reopen
→ Second Edit / Second Render
```

V2.1 does **not** rebuild that engine. V2.1 makes the accepted engine feel like one coherent, professional, AI-native editor.

The release question for V2.1 is:

> Can a normal creator understand where to work, what AI is doing, what is selected, what will change, and how to refine the result without learning the internal Video OS architecture?

V2.1 is primarily an **information architecture, workspace, interaction, and visual-system redesign**.

---

## 2. Source Design Inputs

### 2.1 OpenCut — use for professional NLE shell

Use OpenCut / OpenCut Classic as reference for:

- resizable professional editor shell;
- persistent left tools / center viewer / right properties / bottom timeline;
- quiet top bar;
- preview-first composition;
- contextual properties rather than giant global forms;
- timeline visual density and editor affordances.

Do **not** copy brand assets, source code, visual identity, or proprietary implementation details.

### 2.2 ChatCut local research — use for AI-native workflow

Local ChatCut research confirms the high-value patterns are:

- AI is a first-class workspace, not a modal chat box;
- AI can reason from selection references such as Timeline item, Asset, time, Transcript, and Canvas region;
- Transcript / Assets remain available while AI is active;
- Agent state is visible: plan / running / reviewing / error / retry;
- AI output becomes normal editable timeline/project objects;
- Inspector should be capability/selection-driven;
- workspace persistence is valuable, but unrestricted docking should not be the first implementation;
- Video OS already has safer Project Schema + Commands/Transactions + review/apply boundaries, and should preserve them.

### 2.3 Video OS — own the editing semantics

Do not replace:

- Project Schema 2.0;
- frame-based canonical timing;
- Project Commands / Transactions;
- Script words / source ranges / Remove / Restore;
- Scene semantic model;
- AI Director Analyze / Suggest / Diff / Apply;
- Brand / Linked Styles;
- Canvas transforms / snap / layer;
- Timeline V2 markers / waveform / split / history;
- Remotion Master Composition;
- HyperFrames / video-use / FFmpeg adapters;
- Final Render pipeline.

---

## 3. Product Positioning

V2.1 should feel like:

> **AI-first professional video workspace for talking-head and business content.**

It supports two equally valid entry paths over the same Project state.

### AI-first path

```text
Script
→ Scene
→ AI Workspace
→ Review Changes
→ Fine Tune
→ Export
```

### Professional editing path

```text
Media
→ Viewer / Canvas
→ Timeline
→ Inspector
→ Export
```

Neither path owns a separate project representation.

---

## 4. Non-Negotiable Architecture Rules

1. `main@v2.0.0` is the stable product baseline.
2. V2.1 UI work must reuse current Project Schema.
3. UI state and Project state are separate.
4. Layout/theme/locale/workspace preferences must not mutate Project revision.
5. All durable edits continue through validated Project Commands / Transactions.
6. AI never directly hand-edits `project.json`.
7. Canvas and Timeline engines are reused; V2.1 changes their presentation unless a UI integration defect requires a bounded fix.
8. `REUSE > MODIFY > CREATE`.
9. Do not copy OpenCut/ChatCut code, branding, icons, proprietary resources, fonts, or assets.
10. Every UI phase must preserve V2.0 render equivalence.

---

## 5. Global Information Architecture

```text
VIDEO OS
│
├─ HOME
│  ├─ Recent Projects
│  ├─ Scenario Starters
│  ├─ New Blank Project
│  └─ Open Existing Project
│
├─ EDITOR
│  ├─ Top Bar
│  ├─ Workspace Switcher
│  ├─ Left Icon Rail
│  ├─ Content Panel
│  ├─ AI Workspace / Composer
│  ├─ Viewer / Canvas
│  ├─ Context Inspector
│  ├─ Scene Strip
│  └─ Timeline
│
└─ PROJECT SERVICES
   ├─ Brand
   ├─ Linked Styles
   ├─ Render Jobs
   ├─ Export
   ├─ Workspace Preferences
   └─ Settings
```

---

## 6. Primary Editor Shell

### 6.1 Default desktop composition

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ VIDEO OS   ←   Project Name      ↶  ↷      Saved        AI      Export     │
├────┬────────────────────┬─────────────────────────────┬─────────────────────┤
│    │                    │                             │                     │
│Rail│ Content Panel      │       Viewer / Canvas       │ Context Inspector   │
│    │                    │                             │                     │
│    │                    │                             │                     │
├────┴────────────────────┴─────────────────────────────┴─────────────────────┤
│ Scene Strip                                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ Timeline Toolbar                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ Timeline                                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Default dimensions

Reference desktop viewport: 1440×900 and larger.

```text
Top Bar             48px
Icon Rail           48px
Content Panel       300px default / 240 min / 460 max
Inspector           320px default / 280 min / 440 max
Timeline            300px default / 220 min / 55vh max
Viewer              remaining flexible space
Portrait preview    target visual height 420–520px when space permits
Scene Strip         32–40px
Timeline Toolbar    36–40px
```

### 6.3 Resizing

Required:

- Content Panel ↔ Viewer splitter;
- Viewer ↔ Inspector splitter;
- upper workspace ↔ Timeline splitter;
- collapse Content Panel;
- collapse Inspector;
- collapse Timeline to compact mode;
- double-click splitter resets that axis to workspace default.

### 6.4 Persistence

Persist to local UI preferences, not Project:

```text
workspacePreset
leftPanelWidth
inspectorWidth
timelineHeight
leftPanelCollapsed
inspectorCollapsed
timelineCollapsed
activeContentTool
activeInspectorSection
```

Reset Workspace must restore official defaults.

---

## 7. Official Workspace Presets

V2.1 must ship official layouts before considering free-form docking.

### 7.1 EDIT

```text
Content/Media | Viewer | Inspector
Timeline: standard
```

Purpose: normal fine editing.

### 7.2 AI

```text
AI Composer | Transcript / Scenes / Assets | Viewer
Inspector collapsed by default
Timeline: standard
```

Purpose: AI-directed editing while retaining project context.

### 7.3 SCRIPT

```text
Wide Script / Transcript | Viewer
Inspector collapsed
Timeline: compact
```

Purpose: text-first editing.

### 7.4 MOTION

```text
Effects / Library | Viewer | Inspector
Timeline: tall
```

Purpose: Remotion / HyperFrames / visual tuning.

Workspace switching must not change Project state.

---

## 8. Top Bar Redesign

The Top Bar must become quiet.

### 8.1 Left

- Back / Project browser;
- Video OS mark/name;
- Project name;
- optional dirty/saving state.

### 8.2 Center

- Undo;
- Redo;
- Save state (`Saving…`, `Saved`, `Save failed`).

### 8.3 Right

- Workspace switcher;
- AI button / AI workspace toggle;
- Export primary CTA;
- overflow Project menu.

### 8.4 Remove from persistent Top Bar

Do not permanently show:

- cards count;
- density;
- peak concurrency;
- selection count;
- JSON export;
- language selector;
- theme selector;
- import button.

Move them to relevant contexts:

```text
Density / Peak         → AI Workspace
Import                 → Media
Selection information  → Context / Timeline
Language / Theme       → Settings / Project menu
JSON export            → Project / Advanced
```

---

## 9. Left Icon Rail

Target width: 48px.

Primary tools:

| Key | zh-CN | en-US | Purpose |
|---|---|---|---|
| script | 脚本 | Script | Transcript / text editing |
| scenes | 场景 | Scenes | semantic structure |
| ai | AI | AI | AI Composer / Director |
| media | 媒体 | Media | assets / B-roll / audio |
| captions | 字幕 | Captions | caption browser / presets |
| effects | 动效 | Effects | Remotion / HyperFrames |
| brand | 品牌 | Brand | generated video brand / linked styles |
| project | 项目 | Project | project/advanced/settings |

Rules:

- icons use current project icon library or permissive existing dependency;
- tooltip required;
- active tool uses accent color + subtle background;
- do not create a separate primary icon for every asset type;
- Content Panel title and tabs reflect active tool.

---

## 10. Content Panel Group

The left panel is contextual, not a static collection of independent pages.

### 10.1 Media

Tabs:

```text
Assets | Transcript | Library
```

Assets filters:

```text
All | Video | Image | Audio | Generated
```

V2.1 may reuse current Asset Browser. Do not build GeneratedAsset provider lifecycle in this milestone.

### 10.2 Transcript / Script

Show:

- word/segment text;
- current playhead highlight;
- removed state;
- semantic tags;
- search;
- current Scene association;
- contextual `Ask AI` / reference action.

V2.1 does not need transcript drag-reorder or Speaker editing if not already supported.

### 10.3 Library

Aggregate navigation for:

- Remotion effects;
- HyperFrames effects;
- Presets;
- reusable visual styles where current data supports them.

Do not duplicate existing underlying registries.

---

## 11. Script Workspace UX

Script remains the preferred first edit surface for talking-head content.

Visual pattern:

```text
[00:00] 如果你是一名澳大利亚建筑商……

[00:04] 项目已经延期。
        [Pain] [Motion]

[00:07] ~~可删除的句子……~~

[00:12] 90%以上的施工……
        [Proof] [Motion]
```

Required V2.1 behavior:

- current word/segment highlight;
- Remove / Restore states visually obvious;
- semantic tag chips;
- click text → seek Player;
- playhead → Script highlight;
- selected text can become an AI reference token in AI Workspace;
- Script panel can expand in SCRIPT workspace.

Do not change canonical Script source-range logic.

---

## 12. Scenes UX

Scenes remain a first-class Video OS capability.

Scene card anatomy:

```text
01  HOOK
已经加钱找工人了，项目为什么还是延期？
00:00–00:08

Visual Density  ●●○
AI Status       3 suggestions
```

Required:

- scene number;
- name;
- semantic type;
- time range;
- compact summary;
- visual intensity/density indicator;
- AI suggestion/status indicator when available;
- click Scene → seek Viewer/Timeline + Scene Inspector;
- `Ask AI` action adds Scene reference to AI Composer;
- Scene Strip remains above Timeline.

Scene model is not redesigned.

---

## 13. AI Workspace / AI Composer

This is the largest UX change in V2.1.

AI must become a first-class workspace, not merely an Effect tab.

### 13.1 Composer structure

```text
AI COMPOSER

References
@Scene 03
@Transcript “90%以上……”
@Asset factory.mp4

Prompt
把这一段做得更有冲击力，突出90%以上在工厂完成。

[Send / Analyze]
```

### 13.2 Reference types in V2.1

Support references only where current selection/state already makes them safely resolvable:

- Scene;
- Transcript selection / Script segment;
- selected Timeline Clip;
- selected Asset;
- current playhead/time;
- selected Canvas clip/object.

Canvas free-region semantic reference can remain deferred if no stable representation exists.

Reference tokens are UI context. They must resolve to stable project IDs/frame ranges before an AI plan is constructed.

### 13.3 Agent activity presentation

AI Composer must expose visible execution stages even if the underlying V2.1 implementation is the existing deterministic AI Director:

```text
Reading Project
Reading Script / Scene
Analyzing Density
Planning
Reviewing Suggestions
Ready for Review
Applying
Success
Error
Retry
```

Do not fake tool calls that do not exist. The activity list should be derived from actual state transitions.

### 13.4 Recommendation card

Each recommendation displays:

- Scene;
- Spoken Text;
- Recommendation;
- Reason;
- Confidence;
- Alternatives;
- selected/deselected state;
- applied state.

### 13.5 Sticky Change Preview

At bottom of AI panel/workspace:

```text
CHANGE PREVIEW
+ Add
- Remove
↔ Shorten
✦ Style
Density 2.1 → 3.4/min
Peak 1 → 2

[Apply Selected]
```

Rules remain:

```text
Analyze / Review / Preview = read-only
Apply Selected = validated transaction
One batch = one Undo
```

### 13.6 Explicit boundary

V2.1 does **not** integrate a new cloud LLM provider merely because the UI is called AI Composer.

The Composer wraps the accepted Director capability and prepares UI/state architecture for later provider/command work.

---

## 14. Viewer / Canvas

The center must visually prioritize the video.

### 14.1 Default state

No persistent debug overlays.

Bottom transport:

```text
00:31:04 / 01:12:00       ▶       Canvas | Safe | Fit 72% | Fullscreen
```

### 14.2 Selected visual state

Show only when selected:

- bounding box;
- resize handles;
- rotate handle;
- snap/alignment guides;
- compact floating toolbar.

Floating toolbar can contain:

```text
Linked
Center
Layer Back
Layer Forward
```

### 14.3 Preserve M4 behavior

Must keep:

- actual content follows live drag;
- pointer-up durable command;
- resize;
- rotation;
- nudge;
- snap;
- layer;
- Canvas ↔ Inspector round trip.

V2.1 UI work must not replace the Canvas transform engine.

---

## 15. Context Inspector Registry UX

V2.1 should move from “large per-object forms” toward a capability-driven Inspector presentation while preserving existing command functions.

### 15.1 Concept

```text
Selection
→ Selection Type / Capabilities
→ Inspector Sections
→ Existing Command Handlers
```

### 15.2 Common section registry

Potential sections:

```text
Content
Media
Style
Typography
Transform
Animation
Audio
Timing
Linked Style
Scene
AI
```

### 15.3 Object mapping

Video:

```text
Media | Transform | Audio | Timing
```

Caption:

```text
Content | Typography | Style | Transform/Layout | Timing | Linked
```

Remotion Motion:

```text
Content | Style | Transform | Animation | Timing | Linked
```

HyperFrames Motion:

```text
Block | Transform | Timing | Linked
```

B-roll:

```text
Media | Transform | Audio | Timing
```

Audio:

```text
Audio | Fade | Timing
```

Scene:

```text
Scene | Style | AI
```

Multi-select:

```text
Common | Linked
```

No selection:

```text
Brand / Project
```

### 15.4 Inspector navigation

Use a compact vertical sub-rail or segmented section navigation.

Avoid a single endless scroll of unrelated fields.

### 15.5 Implementation boundary

V2.1 may add an `InspectorRegistry` / `capability resolver`, but it should adapt existing Inspector controls and command handlers rather than rewriting every field.

---

## 16. Timeline Visual Redesign

V2.1 changes Timeline presentation, not the accepted timing/history engine.

### 16.1 Structure

```text
SCENES
HOOK │ PAIN │ REFRAME │ PROOF │ CTA

Motion   ▰━━━━       ▰━━━━
Caption ━━━━━━━━━━━━━━━━━━━
B-roll       ▰━━━━━━
Video   ████████████████████
Audio   ∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿
```

### 16.2 Track headers

Fixed left headers with:

- icon;
- name;
- visibility/mute where semantically valid;
- compact count/state;
- selected-track state.

### 16.3 Timeline toolbar

```text
Undo | Redo
Split
Duplicate
Delete
Snap
Marker
Zoom - / +
Timecode
```

Keyboard shortcuts continue unchanged.

### 16.4 Preserve M4 behavior

Must keep:

- five accepted tracks;
- Scene Strip;
- markers;
- snap;
- split source continuity;
- waveform;
- multi-select;
- shortcut guards;
- Undo/Redo semantics.

### 16.5 Deferred

Not V2.1:

- multi timeline;
- arbitrary track folders;
- full transition system;
- crop/mask engine;
- professional color/HDR.

---

## 17. Home / New Project

V2.1 Home should communicate intent before technical settings.

Scenario starters:

```text
Talking Head Ad / 口播广告
Educational Talking Head / 知识口播
Product Ad / 产品广告
Long Video → Shorts / 长视频切短
Motion Video / 动效视频
Blank Project / 空白项目
```

Each scenario may initialize:

- workspace preset;
- recommended canvas/fps defaults;
- starter AI Composer prompt;
- relevant panel selection.

It must **not** create hidden project mutations or lock the user into a template.

Technical canvas/fps settings remain available in Advanced / Blank Project flow.

---

## 18. Visual Design System

Keep Video OS identity rather than copying ChatCut/OpenCut.

### 18.1 Foundation palette

```text
--bg-app:        #0b0c0e
--bg-panel:      #101114
--bg-elevated:   #141519
--border:        #292a30
--text-primary:  #f3f3f1
--text-muted:    #85868d
--accent:        #ff4b20
```

Existing variables may be retained if semantically equivalent.

### 18.2 Accent rule

Orange is reserved for:

- selected state;
- active tool/tab;
- playhead;
- AI Apply;
- Export;
- destructive/attention semantics only where differentiated appropriately.

Do not use large orange filled areas as general decoration.

### 18.3 Shape and spacing

```text
Radius small    4px
Radius medium   6px
Panel borders   1px
Control height  28–34px
Primary CTA     34–38px
Icon            16–18px
Icon rail item  40–44px hit target
Base spacing    4 / 8 / 12 / 16 / 24
```

### 18.4 Visual hierarchy

Prefer:

```text
containers
→ sections
→ controls
```

Avoid nested “card inside card inside card” layouts.

### 18.5 Typography

Use current application font stack. Do not import proprietary competitor fonts.

Use compact editor type scale:

```text
11–12px metadata
12–13px controls
13–14px body
14–16px panel title
```

---

## 19. Themes and Generated Brand

Studio Appearance remains local UI preference.

Generated Video Brand remains durable Project content.

Rules:

```text
Studio Dark/Light
≠
Generated Video Brand
```

Workspace layout, theme, locale and panel widths must not increase Project revision.

Brand editing remains in Brand/Project context and affects Preview/Render as already accepted.

---

## 20. i18n

All V2.1 primary surfaces must support:

```text
zh-CN
en-US
```

New strings must use the existing locale system.

Do not introduce component-local language conditionals when a common translation map/helper exists.

Allowed technical names can remain English where already contractually accepted:

- Remotion;
- HyperFrames;
- B-roll;
- BGM;
- SFX;
- technical IDs.

---

## 21. Focus, Keyboard, and Selection Rules

V2.1 shell changes must not break editor keyboard behavior.

Required:

- Canvas owns arrow keys when focused;
- Timeline owns global editor shortcuts when appropriate;
- text/number/select/textarea/contenteditable fields block global destructive shortcuts;
- Escape clears active selection/context where current semantics require;
- selection remains single source of truth across Canvas / Timeline / Inspector / AI references;
- opening AI Workspace must not silently clear Timeline selection.

---

## 22. AI Reference Model — UI Contract

V2.1 introduces a UI-level reference envelope, not a new durable Project schema requirement.

Suggested interface:

```ts
type ComposerReference =
  | { kind: 'scene'; sceneId: string }
  | { kind: 'script-segment'; segmentId: string }
  | { kind: 'clip'; clipId: string }
  | { kind: 'asset'; assetId: string }
  | { kind: 'time'; frame: number };
```

If Transcript selection supports a stable word range:

```ts
{ kind: 'transcript-range'; startWordId: string; endWordId: string }
```

References resolve project context but do not directly mutate Project.

Do not persist opaque UI DOM references.

---

## 23. Render Job UX

V2.1 should expose existing render jobs more clearly without changing the renderer architecture.

Minimum UI:

- current job progress;
- queued/running/completed/failed state;
- output filename/path when available;
- failure reason;
- retry button only if current backend supports safe retry;
- recent jobs for current Project where available.

If persistent render-job history does not yet exist, do not fake cross-restart history. Mark persistence as post-core follow-up.

---

## 24. Empty / Loading / Error States

Every major panel requires a deliberate state.

Examples:

Script empty:

```text
No transcript yet
[Transcribe Video]
```

Scenes empty:

```text
No scenes yet
[Generate Scenes]
```

AI empty:

```text
Analyze your script and scenes
[Analyze]
```

Media empty:

```text
Drop media here
[Import Media]
```

Inspector no selection:

```text
Project / Brand context
```

Error states must explain recovery rather than only exposing stack traces.

---

## 25. Performance Requirements

UI redesign must not degrade editor responsiveness.

Targets:

- panel resize: visually continuous;
- Timeline scroll/zoom: no expensive whole-project rerender introduced by shell;
- AI activity rendering: virtualize or limit long activity logs if necessary;
- Transcript lists: preserve current acceptable responsiveness;
- Viewer/Canvas must remain the priority render path;
- workspace persistence writes should be debounced/local and must not create Project revisions.

Do not introduce large UI frameworks unless existing dependencies cannot satisfy the requirement.

---

## 26. Accessibility and Usability

Minimum V2.1 requirements:

- visible focus states;
- tooltips for icon-only rail actions;
- keyboard-reachable primary controls;
- minimum practical hit targets around 32–40px in editor chrome;
- selected/active state not communicated by color alone where ambiguity is likely;
- dialogs trap focus appropriately;
- panels remain usable at 1366×768 minimum desktop size.

V2.1 is desktop-first. Mobile editor support is not required.

---

## 27. State Ownership

### Durable Project State

Examples:

```text
clips
assets
script
scenes
markers
brand
linkedStyles
transforms
caption styles
AI-applied visual clips
```

Writes: Project Commands / Transactions only.

### Session Editor State

Examples:

```text
selection
playhead
active workspace
active panel
AI review selection
open inspector section
undo/redo client session
```

### Local UI Preferences

Examples:

```text
locale
theme
workspace layout
panel sizes
collapsed panels
last workspace preset
```

These must not mutate Project revision.

---

## 28. Migration Strategy

V2.1 must open existing V2.0.0 Projects without migration solely for UI changes.

If a new durable schema field becomes unavoidable, it requires:

1. explicit PRD amendment;
2. schema migration;
3. fixture tests;
4. V2.0 Project open/re-save validation.

Default assumption: **no Project schema bump for V2.1 UI redesign.**

---

## 29. Development Phases

### UI-0 — Product Contract

Deliver:

- this Master PRD;
- V2.1 UI acceptance contract;
- branch / PR boundaries.

No product code required.

### UI-1 — Resizable Editor Shell + Workspace

Deliver:

- shell grid/panels;
- resizable splitters;
- four workspace presets;
- local layout persistence;
- reset workspace;
- Top Bar simplification.

Acceptance:

- no Project revision from layout changes;
- V2.0 Project opens;
- Viewer/Timeline still functional;
- layout survives refresh.

### UI-2 — Icon Rail + Content Panel Group

Deliver:

- 48px icon rail;
- Script / Scenes / AI / Media / Captions / Effects / Brand / Project;
- consolidated Media/Transcript/Library panel patterns;
- empty states.

Acceptance:

- every V2.0 feature remains reachable;
- no duplicate state implementation.

### UI-3 — Viewer + Inspector Registry UI

Deliver:

- simplified Viewer transport;
- Canvas toolbar visual redesign;
- capability/section-driven Inspector navigation;
- adapt existing control components.

Acceptance:

- all M3 Inspector contexts preserved;
- all M4 Canvas interactions preserved;
- Preview = Render smoke.

### UI-4 — Timeline Visual Redesign

Deliver:

- track-header redesign;
- toolbar redesign;
- Scene Strip visual integration;
- clip visual hierarchy;
- waveform/marker polish.

Acceptance:

- M4 shortcuts/snap/split/history unchanged;
- source continuity preserved;
- no regression in multi-select.

### UI-5 — AI Workspace / Composer

Deliver:

- dedicated AI workspace;
- Composer reference chips;
- real AI Director state/activity visualization;
- recommendation review;
- sticky Change Preview;
- Apply Selected.

Acceptance:

- Analyze remains read-only;
- Change Preview remains read-only;
- one Apply = one Transaction;
- one Undo removes AI batch;
- no fake tool activity.

### UI-6 — Script / Scene UX

Deliver:

- clearer Script typography and removed states;
- semantic chips;
- `Ask AI` references;
- Scene cards with semantic/time/density/AI status;
- SCRIPT workspace polish.

Acceptance:

- Remove/Restore/source continuity unchanged;
- Scene Strip sync preserved.

### UI-7 — Home / Scenario Starter

Deliver:

- recent projects redesign;
- scenario starter cards;
- blank project advanced flow;
- starter workspace/prompt initialization.

Acceptance:

- scenario choice never locks Project;
- new Project still creates valid Schema 2.0.0 state.

### UI-8 — i18n / Persistence / Visual Polish

Deliver:

- full zh-CN/en-US pass;
- workspace persistence pass;
- focus/keyboard pass;
- loading/empty/error pass;
- 1366×768 and 1920×1080 visual acceptance;
- final V2.1 end-to-end acceptance.

---

## 30. Explicit Out of Scope for V2.1

Do not add merely because ChatCut/OpenCut contain related concepts:

- new cloud AI provider integration;
- unrestricted AI Command Bar tool surface;
- cloud collaboration;
- marketplace;
- generated video/image/music provider suite;
- multi-Timeline Project model;
- version snapshot engine;
- arbitrary docking engine;
- crop/mask engine;
- transition engine expansion;
- HDR/color-management suite;
- third-party plugin ecosystem;
- mobile editor.

These require separate post-core PRDs.

---

## 31. Visual Acceptance Standard

V2.1 should look like a coherent desktop editor, not an admin dashboard.

Reject if:

- top bar is crowded with telemetry;
- multiple competing orange CTAs are visible;
- every function is a bordered card;
- Inspector becomes a single giant scroll form;
- AI appears as a detached modal unrelated to selection;
- Viewer becomes visually secondary;
- Timeline loses semantic track clarity;
- Script/Scenes become hidden utility pages;
- zh-CN and en-US differ structurally;
- panel resizing creates broken empty space.

Accept when:

- the Viewer is visually central;
- current workflow context is obvious;
- selection → Inspector is predictable;
- AI context/references/change preview are visible;
- user can switch between AI-first and manual editing without changing projects;
- professional controls remain discoverable without dominating the screen.

---

## 32. Required V2.1 Final End-to-End Acceptance

Use a real previously accepted or new talking-head Project and prove:

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
→ Restart / Reopen
→ Final Render
```

Verify:

- H.264/AAC output;
- Preview materially equals Render;
- no durable Project state lost;
- layout/theme/locale do not mutate Project revision;
- all four Workspace presets usable;
- both zh-CN and en-US usable;
- no engineering-only fallback required for the canonical UI workflow.

---

## 33. UI Release Gates

Each phase reports:

```text
CODE COMPLETE: PASS / FAIL
CLOUD VERIFIED: PASS / FAIL
V2.0 REGRESSION: PASS / FAIL
LOCAL UI VERIFIED: PASS / FAIL
VISUAL ACCEPTED: PASS / FAIL
```

Final V2.1 acceptance additionally reports:

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

---

## 34. Development Discipline

For every phase:

1. create/continue the dedicated feature branch;
2. implement only that phase;
3. run lint / typecheck / tests / build;
4. open/update PR;
5. cloud CI must pass;
6. Windows/local UI verification for interaction-heavy phases;
7. log defects with `V2-UI-LV-xxx` IDs;
8. do not start the next phase until current scope is accepted.

UI work must never claim:

```text
CI PASS = visual acceptance
```

or:

```text
component exists = interaction accepted
```

---

## 35. Product Decision Summary

The V2.1 redesign follows three ownership rules:

```text
OpenCut
→ how a professional editor is physically organized

ChatCut
→ how AI remains present, contextual and inspectable during editing

Video OS
→ how words become meaning, Scenes, visual decisions, clips and deterministic render
```

The goal is not competitor imitation.

The goal is to make the already accepted Video OS V2 engine understandable and productive through one continuous AI-native professional workspace.
