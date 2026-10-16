# Oculus Recovery Audit Report

**Audit type:** Read-only recovery audit  
**Codebase modified:** No  
**Current repository commit:** `6ca60c1`  
**Branch:** `master`, synchronized with `origin/master`

## Executive Summary

Oculus has moved from a structurally wired but unverified system to a system with important production paths executed successfully.

Verified in production:

```text
Manual UI scan
→ API
→ PostgreSQL
→ BullMQ
→ scanner worker
→ GitHub source acquisition
→ engines
→ findings count
→ scan completion
→ CI gate
→ GitHub Check Run
```

Also verified:

```text
GitHub pull_request.opened
→ Oculus webhook
→ HTTP 200
→ scan execution
→ check_run.created
→ check_run.completed
```

The core scanning and GitHub automation paths are operational. Remaining work is primarily around findings retrieval/rendering, full webhook regression coverage, engine maturity, CLI/CI verification, observability, security hardening, and deployment process validation.

---

# 1. Current Architecture

```text
Frontend: React + Vite
Backend: Node.js + Express
Database: PostgreSQL / Supabase
Queue: BullMQ
Broker: Redis / Upstash
Realtime: Socket.IO
Source provider: GitHub App
Frontend hosting: Vercel
Backend hosting: Render
CLI: Node.js + Commander
```

Main production API:

```text
https://oculus-ue1s.onrender.com
```

Production frontend:

```text
https://oculus-psi.vercel.app
```

Canonical API prefix:

```text
/api/v1
```

---

# 2. Production Evidence

## Manual Scan

**Status: RUNTIME VERIFIED**

Observed:

```text
Run Scan
→ POST /api/v1/scans
→ scan created
→ QUEUED
→ SCANNING
→ COMPLETED
```

Verified behavior:

- UI button sends the API request.
- Scan row is created.
- BullMQ job is produced.
- Scanner worker consumes the job.
- GitHub source is acquired.
- Security engines execute.
- Scan completes.
- CI gate is calculated.
- GitHub Check Run is created and completed.
- Manual scans are classified as `MANUAL`.

## GitHub PR Webhook

**Status: RUNTIME VERIFIED**

Latest evidence:

```text
X-GitHub-Event: pull_request
action: opened
PR: #1
Repository: hashiraCoder/Newtube
Webhook response: 200
```

Observed event chain:

```text
pull_request.opened
→ webhook accepted
→ scanner execution
→ check_run.created
→ check_run.completed
```

This proves the main GitHub PR automation path is functioning.

## Webhook Security

**Status: RUNTIME VERIFIED**

An invalid signature request returned:

```text
401 Invalid GitHub webhook signature
```

This confirms the webhook does not accept unsigned or incorrectly signed requests.

## Production Dependencies

**Status: RUNTIME VERIFIED**

Production readiness reported:

```json
{
  "ready": true,
  "database": "connected",
  "redis": "connected",
  "queues": "ready"
}
```

---

# 3. Phase Status Matrix

| Area | Status | Evidence |
|---|---|---|
| Frontend loading | Runtime verified | Production pages load |
| Authentication | Previously verified | Existing authenticated session works |
| Workspace routing | Runtime verified | Workspace pages load |
| Repository sync | Runtime verified | Five repositories visible |
| Manual scan trigger | Runtime verified | UI created scan |
| Manual scan worker path | Runtime verified | Scan completed |
| GitHub PR webhook | Runtime verified | `pull_request.opened` returned 200 |
| Webhook signature validation | Runtime verified | Invalid signature returned 401 |
| Scanner source acquisition | Runtime verified | Production scan acquired GitHub source |
| BullMQ readiness | Runtime verified | `/readiness` reported queues ready |
| Check Run creation | Runtime verified | `check_run.created` observed |
| Check Run completion | Runtime verified | `check_run.completed` observed |
| Findings count | Runtime verified | Scan reported findings |
| Findings API rendering | Partial | Count and rows have shown inconsistent behavior |
| Socket.IO connection | Partial | Polling works; WebSocket upgrade produces 400/closed events |
| Database migration parity | Unverified | No direct schema comparison performed |
| Cross-tenant isolation | Partial | Static route protections exist; full runtime matrix incomplete |
| Developer token flow | Static only | Code exists, production CLI flow not verified |
| CI gate flow | Partial | Gate result and Check Run observed; independent CI request not verified |
| CLI | Static only | CLI exists, advertised commands not fully tested |
| Deployment reproducibility | Partial | Vercel/Render operate, clean redeploy reproduction not verified |
| Full webhook duplicate test | Unverified | Delivery deduplication exists in code |
| Merged PR baseline scan | Unverified | Code path exists, real merged PR not tested |

