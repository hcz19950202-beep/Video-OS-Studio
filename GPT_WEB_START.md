# GPT Web Development Start

This repository uses a coordinated development model:

```text
GPT Web + GitHub
→ architecture / cloud-safe implementation / branches / PRs / CI / final review

Local Codex on Windows
→ real media / browser / FFmpeg / Remotion / HyperFrames / video-use / local acceptance
```

Do not start from historical chat context or old milestone documents.

## Mandatory read order

Before editing:

1. `PROJECT_STATUS.md`
2. `AGENTS.md`
3. `SYSTEM.md`
4. the active PRD named in `PROJECT_STATUS.md`
5. the active validation contract when local verification is required

`PROJECT_STATUS.md` is the current-state source of truth. Historical handoff, PRD, validation and release documents are evidence and may describe older branches or completed milestones.

## Current development rule

One workstream uses one GitHub branch/PR.

GPT Web implements and verifies cloud-safe scope first. If Windows/real-engine evidence is required, GPT Web freezes an exact branch/SHA and hands that SHA to local Codex. Codex pushes local fixes back to the same workstream branch. GPT Web reviews the resulting diff and CI before merge.

Do not develop directly on `main`.

## Permanent constraints

- `REUSE > MODIFY > CREATE`
- canonical timing is frame-based
- Project JSON is durable truth
- durable changes use Commands / Transactions / bounded services
- do not write machine-specific paths into Project JSON
- UI modules do not spawn external CLIs directly
- Agents do not hand-edit runtime `project.json`
- repository code and runtime media stay separated through `VIDEO_OS_DATA_ROOT`
- cloud checks do not prove Windows/browser/engine/media behavior

The active milestone and all stop rules are defined in `PROJECT_STATUS.md` and `AGENTS.md`.
