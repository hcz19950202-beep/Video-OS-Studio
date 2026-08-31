# Video OS Studio V2.5 C0 — Local MCP Threat Model and Authentication Design

Status: C0 security baseline for review  
Applies to future C4/C5 Local MCP work. C0 itself opens no listener and exposes no endpoint.

## 1. Security objective

The Local MCP Bridge grants external local Agents bounded **Video OS application authority**, not generic computer authority.

Security invariant:

```text
MCP client
→ authenticated local session
→ application-owned Tool Registry
→ application-owned risk/approval policy
→ accepted Application Service
→ accepted Project / Workflow / Job / Mission / QA truth
```

Never:

```text
MCP client
→ raw filesystem / shell / Git / arbitrary network / desktop control
→ raw project.json / workflow / job persistence
```

## 2. Trust boundaries

Treat as untrusted:

- every local process other than the Video OS server process;
- every MCP client, including correctly installed Codex/Claude/Cursor clients;
- every model/provider output;
- Project text, transcript text, asset metadata and imported content;
- request arguments, tool IDs, Project IDs, operation IDs and protocol metadata supplied by a client;
- stale/replayed requests after reconnect or server restart.

Treat as application-owned truth only after validation:

- Shared Tool Registry definitions;
- risk class and approval policy;
- authenticated connection/session identity;
- accepted Project/Workflow/Job/Mission/QA repositories/services;
- durable operation/idempotency claims;
- user approval bound to exact operation context.

## 3. Transport boundary

Primary V2.5 transport is Streamable HTTP bound to:

```text
127.0.0.1 only
```

Rules:

1. Do not bind `0.0.0.0` by default.
2. Do not implicitly enable LAN/remote access.
3. Prefer an ephemeral port unless a client integration requires a configured local port.
4. If IPv6 loopback is added later, it requires explicit separate acceptance; `::` is not an acceptable substitute for `::1`.
5. No CORS wildcard.
6. No credential in URL query strings.
7. No cookie-based ambient authentication for MCP.

Remote MCP access is outside V2.5.0 scope.

## 4. Authentication design

Localhost is not authentication.

### 4.1 Pairing credential

When the user explicitly enables/adds a local client, Video OS generates a one-time pairing secret using a cryptographically secure RNG with at least 256 bits of entropy.

Pairing secret properties:

```text
single-use
short-lived (target <= 10 minutes)
never stored in Project JSON
never stored in Agent transcript
never written to public logs
never accepted from URL query parameters
```

The one-time pairing exchange produces a per-client bearer credential with at least 256 bits of entropy.

### 4.2 Per-client bearer credential

Every normal MCP request uses:

```text
Authorization: Bearer <client credential>
```

The raw server-side credential must not be stored in ordinary Project/Mission/Workflow/Job/QA JSON. The future bridge uses a dedicated local secret boundary beneath the workstation data root or a stronger OS secret store when available.

C4/C5 implementation must fail closed if the selected persistence mechanism cannot enforce user-local protection appropriate to the accepted Windows workstation. It must not silently fall back to a broadly readable plaintext application JSON file.

A stored verifier may be a cryptographic hash of the high-entropy client credential rather than the raw credential.

### 4.3 Client identity

A successful pairing creates application-owned identity:

```text
connectionId
clientId
clientType
clientLabel
credential verifier
createdAt
lastSeenAt
revokedAt?
toolContractVersion
```

Client-supplied labels are display metadata only. They do not grant scopes or risk downgrades.

### 4.4 Rotation and revocation

Credential rotation:

- invalidates the old credential immediately;
- invalidates active sessions derived from it;
- invalidates outstanding reusable approvals tied to the old session/credential identity;
- does not cancel already accepted durable Jobs unless the user separately cancels them.

Per-client revocation must be supported without rotating every other client.

## 5. Session model

Authentication creates a short-lived server session bound to:

```text
sessionId
connectionId/clientId
authorized Project scope
Tool Registry contract version
createdAt
lastSeenAt
```

A session does not own Project truth.

Project switching must invalidate Project-scoped cached references and approvals. The client must re-resolve current Project/revision before mutation-capable work.

Suggested liveness target for C4 measurement:

```text
heartbeat/activity interval: ~2s when connected
stale connected state deadline: <=5s after loss of liveness
```