---

# 4. Frontend Audit

## Implemented and Verified

- Login and authenticated workspace entry
- Workspace navigation
- Repository listing
- Repository selection drawer
- Manual Run Scan action
- Scan detail navigation
- Scan status display
- CI gate display
- Findings count display
- GitHub repository sync UI
- Findings explorer
- Activity page
- Dashboard and analytics pages

## Fixes Completed

### Manual scan trigger

Previous behavior:

```text
Run Scan
→ navigate to Scans page
```

Current behavior:

```text
Run Scan
→ POST /api/v1/scans
→ open created scan
```

### Scan status model

Frontend now understands:

```text
QUEUED
SCANNING
PASSED
FAILED
COMPLETED
CANCELLED
```

### Terminal scan state

Completed scans no longer display:

```text
Scan is still running
```

when the scan has reached a terminal state.

### Cancellation indicator

The stale `Cancelling...` indicator was corrected to display only while the scan is active.

## Remaining Frontend Issues

### Findings mismatch

Observed state:

```text
25 vulnerabilities found
Findings unavailable
```

The scan count is nonzero, but the scan-specific findings endpoint has returned no rows in some cases.

Likely contributing factors:

- Historical scans were created before the deduplication association fix.
- Existing vulnerability rows may have remained linked to an older scan.
- API retrieval and finding persistence need one clean post-fix scan verification.

### Dashboard date formatting

Earlier production evidence showed:

```text
Invalid Date • s
```

in Recent Scans.

This should be rechecked after the latest deployment.

### Socket.IO transport

Observed:

```text
WebSocket upgrade failed or closed
HTTP 400
```

Polling continues to work, so realtime is partially functional. The impact of polling fallback should be assessed before changing transport configuration.

---

# 5. Backend API Audit

## Canonical Routing

```text
Frontend
→ /api/v1
→ Express
→ v1 router
```

Mounted routes include:

```text
/api/v1/auth
/api/v1/workspaces
/api/v1/pagination
/api/v1/scans
/api/v1/findings
/api/v1/analytics
/api/v1/github
```

## Manual Scan Contract

```http
POST /api/v1/scans
```

Payload:

```json
{
  "repositoryId": "repository-id",
  "commitSha": "optional-sha",
  "branch": "optional-branch",
  "triggerSource": "optional-source"
}
```

Response contains:

```json
{
  "scanId": "created-scan-id"
}
```

## Manual Classification

Manual scans now use:

```text
triggered_by = MANUAL
```

Earlier code used:

```text
triggered_by = API
```

which did not match the intended enum values.

## Webhook Classification

PR webhook scans use:

```text
triggered_by = WEBHOOK
```

and:

```text
trigger_source = github_webhook:pull_request:<action>
```

---

# 6. Webhook Audit

## Supported Events

The current backend processes:

```text
installation
installation_repositories
pull_request
ping
```

Supported pull request actions:

```text
opened
synchronize
reopened
closed
```

For `closed`, the scan is created only when:

```text
pull_request.merged = true
```

## Webhook Processing

```text
GitHub
→ raw request body
→ HMAC SHA-256 validation
→ event persistence
→ duplicate delivery check
→ workspace lookup
→ repository lookup
→ scan creation
→ scanner or baseline queue
→ worker
```

## Verified

- Pull request webhook reached production.
- Signature validation passed.
- Endpoint returned HTTP 200.
- Scanner execution followed.
- GitHub Check Run was created and completed.

## Remaining

- Verify `pull_request.synchronize`.
- Verify duplicate delivery ID handling with a controlled replay.
- Verify merged PR starts a baseline scan.
- Verify webhook failure causes GitHub retry behavior.
- Verify unknown repository or workspace handling.
- Verify webhook processing does not create scans when repository mapping is missing.

