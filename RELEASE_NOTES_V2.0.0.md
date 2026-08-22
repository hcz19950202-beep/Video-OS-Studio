# Video OS Studio V2.0.0 — Release Notes

Release date target: 2026-08-22

## Summary

Video OS Studio V2.0.0 is the first accepted AI-native editor core release built around talking-head video as text-native content.

The core abstraction is:

```text
Words → Meaning → Scenes → Visual Decisions → Clips → Render
```

V2.0 was accepted through milestone-level cloud/Windows validation and a final end-to-end RC1 run that created a brand-new Project from a new real talking-head source and completed two final renders separated by a restart/reopen and second edit.

## Major capabilities

### Project 2.0 and durability

- Project Schema 2.0
- V1→V2 migration
- frame-based canonical time
- validated Project Commands / Transactions
- project-relative media paths
- atomic save / reopen
- bounded Undo / Redo

### Text-native editing

- word-level Script generated through video-use
- Script ↔ Player synchronization
- sentence Remove / Restore
- canonical A-roll rebuild
- semantic tags
- Scene generation, Scene Strip and Scene editing

### Editor Core

- Context Inspector for Project, Video, Caption, Motion, HyperFrames, B-roll, Audio, Scene and Multi-select
- Generated Video Brand independent of Studio UI Theme
- Motion and Caption Linked Styles
- multi-select with one bulk action = one transaction
- real B-roll and Audio editing/render paths

### Canvas and Timeline V2

- direct select / drag / resize / rotate
- live Preview during pointer gestures
- nudge / snap / alignment guides
- cross-type layer ordering
- Markers
- source-aware Video/B-roll/Audio Split
- real FFmpeg waveform cache
- professional Timeline shortcuts
- Undo / Redo with monotonic revisions

### AI Director V2

- Scene-grounded visual suggestions
- Spoken Text grounding
- Recommendation / Reason / Confidence / Alternatives
- density-aware restraint and explicit Density Hold
- Change Preview before Apply
- per-suggestion review/deselection
- mixed-engine preparation
- one Apply = one validated Project Transaction
- whole-batch Undo / Redo
- deterministic IDs and idempotent re-apply

The V2.0 Director runtime source is intentionally reported as:

```text
rules
```

The provider boundary exists, but V2.0 does not claim a cloud LLM provider integration.

## Accepted engines

- video-use — transcript / packed transcript / EDL / QA preparation
- HyperFrames — deterministic reusable motion assets
- Remotion — Player and master composition/render
- FFmpeg / ffprobe — media probing, waveform and processing

## RC1 end-to-end evidence

RC1 used a new real talking-head source and a brand-new Project:

```text
Project ID: rc1-5a342e14
Final durable revision: 83
```

The raw source was a real MOV/HEVC/AAC recording. Because the current Studio media import boundary accepts MP4/SRT/VTT, RC1 adapted the MOV to H.264/AAC MP4 without modifying the original source, then imported through the normal UI.

The accepted workflow included:

- new Project creation
- real media import
- video-use transcript: 341 words / 19 segments
- Script Remove → Restore → final Remove
- Script duration: 2279 → 2169 frames
- semantic CTA tag
- 10 Scenes with manual refinements
- 38 Captions with custom styling
- AI Director: 28 suggestions / 19 Density Hold / 8 accepted visuals
- custom dark-blue/cyan Generated Video Brand
- one Linked Style shared by 8 Motion clips
- Canvas drag / resize / rotate / nudge / snap / layer
- real factory B-roll with source-continuous Split
- real MP3 BGM with fades and waveform
- Marker / Split / Undo / Redo / multi-select / duplicate/delete
- Save / Stop / Restart / Recent Project reopen
- first final render
- second real edit after reopen
- second corrected final render
- zh-CN / en-US
- Dark / Light UI isolated from Project Brand

Final corrected RC output:

```text
H.264 High
AAC LC stereo
1080×1920
30 fps
2169 frames
~72.36 seconds
```

Full video/audio decode passed.

## Final acceptance gates

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

## Known non-blocking observations

### P2 — MOV import

The current Studio import boundary does not accept MOV directly. RC1 converted the source to MP4 before normal UI import. Direct MOV import/transcode UX is post-Core polish.

### P2 — stale Caption UI save

RC1 observed one stale UI Save overwriting a Caption font field. The final state was repaired through the supported command boundary and re-rendered. This is a post-release polish/investigation item, not a V2.0 release blocker.

## Intentionally not included in V2.0 Core

- cloud LLM provider integration for AI Director
- AI Command Bar
- Project Package ZIP portability
- multi-language content tracks
- new Effect Pack expansion
- AI avatar / lip sync / text-to-video

These must be opened as separate Post-Core milestones.

## Release discipline

V2.0.0 should be tagged only after:

1. `package.json` and `package-lock.json` both report `2.0.0`;
2. final release branch lint/typecheck/test/build pass;
3. release-closeout PR merges to `main`;
4. final `main` remains green.
