# Video OS Studio V2.2-W6 Local Windows End-to-End Product Acceptance

## Verdict

**PASS — W6 local Windows product acceptance completed.**

The three required real-media cases passed on the same frozen code SHA:

- Talking Head / 9:16: PASS
- Product Ad / 16:9: PASS
- Restart Recovery / 1:1: PASS

No product-code, Project Schema, engine-pin, configuration, or test change was made during formal W6 acceptance. The only repository change for this handoff is this validation report.

## Repository truth

| Field | Evidence |
| --- | --- |
| Repository | hcz19950202-beep/Video-OS-Studio |
| Branch | release/v2.2-final-acceptance |
| Exact tested code SHA | 8b10a59496a21a4d34cb95b99d0bd496f82bfd92 |
| GitHub PR | [PR #37](https://github.com/hcz19950202-beep/Video-OS-Studio/pull/37) |
| GitHub CI | [Run 32918205921 / #565](https://github.com/hcz19950202-beep/Video-OS-Studio/actions/runs/32918205921) |
| CI result | Ubuntu, Windows, Browser smoke, Windows real-media smoke: PASS |
| Project Schema | 2.0.0, preserved |
| Formal runtime mode | Production next start against a fresh isolated data root per case |
| Final report HEAD | Code HEAD above; report-only commit is supplied in the final handoff |

The checkout was fetched, switched, fast-forward pulled, and verified clean before testing. The final pre-report checkout remained clean at the exact tested SHA.

## Environment and accepted pins

| Component | Version / configuration |
| --- | --- |
| Windows | Windows 10 22H2, build 19045, x64 |
| Node | v24.19.0 |
| npm | 11.6.2 |
| FFmpeg | 8.1.1-full_build-www.gyan.dev |
| ffprobe | 8.1.1-full_build-www.gyan.dev |
| Python | 3.12.13 |
| Playwright | 1.62.1 |
| Browser | Chrome 151.0.7922.138 |
| Remotion / CLI / Player | 4.0.513 |
| HyperFrames | 0.8.10 |
| video-use | Repository-supported adapter; Whisper model small; local model cache configured; real transcription completed |
| Data roots | Fresh isolated W6 roots; no normal production data root used |

## Baseline gate

| Command | Result |
| --- | --- |
| npm ci --no-audit --no-fund | PASS; 684 packages installed, only existing deprecation notices |
| npm run format:check | PASS; H6 format check passed for 11 files |
| npm run lint | PASS; 0 errors, 10 existing warnings |
| npm run typecheck | PASS |
| npm test | PASS; 69 files passed, 2 skipped, 307 tests passed, 2 skipped |
| npm run build | PASS |
| npm run test:e2e | PASS; 2 passed, 1 contract-gated W4 real-media test skipped because its opt-in environment variables were not set |

The required real browser/media coverage was executed separately in Cases A, B, and C below.

## Real source fixture

The formal cases used the same real talking-head MP4 fixture with clear spoken Chinese audio:

- type: real MP4, H.264/AAC, talking-head/factory footage;
- source duration: 75.833333 seconds;
- source video: 1080x1920, 60000/1001 fps;
- transcription result: 357 words across 20 script segments;
- Case B support media: one local reusable factory B-roll image and one local AAC/M4A audio/BGM asset, 75.797 seconds.

No source media or generated media is committed to Git.

## Browser operation path

### Case A

Project → Create Project → Talking Head → 9:16 → Import real source → AI → Workflow → Generate First Draft → Content Review → select caption → Expand Inspector → Typography → Font Size = 60 → Approve & Continue → Assembly Review → Approve & Continue → reload → Recent Projects reopen → AI → Workflow → Download MP4.

### Case B

Project → Create Project → Product Ad → 16:9 → Import real source → import local B-roll image and audio through the UI file input → configure Brand/B-roll/audio/CTA through the normal Project command surface → reload/reopen → AI → Workflow → Generate First Draft → Content Review → Typography Font Size = 60 → approve both checkpoints → reload/reopen → Download MP4.

The Brand, B-roll, audio, and CTA changes used the existing validated Project command/API surface and did not hand-edit project.json.

### Case C

The isolated Project and source import were created through the normal Project/Media services. The visible Workflow was advanced to Content Review, approved, and allowed to enter a real HyperFrames Job. The isolated runtime tree was hard-killed, the same data root was restarted, the first normal Workflow API read triggered durable recovery, Motion was retried, Assembly Review was approved, and Final Render completed. The browser was then reloaded, the Project was reopened from Recent Projects, the same Workflow was rediscovered, and the MP4 was downloaded through the UI.

## Projects and Workflows

| Case | Project ID | Workflow ID | Scenario | Canvas | Final Project revision | assetBaseUrl |
| --- | --- | --- | --- | --- | ---: | --- |
| A | w6-case-a-talking-head-1787726569451-76ab0ffd | 17921a7d-e29b-4375-9362-9b2bf03b5eab | talking-head | 1080x1920 @ 30 | 7 | http://localhost:3000 |
| B | w6-case-b-product-ad-1787731523558-3e893a22 | 2ad02112-a71d-422a-9b86-c09cc0aa52ea | product-ad | 1920x1080 @ 30 | 13 | http://localhost:3000 |
| C | w6-case-c-acceptance-restart-190955-03ceced9 | 39c51f76-c9f6-4e08-96be-b8d4b0fab3df | talking-head recovery fixture | 1080x1080 @ 30 | 6 | http://localhost:3000 |

## 16-stage status table

All rows are terminal and valid. aN is the final stage attempt.

| Stage | Case A | Case B | Case C |
| --- | --- | --- | --- |
| MEDIA_IMPORT | completed / a1 | completed / a1 | completed / a1 |
| MEDIA_PROBE | completed / a1 | completed / a1 | completed / a1 |
| MEDIA_NORMALIZE | completed / a1 | completed / a1 | completed / a1 |
| TRANSCRIBE | completed / a1 | completed / a1 | completed / a1 |
| SCRIPT_ANALYSIS | completed / a1 | completed / a1 | completed / a1 |
| SCENE_DETECTION | completed / a1 | completed / a1 | completed / a1 |
| CAPTION_GENERATION | completed / a1 | completed / a1 | completed / a1 |
| VISUAL_PLANNING | completed / a1 | completed / a1 | completed / a1 |
| CONTENT_REVIEW | completed / a1 | completed / a1 | completed / a1 |
| MOTION_GENERATION | completed / a1 | completed / a1 | completed / a2 |
| BROLL_ASSEMBLY | completed / a1 | completed / a1 | completed / a1 |
| AUDIO_ASSEMBLY | completed / a1 | completed / a1 | completed / a1 |
| TIMELINE_ASSEMBLY | completed / a1 | completed / a1 | completed / a1 |
| PREVIEW | completed / a1 | completed / a1 | completed / a1 |
| ASSEMBLY_REVIEW | completed / a1 | completed / a1 | completed / a1 |
| FINAL_RENDER | completed / a1 | completed / a1 | completed / a1 |

## Checkpoints and Project revision safety

| Case | Checkpoint A | Checkpoint B | Review edit |
| --- | --- | --- | --- |
| A | approved; base 4 → resolved 5 | approved; base 7 → resolved 7 | Inspector expanded; Typography visible; Font Size changed to 60; revision 4 → 5 |
| B | approved; base 10 → resolved 11 | approved; base 13 → resolved 13 | Inspector expanded; Typography visible; Font Size changed to 60; revision 10 → 11 |
| C | approved; base 4 → resolved 4 | approved; base 6 → resolved 6 | No review edit required for the recovery fixture; final revision remained 6 |

## Durable Job table

| Case | Job ID | Type | Final status | Attempt | Output / recovery evidence |
| --- | --- | --- | --- | ---: | --- |
| A | 0626dd4c-51d8-4fba-928b-d196111ccf69 | video-use-transcribe | completed | 1 | Project revision 2; 357 words; 20 segments |
| A | 18e930ec-3ed7-44f9-868f-56f3dfea4e77 | hyperframes-render | completed | 1 | Project revision 6; process-flow overlay |
| A | f89bdab4-3653-46d7-8a4b-49ab81b6c095 | render-final | completed | 1 | source Project revision 7 |
| B | 42429428-460b-4d6b-8dca-6cf0bef5ada0 | video-use-transcribe | completed | 1 | Project revision 8; 357 words; 20 segments |
| B | 71628858-016e-4801-b84b-6ffca1b1e47e | hyperframes-render | completed | 1 | Project revision 12; process-flow overlay |
| B | 7b9733d7-4b16-434b-a816-6bce53908a18 | render-final | completed | 1 | source Project revision 13 |
| C | 697e6e34-291b-4819-936f-13d0b24d04a0 | video-use-transcribe | completed | 1 | Project revision 2; 357 words; 20 segments |
| C | ba280247-aed4-4f82-a0d2-5fc46993f5be | hyperframes-render | completed | 2 | Attempt 1 observed running, then JOB_INTERRUPTED/retryable after restart; attempt 2 completed |
| C | f0213f18-819b-4e2c-95f6-f044388bcb84 | render-final | completed | 1 | source Project revision 6 |

### Case C restart evidence

- pre-kill Workflow: 39c51f76-c9f6-4e08-96be-b8d4b0fab3df, MOTION_GENERATION, status running;
- pre-kill Job: ba280247-aed4-4f82-a0d2-5fc46993f5be, status running, attempt 1, expected revision 4;
- old runtime ID: 71ba54b3-10cd-4d9c-ba3c-9beaa8b4b17d;
- isolated runtime tree was terminated with taskkill.exe /PID 45576 /T /F and the root was confirmed dead;
- after the first normal API read on the restarted root, new runtime ID: a29460f7-face-4dac-8ae6-c7c093a74c80;
- previousRuntimeId recorded as 71ba54b3-10cd-4d9c-ba3c-9beaa8b4b17d;
- old Job became interrupted with JOB_INTERRUPTED, retryable=true; Motion retry advanced the same durable Job to attempt 2 and completed;
- no duplicate captions, motion clips, B-roll clips, or applied operation IDs were present in the final clean C Project.

## Workflow artifacts

Each formal Workflow recorded six durable artifacts: transcript JSON, packed transcript, script analysis, visual plan, HyperFrames motion output, and final render output.

| Case | Artifact relative paths |
| --- | --- |
| A | edit/transcripts/...json; edit/takes_packed.md; edit/workflow-script-analysis.json; edit/ai-director-plan.json; animations/hf-process-flow-94602fe92d61f769.webm; render/final-1080x1920-30fps-f89bdab4-3653-46d7-8a4b-49ab81b6c095.mp4 |
| B | edit/transcripts/...json; edit/takes_packed.md; edit/workflow-script-analysis.json; edit/ai-director-plan.json; animations/hf-process-flow-0b105388e09abb2a.webm; render/final-1920x1080-30fps-7b9733d7-4b16-434b-a816-6bce53908a18.mp4 |
| C | edit/transcripts/...json; edit/takes_packed.md; edit/workflow-script-analysis.json; edit/ai-director-plan.json; animations/hf-process-flow-42732fd5a094d0c8.webm; render/final-1080x1080-30fps-f0213f18-819b-4e2c-95f6-f044388bcb84.mp4 |

## Case A — Talking Head / 9:16

- Project: w6-case-a-talking-head-1787726569451-76ab0ffd;
- Workflow: 17921a7d-e29b-4375-9362-9b2bf03b5eab;
- final revision: 7; captions: 20; motion clips: 10; no duplicate review/continue mutation;
- Content Review edit was preserved from revision 4 to 5 and Font Size 60 was persisted;
- HyperFrames process-flow output was rendered and used in the final composition;
- UI download evidence: evidence/case-a-ui-download.mp4;
- reload/reopen rediscovered the same Workflow ID: PASS.

## Case B — Product Ad / 16:9

Final Project support state:

- assets: 1 source video, 1 local B-roll image, 1 local audio asset, 1 HyperFrames overlay;
- B-roll clip: w6-case-b-broll-clip, source asset media-c741e04c5d0a86d440f1, start frame 2035, duration 240 frames;
- audio clip: w6-case-b-audio-clip, source asset media-2a042bd6300f65436322, duration 2274 frames, volume 0.18, role bgm;
- motion clips: 11 total, including one HyperFrames process-flow clip, deterministic Remotion proof/number treatments, and the CTA clip w6-case-b-cta-clip;
- final Project revision: 13; captions: 20; B-roll clips: 1; audio clips: 1; no duplicate mutation.

Brand configured through the normal Project surface:

- mode: custom;
- primary color: #00A6FF;
- motion intensity: strong;
- heading/body/caption fonts: system-ui.

Visible final-output evidence from extracted frames:

- 13s: HyperFrames HOW IT WORKS process-flow overlay;
- 38s: 90% key metric treatment;
- 43s: 15 DAYS key-number treatment;
- 47s: 30 DAYS key-number treatment;
- 50s: proof treatment and caption;
- 68s: real distinct B-roll insert;
- 69s: visible CTA treatment 把你的下一个项目发给我们.

The deterministic plan held its CTA recommendation because of its density guard; the spoken CTA was exercised through the existing normal Project command path and is present as a visible Remotion CTA clip in the final output. This is not a fabricated media substitute.

- UI download evidence: evidence/case-a-ui-download.mp4;
- reload/reopen rediscovered the same Workflow ID: PASS.

## Case C — Restart Recovery / 1:1

- Project: w6-case-c-acceptance-restart-190955-03ceced9;
- Workflow: 39c51f76-c9f6-4e08-96be-b8d4b0fab3df;
- final revision: 6; captions: 20; motion clips: 10; B-roll: 0; audio clips: 0;
- pre-kill Motion Job was truly running and was not allowed to finish before termination;
- restart preserved the Workflow and completed stages before the crash;
- first normal API read after restart recorded the new runtime and converted the active Job/Stage to interrupted and retryable;
- retry completed Motion, downstream assembly, reviews, and Final Render;
- UI download evidence: evidence/case-c-final-ui-download.mp4;
- reload/reopen rediscovered the same Workflow ID: PASS.

## Final encoded MP4 / ffprobe

All values below came from the actual UI-downloaded encoded MP4, not Project JSON alone.

| Case | Final Render Job | Relative render path | Video codec | Audio codec | Size | FPS | Duration |
| --- | --- | --- | --- | --- | --- | --- | ---: |
| A | f89bdab4-3653-46d7-8a4b-49ab81b6c095 | render/final-1080x1920-30fps-f89bdab4-3653-46d7-8a4b-49ab81b6c095.mp4 | H.264 | AAC | 1080x1920 | 30/1 | 75.840000s |
| B | 7b9733d7-4b16-434b-a816-6bce53908a18 | render/final-1920x1080-30fps-7b9733d7-4b16-434b-a816-6bce53908a18.mp4 | H.264 | AAC | 1920x1080 | 30/1 | 75.882667s |
| C | f0213f18-819b-4e2c-95f6-f044388bcb84 | render/final-1080x1080-30fps-f0213f18-819b-4e2c-95f6-f044388bcb84.mp4 | H.264 | AAC | 1080x1080 | 30/1 | 75.840000s |

Cross-aspect gate: **9:16 PASS; 16:9 PASS; 1:1 PASS.** No renderer silently forced portrait dimensions.

## Visual inspection

FFmpeg extracted representative frames from each actual final MP4 and the frames were visually inspected:

- Case A, 3s and 7s: non-empty real factory/talking-head footage, readable Chinese captions, and selected motion treatment;
- Case B, 13s/38s/43s/47s/50s/68s/69s: process-flow, proof/number treatments, real B-roll, captions, and CTA visibly present;
- Case C, 3s and 7s: non-empty real factory/talking-head footage, captions, and process-flow motion visibly present.

Visual inspection: **PASS**.

## Revision, operation, and duplicate checks

- final A Project: 20 captions and 10 motion clips;
- final B Project: 20 captions, 11 motion clips, 1 B-roll clip, 1 audio clip;
- final clean C Project: 20 captions and 10 motion clips, with one HyperFrames result and no duplicate clip IDs/signatures;
- operations.jsonl parsed successfully for all formal Projects;
- operation records were one pending plus one applied record per unique operation ID: A 7 unique, B 13 unique, C 6 unique;
- no operation ID had more than one applied mutation;
- all project.json, project.backup.json, operations.jsonl, Workflow JSON, Job JSON, and owner metadata read back as valid JSON;
- no silent Project overwrite or duplicate Caption/Motion/B-roll mutation was observed in the formal final cases.

## Cleanup and resource gate

After stopping the formal production servers:

- Workflow-linked non-terminal Jobs: 0 in every W6 data root;
- Workflow/Project/operation/runtime-owner lock residue: 0;
- W6-owned Next/Node, Chromium, Remotion, HyperFrames, FFmpeg/ffprobe, and video-use Python processes: 0;
- port 3000: free;
- temporary Playwright output was moved outside the repository;
- source media, generated MP4, HyperFrames media, credentials, secrets, and private absolute paths were not added to Git.

## Defects, fixes, and remaining failures

Formal W6 acceptance found **no release-blocking product defect**. No regression test or product fix was needed, and no code/config/schema/pin change was made.

One preliminary diagnostic run used next dev with the long real source and remained at transcription progress 0.15 without a Python child for the observation window. Direct video-use completed and all formal A/B/C acceptance runs passed under the built production next start runtime. This diagnostic was not used as formal PASS evidence and did not change the repository.

Remaining failed items: **none for the W6 contract.**

## Release recommendation

W6 local Windows acceptance is **PASS** for exact code SHA 8b10a59496a21a4d34cb95b99d0bd496f82bfd92. The report is ready for GPT Web review and the report-only commit to be checked by GitHub CI. No local merge and no V2.3 work was started.

## Commands executed

~~~powershell
git fetch origin
git switch release/v2.2-final-acceptance
git pull --ff-only origin release/v2.2-final-acceptance
git rev-parse HEAD
git status --short --branch

npm ci --no-audit --no-fund
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e

npm run start -- --hostname 127.0.0.1 --port 3000
ffprobe -v error -show_entries stream=codec_name,codec_type,width,height,r_frame_rate -show_entries format=duration -of json <ui-downloaded-final.mp4>
ffmpeg -y -ss 3 -i <ui-downloaded-final.mp4> -frames:v 1 <frame-3s.png>
ffmpeg -y -ss 7 -i <ui-downloaded-final.mp4> -frames:v 1 <frame-7s.png>
taskkill.exe /PID 45576 /T /F
~~~

All browser/API harnesses, source media, extracted frames, logs, and generated outputs remained outside the Git repository.