## Important Design Decision

`check_run` and `check_suite` should remain non-triggering events.

They are reporting callbacks:

```text
Oculus scan
→ Check Run update
→ GitHub check_run webhook
```

Treating them as scan triggers would create a loop.

---

# 7. Queue and Worker Audit

## Queues

```text
scanner
baseline-scan
webhook-delivery
```

Workers include:

```text
scanner.worker.js
baseline.worker.js
webhook-delivery.worker.js
outbox.worker.js
```

## Verified

- Redis is connected.
- BullMQ reports ready.
- Manual scan produced a scanner job.
- Scanner worker processed the job.
- Production scan completed.
- GitHub Check Run lifecycle was observed.

## Remaining

- Direct retry/backoff test.
- Failed job recovery test.
- Stalled job test.
- Worker restart test.
- Baseline queue execution test.
- Webhook-delivery queue execution test.
- Confirmation that workers run continuously as an independent production process.
- Queue metrics and dead-letter visibility.

---

# 8. Scanner Audit

## Implemented Path

```text
scanner worker
→ GitHub installation token
→ repository tarball or PR files
→ extraction
→ file filtering
→ sandbox worker
→ engines
→ normalized findings
```

## Protections Present

- Symlink blocking
- Hardlink blocking
- Path traversal checks
- Zip-slip checks
- Archive decompression limit
- Binary detection
- File size limits
- Line size limits
- Excluded directories
- Excluded extensions
- Worker timeout

## Verified

- Production source acquisition succeeded for the tested repository.
- A previous failure was correctly classified:
  ```text
  SOURCE_NOT_FOUND
  ```
- Root cause was identified as a queue payload mismatch:
  ```text
  producer: repo
  worker: repositoryName
  ```
- Producer was corrected to send `repositoryName`.

## Remaining

- Large archive test.
- Symlink archive test.
- Path traversal archive test.
- Empty repository behavior.
- GitHub permission failure behavior.
- Tarball timeout behavior.
- Worker timeout behavior.
- Production scan of multiple repository types.

---

# 9. Engine Audit

## Engine Inventory

| Engine | Current Assessment |
|---|---|
| Secret | Implemented and observed through findings |
| Entropy | Implemented in code; production-specific attribution incomplete |
| SAST | Architecture and code path present; independent rule coverage incomplete |
| Dependency | Architecture present; capability scope is limited |
| V2 adapters | Transitional/shadow architecture remains |

## Secret Engine

Implemented:

- AWS access key detection
- Database password detection
- GitHub token detection
- Private key detection
- Slack token detection

Observed production finding examples include:

```text
GITHUB_TOKEN
DATABASE_PASSWORD
HIGH_ENTROPY_SECRET
```

Remaining:

- Independent fixture-based production attribution.
- False-positive review.
- Multi-line secret coverage.
- Encoded secret coverage.

## Entropy Engine

Implemented:

- Context keyword matching
- Tokenization
- Shannon entropy calculation
- Threshold-based detection

Known limitation:

```text
Keyword and token generally need to be on the same line.
```

Remaining:

- Confirm engine attribution in persisted findings.
- Test short secrets.
- Test encoded values.
- Test hash false positives.

## SAST Engine

The V2 architecture describes AST-based rules for:

- SQL injection
- XSS
- Path traversal
- Command injection
- Unsafe eval

Remaining:

- Independent runtime verification of each rule.
- Confirm all claimed rules are active in the production worker.
- Confirm parser failure isolation.
- Confirm findings persist with correct engine attribution.

## Dependency Engine

Current effective scope appears primarily focused on:

```text
package.json
```

Remaining:

- Verify actual advisory database behavior.
- Confirm vulnerable dependency fixture.
- Confirm line number mapping.
- Decide whether Python, Java, and other manifests are supported.
- Document unsupported manifest types.

## V1/V2 Architecture

The project contains V1 engine paths and V2 adapters.

Remaining decision:

```text
Choose one canonical production engine execution mode.
```

The following must be documented:

```text
V1
V2
shadow
```

Shadow mode should not remain enabled unintentionally.

