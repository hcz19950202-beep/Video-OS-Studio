# Video OS Studio V1.1 — UI Benchmark & Product Decisions

> Goal: absorb the strongest workstation patterns from the user-supplied Overlay Studio references without cloning the product 1:1 or weakening Video OS Studio's validated V1 architecture.

## 1. What the reference does especially well

### Workstation information architecture

- persistent top status bar with TIME / CARDS / DENSITY / PEAK / selected card
- left-side global controls and card/subtitle inventory
- central preview as the visual focus
- right-side dense single-card inspector
- bottom timeline always visible
- clear Edit / Effects workspace separation

### Parameter-first editing

A card is not just a visual thumbnail. The selected card exposes a long parameter contract grouped around:

- content
- timing
- style
- layout / size
- preset
- delete / lifecycle

This makes the system feel like a production tool rather than a demo gallery.

### Design-system discipline

The reference repeatedly emphasizes:

- global design tokens
- deterministic animation timing
- parameterized cards
- visual density without decorative clutter
- thin borders and low-radius panels
- very dark canvas + restrained accent
- reusable presets
- scale participating in layout rather than only visual zoom

## 2. What Video OS Studio should NOT copy

Video OS Studio has a wider product boundary. It must keep:

- real A-roll video editing
- five canonical Timeline tracks
- captions as a first-class track
- video-use rough cut / EDL
- Remotion as the final master composition
- HyperFrames as a complex motion engine
- AI Visual Planner with review-before-apply
- reusable local Preset library
- final MP4 plus alpha overlay output

Therefore V1.1 changes the workstation shell and interaction hierarchy, not the validated Project / Adapter / Render architecture.

## 3. V1.1 parity matrix

| Reference pattern | Video OS V1.1 | Decision |
| --- | --- | --- |
| Dark high-density workstation | Implemented | Near-black flat panels, fine borders, orange-red focus accent |
| Light / dark skin | Implemented | Persisted local UI preference |
| Chinese interface | Implemented | Default zh-CN |
| English interface | Implemented | Full zh-CN / en-US switch with persistence |
| TIME metric | Implemented | Canonical frame-derived time |
| CARDS metric | Implemented | Enabled Motion clip count |
| DENSITY metric | Implemented | Motion cards per minute |
| PEAK metric | Implemented | Maximum concurrent Motion clips |
| Selected card metric | Implemented | Current selected Clip ID |
| Edit / Effects tabs | Implemented | Same Project, two work modes |
| Card / Subtitle side tabs | Implemented | Motion workflow vs caption browser |
| Search effect templates | Implemented | Bilingual name/id/category search |
| Filter effect templates | Implemented | Registry category filters |
| Dense single-card Inspector | Implemented | Header + Timing + Content + Style + Layout + metadata |
| Direct card in/out control | Implemented | Start Frame + Duration Frames through Project Command |
| Card delete in Inspector | Implemented | Project Command, selection cleared afterward |
| Effect preset library | Existing + restyled | Durable presets under VIDEO_OS_DATA_ROOT |
| Timeline compact overview | Implemented | 31px track lanes, compact toolbar and playhead |
| Import video | Existing + promoted to top bar | Keeps ffprobe/media boundary |
| Export project JSON | Implemented | Local download of validated Project data |
| Transparent export | Existing | VP9 alpha WebM remains validated default |
| Transparent MOV / ProRes 4444 | Deferred | Optional future format, not needed to replace validated WebM |
| Sound controls in top transport | Deferred | Better implemented together with Audio-track mixer |
| Import project JSON | Deferred | Needs migration + conflict + missing-asset validation first |
| Per-card named parameter presets in Inspector | Deferred | Existing global preset library already covers reusable clips |
| Global effect speed / scale | Deferred | Should become validated project-level design settings, not UI-only state |
| Global font and semantic color tokens | Deferred | Requires Project/Brand schema rather than cosmetic controls |
| Card list independent from Timeline | Partial | Current Cards count/library + Timeline selection; dedicated card inventory can follow production feedback |
| Keyboard shortcut layer | Deferred | Add after real usage establishes high-frequency operations |
| Resizable dock panels | Deferred | Useful, but not necessary for the first V1.1 acceptance |

## 4. V1.1 visual system

### Core UI tokens

- background: near-black
- panel surfaces: subtle stepped charcoal
- borders: fine neutral gray
- focus/accent: orange-red
- success: restrained green
- errors: restrained red
- typography: system CJK-safe sans + monospace labels for metrics / metadata

### Interaction principles

1. Keep important state visible rather than hiding it behind modal dialogs.
2. Use color for focus and state, not decoration.
3. The preview remains central; panels must not visually overpower it.
4. Timeline remains the canonical timing view.
5. All durable video changes continue through Project Commands or bounded services.
6. Locale/theme are UI preferences and must not contaminate Project JSON.
7. Bilingual switching must change operation labels, Inspector labels, Timeline labels, render controls, video-use, AI planning and asset controls — not only navigation.

## 5. Recommended next benchmark wave after V1.1 ships

Do not implement these before real local UI acceptance:

### A. Brand / Global Design Settings

Add validated Project schema for:

- semantic accent colors
- global generated-motion font
- default effect scale
- default motion speed
- safe-area preset
- caption preset

### B. Inspector preset workflow

Allow a selected Effect to save / switch named parameter combinations without leaving the Inspector.

### C. Media/audio transport

Add:

- master mute
- audio monitoring
- simple track gain
- sound-effect preview

### D. Project JSON round-trip

Add Import JSON only after validating:

- schema version migration
- duplicate project IDs
- missing media assets
- relative path safety
- effect versions

### E. Professional workspace ergonomics

- keyboard shortcuts
- resizable side panels
- hide/show docks
- full-screen preview
- saved workspace layout

## 6. Acceptance target

V1.1 is accepted when:

1. existing V1 project opens unchanged;
2. real video preview / seek still works;
3. Timeline edits still persist;
4. all existing render/video-use/HyperFrames flows still work;
5. Chinese / English switching updates all primary operational surfaces and survives reload;
6. dark / light UI preference survives reload;
7. Effect search/filter/add works;
8. Inspector timing/content/style controls update Player and Project;
9. UI remains usable at 1920x1080 and 1440x900;
10. CI remains green and local browser smoke tests pass.