The UI must derive `connected/degraded/disconnected` from current server session evidence, never only from persisted UI state.

## 6. Request boundary

Future HTTP adapter defaults:

```text
allowed bind: 127.0.0.1
allowed method set: protocol-required only
max request body: 1 MiB initial default
max header bytes: bounded by server runtime, target <=16 KiB
per-client in-flight tool calls: bounded, initial target <=8
application tool dispatch timeout: <=30s
large transcript/assets: pagination/search/summary, not unbounded payloads
```

R3 long-running work must return durable operation/Job identity instead of holding one fragile HTTP request for the full render/generation duration.

## 7. Browser-origin / loopback CSRF defense

A malicious web page can attempt requests to loopback addresses, so `127.0.0.1` is not sufficient protection.

Future bridge requirements:

1. Bearer authentication is mandatory.
2. Do not enable permissive CORS.
3. Reject unexpected browser `Origin` values.
4. Validate `Host`/authority against the actual loopback listener and configured port.
5. Do not accept bearer credentials through cookies, URL fragments or query strings.
6. Pairing must require explicit in-app user action and a one-time secret; visiting a web page cannot silently pair a client.
7. State-changing requests require normal application approval/risk rules even after authentication.

## 8. Threat analysis

| Threat | Failure mode | Required mitigation |
| --- | --- | --- |
| Untrusted local process | Discovers port and calls Video OS | Loopback + high-entropy bearer auth + per-client identity + scopes |
| Malicious/buggy MCP client | Sends unexpected tool/args or excessive calls | Allow-listed shared registry, schema validation, bounded concurrency/payload, fail closed |
| Stale/replayed request | Repeats a prior mutation/render | Stable operation ID/idempotency claim, expected revision, approval binding, safe replay result |
| Cross-project request | Client applies action to another Project | Session Project scope, service-side Project ownership check, ContextReference project binding |
| Credential leak | Another process impersonates client | Per-client credentials, rotation/revocation, secret redaction, no query-string/cookie transport |
| Loopback CSRF / browser-origin confusion | Web page attacks localhost bridge | Bearer auth, strict Origin/CORS/Host handling, explicit pairing |
| Port discovery | Process scans localhost | Port secrecy is not relied on; authentication remains mandatory |
| Client disconnect | UI or durable work becomes inconsistent | Session liveness only affects connection state; durable Job truth remains authoritative |
| Server restart | In-memory state lost mid-operation | No durable truth owned by transport; reconnect reauthenticates/revalidates Project and operation IDs |
| Long-running Job disconnect | HTTP connection loss marks work failed/completed incorrectly | Return durable Job/operation ID; query accepted Job/Mission/Workflow truth after reconnect |
| Oversized payload | Memory/CPU denial or data leakage | Request/response size limits, pagination/search, bounded tool schemas |
| Prompt injection in Project/transcript | Imported text instructs model to bypass policy | Treat content as data; application owns tool catalog, scopes, risk, approval and validation |
| Tool result injection | Tool output attempts to alter policy | Output schema validation; policy is not read from model/tool prose |
| Approval confusion | Approval for one action reused for another | Bind approval to client/session, tool ID+version, Project, expected revision, operation/arguments digest and expiry |
| Secret/log leakage | Token/path appears in logs/errors | Structured redaction, safe public errors, sensitive argument metadata, no raw request header logging |
| Path traversal | Client coerces asset/project reads outside data root | Logical IDs only at tool boundary; accepted path-safe repositories/services resolve paths |
| Generic computer authority | MCP becomes shell/fs/network bridge | No such tools in Shared Tool Registry; adapter cannot dynamically expose arbitrary functions |

## 9. Approval binding

An approval is capability evidence for one bounded operation, not a generic permission slip.

For R2/R3/R4, approval records must bind at least:

```text
approvalId
clientId/sessionId
toolId
tool contract version
risk class
Project ID
expected Project revision when applicable
stable operation ID when applicable
canonical argument digest
approval mode
timestamp / expiry
```

Changing arguments, Project, revision, tool version or client identity invalidates the approval.

`Always Ask` cannot be weakened by a session allowlist. `Deny` cannot be overridden by the model/client.

## 10. Replay and idempotency

Protocol request IDs are not sufficient idempotency keys.

