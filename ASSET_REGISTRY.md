# Video OS Studio Asset Registry

This file documents code-shipped production assets. User presets are stored outside Git under `VIDEO_OS_DATA_ROOT/library/asset-registry.json`.

## Built-in Remotion Effects

| ID | Name | Engine | Use case |
|---|---|---|---|
| RM-001 | Big Number | Remotion | Days, amounts, counts, concrete proof numbers |
| RM-002 | Metric Focus | Remotion | Percentages, progress, completion metrics |
| RM-003 | Keyword Impact | Remotion | Hooks, pain points, CTA emphasis |
| RM-004 | Lower Third | Remotion | Name, role, identity |

## Built-in HyperFrames Blocks

| ID | Name | Engine | Use case |
|---|---|---|---|
| HF-001 | Process Flow | HyperFrames | 2–4 step structured process explanation |
| HF-002 | Map Route | HyperFrames | Logistics and geographic movement |

## User Presets

Runtime presets are intentionally separated from repository code:

```text
VIDEO_OS_DATA_ROOT/
└── library/
    ├── asset-registry.json
    ├── asset-registry.backup.json
    └── promoted/
        └── preset-*.json
```

- **Save selected** captures a validated Motion clip as a reusable preset.
- **Favorite** is a local preference.
- **Promote** marks a preset `production-ready` and writes an auditable manifest under `library/promoted/`.
- Applying a preset in another project happens through the normal Project Command / HyperFrames service boundaries.
- Runtime promotion does **not** modify Git source files. Moving a promoted preset into the built-in code library is a deliberate Codex/developer review step.

Principle: `REUSE > MODIFY > CREATE`.
