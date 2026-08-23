# Video OS Studio V2.1.1 H6 — Local Windows Acceptance

> Workstream: H6 Automated Acceptance  
> PR: #25  
> Branch: `hardening/v2.1.1-h6-automated-acceptance`  
> Base accepted H5 main: `c639ebf2b6b91613b4cb772215599a6bd713638a`  
> Cloud code gate SHA: `3667867c9f43680b668229efbd67414e4a3e20b1`  
> Cloud code gate CI: Run `32626056514` — PASS  
> Frozen handoff SHA: **resolve from final PR #25 branch HEAD after this checkpoint documentation has passed the full four-gate CI; GPT Web supplies that exact SHA in the PR body and Codex handoff prompt.**

## 1. Purpose

H6 converts the accepted H0–H5 behavior into repeatable cloud/Windows/browser/media acceptance. This document is the authoritative local Codex contract after GPT Web freezes an exact green H6 branch HEAD.

Local acceptance validates the frozen implementation; it must not start H7, V2.2 Workflow Runtime, a real external AI provider, a Project Schema migration, or unrelated UI work.

### Why the frozen SHA is not embedded as a literal value above

A Git commit cannot truthfully contain its own SHA. Therefore this document records the last green **cloud code gate SHA** and CI evidence, while the exact **frozen handoff SHA** is the branch HEAD produced after the checkpoint documentation commit and its final CI. GPT Web records that value outside the commit itself in PR #25 and the handoff prompt.

Codex must use the supplied frozen handoff SHA as the checkout authority. Do not substitute the earlier cloud code gate SHA when a newer frozen handoff SHA is supplied.

## 2. Cloud acceptance already proved

Cloud code gate:

```text
SHA: 3667867c9f43680b668229efbd67414e4a3e20b1
Run: 32626056514
Node / npm: 24.19.0 / 11.17.0
```

Four jobs passed:

```text
ubuntu-verify:       PASS
windows-verify:      PASS
browser-smoke:       PASS
windows-media-smoke: PASS
```

Ubuntu code gates:

```text
format-check: PASS
lint: PASS with 2 pre-existing no-img-element warnings only
typecheck: PASS
unit: 51 passed files + 1 Windows-media smoke skipped in normal matrix
      222 passed tests + 1 skipped
build: PASS
```

Browser smoke:

```text
@playwright/test: 1.62.1 exact
Chromium smoke: 1/1 PASS
Flow: Create/Open → tiny import → Caption edit → Canvas Apply → rules Analyze/Apply → Undo/Redo → Save/Reopen
```

Windows CI real-media smoke:

```text
Windows Server 2025 runner
FFmpeg / ffprobe: 9.0.1 exact via Chocolatey
real-media smoke: 1/1 PASS
```

It exercised real MP4, MOV normalization, PNG, FLAC normalization, SRT parsing, byte Range streaming, and a short Final render through `NodeRemotionCliAdapter`.

This cloud evidence is not a substitute for the final local Windows release acceptance below.

## 3. Entry gate

Do not start local validation until GPT Web supplies an exact **frozen handoff SHA** from the final green PR #25 branch HEAD.

Create an isolated worktree and isolated runtime data root, for example:

```text
E:\Video-OS-Studio-H6-Validation
E:\Video-OS-Data\v2.1.1-h6-validation-<short-sha>
```

Required first checks:

```powershell
git fetch origin
git checkout hardening/v2.1.1-h6-automated-acceptance
git reset --hard <FROZEN_HANDOFF_SHA>
git rev-parse HEAD
```

`git rev-parse HEAD` must exactly equal the supplied frozen handoff SHA before any acceptance action.

Read, in order:

1. `PROJECT_STATUS.md`
2. `AGENTS.md`
3. `SYSTEM.md`
4. `docs/prd/Video_OS_Studio_V2_1_1_Engineering_Hardening_Master_PRD.md`
5. this document
6. PR #25 and its latest CI evidence

If repository truth, PR state, or the supplied SHA disagree, stop and report the mismatch rather than guessing.

## 4. Environment evidence

Record:

