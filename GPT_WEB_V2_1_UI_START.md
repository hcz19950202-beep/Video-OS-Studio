# GPT Web Start — Video OS Studio V2.1 AI-First UI

> Branch: `feature/v2.1-ai-first-ui`
> Base: released `v2.0.0`
> Start phase: UI-1 only after UI-0 documents are reviewed.

## Read first

1. `Video_OS_Studio_V2_1_AI_First_UI_Redesign_Master_PRD.md`
2. `LOCAL_VALIDATION_V2_1_UI.md`
3. `Video_OS_Studio_V2_AI_Native_Editor_Master_PRD_Rev2.md`
4. `SYSTEM.md`
5. `DESIGN.md`
6. `RELEASE_NOTES_V2.0.0.md`
7. `docs/research/chatcut/CHATCUT_LOCAL_RESEARCH_MASTER.md` from `research/chatcut-local-audit`
8. `docs/research/chatcut/12_VIDEO_OS_REUSE_RECOMMENDATIONS.md` from `research/chatcut-local-audit`

## Core boundary

V2.1 is a UI/UX redesign over the accepted V2.0 engine.

Do not rewrite:

- Project Schema;
- Project Commands / Transactions;
- Script source-range engine;
- Scene model;
- AI Director transaction semantics;
- Canvas transform engine;
- Timeline timing/history engine;
- Remotion render pipeline;
- HyperFrames/video-use/FFmpeg adapters.

## Development sequence

```text
UI-0 Product Contract      COMPLETE when docs accepted
UI-1 Shell + Workspaces
UI-2 Rail + Content Panels
UI-3 Viewer + Inspector
UI-4 Timeline Visual Redesign
UI-5 AI Workspace / Composer
UI-6 Script / Scene UX
UI-7 Home / Scenario Starter
UI-8 i18n / Persistence / Polish
V2.1 Final Acceptance
```

Each phase must stop at its acceptance boundary before starting the next.

## UI-1 scope

When UI-1 starts, implement only:

- simplified Top Bar;
- resizable Content / Viewer / Inspector / Timeline shell;
- official workspace presets: Edit / AI / Script / Motion;
- local layout persistence;
- panel collapse/restore;
- Reset Workspace;
- responsive desktop constraints;
- preserve current editor surfaces inside the new shell.

Do not yet redesign individual Script/Scene/AI/Timeline/Inspector content in UI-1.

## UI state vs Project state

Workspace/layout state is local UI state.

It must not:

- call Project Command;
- increment Project revision;
- appear in `project.json`.

## Visual rule

Keep Video OS identity:

```text
#0b0c0e app
#101114 panel
#141519 elevated
#292a30 border
#f3f3f1 text
#85868d muted
#ff4b20 accent
```

Orange is reserved for selected/active/primary actions, not general decoration.

## Competitor research rule

Use OpenCut and ChatCut as pattern references only.

Do not copy:

- proprietary code;
- logos;
- fonts;
- images;
- bundled assets;
- branded component styling.

## Gates

After every phase:

```text
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

Then perform the phase-specific local UI acceptance from `LOCAL_VALIDATION_V2_1_UI.md`.

Do not claim visual acceptance from CI alone.
