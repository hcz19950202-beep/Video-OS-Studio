# Local Validation

This file records checks that cannot be concluded from cloud CI alone.

## Environment

- OS: NOT VERIFIED
- Node: NOT VERIFIED
- npm: NOT VERIFIED
- FFmpeg: NOT VERIFIED
- ffprobe: NOT VERIFIED
- Chrome/Chromium: NOT VERIFIED
- GPU: NOT VERIFIED
- `VIDEO_OS_DATA_ROOT`: NOT VERIFIED

## Phase 0 Foundation

- CODE COMPLETE: PENDING PR REVIEW
- CLOUD VERIFIED: PENDING CI
- LOCAL VERIFIED: NOT RUN
- PRD ACCEPTED: NOT RUN
- RENDER VERIFIED: NOT APPLICABLE TO PHASE 0

### Required Windows checks after merge

- [ ] `npm ci` or initial `npm install` succeeds on Windows.
- [ ] `npm run dev` starts the app.
- [ ] Browser opens the Studio shell and embedded Remotion Player.
- [ ] Player controls play, pause, and seek correctly.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] Project create/save/load works against a real `VIDEO_OS_DATA_ROOT`.
- [ ] Atomic save preserves `project.backup.json`.
- [ ] `ffmpeg -version` and `ffprobe -version` are available for later phases.

### Local issues

Use IDs `LV-001`, `LV-002`, ... and fix them on `fix/lv-xxx` branches before marking Phase 0 accepted.