Mutation/job tools use an application-owned stable `operationId` contract. The accepted application service/repository owns claim/replay behavior.

Expected flow:

```text
request
→ authenticate session
→ resolve tool contract
→ validate input
→ validate Project/session scope
→ resolve approval policy
→ claim/check stable operation ID
→ expected revision check where required
→ call accepted service
→ persist authoritative result/evidence
→ return bounded result
```

If the same stable operation is retried, return/reconcile the existing authoritative outcome rather than dispatching duplicate work.

## 11. Cross-project and stale context defense

`ContextReference` is context, not authorization.

For every reference/tool use:

1. `reference.projectId` must match the session-authorized Project.
2. Logical target must resolve against current accepted truth.
3. Deleted/replaced/unresolvable targets fail closed.
4. R2/R3/R4 actions also enforce their own expected revision/idempotency semantics.
5. A Project switch invalidates previous Project-scoped approvals and draft context attachments for mutation use.

No client may supply an arbitrary path to escape these rules.

## 12. Prompt-injection boundary

Project names, transcript text, captions, asset labels, QA explanations and imported metadata may contain adversarial instructions.

They are always treated as untrusted content.

They cannot define or change:

```text
tool IDs
risk class
required scopes
approval mode
authentication
Project authorization
idempotency policy
path safety
secret access
```

The model may propose an action. The application decides whether that action exists and may run.

## 13. Audit model

Every externally triggered tool call must produce structured application activity sufficient to answer who/what/when/result without exposing secrets or hidden reasoning.

Minimum audit metadata:

```text
timestamp
connectionId/clientId
sessionId
toolId + version
risk class
Project ID
operationId when present
approvalId/mode when present
result status
Project revision before/after when applicable
History/Proposal/Workflow/Job/Mission/QA evidence IDs when applicable
redacted error code
```

Do not persist chain-of-thought. Do not log Authorization headers, pairing secrets or raw sensitive fields.

## 14. Disconnect and restart semantics

Transport state never overrides durable application truth.

- A disconnected client is not proof a Job failed.
- A server restart is not permission to redispatch the same operation.
- Reconnect requires current authentication/session establishment and current Project/revision resolution.
- Durable Job/Workflow/Mission state is re-read from accepted repositories/services.
- Cancellation uses the underlying accepted cancellation capability; closing HTTP alone is not cancellation of a durable Job.

## 15. Explicitly forbidden V2.5 MCP capabilities

The Video OS Shared Tool Registry must not expose generic:

```text
shell / PowerShell / bash
filesystem traversal
Git
arbitrary HTTP/network fetch
computer/desktop control
raw secret read
raw Project JSON write
raw Workflow persistence write
raw Job persistence write
raw Mission persistence write
```

External clients may independently possess their own computer tools. That authority is outside Video OS and must not be inherited by the Video OS MCP server.

## 16. C4/C5 implementation gates derived from C0

C4 read bridge cannot be accepted unless:

- listener is loopback-only;
- auth/pairing is enforced before tool discovery/execution;
- browser-origin confusion is tested;
- request/response limits are tested;
- only shared R0/R1-safe capabilities intended for C4 are exposed;
- cross-project reads fail closed;
- logs redact credentials and machine paths.

C5 mutation bridge cannot be accepted unless, in addition:

- R2/R3/R4 approval binding exists;
- stable operation id/replay tests exist;
- expected revision/stale tests exist;
- Protected Edit policy cannot be bypassed;
- Audit evidence exists;
- disconnect/restart does not duplicate durable mutation/Job dispatch;
- cancellation propagation is proven where supported.

## 17. C0 security acceptance checklist

- [x] Untrusted-local-process threat modeled.
- [x] Malicious/buggy client threat modeled.
- [x] Replay/stale request threat modeled.
- [x] Cross-project threat modeled.
- [x] Credential leak/rotation/revocation boundary defined.
- [x] Loopback CSRF/browser-origin confusion modeled.
- [x] Port discovery is explicitly not trusted as security.
- [x] Disconnect/restart/long Job semantics defined.
- [x] Oversized payload limits defined.
- [x] Prompt injection boundary defined.
- [x] Per-client pairing/bearer/session identity design defined.
- [x] Audit/redaction requirements defined.
- [ ] C4 implementation proves transport controls.
- [ ] C5 implementation proves mutation/approval controls.
