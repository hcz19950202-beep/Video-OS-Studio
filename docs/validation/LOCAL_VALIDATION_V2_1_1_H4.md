# Video OS Studio V2.1.1 H4 — Local Windows Streaming Media Validation Contract

> Workstream: H4 Streaming Media Pipeline  
> Branch: `hardening/v2.1.1-h4-streaming-media`  
> PR: #23  
> Authority: `PROJECT_STATUS.md` + Master Hardening PRD

## 0. Purpose

H4 proves that large media no longer requires whole-file buffering in the normal upload, Asset serving, or Render-output serving paths.

H4 does **not** implement H5 orphan cleanup/data-integrity work or H6 broad CI expansion.

Target upload path:

```text
browser File body
→ request.body stream
→ Project .uploads/<uuid>.part
→ byte-limit enforcement
→ staged MediaImportService
→ probe / optional normalize
→ H1-safe Project registration
```

Target serving path:

```text
stat
→ parse single Range
→ createReadStream(start,end)
→ Web ReadableStream
→ 200 / 206 / 416
```

No large-file acceptance may rely only on unit tests. Real Windows process memory and real media are required.

## 1. Entry gate

Do not use old chat memory as project truth.

Read in order:

1. `PROJECT_STATUS.md`
2. `AGENTS.md`
3. `SYSTEM.md`
4. `docs/prd/Video_OS_Studio_V2_1_1_Engineering_Hardening_Master_PRD.md`
5. this file
6. PR #23 live state

GPT Web will supply an exact frozen green SHA.

Create a fresh isolated worktree, for example:

```text
E:\Video-OS-Studio-H4-Validation
```

Use a fresh isolated runtime root, for example:

```text
E:\Video-OS-Data\v2.1.1-h4-validation-<sha-prefix>
```

Before validation:

```powershell
git fetch origin
git checkout hardening/v2.1.1-h4-streaming-media
git reset --hard <GPT_WEB_FROZEN_SHA>
git status --short
git rev-parse HEAD
node --version
npm --version
```

`git rev-parse HEAD` must exactly equal the frozen SHA. Otherwise stop.

Record Windows, Node/npm, Chrome, FFmpeg/ffprobe, Remotion, and HyperFrames versions.

Accepted H2 engine pins must remain unchanged:

```text
remotion             4.0.513
@remotion/player     4.0.513
@remotion/cli        4.0.513
hyperframes          0.8.10
```

## 2. Clean code gate

Run:

```powershell
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

All must pass. The two pre-existing `@next/next/no-img-element` warnings remain known non-blocking warnings. H4 must not introduce new warnings.

## 3. Test media and memory measurement

Use real media outside Git.

Preferred large-file size for the primary streaming test:

```text
300 MB – 1 GB
```

Prefer a real MP4/MOV already available locally. If unavailable, a validation-only large file may be generated outside the repository. Do not commit it.

For a successful application import, also keep a valid MP4/MOV fixture that ffprobe can read.

### Memory evidence

Record at minimum:

```text
file size MB
baseline server RSS MB
peak server RSS MB
RSS delta MB
RSS delta / file size
baseline heapUsed MB (validation harness)
peak heapUsed MB (validation harness)
heap delta MB
heap delta / file size
```

Use two complementary measurements:

1. **real Next server path** — sample the server Node process Working Set/RSS repeatedly with PowerShell during upload/download;
2. **validation-only Node harness** — call the real H4 streaming helpers with a large file/body and sample `process.memoryUsage()` to capture `rss` and `heapUsed`.

The harness must import the real H4 implementation and use real filesystem streams. Do not commit the harness.

H4 fails memory acceptance if the evidence shows memory growth approximately proportional to the full file. As a practical gate for the large streaming-only case:

```text
peak RSS delta / file size must remain < 0.50
peak heapUsed delta / file size must remain < 0.20
```

Expected healthy behavior should normally be materially better than these ceilings. Record the actual ratios; do not merely write PASS.

For a normalized MOV import, FFmpeg's own memory is separate from the Next server upload-buffering question. Record the Next server process separately from FFmpeg.

## 4. Browser raw upload contract

Open the real Studio in Chrome and import media through the normal Media UI.

Use DevTools Network or browser instrumentation to prove the request to:

```text
POST /api/projects/<projectId>/media
```

uses a raw File/Blob request body and query metadata:

```text
fileName
expectedRevision
operationId
```

Required:

- request is **not** `multipart/form-data`;
- no browser-side FormData wrapper is used by the current Studio path;
- server accepts the request through `request.body` streaming;
- Project import completes normally.

Record request method, Content-Type, Content-Length when present, and the request URL metadata shape without exposing unrelated local secrets.

## 5. Large upload streaming + RSS

Using the large local fixture, perform a real upload through the application or the exact route protocol.

During transfer, sample the Next server Node process RSS at a short interval.

Expected:

- `.uploads/<uuid>.part` grows progressively during the transfer;
- Node server RSS does not grow approximately 1:1 with transferred bytes;
- upload does not require one full-file `Uint8Array`/ArrayBuffer;
- after successful staging/import, the `.part` file is moved/consumed or removed;
- no stale `.part` remains from the successful request;
- resulting Asset `sizeBytes` matches the uploaded byte count;
- a valid MP4 import still probes and registers correctly.

Record actual memory numbers and ratios from section 3.

## 6. Upload abort cleanup

Start a sufficiently large upload and abort the client request before completion. A DevTools/AbortController/local validation client is acceptable; no product UI cancel button is required by H4.

Expected:

- request stops;
- server returns/records an interrupted upload rather than a successful import;
- partial `.uploads/*.part` is removed;
- Project revision does not advance for the aborted import;
- no Asset is registered;
- the next normal upload succeeds;
- no open file handle prevents cleanup on Windows.

## 7. Upload limit / 413

The local limit is 2 GB.

Do not create a >2 GB committed fixture.

Prove both enforcement layers where practical:

### Declared-length preflight

Send a validation request with `Content-Length` greater than the configured limit without transmitting a multi-gigabyte body.

Expected:

```text
HTTP 413
code = MEDIA_UPLOAD_TOO_LARGE
no .part file retained
no Project mutation
```

### Actual streamed-byte enforcement

Use the real `streamRequestBodyToFile` in a validation-only harness with a deliberately small `maxBytes` and a body that exceeds it.

Expected:

- `UploadTooLargeError`;
- partial file removed;
- memory remains bounded.

Do not change the product 2 GB limit just to test it through the app.

## 8. Real MP4 and MOV import regression

Run at least:

```text
native MP4 import
MOV import requiring normalize-video
```

Expected for MP4:

- raw body streaming upload;
- Asset registered;
- ffprobe metadata valid;
- Project revision advances through H1 mutation safety.

Expected for MOV:

- original MOV preserved under Project `original/`;
- working MP4 produced under the normal working path;
- no full upload buffer is introduced before FFmpeg;
- original and working paths remain valid after save/reopen;
- H2 ToolRunner/H3 foundations remain healthy.

## 9. Stale Project revision during long upload

Start an upload with:

```text
expectedRevision = N
```

While the body is still uploading or before final Project commit, perform another legitimate Project edit that advances revision to `N+1`.

Expected:

- stale import must not silently overwrite the newer Project;
- final Project attachment returns structured `PROJECT_REVISION_CONFLICT` where the race reaches mutation commit;
- newer Project edit remains intact;
- no duplicate Asset is registered.

A staged/original/normalized orphan created after the upload but before stale commit may be recorded as an H5 cleanup follow-up. Do not implement H5 orphan cleanup inside H4 merely to make this test pass.

## 10. Asset GET / HEAD contract

Use a large registered video Asset.

Validate:

```text
GET  /api/projects/<projectId>/assets/<assetId>
HEAD /api/projects/<projectId>/assets/<assetId>
```

Full GET expected:

```text
200
Content-Length = full file size
Accept-Ranges = bytes
canonical Content-Type from server-side extension
X-Content-Type-Options = nosniff
Cache-Control = no-store
body streams progressively
```

HEAD expected:

- same relevant metadata as GET;
- no body;
- no whole-file read.

## 11. Asset Range matrix

Validate all of these against the same known file:

```text
Range: bytes=0-1023
Range: bytes=1024-2047
Range: bytes=4096-
Range: bytes=-4096
Range: bytes=<last-byte>-<last-byte>
invalid start beyond EOF
malformed/multiple range request
```

For valid Range:

```text
206
Content-Range correct
Content-Length = selected bytes
Accept-Ranges = bytes
returned bytes exactly match source file slice
```

For unsatisfiable/malformed unsupported Range:

```text
416
Content-Range: bytes */<full-size>
Content-Length: 0
```

H4 supports one byte range, not multipart/byteranges.

## 12. Asset serving memory / RSS

Stream the full large Asset to a file or sink using a client that does not buffer the entire response in its own memory, for example curl/PowerShell streaming download.

Sample Next server RSS and use the helper harness for heapUsed.

Expected:

- server memory does not scale approximately 1:1 with Asset size;
- sequential Range requests do not accumulate memory;
- aborted client download releases the file stream/handle;
- a later request succeeds.

Record file size, peak RSS delta, heap delta, and ratios.

## 13. Browser playback / seek Range proof

Open/preview a video Asset in the normal app where the browser requests the Asset route.

Seek to at least two non-adjacent positions where practical.

Expected:

- playback remains functional;
- browser Range requests receive valid 206 responses;
- seeking does not require the server to read the entire Asset into memory first.

This is a browser behavior proof, not a requirement to redesign the Player.

## 14. Render output GET / HEAD

Create one short durable Final Render through H3, and if practical use an existing Overlay render output as well.

Validate:

```text
GET  /api/renders/<jobId>/output
HEAD /api/renders/<jobId>/output
```

Expected Final MIME:

```text
video/mp4
```

Expected Overlay MIME:

```text
video/webm
```

Both must include:

```text
Accept-Ranges: bytes
X-Content-Type-Options: nosniff
Content-Length
Content-Disposition
```

Output files must remain durable H3 artifacts; serving/metadata reads must not delete them.

## 15. Render output Range matrix + memory

Repeat the Asset Range matrix for at least a Final Render output:

```text
first range
middle/open-ended range
suffix range
invalid range → 416
HEAD with range
```

Verify returned bytes against the on-disk render output.

If the render is large enough to be meaningful, record server RSS during a full streamed download. If the render is small, use a large validation file through the shared streaming helper harness to prove memory behavior and separately prove the real Render route HTTP semantics.

## 16. Canonical MIME / nosniff

Server response MIME must be derived from trusted server-side path/output semantics, not blindly copied from an upload-supplied Content-Type.

At minimum prove:

```text
.mp4  → video/mp4
.mov  → video/quicktime
.webm → video/webm
.jpg/.jpeg → image/jpeg
.png → image/png
.srt → application/x-subrip
.vtt → text/vtt; charset=utf-8
```

Every streamed media success and 416 response must maintain the intended `nosniff` safety boundary where applicable.

## 17. Temp-file / handle cleanup

After success, abort, 413, and a client-aborted GET:

- inspect Project `.uploads/`;
- no completed/aborted request should leave an unexpected `.part` file;
- no file handle should block rename/delete on Windows;
- no H4-owned residual Node/FFmpeg process should remain;
- H3 durable render outputs must remain present.

Do not clean historical H1/H5 orphan fixtures as part of this workstream.

## 18. Representative application regression

After the streaming tests, perform:

```text
Create/Open Project
Import MP4 through normal UI
Import MOV through normal UI
Caption edit
Canvas edit
Save/Reopen
Undo/Redo
Preview playback + seek
Durable Final Render
Stream/download Final output
HyperFrames representative operation
```

H0/H1/H2/H3 behavior must remain intact.

## 19. Defect handling

Use IDs:

```text
V2.1.1-H4-LV-001
V2.1.1-H4-LV-002
...
```

For each defect record:

- reproduction;
- expected;
- actual;
- media size;
- baseline/peak RSS and heap where relevant;
- request/range headers where relevant;
- root cause;
- changed files;
- regression test;
- commit SHA.

Fix only H4 scope on:

```text
hardening/v2.1.1-h4-streaming-media
```

After every fix:

```powershell
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
git push origin hardening/v2.1.1-h4-streaming-media
```

Do not merge locally. Do not start H5.

## 20. Explicitly prohibited in H4

Do not implement:

- H5 orphan media cleanup;
- frozen historical schema/migration chain rewrite;
- Project referential-integrity expansion;
- Recent Project indexing;
- broad H6 Windows CI/Playwright matrix;
- H7 frontend consolidation;
- Project Schema migration;
- real external AI Provider;
- V2.2 Workflow Runtime.

Do not rewrite upload into a new cloud/object-storage architecture. This remains a local-first workstation pipeline.

## 21. Final report format

Return exactly:

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

CLEAN NPM CI: PASS/FAIL
CODE CHECKS: PASS/FAIL
BROWSER RAW UPLOAD: PASS/FAIL
LARGE UPLOAD STREAMING: PASS/FAIL
UPLOAD MEMORY/RSS: PASS/FAIL — file MB / baseline RSS / peak RSS / delta / ratio / heap ratio
UPLOAD ABORT CLEANUP: PASS/FAIL
UPLOAD LIMIT/413: PASS/FAIL
MP4 IMPORT: PASS/FAIL
MOV NORMALIZATION: PASS/FAIL
STALE REVISION SAFETY: PASS/FAIL
ASSET GET/HEAD: PASS/FAIL
ASSET RANGE MATRIX: PASS/FAIL
ASSET MEMORY/RSS: PASS/FAIL — file MB / baseline RSS / peak RSS / delta / ratio / heap ratio
BROWSER PLAYBACK/SEEK: PASS/FAIL
RENDER OUTPUT GET/HEAD: PASS/FAIL
RENDER RANGE MATRIX: PASS/FAIL
RENDER MEMORY/RSS: PASS/FAIL/NOT MATERIAL — output MB / RSS evidence
CANONICAL MIME/NOSNIFF: PASS/FAIL
TEMP FILE CLEANUP: PASS/FAIL
APP REGRESSION: PASS/FAIL
FINAL GITHUB VERIFY: PASS/FAIL

DEFECTS FIXED:
COMMITS PUSHED:
REMAINING FAILURES:
RESIDUAL TEMP/PROCESSES:

MERGE RECOMMENDATION: YES/NO
```

If validation documentation creates the last commit, report that documentation commit as FINAL HEAD.