- Windows edition/build/architecture;
- Node and npm;
- Chrome version/path;
- FFmpeg and ffprobe versions/paths;
- Remotion package versions;
- HyperFrames package version;
- Playwright package/browser version;
- Python version and `VIDEO_USE_ROOT` if video-use regression is exercised;
- isolated worktree and `VIDEO_OS_DATA_ROOT`.

Expected engine/tool pins at H6 entry:

```text
remotion            4.0.513
@remotion/player    4.0.513
@remotion/cli       4.0.513
hyperframes         0.8.10
@playwright/test    1.62.1
```

Do not change engine versions during acceptance unless a real H6 defect proves the frozen lock is unusable. Any dependency change is an H6 code change and requires a regression test plus final GitHub CI.

The GitHub Windows runner installs FFmpeg `9.0.1` explicitly because its current image does not include system FFmpeg. The user's local validation may use the existing locally installed FFmpeg/ffprobe, but exact versions and paths must be recorded and the required behavior must pass.

## 5. Clean repository gates

From the isolated worktree:

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

All must pass. The two pre-existing `@next/next/no-img-element` warnings are non-blocking unless their behavior changes.

Also run the H6 focused automation:

```powershell
npm run test:e2e
$env:H6_WINDOWS_MEDIA_SMOKE="1"
npm run test:windows-media
Remove-Item Env:H6_WINDOWS_MEDIA_SMOKE
```

If Playwright's bundled Chromium is not installed, install the browser for the exact locally pinned package; do not install a floating Playwright package.

The focused Windows media smoke uses generated tiny fixtures outside Git. Do not commit generated media or runtime data.

## 6. Browser acceptance — real Windows browser

Run the H6 Playwright flow and separately inspect the application in the installed Windows Chrome at a representative desktop viewport.

Required workflow:

```text
Create Project
→ Open Project
→ import tiny media
→ select Caption
→ edit Caption field and commit on blur/Enter
→ Canvas draft / preview / Apply
→ AI rules Analyze
→ review selected recommendation
→ Apply as one durable mutation
→ Undo
→ Redo
→ Save
→ Reopen
```

Acceptance:

- no unhandled Promise rejection;
- no silent stale overwrite;
- no false-success notice after a failed mutation;
- revision changes only at durable mutation boundaries;
- Caption edit survives Save/Reopen;
- Canvas change survives Save/Reopen;
- AI Apply is undoable/redoable and survives Save/Reopen;
- Open loads canonical Project truth, not stale in-memory state.

The checked-in Playwright smoke uses the public Project Command API only to seed a deterministic proof Scene and Caption fixture. Create/import and all acceptance edits/actions after fixture seeding use the real UI. Do not replace this with direct store mutation.

## 7. Windows real-media smoke

Use tiny but real fixtures stored outside Git. Validate at minimum:

```text
MP4
MOV
image
real audio
SRT or VTT
```

The automated H6 Windows smoke exercises real `MediaImportService`, `NodeFfmpegAdapter`, byte Range streaming, and `NodeRemotionCliAdapter`. Local validation must repeat representative real-media behavior on the user's Windows machine.

### MP4

- import succeeds;
- ffprobe reports positive duration and expected dimensions;
- Project Asset/Video Clip references are valid;
- Asset GET/HEAD/Range works with real bytes.

### MOV

- original MOV is preserved;
- working MP4 is produced by real FFmpeg normalization;
- working MP4 is ffprobe-readable;
- Project points to the working asset and preserves original path metadata.

### Image

- import succeeds as an image Asset;
- no unnecessary video normalization occurs.

### Audio

- import succeeds;
- exercise an audio format that requires normalization where practical;
- normalized output is ffprobe-readable and reports audio.

### Subtitle

- real SRT/VTT parses into Caption clips;
- Caption clips render in the editor and remain valid after Save/Reopen.

### Range

For a real imported/normalized media file:

- valid single byte Range returns `206`;
- `Content-Range` is correct;
- returned byte count matches the requested interval;
- invalid range returns `416`;
- `X-Content-Type-Options: nosniff` remains present.

