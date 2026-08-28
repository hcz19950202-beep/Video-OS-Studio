# V2.3.1 H5 Windows Atomic Rename Blocker

## Trigger

Final H5 acceptance on product SHA `c34a1d337ea5434f1a9da0c385cac19ffa89d722` reached Case E and created a production `render-final` Durable Job through the real Next API. The Job failed at progress `0.02` before Remotion output creation because Windows rejected the JobStore atomic replacement:

`EPERM: operation not permitted, rename '<job.json>.<uuid>.tmp' -> '<job.json>'`

The failure was classified `PRODUCT_DEFECT`. The original worktree remained untouched and the H5 Gate worktree remained clean.

## Root cause

`FileJobStore.atomicWrite()` used a temp file followed by one bare `rename(temp, target)`. Windows can transiently reject atomic replacement with `EPERM`, `EACCES`, or `EBUSY` when another Windows component briefly holds a file handle. The existing in-process path chain prevents same-store overlap but cannot eliminate OS-level sharing/AV/indexer windows.

`NodeFileSystemAdapter.writeTextAtomic()` had the same bare rename behavior, so the defect was systemic rather than render-specific.

## Patch design

- keep temp-file + atomic rename semantics;
- do **not** delete the destination before rename;
- retry only on Windows;
- retry only `EPERM`, `EACCES`, and `EBUSY`;
- use bounded exponential backoff;
- fail immediately for non-transient errors;
- fail closed when the retry budget is exhausted;
- share the helper between JobStore and `NodeFileSystemAdapter.writeTextAtomic()`.

## Hard boundaries

- no RenderJob-specific persistence workaround;
- no Project Schema changes;
- no H.264/export-profile changes;
- no engine/runtime pin changes;
- no H4 network/Range changes;
- no version bump;
- no destination delete-before-rename fallback.

## Required acceptance

Cloud exact-head CI must pass Ubuntu, Windows, Browser Smoke, and Windows Media Smoke.

Then Local Windows must reproduce the H5 Case E production path on the frozen exact SHA and verify:

1. real `POST /api/projects/<id>/renders` no longer fails on JobStore persistence;
2. the odd `641×361` Project still resolves to `640×360` H.264 export truth;
3. the Durable Job completes;
4. the actual MP4 probes as `640×360`;
5. repeated Job state saves remain valid JSON and do not leave `.tmp` residue;
6. no orphan Next/Chromium/Remotion/FFmpeg processes;
7. exact SHA and clean worktree are preserved.
