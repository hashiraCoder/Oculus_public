<div align="center">

# 👁️ Oculus
### Enterprise GitHub Security & Risk Management Platform

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red.svg)](https://redis.io/)
[![BullMQ](https://img.shields.io/badge/Queues-BullMQ-orange.svg)](https://bullmq.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-Passing%20100%25-brightgreen.svg)](#verifying-the-codebase)

**Oculus** is a production-grade application security platform that connects to GitHub organizations, analyzes repositories across multiple security disciplines (Secrets, SAST, SCA), correlates findings, and provides actionable risk governance for engineering organizations.

[Architecture](#architecture) • [3-Layer Strategy](#the-3-layer-publicprivate-strategy) • [Quick Start](#quick-start) • [CLI Guide](#developer-cli) • [Benchmarks](#verifiable-benchmarks)

</div>

---

## The 3-Layer Public/Private Strategy

This repository provides **independently verifiable engineering and product proof** of the Oculus platform without exposing proprietary zero-day detection models, confidential detection rules, or production deployment credentials.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: PRODUCT PROOF (100% Public)                                        │
│ System architecture, data flow diagrams, threat models, API specs, demos    │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 2: ENGINEERING PROOF (40–70% Public)                                  │
│ DB schemas, BullMQ queue design, worker leases, sandbox isolation,          │
│ IAnalyzer plugin interface, reference engine, developer CLI, benchmarks     │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 3: CORE IP & SENSITIVE ORCHESTRATION (Private)                        │
│ Proprietary multi-pass AST taint analysis, custom CFG/DFG solvers,          │
│ enterprise zero-day rules, production secrets & live cloud configurations   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture

Oculus is designed around decoupled, fault-tolerant distributed systems primitives:

```mermaid
flowchart TD
    GH[GitHub App / PR Webhook] -->|HMAC Verification & SSRF Guard| Gateway[Ingestion Gateway]
    Gateway -->|Enqueue Scan Job| Queue[BullMQ Distributed Queue]
    
    subgraph Worker Pool
        Queue -->|Acquire Lease| Worker[Scanner Worker]
        Worker -->|Streaming Tarball Fetch| Tar[Source Acquisition]
        Tar -->|Zip-Bomb Protection| Sandbox[Isolated Worker Thread]
        
        subgraph Security Engine Pipeline
            Sandbox --> Reg[Analyzer Registry]
            Reg --> Sec[Reference Secret Analyzer]
            Reg --> SAST[Reference SAST AST Analyzer]
            Reg --> SCA[Reference Dependency SCA Analyzer]
        end
        
        Security Engine Pipeline -->|Raw Findings| Correlator[Finding Correlator]
    end
    
    Correlator -->|AES-256-GCM Encryption| DB[(PostgreSQL Timeseries & DDL)]
    Worker -->|State Updates| Socket[Socket.IO Gateway]
    Socket --> UI[React/Vite Dashboard]
    DB --> CLI[Developer CLI & CI Gate]
```

### Key Architectural Highlights
- **Distributed Worker Leases**: Distributed lock heartbeats in Redis ensure crashed or OOM worker jobs are recovered automatically without human intervention.
- **Resource Sandboxing**: Untrusted code is analyzed in isolated worker threads with streaming decompression, strict memory boundaries, and directory traversal guards.
- **Normalized Domain Model**: Findings from different analyzers are normalized into canonical fingerprints (`SHA256(repoId + path + ruleId + snippet)`), eliminating duplicate reports across commits.
- **Cross-Engine Corroboration**: Multi-analyzer corroboration boosts confidence scores and maintains an audit trail in the `evidence` payload.
- **Encrypted Evidence at Rest**: Code snippets containing detected credentials are encrypted using AES-256-GCM before storage in PostgreSQL.

---

## Quick Start (Docker Compose)

Launch the complete Oculus demonstration stack (PostgreSQL, Redis, Backend API & Worker, and Frontend UI) with one command:

```bash
# 1. Clone the repository
git clone https://github.com/oculus-security/oculus.git
cd oculus

# 2. Launch with Docker Compose
docker compose up -d

# 3. Open the Dashboard in your browser:
#    Frontend Web UI  -> http://localhost:5173
#    Backend API      -> http://localhost:5000/health
```

---

## Local Development Setup

You can also run each component natively:

```bash
# Install all dependencies across backend, frontend, and CLI
npm install

# Run backend API and workers
npm run dev:backend

# Run frontend React/Vite dashboard
npm run dev:frontend
```

---

## Verifying the Codebase

Oculus is designed to be independently tested and verifiable:

### 1. Run Backend Unit & Integration Tests
```bash
npm run test:backend
```
Verifies engine isolation, timeout guarantees, AES-256-GCM encryption, finding correlation, and API contracts.

### 2. Run Scanner Verification Suite
```bash
npm run test:smoke
```
Executes the reference security analyzers against sample code and verifies detection accuracy.

### 3. Run Reproducible Engine Benchmarks
```bash
npm run benchmark
```

---

## Verifiable Benchmarks

Results obtained using the included reproducible benchmark runner (`benchmarks/run-benchmarks.js`):

| Target Corpus | Category | Lines Scanned | Findings Detected | Latency | Throughput |
|---|---|---|---|---|---|
| `aws-basic.js` | Cloud Secrets | 3 lines | 1 (Critical) | 10.4 ms | 288 lines/s |
| `github-basic.js` | API Tokens | 3 lines | 1 (Critical) | 2.8 ms | 1,051 lines/s |
| `sql-injection.js` | SAST (AST) | 19 lines | 1 (High) | 4.3 ms | 4,363 lines/s |
| `unsafe-eval.js` | SAST (AST) | 10 lines | 2 (Critical) | 2.3 ms | 4,264 lines/s |
| `package.json` | Dependency SCA | 10 lines | 2 (High) | 1.1 ms | 8,384 lines/s |

---

## Developer CLI

Oculus includes a developer-first CLI located in `cli/`:

```bash
# Link CLI globally
cd cli && npm link

# Authenticate with token
oculus auth login --token ocx_live_demo_token

# List repositories in workspace
oculus repo list

# Trigger a scan and block on security gate
oculus scan --repository <repo-id> --branch main --wait

# Inspect triage findings
oculus findings list --severity CRITICAL
```

---

## Repository Structure

```
oculus_public/
├── backend/                  # Express REST API, BullMQ Workers & Security Pipeline
│   ├── config/               # Environment validation, database pool, logger, redis
│   ├── database/             # PostgreSQL DDL schemas, migrations, seeders
│   ├── github/               # HMAC webhook verification, installation management
│   ├── middleware/           # Rate limiting, scope enforcement, unified JWT auth
│   ├── queues/               # BullMQ scanner, baseline, and notification queues
│   ├── scanner/              # Core scanning pipeline
│   │   ├── engine/           # IAnalyzer interface, registry, reference engine
│   │   ├── orchestrator/     # Pipeline orchestrator, lifecycle & lease coordination
│   │   ├── sandbox/          # Worker thread isolation & resource governor
│   │   └── correlation/      # Fingerprint deduplication & confidence boosting
│   └── workers/              # BullMQ queue worker processors
├── frontend/                 # React 19 + TypeScript + Vite + Tailwind Dashboard
│   └── src/
│       ├── features/         # Findings, Scans, Health, Repositories, Analytics
│       └── components/       # Risk grade badges, terminal viewers, metrics charts
├── cli/                      # Standalone Oculus Developer CLI (@oculus/cli)
├── benchmarks/               # Reproducible latency & accuracy benchmark corpora
├── docs/                     # System design RFCs, Architecture & Threat Model
└── docker-compose.yml        # Turnkey local demonstration deployment
```

---

## License

This public demonstration repository is licensed under the [Apache License 2.0](LICENSE).
Proprietary detection algorithms, AST data-flow solvers, and enterprise rules remain property of Oculus Security.
#   O c u l u s _ p u b l i c  
 