---

# 10. Findings Audit

## Implemented Pipeline

```text
engine finding
→ normalization
→ fingerprint
→ vulnerability upsert
→ PostgreSQL
→ API
→ frontend
```

## Fix Applied

Deduplicated findings are now reassigned to the latest scan:

```sql
scan_id = EXCLUDED.scan_id
```

Occurrence count is incremented:

```sql
number_of_occurrences = vulnerabilities.number_of_occurrences + 1
```

## Remaining Defects

### Findings retrieval

The UI can show:

```text
37 vulnerabilities found
```

while the scan-specific vulnerability endpoint returns zero rows.

This requires a clean post-fix production scan to verify.

### Engine attribution

The findings UI supports displaying an engine, but the historical audit identified inconsistent or incomplete engine persistence. This must be verified against new findings.

### Snippet visibility

The codebase contains encrypted snippets, but historical audit evidence indicated that some findings endpoints omit snippets or do not expose them consistently.

### Deduplication semantics

Moving `scan_id` to the newest scan solves scan-specific rendering, but the product should explicitly decide whether:

- A finding belongs only to the latest scan, or
- A finding has scan occurrence history in a separate relation.

---

# 11. Developer Token Audit

## Implemented

Developer token functionality exists under:

```text
Backend/workspaces/services/token.service.js
Backend/middleware/token.middleware.js
Backend/middleware/unified-auth.middleware.js
```

Token format:

```text
ocx_live_<public-id>_<secret>
```

The backend hashes the secret and stores the hash in `developer_tokens`.

## Intended Uses

Developer tokens appear intended for:

```text
CLI
CI integrations
Machine-to-machine API calls
```

## Current Status

**STATIC ONLY**

Not fully verified:

- Token creation in production.
- Token authentication against production.
- Workspace scope enforcement.
- Token revocation.
- Expired/revoked token rejection.
- CLI usage.
- CI usage.
- Token audit history.

## Security Requirement

Developer tokens must never be logged or returned after creation. Only the token hash and public prefix should be persisted.

---

# 12. CLI Audit

## Implemented

CLI package:

```text
@oculus/cli
```

Command currently present:

```text
oculus scan
```

Options:

```text
--repository
--branch
--commit
--wait
```

Authentication uses:

```text
OCULUS_TOKEN
```

API configuration uses:

```text
OCULUS_API_URL
```

## Current Status

**STATIC ONLY**

Risks identified:

- Default API URL points to localhost.
- Production API URL must be explicitly configured.
- CLI reads `response.data.id`, while the backend response contract should be checked for the actual `scanId` nesting.
- No automated CLI tests exist.
- No CLI test script is implemented.
- Exit code behavior needs production verification.

## Remaining

- Run CLI against production.
- Test trigger-only mode.
- Test `--wait`.
- Test pass gate exit code.
- Test failed gate exit code.
- Test invalid token.
- Test invalid repository.
- Test API timeout.
- Update documentation for supported commands.

---

# 13. CI Gate Audit

## Implemented

The backend exposes a scan gate endpoint:

```http
GET /api/v1/scans/:id/gate
```

Gate states include:

```text
PENDING
PASSED
FAILED
```

GitHub Check Run integration exists and production evidence confirms:

```text
check_run.created
check_run.completed
```

## Verified

- Scan gate result generated.
- GitHub Check Run completed.
- Failed security result was reported to GitHub.
- Findings summary was included in Check Run output.

## Remaining

- Independent CI request using a developer token.
- Exact CI endpoint documentation.
- Policy threshold verification.
- Deterministic pass fixture.
- Deterministic fail fixture.
- GitHub branch protection behavior.
- Check Run annotation verification.
- CLI-to-CI compatibility.

---

# 14. Database and Migration Audit

## Tables in Active Use

The code references:

```text
users
workspaces
users_workspaces
repositories
scans
scan_files
scan_events
scan_logs
vulnerabilities
vulnerability_audits
developer_tokens
workspace_developer_metrics
github_developer_identities
dashboard_snapshots
repository_risk_snapshots
risk_policies
github_webhook_events
github_check_runs
integration_webhooks
notifications
```

## Current Status

**PARTIAL**

