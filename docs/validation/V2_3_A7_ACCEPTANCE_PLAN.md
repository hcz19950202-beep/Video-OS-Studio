# Video OS Studio V2.3 — A7 End-to-End Product Acceptance Plan

## Purpose

A7 is the final product-acceptance workstream for V2.3 Real AI Director / AI Editing Agent.

It does not add a second editor, Workflow Runtime, Job system, media engine, or Project truth. A7 proves that the accepted A0–A6 implementation works as one product with real Project/media, the real production provider, the existing V2.2 Workflow/Job runtime, and the accepted rendering engines.

Authoritative sources:

- `docs/prd/Video_OS_Studio_V2_3_Real_AI_Director_Agent_Master_PRD.md`
- `docs/prd/Video_OS_Studio_V2_3_Development_Plan.md`
- `docs/validation/LOCAL_VALIDATION_V2_2_W6.md` for the accepted real-media/runtime pattern that A7 reuses rather than replaces.

Project Schema remains `2.0.0`.

## Accepted baseline entering A7

A7 starts from accepted A6 main:

`05c331947b6d3704daa680e66d5e0cbe1d4982ed`

A6 exact frozen code candidate:

`a470bd9eacecc708e5690e5c925c75be668ea373`

A6 acceptance already proved:

- durable Agent Session restart/reopen;
- Session primary corruption recovery from validated atomic backup and self-heal;
- real Volcengine cancellation followed by a fresh retry without replaying durable work;
- Project revision stale protection;
- concurrent duplicate Apply idempotency;
- secret safety;
- no Agent-created residual lock/process;
- accepted Windows media runtime still green.

A7 does not repeat A6 chaos for its own sake. It exercises those safety properties inside final product cases.

## Cloud-first acceptance boundary

Cloud CI must remain green before any final Local Codex gate:

```text
format
lint
typecheck
unit/integration
build
Playwright browser acceptance
Windows media smoke
```

Existing deterministic cloud coverage is reused as acceptance evidence:

- A4 browser: Project/selection context → Agent proposal → Review/Diff → Apply → reload/reopen → stale guard;
- A5 browser: Agent `request_workflow_action` → Workflow Action Review → explicit confirmation → existing WorkflowService/WorkflowRunner;
- A6 tests: timeout/cancel/retry/recovery/revision/idempotency/error-safety;
- W6 media/runtime tests: accepted Windows FFmpeg/media boundary.

A7 adds a dedicated deterministic browser case that must prove:

```text
proposal at revision N
→ user manual Project edit to N+1
→ old proposal becomes stale
→ Re-plan latest
→ new proposal uses latest Project truth
→ manual edit remains present
→ explicit Apply exactly once
→ revision N+1 → N+2
→ no duplicate visual operation
→ browser reload/reopen preserves the final Project and Agent session
```

Cloud evidence is necessary but cannot substitute for real-provider, real-media, process-restart, or final encoded-video evidence.

## Mandatory Local Codex final cases

All formal local cases must run against one exact cloud-green frozen SHA on Windows / Node 24.x with:

- provider: `volcengine-agent-plan`;
- model: `ark-code-latest`;
- real `.env.local` key loaded server-side only;
- real browser;
- real media files;
- accepted FFmpeg / ffprobe / video-use / HyperFrames / Remotion paths;
- isolated A7 runtime/data roots where practical;
- no tracked product-code/config/test change during formal acceptance.

### Case A — Talking Head Conversational Hook Edit

Required product flow:

```text
real Talking Head Project
→ import real talking-head MP4
→ create/complete enough Workflow state to obtain real Script/Scenes/Caption context
→ select the opening Scene and/or Script range in Studio
→ start/reopen a real Agent session
→ ask Agent to improve the opening hook without over-styling it
→ Agent reads bounded selected Scene/Script context
→ real proposal + concise rationale
→ Review / Diff
→ verify Project unchanged before confirmation
→ user Apply Selected / Apply
→ Project revision advances exactly once
→ preview/reload proves accepted edit is durable
```

