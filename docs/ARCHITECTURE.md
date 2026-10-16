# Oculus Platform Architecture & System Design

This document details the architectural principles, distributed systems design, data pipelines, sandboxing mechanics, and security controls behind **Oculus**.

---

## 1. High-Level System Architecture

Oculus operates as an asynchronous, event-driven security platform connecting GitHub organizations, scanning code on pull requests and commits, calculating security risk, and driving real-time developer feedback.

```
┌─────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
│  GitHub Events  │ ────> │ Ingestion / Gateway  │ ────> │  BullMQ Distributed  │
│ Webhooks / API  │       │  HMAC & SSRF Guards  │       │     Queue Pool       │
└─────────────────┘       └──────────────────────┘       └──────────────────────┘
                                                                    │
                                                                    ▼
┌─────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
│ Real-Time UI &  │ <──── │ Scan Orchestration   │ <──── │ Worker Pool / Lease  │
│ Developer CLI   │       │  & Lifecycle Manager │       │ Heartbeat & Recovery │
└─────────────────┘       └──────────────────────┘       └──────────────────────┘
        │                            │                              │
        │                            ▼                              ▼
┌─────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
│ PostgreSQL DDL  │       │ Finding Correlator   │ <──── │ Sandboxed Worker     │
│ & Timeseries DB │       │ & Confidence Scoring │       │ Thread Execution     │
└─────────────────┘       └──────────────────────┘       └──────────────────────┘
                                                                    │
                                                                    ▼
                                                         ┌──────────────────────┐
                                                         │ IAnalyzer Extensible │
                                                         │ Engine Plugin Suite  │
                                                         └──────────────────────┘
```

---

## 2. Ingestion & Edge Security

### GitHub Webhook Verification
- Incoming GitHub webhooks are intercepted before JSON parsing.
- HMAC signatures (`X-Hub-Signature-256`) are verified over raw request payloads using timing-safe buffer comparison to prevent timing attacks.
- Replay attack mitigation ensures timestamps and delivery UUIDs are strictly deduplicated.

### Server-Side Request Forgery (SSRF) Guard
- Outgoing requests (fetching artifacts, raw files, or third-party webhooks) pass through strict SSRF validation (`utils/ssrf.js`).
- Resolves DNS targets and rejects non-routable, loopback, link-local, multicast, or private IP ranges (e.g. `127.0.0.0/8`, `10.0.0.0/8`, `169.254.0.0/16`, AWS IMDS metadata service `169.254.169.254`).

---

## 3. Distributed Queues & Worker Resiliency

Oculus leverages **BullMQ backed by Redis** with enterprise fault tolerance guarantees:

### Worker Leases & Distributed Heartbeats
- Every scanner worker process acquires a lease in Redis (`scanner/lifecycle/worker-lease.js`).
- Leases are renewed via periodic heartbeats.
- If a worker crashes or encounters an Out-Of-Memory (OOM) event:
  1. The heartbeat expires.
  2. The `StaleScanRecovery` cron detects the orphan lease.
  3. The scan record transitions to `FAILED` or is automatically re-enqueued for retry.

### Idempotency & State Machine Transitions
- Scans follow a strict state machine: `QUEUED` → `INITIALIZING` → `ANALYZING` → `CORRELATING` → `COMPLETED` | `FAILED`.
- Terminal states (`COMPLETED`, `FAILED`, `CANCELLED`, `TIMEOUT`) are guarded against duplicate processing to prevent double-counting of security findings.

---

## 4. Sandboxed Execution & Source Acquisition

Scanning untrusted source code requires robust isolation to protect host infrastructure:

### Streamed Extraction & Zip Bomb Mitigation
- Source archives (`.tar.gz`) are acquired via authenticated GitHub App streams.
- Extracted using streaming parsers with hard bounds:
  - **Max Total Extracted Size**: Capped at 250 MB.
  - **Max File Count**: 10,000 files.
  - **Path Traversal Shield**: Any tar entry attempting relative directory traversal (e.g. `../../etc/passwd`) immediately aborts the extraction.

### Worker Thread Isolation
- Analysis executes inside dedicated Node.js `worker_threads` (`scanner-thread.worker.js`).
- **Memory Boundaries**: Managed by the `ResourceGovernor`.
- **CPU & Execution Timeouts**: Each analyzer execution is wrapped in a hard timeout (`ANALYZER_TIMEOUT_MS`). A hanging or malicious parser is terminated without affecting concurrent analyzers or host workers.

---

## 5. Extensible Engine Architecture (`IAnalyzer`)

The platform decouples detection logic from orchestration using the canonical `IAnalyzer` interface:

```typescript
export class IAnalyzer {
    getCapabilities(): AnalyzerCapabilities;
    analyze(context: AnalyzerContext): Promise<AnalyzerResult>;
}
```

### Capabilities Declaration
Each analyzer advertises its metadata:
- `id`: Unique identifier (e.g., `'reference-secret'`, `'reference-sast'`).
- `category`: `'secrets' | 'sast' | 'taint' | 'sca'`.
- `languages`: Array of supported languages (or empty for universal).
- `fileTypes`: Array of target file classifications (`'SOURCE' | 'CONFIG' | 'DEPENDENCY'`).
- `productionReady`: Flag controlling whether the analyzer runs in standard scans or experimental profiles.

### Normalized Finding Schema
Every analyzer produces canonical `Finding` entities:
- **Fingerprint**: Stable SHA-256 hash computed from `repositoryId + relativePath + ruleId + normalizedSnippet`. Line numbers are omitted to preserve fingerprint stability across commits.
- **Severity & Confidence**: Standardized levels (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`).
- **Encrypted Evidence**: Sensitive code snippets are encrypted at rest with AES-256-GCM before database insertion.

### Finding Correlator & Confidence Boosting
When multiple analyzers (e.g. SAST + Secrets or multi-rule matches) identify the same fingerprint:
1. `FindingCorrelator` deduplicates the entries into a single canonical finding.
2. Cross-engine agreement increases the `confidenceScore`.
3. All underlying analyzer results are retained in the `evidence` payload for auditability.

---

## 6. Threat Model & Tenant Isolation

| Threat | Mitigation Architecture |
|---|---|
| **Malicious Repository Code (RCE)** | Code is analyzed statically in isolated worker threads; never executed. Resource governor limits file sizes and AST depth. |
| **Archive Bomb / DoS** | Streaming tar extractor strictly checks decompression ratio and aborts if byte/file limits are exceeded. |
| **SSRF via Webhooks** | Outgoing dispatch resolves DNS and rejects loopback (`127.0.0.1`), private networks, and cloud metadata IPs (`169.254.169.254`). |
| **Tenant Data Leakage** | All database queries enforce tenant isolation through foreign-keyed `workspace_id`. Cross-workspace access returns `404 Not Found`. |
| **Secret Leaks in Platform Logs** | Code snippets with credentials are encrypted using AES-256-GCM before persistence; masked in CLI and API responses. |
| **Replay & Timing Attacks** | Webhook HMAC verification uses timing-safe constant-time comparison algorithms with timestamp validation. |

---

## 7. Verifiable Benchmarking

The public repository includes a reproducible benchmark runner (`benchmarks/run-benchmarks.js`) demonstrating sub-millisecond execution times and high throughput on realistic codebases:

```bash
npm run benchmark
```