The application is operating against production PostgreSQL, but complete migration parity has not been independently confirmed.

## Remaining

- Compare production schema to all migrations.
- Verify enum values.
- Verify indexes and foreign keys.
- Verify `scan_status_enum` includes `COMPLETED` and `CANCELLED`.
- Verify all columns selected by API queries exist in production.
- Verify migration order on a clean database.
- Verify migration rollback or recovery procedure.
- Verify no destructive migration is required.

---

# 15. Socket.IO Audit

## Verified

- Socket.IO connection is attempted.
- Polling transport works.
- Scan events appear in Activity.
- Production emits scan lifecycle events.

## Partial

WebSocket upgrade has produced errors such as:

```text
WebSocket closed before connection was established
HTTP 400
```

Polling fallback remains functional.

## Remaining

- Confirm expected Render proxy behavior.
- Confirm allowed transports.
- Confirm reconnect behavior.
- Confirm duplicate listener prevention.
- Confirm workspace room isolation.
- Confirm scan room isolation.
- Confirm events:
  ```text
  oculus.scan.progress
  oculus.scan.log
  oculus.scan.completed
  finding.updated
  dashboard.summary.updated
  repository.updated
  workspace_updated
  ```

---

# 16. Notifications Audit

## Implemented

Notification routes and services exist.

Production Activity evidence shows scan-related events.

## Remaining

- Verify notification row creation.
- Verify unread count.
- Verify mark-read.
- Verify mark-all-read.
- Verify pagination.
- Verify realtime notification updates.
- Investigate historical errors involving missing `workspace_id`.
- Confirm old notification routes are unused before cleanup.

---

# 17. Deployment and CI/CD Audit

## Current Deployment

```text
Frontend: Vercel
Backend: Render
Database: Supabase PostgreSQL
Redis: Upstash
```

## Verified

- Frontend deployment is reachable.
- Backend deployment is reachable.
- Readiness endpoint reports database, Redis, and queues connected.
- Frontend and backend communicate in production.

## Remaining

- Confirm exact Render worker deployment model.
- Confirm workers remain alive continuously.
- Confirm clean deployment runs migrations safely.
- Confirm frontend build uses correct production API URL.
- Confirm backend environment variables are managed only in Render.
- Confirm rollback process.
- Confirm deployment health checks.
- Confirm deployment alerting.
- Confirm branch protection and required checks.

---

# 18. Observability Audit

## Implemented

Endpoints:

```text
/liveness
/health
/readiness
```

Readiness checks:

```text
PostgreSQL
Redis
BullMQ readiness
```

## Remaining

- Add structured scan correlation IDs where absent.
- Ensure worker failures are searchable.
- Ensure source acquisition failures include safe context.
- Ensure queue retry exhaustion is visible.
- Ensure webhook delivery failures are visible.
- Ensure no secrets appear in logs.
- Add production log retention and alerting.
- Add metrics for:
  ```text
  scan duration
  queue wait time
  source acquisition time
  engine duration
  finding count
  webhook failures
  worker failures
  ```

---

# 19. Orphan, Dead, Legacy, and Shadow Components

## Likely Active

```text
scanner.worker.js
baseline.worker.js
webhook-delivery.worker.js
outbox.worker.js
WebhookService
ScanService
ScanOrchestratorService
Engine execution paths
Developer token middleware
CLI scan command
```

## Shadow or Transitional

```text
V1 engine paths
V2 engine adapters
Secret V2 adapter
Entropy V2 adapter
V1/V2 execution mode switching
```

These should not be deleted until production references and configuration are fully checked.

## Potentially Orphaned or Incomplete

```text
CLI commands without test coverage
Legacy notification routes
Unused API compatibility routes
Benchmark scripts
Old forensic audit scripts
Unused engine modes
Unused worker exports
```

## Already Removed

Several obsolete forensic/reporting files have been removed in prior commits, including old report generator and audit output files.

## Cleanup Rule

Do not remove additional components until:

```text
runtime references are searched
production behavior is verified
replacement path is confirmed
rollback is possible
```

---

# 20. Security Findings

## Critical

Production credentials were present in the local `.env.production` file during the audit.

