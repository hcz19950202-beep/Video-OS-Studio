# Local Validation

This file records Phase 0 checks that cannot be concluded from cloud CI alone.

Validation date: 2026-08-20 (Asia/Shanghai)

## Environment

- OS: Microsoft Windows 10 Home China, 64-bit, 10.0.19045 (build 19045)
- Validated Node runtime: v24.19.0 (Codex bundled LTS runtime)
- System-default Node runtime: v25.2.1 (EOL; not used for final acceptance)
- npm: 11.6.2
- FFmpeg: 8.1.1 full build
- ffprobe: 8.1.1 full build
- Chrome: 151.0.7922.138
- GPU: Intel UHD Graphics and NVIDIA GeForce RTX 3050 Ti Laptop GPU
- PowerShell: 7.6.4
- `VIDEO_OS_DATA_ROOT`: `E:\Video-OS-Data`

## Phase 0 Foundation status

- CODE COMPLETE: **PASS FOR PHASE 0**
- CLOUD VERIFIED: **PENDING RERUN**
- LOCAL VERIFIED: **PASS**
- PRD ACCEPTED: **PASS FOR PHASE 0**
- RENDER VERIFIED: **NOT APPLICABLE TO PHASE 0**

The pre-public visibility run was blocked before GitHub allocated a runner because of the account's Actions billing gate. After the repository was made public, run `32275340699` allocated a runner and reached checkout/setup successfully, but `npm ci` failed because the lockfile did not contain Linux's optional `@emnapi` entries. That lockfile issue is fixed locally; the public CI rerun is the remaining cloud gate.

## Automated Windows checks

- [x] `npm install --no-audit --no-fund` succeeded and generated `package-lock.json`.
- [x] `npm ci --no-audit --no-fund` succeeded under Node v24.19.0.
- [x] `npm run lint` passed.
- [x] `npm run typecheck` passed.
- [x] `npm run test` passed: 6 files, 29 tests.
- [x] `npm run build` passed with Next.js 16.3.1.
- [x] `ffmpeg -version` succeeded.
- [x] `ffprobe -version` succeeded.

## Browser verification

- [x] `npm run dev` started at `http://localhost:3000` under Node v24.19.0.
- [x] Studio shell displayed Asset Library, Remotion Player, Inspector, and Timeline placeholder.
- [x] Player Play changed state to Pause and advanced from frame 150 to frame 269.
- [x] Pause stopped playback.
- [x] Seek moved the Player to frame 150 / 00:05.
- [x] No Next.js error overlay or critical application server error appeared.

Browser evidence:

- `C:\Users\hcz\.config\browser-harness\agent-workspace\recordings\video-os-phase0-node24`
- `C:\Users\hcz\.config\browser-harness\agent-workspace\recordings\video-os-phase0-node24-playback`

The browser harness reports the page as hidden while controlled through CDP, so animation updates were throttled. Playback nevertheless advanced across multiple observed frames.

## Real project persistence verification

- [x] Created `E:\Video-OS-Data\projects\phase0-local-validation\project.json`.
- [x] Reloaded the project through `ProjectRepository`.
- [x] A subsequent save produced `project.backup.json`.
- [x] Current project is revision 1 with name `Updated`.
- [x] Backup project is revision 0 with name `Original`.
- [x] No `.tmp` file remained after atomic replacement.
- [x] Project IDs containing traversal or path separators are rejected before filesystem access.

## Local issues and fixes

### LV-001 — In-memory filesystem used separator-sensitive keys

- Symptom: the backup serialization test failed on Windows with `File not found: /data/projects/p1/project.backup.json`.
- Cause: `node:path.join()` produced Windows separators while the fake filesystem stored raw string keys.
- Fix: normalize all in-memory filesystem keys.
- Regression: targeted serialization tests 3/3; full suite passes.

### LV-002 — Project ID could escape the configured data root

- Symptom: `ProjectRepository.load("../escape")` could construct a path outside the intended project directory.
- Cause: repository path construction accepted an unvalidated project ID.
- Fix: add `ProjectIdSchema` and validate before constructing project paths.
- Regression: safe IDs accepted; traversal, drive-like, slash, backslash, and hidden-path IDs rejected.

### LV-003 — Runtime baseline differed across cloud and local environments

- Symptom: CI requested Node 22 while the system default was unsupported Node 25.
- Fix: standardize `.nvmrc`, `package.json`, and GitHub Actions on Node 24 LTS. Final local validation used v24.19.0.

### LV-004 — Initial lockfile was not clean-install reproducible

- Symptom: `npm ci` rejected the first lockfile because optional `@emnapi/wasi-threads` dependencies were inconsistent.
- Cause: the initial lockfile was generated before the runtime baseline and dependency tree were stabilized.
- Fix: regenerate the dependency tree and lockfile under Node v24.19.0 with npm 11.6.2.
- Regression: a fresh `npm ci --no-audit --no-fund` installed 392 packages successfully, followed by passing lint, typecheck, 29/29 tests, and production build.

### LV-005 — Public Linux CI needed cross-platform optional dependencies

- Symptom: after the public runner became available, `npm ci` failed with missing `@emnapi/core` / `@emnapi/runtime` entries.
- Cause: the lockfile had been materialized on Windows and omitted the Linux-selected optional dependency placement.
- Fix: regenerate `package-lock.json` with optional dependencies for the Linux x64 target, retaining the platform variants needed by Windows as well.
- Regression: Linux-targeted `npm ci --os=linux --cpu=x64`, Windows Node v24 `npm ci`, lint, typecheck, 29/29 tests, and production build all pass locally.

### LV-006 — In-memory paths differed between Windows and Linux

- Symptom: public Linux CI failed the serialization suite while Windows passed with a path containing backslashes.
- Cause: the in-memory adapter delegated separator handling to the host-specific `path.normalize()` implementation.
- Fix: normalize in-memory keys with POSIX rules after converting both slash styles to `/`.
- Regression: the equivalent-separator test and the full 29-test suite pass on Windows; this is the same normalization path exercised by Linux CI.

## Known non-blocking notes

- Remotion prints its standard license notice during development and build. Licensing must be reviewed before commercial distribution; it does not block Phase 0 technical acceptance.
- The repository is now public, so the current CI path no longer depends on the paid private-repository billing gate; the final public rerun must still pass before `CLOUD VERIFIED` becomes PASS.
- HyperFrames alpha, video-use, and final rendering are intentionally outside Phase 0 and remain unverified.