### Short Final Render

Render a short real Final through the product Remotion adapter:

- use the exact installed Remotion `4.0.513` packages;
- no runtime `npx --package` or floating download path;
- output MP4 is non-empty and ffprobe-readable;
- dimensions/fps match the selected export Project/profile;
- muted/no-audio export remains correct when selected;
- no owned Chrome/Remotion/FFmpeg process remains after completion.

## 8. Engine regression

H6 does not redesign H2/H3 engines, but final release smoke must prove the accepted engine boundary still works.

At minimum:

- Remotion final render;
- Remotion overlay path or focused existing regression;
- HyperFrames exact `0.8.10` health/lint/check/render on one existing effect;
- FFmpeg probe + video normalization + audio normalization;
- cancellation/process cleanup remains covered by accepted H2/H3 tests and representative local runtime checks;
- video-use focused regression if `VIDEO_USE_ROOT` is configured in the local release environment.

Do not implement new H3 job behavior as part of H6.

## 9. Regression checklist

Repeat representative editor behavior:

- Create/Open;
- media import;
- Caption edit;
- Canvas edit;
- AI rules Analyze/Apply;
- Timeline selection;
- Undo/Redo;
- Save/Reopen;
- preview playback/seek;
- Final render;
- HyperFrames effect add/render.

Confirm no `.tmp`, `.part`, `.partial` residue from the H6 validation and no H6-owned Node/Chrome/FFmpeg/HyperFrames process remains after the tests finish.

## 10. Defect protocol

Use IDs:

```text
V2.1.1-H6-LV-001
V2.1.1-H6-LV-002
...
```

For each local defect:

1. reproduce against the exact frozen handoff SHA;
2. confirm it is in H6 scope;
3. fix only the H6 defect on the same branch;
4. add the smallest useful regression test;
5. rerun affected local gates;
6. run the full clean code gates before handoff;
7. commit and push to `hardening/v2.1.1-h6-automated-acceptance`;
8. append Actual Results below.

Do not fix unrelated H7/UI debt during H6 acceptance.

## 11. Actual Results

> Local Codex appends evidence here. Do not replace the contract above.

Pending.

## 12. Required final report

```text
BRANCH:
FINAL HEAD:
FROZEN INPUT HEAD:
LOCAL WORKTREE:
LOCAL DATA ROOT:
WINDOWS:
NODE/NPM:
CHROME:
FFMPEG/FFPROBE:
REMOTION VERSIONS:
HYPERFRAMES VERSION:
PLAYWRIGHT VERSION:

CLEAN NPM CI: PASS/FAIL
FORMAT CHECK: PASS/FAIL
LINT: PASS/FAIL
TYPECHECK: PASS/FAIL
UNIT TESTS: PASS/FAIL
BUILD: PASS/FAIL
PLAYWRIGHT H6 SMOKE: PASS/FAIL
CREATE/OPEN: PASS/FAIL
TINY IMPORT: PASS/FAIL
CAPTION EDIT: PASS/FAIL
CANVAS CHANGE: PASS/FAIL
AI ANALYZE/APPLY: PASS/FAIL
UNDO/REDO: PASS/FAIL
SAVE/REOPEN: PASS/FAIL
MP4: PASS/FAIL
MOV NORMALIZATION: PASS/FAIL
IMAGE: PASS/FAIL
AUDIO: PASS/FAIL
SUBTITLE: PASS/FAIL
ASSET RANGE: PASS/FAIL
FFMPEG/FFPROBE: PASS/FAIL
SHORT FINAL RENDER: PASS/FAIL
HYPERFRAMES REGRESSION: PASS/FAIL
APP REGRESSION: PASS/FAIL

DEFECTS FIXED:
COMMITS PUSHED:
REMAINING FAILURES:
RESIDUAL TEMP/PROCESSES:

MERGE RECOMMENDATION: YES/NO
```

## 13. Stop rule

Local Codex must **not merge PR #25** and must **not start H7**. Return the exact FINAL HEAD and evidence to GPT Web. GPT Web reviews the frozen-to-final diff and final CI before any merge decision.
