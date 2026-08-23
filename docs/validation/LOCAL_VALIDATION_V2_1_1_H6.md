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

Validation date: 2026-08-23 (Asia/Shanghai)

BRANCH: hardening/v2.1.1-h6-automated-acceptance (detached validation worktree; push target preserved)
FINAL HEAD: documentation commit created after this section; exact SHA recorded in final handoff
FROZEN INPUT HEAD: c019689884877a12660e73e1ec8ba81aa9e76e69
LOCAL WORKTREE: E:\Video-OS-Studio-H6-Validation
LOCAL DATA ROOT: E:\Video-OS-Data\v2.1.1-h6-validation-c0196898
WINDOWS: Microsoft Windows 10 家庭中文版 10.0.19045, x64
NODE/NPM: v25.2.1 / 11.6.2; repository engine is 24.x; bundled Node v24.19.0 was available
CHROME: Installed Chrome 151.0.7922.138 at C:\Program Files\Google\Chrome\Application\chrome.exe
FFMPEG/FFPROBE: 8.1.1-full_build-www.gyan.dev at C:\Users\hcz\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin
REMOTION VERSIONS: remotion 4.0.513; @remotion/player 4.0.513; @remotion/cli 4.0.513
HYPERFRAMES VERSION: 0.8.10
PLAYWRIGHT VERSION: @playwright/test 1.62.1; pinned browser chromium-1234 available
PYTHON / VIDEO-USE: Python 3.12.10; VIDEO_USE_ROOT NOT CONFIGURED

CLEAN NPM CI: PASS — 684 packages installed from frozen lock; only Node engine/deprecation warnings
FORMAT CHECK: PASS — H6 format check passed for 9 files
LINT: PASS — 0 errors; only the two pre-existing no-img-element warnings
TYPECHECK: PASS
UNIT TESTS: PASS — 51 files / 222 passed tests; 1 H6 Windows-media test skipped in the normal matrix
BUILD: PASS

PLAYWRIGHT H6 SMOKE: PASS — exact 1.62.1, 1/1. The repository's standard port 3000 was occupied by the unrelated E:\Video-OS-Studio service; the identical checked-in test ran on temporary local port 3010 with the same pinned package and was deleted afterward.
CREATE/OPEN: PASS
TINY IMPORT: PASS — real UI imported tiny PNG; Project Asset kind=image
CAPTION EDIT: PASS — Playwright committed Font Size 64; real Chrome selected Caption and committed the same editor path; no unhandled browser errors
CANVAS CHANGE: PASS — real Chrome previewed and applied 1080x1920 9:16 Canvas
AI ANALYZE/APPLY: PASS — after deterministic public Command API fixture seeding, real UI Rules Analyze produced one actionable metric-focus recommendation and Apply created one transaction/motion clip
UNDO/REDO: PASS — AI Apply Undo reached rev13 with the motion removed; Redo reached rev14 with it restored
SAVE/REOPEN: PASS — project reopened with Canvas, Caption and motion state intact

MP4: PASS — real 320x180 H.264/AAC MP4 imported and probed at 2.000s; Asset/Video Clip references valid
MOV NORMALIZATION: PASS — real MOV preserved at original/media-4bcd7e8f3a2a43a82398-h6-local.MOV; working MP4 at input/media-4bcd7e8f3a2a43a82398-h6-local-working.mp4; ffprobe 320x180, positive duration, AAC audio
IMAGE: PASS — real PNG imported as image Asset without video normalization
AUDIO: PASS — real FLAC retained under original/ and normalized to assets/media-acdc406fc914e6bc8ed1-h6-local-working.m4a; ffprobe reports AAC audio and 2.000s
SUBTITLE: PASS — real SRT parsed into two Caption clips, visible on Timeline/Preview; SRT Asset retained through later Project saves
ASSET RANGE: PASS — valid GET Range bytes=0-31 returned HTTP 206, Content-Range bytes 0-31/34664, 32 bytes and nosniff; invalid 999999-1000000 returned HTTP 416 with bytes */34664

FFMPEG/FFPROBE: PASS — local 8.1.1 exercised by import/probe/normalization, Range and render checks
SHORT FINAL RENDER: PASS — real UI Final Render job 115711a9-7146-4c17-a54f-68c340f28aec completed in 13.3s; 18,677-byte MP4, 1080x1920, 30fps, 3.000s, no audio stream; H6 Windows-media smoke also passed a real muted 320x180 render
HYPERFRAMES REGRESSION: PASS — pinned 0.8.10 doctor exit 0; lint 0 errors/0 warnings; check passed with 0 errors/0 warnings and 2 informational layout-overflow notes; CLI process-flow render produced 124,945-byte 1080x1920 30fps 3.000s VP9 WebM; real Chrome UI add/render completed and added one HyperFrames clip
VIDEO-USE: NOT CONFIGURED
APP REGRESSION: PASS — final real Chrome path covered Create/Open, MP4, MOV, PNG, FLAC, SRT, Caption, Canvas, AI Analyze/Apply, Timeline, Undo/Redo, Save/Reopen, seek to 1.0s, play/pause, Final Render and HyperFrames add/render. Final Project h6-local-windows-acceptance-4c507aae was valid at revision 16 with 6 Assets, 1 Caption, 2 motion clips and 1 HyperFrames Asset.

DEFECTS FIXED: None. No H6 product defect was reproduced. The initial standard Playwright command was blocked only by the unrelated port-3000 service; the HyperFrames check retry removed an unsupported CLI flag; neither changed repository code.
COMMITS PUSHED: Documentation commit only, pushed with git push origin HEAD:hardening/v2.1.1-h6-automated-acceptance
REMAINING FAILURES: None in H6 product scope. Environment notes: system Node 25.2.1 versus declared 24.x; HyperFrames doctor reported low available memory, missing optional Docker/whisper/TTS/BGM and stale optional skill manifest, while required Node/FFmpeg/ffprobe/Chrome health and all required lint/check/render gates passed. Standard Playwright port 3000 remained occupied by an unrelated service. Video-use was not configured.
RESIDUAL TEMP/PROCESSES: No H6 data-root .tmp/.part/.partial files; Windows-media temp roots were cleaned; no H6-owned Node, Chrome, FFmpeg, ffprobe, Python or HyperFrames process remained after stop. Successful HyperFrames .hf-work design files, Project render output, jobs metadata and fixture media remain intentionally as validation evidence; unrelated user processes were not killed.

MERGE RECOMMENDATION: NO — local H6 acceptance is PASS, but PR #25 must remain Draft/unmerged pending GPT Web frozen-to-final diff review and final GitHub CI; do not start H7 or V2.2

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