The file is ignored and not tracked by Git, but the credentials must be treated as exposed.

Required later action:

```text
Rotate database credentials
Rotate Redis credentials
Rotate JWT secrets
Rotate GitHub App private key
Rotate GitHub webhook secret
Rotate email provider key
Redeploy backend
```

This was intentionally deferred at the user’s request.

## Verified

- Invalid webhook signatures are rejected.
- GitHub App installation token path works for tested scan.
- Workspace-scoped API routes exist.
- JWT authentication is active.

## Remaining

- Cross-workspace IDOR tests.
- Repository isolation tests.
- Scan isolation tests.
- Finding isolation tests.
- Expired access token tests.
- Revoked refresh token tests.
- Developer token revocation tests.
- Rate limit tests.
- CORS verification.
- Cookie security verification.
- Production secret rotation.

---

# 21. Priority List

## P0

1. Rotate exposed production credentials.
2. Verify all production environment variables after rotation.
3. Confirm no secrets are present in logs, Git history, or deployment artifacts.

## P1

1. Fix and verify findings API/rendering consistency.
2. Verify `pull_request.synchronize`.
3. Verify merged PR baseline scan.
4. Verify duplicate webhook delivery protection.
5. Complete cross-tenant authorization testing.
6. Confirm production worker continuity.
7. Confirm canonical V1/V2 engine execution mode.

## P2

1. Verify CLI against production.
2. Verify developer token lifecycle.
3. Verify independent CI gate request.
4. Verify Socket.IO room isolation and reconnect behavior.
5. Complete database migration parity audit.
6. Add queue failure/retry tests.
7. Verify engine-specific finding attribution.

## P3

1. Clean remaining legacy/shadow components.
2. Improve dashboard date and empty-state handling.
3. Add performance metrics.
4. Add automated CLI and webhook regression suites.
5. Improve documentation and deployment runbooks.

---

# 22. Recommended Next Sequence

```text
1. Findings API/rendering verification
2. PR synchronize test
3. Duplicate webhook test
4. Merged PR baseline test
5. Developer token production test
6. CLI production test
7. CI gate production test
8. Cross-tenant security tests
9. Database migration parity check
10. Socket.IO isolation/reconnect test
11. Engine V1/V2 canonicalization
12. Credential rotation
13. Legacy cleanup
14. Final regression matrix
```

---

# 23. Final Current Assessment

## Recovered

```text
Manual UI scan: VERIFIED
GitHub PR opened automation: VERIFIED
Webhook signature validation: VERIFIED
BullMQ readiness: VERIFIED
Scanner worker execution: VERIFIED
GitHub source acquisition: VERIFIED
Check Run creation: VERIFIED
Check Run completion: VERIFIED
Production database: CONNECTED
Production Redis: CONNECTED
Production queues: READY
```

## Partially Recovered

```text
Findings API/UI rendering
Socket.IO transport
Engine-by-engine attribution
Database migration parity
Multi-tenant authorization
Notifications
CI gate
Developer tokens
CLI
Deployment reproducibility
```

## Not Yet Fully Verified

```text
PR synchronize automation
Merged PR baseline scan
Duplicate webhook replay behavior
Developer token lifecycle
CLI production execution
Independent CI request
Cross-tenant attack matrix
Clean deployment reproduction
Final security posture
```

## Overall Assessment

Oculus is no longer blocked at the core scan trigger. The most important production paths now execute:

```text
Manual UI scan
and
GitHub PR webhook scan
```

The system should be classified as:

```text
CORE SCANNING PATH: RUNTIME VERIFIED
GITHUB PR AUTOMATION: RUNTIME VERIFIED
FULL PRODUCTION RECOVERY: PARTIALLY VERIFIED
PRODUCTION READY: NOT YET DECLARED
```

The next highest-value work is findings consistency, webhook regression coverage, developer token/CLI/CI validation, and security remediation.

Created 3 todos

User: do it and proceed

GitHub Copilot: Updated todo list

I’ll proceed with the next concrete recovery item: make the findings contract consistent so a completed scan’s reported findings are retrievable and renderable. I’ll start from the current orchestrator and vulnerability API path, form one local hypothesis, then apply and validate the smallest fix.