Acceptance evidence:

- real Project ID;
- real Session ID and turn IDs;
- selected Scene/Script IDs or word range;
- normalized tool calls only, no secret/raw chain-of-thought;
- Proposal ID and base revision;
- revision before proposal / after review / after apply;
- Apply operation ID;
- no duplicate visual/edit operation;
- reload/reopen evidence.

If the accepted edit materially changes visible visuals, render evidence is required. Case B is the mandatory final encoded visual proof even if Case A remains a preview-level visual change.

### Case B — Product Ad Proof / Number / CTA + Final Encoded MP4

This is the strongest V2.3 final product case.

Use a real 16:9 Product Ad Project with real source media. Reuse the accepted W6 fixture pattern when available instead of fabricating a synthetic media-only substitute.

Required flow:

```text
real Product Ad Project / 16:9
→ real source import / media probe / transcript / Scene context
→ real Agent session
→ ask Agent to emphasize concrete proof/numbers and CTA
→ Agent uses accepted allow-listed context/planning tools
→ Proposal only, no hidden mutation
→ Review / Diff
→ explicit Apply
→ accepted Project revision advances once
→ existing Workflow Runtime continues through accepted Stages / reviews
→ HyperFrames/Remotion boundaries remain normal
→ FINAL_RENDER through accepted render Job
→ real encoded 1920x1080 MP4
→ ffprobe + extracted-frame evidence proves accepted visible changes are actually encoded
```

The final video must visibly contain the accepted proof/number/CTA treatment. Project JSON alone is not enough.

Record:

- Project ID;
- Session/turn/Proposal IDs;
- base/apply revisions;
- Apply operation ID;
- WorkflowRun ID;
- relevant durable Job IDs;
- final render Job ID;
- final relative MP4 path;
- UI-downloaded or accepted final MP4 evidence path;
- ffprobe codec / width / height / fps / duration;
- extracted frame timestamps and what accepted treatment is visible in each frame;
- no duplicate motion/B-roll/CTA/assets/operation IDs.

### Case C — Multi-turn Manual Edit Conflict + Re-plan

Required flow:

```text
real Agent proposal at revision N
→ user manually edits Project through normal Studio/Project command path
→ Project reaches N+1
→ old proposal Review/Apply is blocked as stale
→ Agent re-reads latest context
→ Agent creates a fresh proposal
→ user's manual edit remains present
→ user explicitly applies fresh proposal once
→ Project reaches N+2 exactly
→ no duplicate mutation
```

This case must be multi-turn in the same durable Agent session unless a product defect makes that impossible.

Record:

- old Proposal ID/status/base revision;
- manual edit identity and revision;
- stale error/result;
- new turn ID and new Proposal ID;
- evidence that latest context includes the user edit;
- final Apply operation ID;
- final revision delta;
- duplicate check.

### Case D — Restart / Session Recovery on Latest Revision

Required flow:

```text
active real Agent session
→ persist useful conversation/proposal history
→ normal app/server restart
→ reopen same Project
→ same Session is discoverable and reopens
→ Project remains intact
→ next Agent turn reads latest Project revision
→ no secret/lock/process residue
```

A7 may reuse the same Project/session from Case A, B, or C if the evidence remains unambiguous.

Record:

- pre-restart Project revision;
- Session ID;
- server/runtime identity if available;
- post-restart Session list/reopen evidence;
- restored messages/turn/proposal status;
- next-turn base Project revision;
- residual lock/process check.

## Workflow / Job acceptance requirements

When an A7 case involves Workflow execution, Agent authority must remain bounded:

```text
Agent tool
→ workflow-action Proposal
→ Review
→ explicit confirmation
→ existing WorkflowService / WorkflowRunner
→ existing Durable Job / Stage executor
```

Forbidden during acceptance:

- direct Workflow JSON edits;
- direct Project JSON edits;
- invented Stage status;
- direct Agent spawning of FFmpeg/Remotion/HyperFrames/video-use;
- bypassing review checkpoints;
- a second Workflow or Job runtime.

The Product Ad final-render path should retain the accepted 16-stage Workflow semantics from V2.2 rather than create an Agent-specific render shortcut.

## Security / privacy evidence

For every formal case, confirm structurally without printing the real secret:

- API key persisted in Project: NO;
- API key persisted in Agent Session: NO;
- Authorization header persisted: NO;
- API key exposed in browser/UI/log evidence: NO;
- provider-specific secret data committed: NO;
- raw arbitrary local paths exposed to the model/browser: NO beyond bounded application-safe metadata;
- raw media is not uploaded to the language-model provider automatically merely because the Agent session exists.

## Final encoded-video evidence standard

For every case where final visible-video proof is required, record evidence from the actual encoded MP4, not only editor state:

```text
ffprobe:
- format/container
- video codec
- width/height
- fps
- duration
- audio codec when present

frame evidence:
- timestamp
- extracted frame path
- visible accepted treatment
```

Case B must include at least three relevant frame observations covering proof/number/CTA treatment where the source content allows it.

A final MP4 that renders but does not visibly contain the accepted Agent-applied change is a FAIL.

## Restart / cleanup standard

Before and after formal local acceptance, record relevant process/lock baseline and final state.

After stopping A7 runtime(s), there must be no new orphan:

- Video OS Studio dev/production server;
- Agent-created node process;
- ffmpeg/ffprobe;
- Remotion worker;
- HyperFrames process;
- stale Agent Session `.lock`.

Codex's own pre-existing processes are not acceptance failures.

## Repository integrity / freeze rule

Formal local acceptance starts only after a full exact-head GitHub CI PASS.

Once frozen:

- no tracked product code/test/config/docs commit;
- PR metadata may be updated without invalidating SHA;
- local acceptance may create isolated runtime data and external evidence files;
- any required tracked fix invalidates the freeze.

If a tracked fix is required:

```text
STOP local acceptance
→ sanitized defect report
→ fix on A7 branch through GPT Web/GitHub
→ new SHA
→ full CI
→ new freeze
→ rerun affected formal local cases
```

## Formal evidence fields

The final A7 report must record at minimum:

```text
Repository
Branch
Exact tested SHA
GitHub CI run
OS / Node
Provider / model
Project Schema

Case A
- Project ID
- Session ID
- turn IDs
- selection context
- tool calls
- Proposal ID/status
- revisions
- Apply operation ID
- reload/reopen

Case B
- Project ID
- Session ID / turn IDs
- Proposal ID
- revisions / Apply operation ID
- WorkflowRun ID
- Job IDs
- final MP4 path
- ffprobe
- frame evidence
- duplicate checks

Case C
- Project ID / Session ID
- old Proposal ID/base revision
- manual edit/revision
- stale result
- new turn / Proposal
- final Apply/revision
- manual edit preserved
- duplicate checks

Case D
- Project ID / Session ID
- pre/post restart revisions
- session reopened
- next-turn base revision
- lock/process cleanup

Security
Repository post-check
Overall PASS/FAIL
```

## Definition of A7 PASS

A7 passes only when all are true:

```text
cloud CI green on exact frozen SHA
Case A PASS
Case B PASS with real encoded MP4 + ffprobe/frame evidence
Case C PASS
Case D PASS
real provider used
explicit Review/Apply boundary preserved
latest Project revision respected
retry/apply idempotency preserved
existing Workflow/Job/engine boundaries preserved
no secret leakage
no orphan process/lock
Project Schema remains 2.0.0
exact SHA unchanged
working tree clean
```

Only after A7 PASS may V2.3 release finalization choose/bump the product version and create the V2.3 release tag. The immutable V2.2.0 tag must never move.
