<div align="center">

# 🛡️ Oculus

<<<<<<< HEAD
### Continuous DevSecOps Intelligence & Automated Security Quality Gates for GitHub
=======
### Enterprise GitHub Security & Continuous DevSecOps Intelligence Platform
>>>>>>> a1e4d7c70c57f4f34a26c5aa92e3992cec0c27ec

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.0-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7.x-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-10B981?style=for-the-badge)](LICENSE)

<br />

<<<<<<< HEAD
**Continuous, real-time security visibility into every repository, branch, and pull request.**

Oculus connects seamlessly to your GitHub organization to discover codebases, run five specialized security analysis engines in sandboxed worker threads, compute real-time risk posture grades (**A** through **F**), and enforce automated security quality gates directly within CI/CD pipelines.

<br />

[🌐 Live Demo](https://oculus-psi.vercel.app) • [📖 Documentation](#-architecture--data-flow) • [⚡ Quick Start](#-quick-start--local-setup) • [🐛 Report Issue](https://github.com/hashiraCoder/Oculus/issues) • [💡 Request Feature](https://github.com/hashiraCoder/Oculus/issues)
=======
**Continuous visibility into the security posture of every repository, every branch, and every commit.**

Oculus connects directly to your GitHub organization to discover codebases, run five specialized security analysis engines in sandboxed worker threads, compute real-time risk posture grades (**A** through **F**), and enforce automated security quality gates directly in CI/CD pipelines.

<br />

[🌐 Live Application](https://oculus-psi.vercel.app) • [📖 CLI Documentation](./cli/README.md) • [🐛 Report Bug](https://github.com/hashiraCoder/Oculus/issues) • [💡 Request Feature](https://github.com/hashiraCoder/Oculus/issues)
>>>>>>> a1e4d7c70c57f4f34a26c5aa92e3992cec0c27ec

</div>

---

## 📑 Table of Contents

- [Overview](#-overview)
<<<<<<< HEAD
- [Key Features](#-key-features)
- [Multi-Engine Security Suite](#-multi-engine-security-suite)
- [Architecture & Data Flow](#-architecture--data-flow)
- [Security & Cryptographic Guarantees](#-security--cryptographic-guarantees)
=======
- [Key Capabilities](#-key-capabilities)
- [Architecture & Data Flow](#-architecture--data-flow)
- [Multi-Engine Security Suite](#-multi-engine-security-suite)
- [Security & Authentication Model](#-security--authentication-model)
>>>>>>> a1e4d7c70c57f4f34a26c5aa92e3992cec0c27ec
- [Tech Stack](#-tech-stack)
- [Quick Start & Local Setup](#-quick-start--local-setup)
  - [Prerequisites](#prerequisites)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
  - [4. CLI Setup](#4-cli-setup-optional)
<<<<<<< HEAD
- [CI/CD & Pipeline Quality Gates](#-cicd--pipeline-quality-gates)
- [Headless CLI Reference](#-headless-cli-reference)
- [REST API Reference](#-rest-api-reference)
- [Repository Structure](#-repository-structure)
=======
- [REST API Reference](#-rest-api-reference)
- [CI/CD & Security Gates](#-cicd--security-gates)
- [Project Directory Structure](#-project-directory-structure)
- [Production Deployment](#-production-deployment)
>>>>>>> a1e4d7c70c57f4f34a26c5aa92e3992cec0c27ec
- [Roadmap](#-roadmap)
- [Contributing Guidelines](#-contributing-guidelines)
- [License](#-license)

---

## 🔭 Overview

<<<<<<< HEAD
Modern development teams ship fast, but traditional application security testing tools are often slow, noisy, and siloed from daily developer workflows. 

**Oculus** bridges the gap between speed and security. Operating as an intelligent DevSecOps control plane, Oculus continuously evaluates your repositories through native GitHub webhooks, triggers incremental scans with sub-second decision latency, correlates findings across multiple detection disciplines, and enforces strict security policies before vulnerable code merges to production.

```mermaid
flowchart TD
    A[GitHub Organization] -->|GitHub App Webhooks| B(Event Ingestion & Webhook Gateway)
    B --> C{Event Type}
    C -->|Push / Pull Request| D[DiffPlanner: Incremental AST Delta Analysis]
    C -->|Manual / Scheduled / CLI| E[Codebase Snapshot Engine]
    D --> F[Sandboxed Worker Thread Pool]
    E --> F
    
    subgraph MultiEngine [Parallel Security Analysis Engines]
        F --> G1[Secret Engine - RE2 Regex]
        F --> G2[Entropy Engine - Shannon Metric]
        F --> G3[AST SAST Engine - Acorn Parser]
        F --> G4[Taint Flow Engine - Source to Sink]
        F --> G5[SCA Engine - Dependency Manifests]
=======
Modern software development demands security checks that run seamlessly within developer workflows without introducing bottleneck delays or false-positive fatigue. 

**Oculus** is an enterprise-grade DevSecOps platform engineered to deliver continuous security intelligence. By pairing native GitHub App webhooks with sandboxed, multi-threaded analysis engines, Oculus inspects code changes incrementally, correlates findings across multiple detection disciplines, and enforces automated pipeline gates with sub-second decision latency.

```mermaid
flowchart TD
    A[GitHub Organization] -->|GitHub App Webhook| B(Repository Discovery & Event Ingestion)
    B --> C{Trigger Type}
    C -->|Push / PR Event| D[DiffPlanner - Incremental Delta Analysis]
    C -->|Manual / CLI Scan| E[Full Codebase Snapshot]
    D --> F[Sandboxed Worker Thread Pool]
    E --> F
    
    subgraph MultiEngine [Parallel Security Analyzers]
        F --> G1[Secret Engine]
        F --> G2[Entropy Engine]
        F --> G3[AST SAST Engine]
        F --> G4[Taint Flow Engine]
        F --> G5[SCA Dependency Engine]
>>>>>>> a1e4d7c70c57f4f34a26c5aa92e3992cec0c27ec
    end
    
    G1 & G2 & G3 & G4 & G5 --> H[Finding Correlator & Deduplicator]
    H --> I[Dynamic Risk Engine: A-F Grade Calculation]
<<<<<<< HEAD
    I --> J[PostgreSQL: AES-256 Encrypted Finding Storage]
    I --> K[Socket.IO Real-Time Telemetry Stream]
    I --> L[GitHub Check Run Status Gate: Pass / Fail]
    
    K --> M[Interactive Real-Time Web Dashboard]
    L --> N[Developer PR Feedback & CI Block]
```

### 🛡️ Core Guarantees

> [!IMPORTANT]
> **Ephemeral Zero-Retention Scanning:** Source code is streamed ephemerally into isolated worker sandboxes solely for the duration of AST evaluation. Raw code is **never persisted** to databases or disk.

> [!NOTE]
> **Zero Disruption for Engineers:** Oculus operates non-intrusively. It surfaces actionable remediation suggestions, code snippets, and advisory PR statuses without introducing merge friction or modifying developer branches directly.

> [!TIP]
> **Enterprise Multi-Tenancy:** Workspaces enforce strict cryptographic role-based access control (`SUPER_ADMIN`, `ADMIN`, `MEMBER`, `VIEWER`), ensuring complete isolation across repositories, API tokens, and compliance audit records.

---

## ⚡ Key Features

### 🔍 Comprehensive Security Engines
- **Five Parallel Analyzers:** High-speed regex pattern matching, Shannon entropy calculation, Abstract Syntax Tree (AST) static analysis, taint dataflow tracking, and Software Composition Analysis (SCA).
- **Sandboxed Worker Threads:** Analyzers execute inside isolated Node.js `worker_threads` with enforceable CPU timeouts and strict memory boundaries.
- **Incremental PR Scanning (`DiffPlanner`):** Analyzes only modified files and dependent import trees on pull requests, cutting scan times from minutes to seconds.
- **Deterministic Finding Fingerprints:** Finds are assigned deterministic SHA-256 context hashes, ensuring findings retain their lifecycle history across line additions and file refactors.
- **Shadow Scanning Mode:** Test new analyzer rules and experimental heuristics side-by-side against production baselines before full promotion.

### 📊 Real-Time Posture & Analytics
- **Dynamic Risk Posture Grading (A–F):** Algorithmic scoring that dynamically weighs vulnerability severities, confidence levels, finding age, and workspace criticality.
- **Live Telemetry & Streaming Logs:** Scan execution progress, terminal logs, and system metrics broadcast via WebSocket (`Socket.IO`).
- **Engineering Scorecards:** Track remediation velocity, recurring vulnerability patterns, and historical team posture trends.
- **Multi-Format Compliance Export:** Export normalized finding sets directly to **SARIF**, **JSON**, or **CSV** formats for SIEM and reporting ingestion.

### 🔗 Native Developer Ecosystem
- **GitHub App Integration:** One-click repository discovery, synchronized webhook handling, and automated GitHub Check Runs.
- **Automated Pull Request Blocking:** Fails CI status checks when new Critical or High vulnerabilities are introduced.
- **Headless Pipeline CLI (`@oculus/cli`):** Scriptable CLI for local pre-commit checks and CI/CD pipelines (GitHub Actions, GitLab CI, CircleCI).

---

## 📡 Multi-Engine Security Suite

Every scan passes code through five specialized, non-interfering detection engines:

| Engine | Detection Technique | Primary Target Scenarios | CWE Coverage |
|---|---|---|---|
| **Secret Engine** | RE2 High-Performance Regex | AWS access keys, GitHub tokens, Slack webhooks, RSA private keys, JWT secrets, DB connection URLs | CWE-798, CWE-259 |
| **Entropy Engine** | Shannon Entropy Calculation | High-randomness cryptographic secrets, Base64 private keys, high-entropy tokens without standard prefixes | CWE-312, CWE-321 |
| **SAST Engine** | Acorn AST Pattern Matching | Code injection (`eval`, `Function`), prototype pollution, insecure deserialization, unsafe child process execution, DOM XSS | CWE-94, CWE-1321, CWE-79 |
| **Taint Engine** | Source-to-Sink Dataflow Graphs | Untrusted HTTP inputs, headers, and request parameters propagating into SQL queries, shells, or HTML sinks | CWE-89, CWE-78, CWE-116 |
| **SCA Engine** | Dependency Tree & Advisory Match | Known public CVEs in dependency manifests (`package.json`, `package-lock.json`, lockfiles) | CWE-1395, CWE-1104 |

### Finding Enrichment & Lifecycle

```
[ New Finding ] ──► [ Deduplication & Hashing ] ──► [ AES-256 Encryption ] ──► [ Open ]
                                                                                   │
                 ┌─────────────────────────────────────────────────────────────────┴──────────┐
                 ▼                                 ▼                                          ▼
          [ Confirmed ]                   [ False Positive ]                             [ Ignored ]
                 │                                 │                                          │
                 ▼                                 └──────────────────┬───────────────────────┘
            [ Fixed ]                                                 ▼
                                                              [ Complete Audit Trail ]
```

- **Fingerprint Consistency:** Deterministic SHA-256 fingerprint calculated over the syntactic context.
- **Standardized Severity Tiers:** `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, and `INFO`.
- **Triage State Machine:** `OPEN` ➔ `CONFIRMED` ➔ `FALSE_POSITIVE` ➔ `FIXED` ➔ `IGNORED`.
- **Snippet Protection:** Sensitive source code snippets are encrypted at rest with AES-256 in the database.
- **Immutable Audit Trail:** All triage status modifications record the reviewer, rationale comment, and timestamp.

---

## 🏗️ Architecture & Data Flow

Oculus follows a clean, layered architecture separating user interface, orchestration, scanning engines, and persistence:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER (SPA)                        │
│          React 19  •  TypeScript  •  Tailwind CSS 4  •  Vite 8         │
=======
    I --> J[PostgreSQL Audit & AES-Encrypted Finding Storage]
    I --> K[Socket.IO Real-time Telemetry Gateway]
    I --> L[GitHub Check Run Status Gate: Pass/Fail]
    
    K --> M[Interactive Real-Time Dashboard]
    L --> N[Developer PR Feedback & CI Blocking]
```

### 🛡️ Core Tenets & Guarantees

> [!IMPORTANT]
> **No Permanent Source Code Retention:** Source code is retrieved ephemerally into isolated worker sandboxes solely during scan execution and discarded immediately after AST evaluation. Source code is never retained in database storage.

> [!NOTE]
> **Zero-Disruption Engineering:** Oculus operates as an advisory and policy enforcement plane. It suggests actionable remediation code patches without committing unvetted changes directly to developer branches.

> [!TIP]
> **Strict Multi-Tenant Isolation:** Workspaces enforce cryptographic role scoping (`SUPER_ADMIN`, `ADMIN`, `MEMBER`, `VIEWER`), ensuring complete boundary separation across organizational repositories, API keys, and audit logs.

---

## ⚡ Key Capabilities

### 🔍 Multi-Engine Vulnerability Scanning
- **Five Concurrent Analysis Disciplines:** Regex, Shannon Entropy, Abstract Syntax Tree (AST), Taint Analysis, and Dependency Manifest scanning.
- **Sandboxed Thread Isolation:** Scans run inside dedicated Node.js `worker_threads` with enforceable execution timeouts and isolated memory heaps.
- **Incremental Diff Scanning (`DiffPlanner`):** Only changed files and dependent import graphs are analyzed on PR commits, providing rapid turnaround times.
- **Cross-Engine Finding Correlation:** Normalizes and merges overlapping alerts across analyzers into single actionable findings with deduplicated fingerprint hashes.
- **Shadow Scanning Mode:** Safely evaluate experimental rules and new analyzers side-by-side against production baselines before promoting them.

### 📊 Real-Time Posture & Analytics
- **Dynamic Risk Posture Grading (A–F):** Algorithmic scoring factoring in vulnerability severities, exploitability confidence, finding age, and workspace weights.
- **Interactive Security Telemetry:** Live streaming scan logs, progress bars, and audit records delivered over WebSockets (`Socket.IO`).
- **Developer Security Scorecards:** Trace vulnerability introduction trends and time-to-remediation across engineering teams.
- **Compliance Export:** Export filtered findings into structured **JSON**, **CSV**, or **SARIF** formats.

### 🔗 Deep GitHub & CI/CD Ecosystem Integration
- **Zero-Config GitHub App:** One-click OAuth install for complete organization repository synchronization.
- **Native Check Run Enforcement:** Blocks pull requests with critical vulnerabilities via automated GitHub commit status updates.
- **Headless Pipeline CLI (`@oculus/cli`):** Trigger scans, evaluate pass/fail criteria (`--wait`), and automate security quality gates in GitHub Actions, GitLab CI, or local terminals.

---

## 🏗️ Architecture & Data Flow

Oculus is engineered following a strict **layered clean architecture** with separation of concerns between presentation, orchestration, domain logic, and persistence.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION TIER (SPA)                         │
│       React 19  •  TypeScript  •  Tailwind CSS 4  •  Vite 8            │
>>>>>>> a1e4d7c70c57f4f34a26c5aa92e3992cec0c27ec
│                                                                        │
│   Components  ──►  Custom Hooks  ──►  Repositories  ──►  Axios Client  │
│        ▲                                                     │         │
│   View Models  ◄──  Mappers  ◄──  DTO Interfaces  ◄──────────┘         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (REST) / WSS (Socket.IO)
┌───────────────────────────────────▼────────────────────────────────────┐
│                         APPLICATION API GATEWAY                        │
│             Node.js  •  Express 5  •  Redis Pub/Sub                    │
│                                                                        │
│   Controllers  ──►  Business Services  ──►  Repositories  ──► Raw SQL  │
│        │                     │                                         │
<<<<<<< HEAD
│   Rate Limiting       Auth & Session Guard                             │
└──────────────────────────────┬─────────────────────────────────────────┘
                               │ BullMQ Task Queue
=======
│   Rate Limiting       Auth & JWT Session                               │
└──────────────────────────────┬─────────────────────────────────────────┘
                               │ BullMQ Job Enqueue
>>>>>>> a1e4d7c70c57f4f34a26c5aa92e3992cec0c27ec
┌──────────────────────────────▼─────────────────────────────────────────┐
│                    DISTRIBUTED SCANNING WORKERS                        │
│             Node.js Worker Threads  •  Sandboxed Memory                │
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │                 Parallel Analyzer Registry                   │     │
│   │  [Secret Engine]  [Entropy Engine]  [SAST Engine]            │     │
│   │  [Taint Analyzer] [SCA Dependency Graph Engine]              │     │
│   └──────────────────────────────┬───────────────────────────────┘     │
│                                  │                                     │
│                     Finding Correlator & Deduplicator                  │
│                                  │                                     │
│                     Risk Calculation Engine (A-F)                      │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
<<<<<<< HEAD
│                       PERSISTENCE & CACHING TIER                       │
│    PostgreSQL 16 (Parameterized SQL)  •  Redis 7 (BullMQ & Caching)    │
=======
│                       PERSISTENCE & CACHE TIER                         │
│   PostgreSQL 16 (Raw Parameterized SQL)  •  Redis 7 (Cache & BullMQ)   │
>>>>>>> a1e4d7c70c57f4f34a26c5aa92e3992cec0c27ec
└────────────────────────────────────────────────────────────────────────┘
```

---

<<<<<<< HEAD
## 🔒 Security & Cryptographic Guarantees

Oculus is designed according to enterprise defense-in-depth principles:
=======
## 📡 Multi-Engine Security Suite

Each scan job evaluates target files against five complementary analysis engines:

| Engine | Technique | Target Scenarios & Detects | CWE Coverage |
|---|---|---|---|
| **Secret Engine** | RE2 High-Performance Regex | Hardcoded AWS credentials, GitHub personal tokens, Slack webhooks, Private RSA keys, JWT secrets, DB connection strings | CWE-798, CWE-259 |
| **Entropy Engine** | Shannon Entropy Metric | High-randomness cryptographic secrets, Base64 private blobs, obfuscated credentials lacking standard prefix patterns | CWE-312, CWE-321 |
| **SAST Engine** | Acorn AST Pattern Matcher | Code injection (`eval`, `Function`), prototype pollution, insecure deserialization, unsafe child processes, DOM-based XSS | CWE-94, CWE-1321, CWE-79 |
| **Taint Engine** | Source-to-Sink Dataflow DFG | Unsanitized HTTP inputs, request params, and headers propagating into database queries, shells, or HTML outputs | CWE-89, CWE-78, CWE-116 |
| **SCA Engine** | Dependency Tree Analysis | Known public CVEs across package manifests (`package.json`, `package-lock.json`, lockfiles) via security advisories | CWE-1395, CWE-1104 |

### Finding Enrichment & Lifecycle
Each finding generated across engines is normalized with:
- **Unique Fingerprint:** Deterministic SHA-256 hash calculated over file context to maintain identity across line additions and file shifts.
- **Severity Rating:** `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, or `INFO`.
- **Triage Workflow:** `OPEN` ➔ `CONFIRMED` ➔ `FALSE_POSITIVE` ➔ `FIXED` ➔ `IGNORED`.
- **AES-256 Code Snippet Encryption:** Sensitive source code excerpts are encrypted at rest in PostgreSQL.
- **Audit Logging:** Every status change records the reviewing engineer, rationale comment, and timestamp in `vulnerability_audits`.

---

## 🔒 Security & Authentication Model

Oculus implements an enterprise-grade, defense-in-depth security model:
>>>>>>> a1e4d7c70c57f4f34a26c5aa92e3992cec0c27ec

```mermaid
sequenceDiagram
    autonumber
<<<<<<< HEAD
    actor Client as User / Browser
    participant Auth as Auth Gateway
    participant Store as Safe In-Memory Store
    participant DB as PostgreSQL Database
    participant API as Protected Route

    Client->>Auth: POST /api/v1/auth/login (credentials)
    Auth->>DB: Validate user, password hash, and lockout counter
    Auth-->>Client: 200 OK + Short-lived Access Token (JSON)<br/>HttpOnly Refresh Token Cookie (SameSite=Strict)
    Client->>Store: Retain Access Token in Memory (Safe Storage)
    
    Client->>API: GET /api/v1/workspaces (Authorization: Bearer <token>)
    API-->>Client: 200 OK (Workspace List)
    
    Note over Client,API: Access Token Expired (15 min lifespan)
    Client->>API: GET /api/v1/workspaces (Expired token)
    API-->>Client: 401 Unauthorized
    
    Client->>Auth: Single-Flight POST /api/v1/auth/refresh (Cookie)
    Auth->>DB: Validate Refresh Token & Session Token Version
    Auth->>DB: Rotate Refresh Token (Single-Use Revocation)
    Auth-->>Client: New Access Token + Fresh Refresh Cookie
    Client->>API: Re-execute queued original request with fresh token
    API-->>Client: 200 OK
```

- **Memory-Only Access Tokens:** Short-lived (15 min) JWTs are stored in active application memory—never in `localStorage`.
- **Single-Flight Refresh Token Rotation (RTR):** Coalesces concurrent 401 requests into a single refresh handshake, preventing race-condition lockouts.
- **Global Session Invalidation:** Incrementing a user's `token_version` immediately revokes active sessions across all devices.
- **Granular Developer Tokens:** Scoped machine tokens (`ocx_live_...`) hashed with SHA-256 for secure pipeline access.
- **Resilient Storage Fallbacks:** Automatic in-memory mock fallback when running inside hardened or cross-origin sandbox environments.
=======
    actor User as User / Client
    participant Auth as Auth Controller
    participant Store as Safe Zustand Store
    participant DB as PostgreSQL Database
    participant API as Protected API Route

    User->>Auth: POST /api/v1/auth/login (credentials)
    Auth->>DB: Validate user, password hash, and lockout state
    Auth-->>User: 200 OK + JWT Access Token (in JSON payload)<br/>Set HttpOnly Refresh Token Cookie (SameSite=Strict)
    User->>Store: Store Access Token in Memory (Safe Storage)
    
    User->>API: GET /api/v1/workspaces (Authorization: Bearer <token>)
    API-->>User: 200 OK (Protected Data)
    
    Note over User,API: Access Token Expired (15 min lifespan)
    User->>API: GET /api/v1/workspaces (Expired token)
    API-->>User: 401 Unauthorized
    
    User->>Auth: Single-Flight POST /api/v1/auth/refresh (Cookie)
    Auth->>DB: Validate Refresh Token & Session Version
    Auth->>DB: Rotate Refresh Token (Single-Use Revocation)
    Auth-->>User: New Access Token + New Refresh Cookie
    User->>API: Re-execute queued original request with fresh token
    API-->>User: 200 OK
```

- **Memory-Only Access Tokens:** 15-minute JSON Web Tokens are retained exclusively in active memory (never exposed in persistent `localStorage`).
- **Single-Flight Refresh Rotation (RTR):** Axios response interceptors coalesce simultaneous 401 responses into a single refresh flight, eliminating concurrency race conditions.
- **Global Invalidation (`logout-all`):** Incrementing the user's `token_version` in PostgreSQL instantly revokes every active access and refresh token globally.
- **Developer Token Scopes:** Granular automation tokens (`ocx_live_...`) hashed with SHA-256, strictly restricted to explicit scopes (`scans:create`, `findings:read`, `analytics:read`).
- **Resilient Storage Fallbacks:** All client storage access is wrapped with `safeSessionStorage` and `safeLocalStorage`, falling back to in-memory mocks when running inside privacy-hardened browsers or cross-origin iframes.
>>>>>>> a1e4d7c70c57f4f34a26c5aa92e3992cec0c27ec

---

## 🛠️ Tech Stack

<<<<<<< HEAD
### Frontend
| Tool | Version | Purpose |
|---|---|---|
| **React** | 19.x | Modern UI rendering and concurrent features |
| **TypeScript** | 6.x | Strict type safety for DTOs, view models, and stores |
| **Tailwind CSS** | 4.x | Design system tokens and responsive layouts |
| **Vite** | 8.x | High-speed ESM development and production bundler |
| **Zustand** | 5.x | High-performance state stores for auth and workspaces |
| **TanStack Query** | v5 | Declarative server data fetching and cache invalidation |
| **TanStack Table & Virtual** | v8 / v3 | Virtualized table rendering for high-volume finding sets |
| **Recharts** | v3 | Posture dials, severity breakdowns, and trend charts |
| **Socket.IO Client** | v4 | WebSocket listener for real-time scan progress |

### Backend
| Tool | Version | Purpose |
|---|---|---|
| **Node.js** | ≥ 18 LTS | Asynchronous runtime environment |
| **Express** | 5.x | Scalable REST API gateway (`/api/v1`) |
| **PostgreSQL** | 16 | Relational persistence with raw parameterized SQL |
| **Redis** | 7.x | Fast caching, rate limit stores, and pub/sub channels |
| **BullMQ** | v5 | Robust distributed job queue for scan orchestration |
| **Acorn & Acorn Walk** | 8.x | JavaScript / TypeScript AST parsing and AST traversal |
| **RE2** | 1.x | Safe, linear-time regular expression engine (ReDoS-immune) |
| **Socket.IO** | v4 | WebSocket server for scan telemetry and live events |
| **Commander.js** | v12 | CLI tool framework for pipeline integration |

---

## 🚀 Quick Start & Local Setup

### Prerequisites

Ensure you have the following installed locally:
- **Node.js** `≥ 18.0.0`
- **npm** `≥ 9.0.0`
- **PostgreSQL** `≥ 14` (Local or cloud managed, e.g., Supabase / Neon)
- **Redis** `≥ 6` (Local or serverless, e.g., Upstash)
- *(Optional)* A registered **GitHub App** for live repository webhook synchronization

---

### 1. Clone Repository

```bash
git clone https://github.com/hashiraCoder/Oculus.git
cd Oculus
```

---

### 2. Backend Setup

```bash
cd Backend
npm install
cp .env.example .env
```

Configure your environment variables in `Backend/.env`:

```env
# ── Server Configuration ──
PORT=3000
NODE_ENV=development
CORS_URL=http://localhost:5173

# ── PostgreSQL Database ──
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_NAME=oculus
DB_MAX_POOL_SIZE=20

# ── Redis Cache & BullMQ Queue ──
REDIS_URL=redis://127.0.0.1:6379

# ── JWT Authentication ──
JWT_SECRET=replace_with_min_32_character_random_string
JWT_REFRESH_SECRET=replace_with_min_32_character_random_string
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ── Encryption & Scanner Controls ──
FINDING_ENCRYPTION_KEY=replace_with_32_byte_aes_encryption_key
SCANNER_TIMEOUT_MS=30000
SCANNER_CONCURRENCY=2

# ── (Optional) GitHub App Integration ──
GITHUB_APP_ID=
GITHUB_APP_NAME=
GITHUB_PRIVATE_KEY=
GITHUB_WEBHOOK_SECRET=
```

Initialize the database schema and launch the development server:

```bash
# Run database schema migrations
npm run db:migrate

# Start the backend server with hot-reload
npm run dev
```

The API will be available at `http://localhost:3000/api/v1`.

---

### 3. Frontend Setup

In a new terminal window:

```bash
cd Frontend
npm install
```

Create a `.env.local` file:

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_GITHUB_APP_NAME=oculus-security-scanner
```

Start the Vite development server:

```bash
npm run dev
```

Open your browser to `http://localhost:5173` to access the Oculus dashboard.

---

### 4. CLI Setup (Optional)

To test the command-line interface locally:

```bash
cd cli
npm install
npm link

# Verify installation
oculus --version

# Authenticate with your developer token
oculus auth login --token ocx_live_your_token_here
=======
### Frontend Architecture
| Category | Technology | Purpose |
|---|---|---|
| **Framework** | [React 19](https://react.dev/) | Component architecture & modern React features |
| **Language** | [TypeScript 6](https://www.typescriptlang.org/) | Type safety across viewmodels, DTOs, and stores |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) | Design tokens and responsive layouts |
| **Build Tool** | [Vite 8](https://vite.dev/) | Development server and bundle optimizer |
| **State Management** | [Zustand 5](https://zustand.docs.pmnd.rs/) | Lightweight global stores for auth, workspace, and layout |
| **Server Cache** | [TanStack React Query v5](https://tanstack.com/query) | Declarative fetching, caching, and cache invalidation |
| **Data Tables** | [TanStack Table v8](https://tanstack.com/table) + [Virtual v3](https://tanstack.com/virtual) | Virtualized row rendering for high-volume finding tables |
| **Visualizations** | [Recharts v3](https://recharts.org/) | Risk dials, severity distributions, and trend charts |
| **Form Handling** | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) | Schema-driven form validation and runtime typing |
| **Real-Time** | [Socket.IO Client v4](https://socket.io/) | Bi-directional streaming for scan progress and notifications |

### Backend Architecture
| Category | Technology | Purpose |
|---|---|---|
| **Runtime** | [Node.js](https://nodejs.org/) (≥18 LTS) | Event-driven backend execution environment |
| **Web Server** | [Express 5](https://expressjs.com/) | Versioned RESTful API router (`/api/v1`) |
| **Database** | [PostgreSQL 16](https://www.postgresql.org/) | Relational database (Raw parameterized SQL, strict Zero-ORM) |
| **In-Memory & Cache** | [Redis 7](https://redis.io/) (`ioredis`) | Fast caching, rate limit stores, and pub/sub channels |
| **Job Queue** | [BullMQ v5](https://docs.bullmq.io/) | Distributed job queues for scans and background notifications |
| **Parsing & AST** | [Acorn](https://github.com/acornjs/acorn) + [RE2](https://github.com/google/re2) | AST generation and linear-time regular expression evaluation |
| **Real-Time Server** | [Socket.IO v4](https://socket.io/) | WebSocket server for workspace rooms and scan channels |
| **CLI Framework** | [Commander.js v12](https://github.com/tj/commander.js/) | CLI argument parsing, status exit codes, and terminal UI |

---


### CLI Setup 

To test the command-line interface locally:

```bash
cd ../cli
npm install
npm link

# Verify installation
oculus --version

# Authenticate with a Developer Token
oculus auth login --token ocx_live_your_generated_token
>>>>>>> a1e4d7c70c57f4f34a26c5aa92e3992cec0c27ec
oculus auth status
```

---

<<<<<<< HEAD
## 🚦 CI/CD & Pipeline Quality Gates

Integrate Oculus directly into your GitHub Actions workflow to block pull requests containing critical vulnerabilities.

### GitHub Actions Workflow Example

Create `.github/workflows/oculus-security.yml` in your target repository:

```yaml
name: Oculus Security Quality Gate

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  security-gate:
    name: Run Oculus Security Scanner
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Oculus CLI
        run: npm install -g @oculus/cli

      - name: Execute Security Gate
        env:
          OCULUS_API_URL: ${{ secrets.OCULUS_API_URL }}
          OCULUS_TOKEN: ${{ secrets.OCULUS_DEVELOPER_TOKEN }}
        run: |
          oculus scan \
            --workspace "${{ secrets.OCULUS_WORKSPACE_ID }}" \
            --repo "${{ github.repository }}" \
            --commit "${{ github.sha }}" \
            --wait \
            --fail-on high
```

> If vulnerabilities at or above `--fail-on` are detected, `oculus scan --wait` exits with code `1`, preventing pull request merges until resolved.

---

## 💻 Headless CLI Reference

The `@oculus/cli` binary provides comprehensive pipeline control:

```bash
# Authenticate CLI with workspace token
oculus auth login --token <DEVELOPER_TOKEN>
oculus auth status

# Trigger an immediate scan
oculus scan --repo <owner/repo> --commit <sha>

# Trigger scan and wait for quality gate evaluation
oculus scan --repo <owner/repo> --commit <sha> --wait --fail-on high

# Query workspace findings
oculus findings list --severity CRITICAL --status OPEN

# View monitored repositories
oculus repo list
```

---

## 📡 REST API Reference

All versioned endpoints are prefixed with `/api/v1`.

### 🩺 Health & Diagnostics
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | `/liveness` | Service liveness probe | No |
| `GET` | `/health` | Core subsystem health (PostgreSQL, Redis, Memory) | No |
| `GET` | `/readiness` | Job worker queue readiness probe | No |

### 🔐 Authentication & Session
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `POST` | `/auth/register` | Register new account and workspace | No |
| `POST` | `/auth/login` | Authenticate with credentials | No |
| `POST` | `/auth/refresh` | Rotate refresh token and issue fresh JWT | HttpOnly Cookie |
| `POST` | `/auth/logout` | Terminate active device session | Yes |
| `POST` | `/auth/logout-all` | Invalidate all sessions globally | Yes |

### 🏢 Workspaces & Tokens
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | `/workspaces` | List accessible user workspaces | Yes |
| `GET` | `/workspaces/:id` | Workspace details and security policies | Yes |
| `GET` | `/workspaces/:id/tokens` | List scoped developer API tokens | Yes |
| `POST` | `/workspaces/:id/tokens` | Create a new scoped developer API token | Yes (Admin) |

### 🔍 Scans & Telemetry
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `POST` | `/scans` | Dispatch a repository scan job | Yes |
| `GET` | `/scans/:id` | Scan status, timing, and progress metrics | Yes |
| `GET` | `/scans/:id/logs` | Execution log output stream | Yes |
| `GET` | `/scans/:id/gate` | CI/CD security quality gate evaluation | Token / Key |
| `POST` | `/scans/:id/cancel` | Cancel an in-flight scan | Yes |

### 📋 Findings & Triage
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | `/findings/:wsId` | Paginated list of findings with filters | Yes |
| `GET` | `/findings/:wsId/:id` | Detailed finding view & decrypted snippet | Yes |
| `PATCH` | `/findings/:wsId/:id/status` | Triage status update (`CONFIRMED`, `FALSE_POSITIVE`, etc.) | Yes |
| `GET` | `/findings/:wsId/:id/audit` | Chronological audit trail for finding | Yes |

---

## 📁 Repository Structure

```
Oculus/
├── Backend/                    # Node.js Express 5 REST API & Scan Orchestrator
│   ├── admin/                  # Super-admin observatory and health telemetry
│   ├── analytics/              # Risk trend models and posture calculators
│   ├── auth/                   # Identity, password hashing, and token services
│   ├── config/                 # Environment configuration & Winston logger
│   ├── database/               # PostgreSQL schemas and versioned SQL migrations
│   ├── email/                  # Notification providers (Brevo, SMTP, Resend)
│   ├── findings/               # Finding triage, export (SARIF/CSV), and queries
│   ├── github/                 # GitHub App integration, webhooks, and Check Runs
│   ├── middleware/             # Auth guards, rate limiting, and error handling
│   ├── notifications/          # Socket.IO gateway and Redis event subscribers
│   ├── queues/                 # BullMQ queue creators and worker schedulers
│   ├── repositories/           # Zero-ORM parameterized SQL repositories
│   ├── routes/                 # Express REST route controllers (/api/v1)
│   ├── scanner/                # Security analysis engines, sandbox, and policies
│   └── workers/                # BullMQ background job workers
│
├── Frontend/                   # React 19 Single Page Application
│   └── src/
│       ├── components/         # Layout, UI primitives, and security widgets
│       ├── features/           # Dashboard, findings, scans, analytics, settings
│       ├── layouts/            # Auth and Dashboard layout wrappers
│       ├── lib/                # Safe storage, Axios interceptors, date utils
│       ├── providers/          # React Query, Theme, and Socket.IO providers
│       ├── router/             # React Router route hierarchy
│       └── stores/             # Safe Zustand global state stores
│
├── cli/                        # Standalone @oculus/cli binary
│   ├── bin/                    # Executable entry point
│   ├── src/                    # CLI commands (scan, auth, findings, repo)
│   └── ci/                     # Reusable CI workflow templates
│
├── benchmarks/                 # Engine performance and scanner benchmarks
└── test/                       # End-to-end integration and smoke test suites
=======
## 📡 REST API Reference

All versioned endpoints are prefixed with `/api/v1`.

### 🩺 Health & Diagnostics
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | `/liveness` | Service liveness probe | No |
| `GET` | `/health` | Core subsystem health (DB, Redis, Memory) | No |
| `GET` | `/readiness` | Worker queue readiness check | No |

### 🔐 Authentication & Session Management
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `POST` | `/auth/register` | Register new account & default workspace | No |
| `POST` | `/auth/login` | Authenticate with email & password | No |
| `POST` | `/auth/refresh` | Rotate refresh token and issue new JWT | Cookie |
| `POST` | `/auth/logout` | Revoke current device session | Yes |
| `POST` | `/auth/logout-all` | Increment token version, revoking all devices | Yes |

### 🏢 Workspaces & Configuration
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | `/workspaces` | Retrieve all workspaces accessible to user | Yes |
| `GET` | `/workspaces/:id` | Fetch detailed workspace profile | Yes |
| `PATCH` | `/workspaces/:id` | Rename workspace or update policies | Yes (Admin) |
| `GET` | `/workspaces/:id/tokens` | List developer API tokens | Yes |
| `POST` | `/workspaces/:id/tokens` | Generate new scoped developer token | Yes (Admin) |

### 🔍 Security Scans & Telemetry
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `POST` | `/scans` | Dispatch new scan job for a repository | Yes |
| `GET` | `/scans/:id` | Get status, metrics, and progress of scan | Yes |
| `GET` | `/scans/:id/logs` | Fetch terminal execution logs | Yes |
| `GET` | `/scans/:id/gate` | Evaluate CI/CD security quality gate | Token / Key |
| `POST` | `/scans/:id/cancel` | Abort an active in-flight scan | Yes |

### 📋 Findings & Vulnerability Triage
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | `/findings/:wsId` | Paginated list of workspace findings with filters | Yes |
| `GET` | `/findings/:wsId/:id` | Fetch finding details & encrypted snippet | Yes |
| `PATCH` | `/findings/:wsId/:id/status` | Transition status (`CONFIRMED`, `FALSE_POSITIVE`, etc.) | Yes |
| `PATCH` | `/findings/:wsId/bulk-status` | Bulk update status across multiple findings | Yes |
| `GET` | `/findings/:wsId/:id/audit` | Retrieve full chronological audit trail | Yes |

---

## 🚦 CI/CD & Security Gates

Oculus can be dropped into any continuous integration pipeline as an automated pull request security gate.

### GitHub Actions Workflow Example

Create `.github/workflows/oculus-security.yml` in your target repository:

```yaml
name: Oculus Security Quality Gate

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  security-gate:
    name: Run Oculus Scanner
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Source Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Oculus CLI
        run: npm install -g @oculus/cli

      - name: Execute Security Gate
        env:
          OCULUS_API_URL: ${{ secrets.OCULUS_API_URL }}
          OCULUS_TOKEN: ${{ secrets.OCULUS_DEVELOPER_TOKEN }}
        run: |
          oculus scan \
            --workspace "${{ secrets.OCULUS_WORKSPACE_ID }}" \
            --repo "${{ github.repository }}" \
            --commit "${{ github.sha }}" \
            --wait \
            --fail-on high
```

If critical or high vulnerabilities are detected, `oculus scan --wait` exits with code `1`, preventing pull request merges until vulnerabilities are resolved or formally triaged.

---

## 📁 Project Directory Structure

<details>
<summary>📂 Click to inspect monorepo file structure</summary>

```
Oculus/
├── Backend/
│   ├── admin/                  # Super Admin engine observatory & queues
│   ├── analytics/              # Security posture metrics & risk trend calculators
│   ├── auth/                   # Identity, password hashing, and token services
│   ├── config/                 # Typed 12-factor env configuration & Winston logger
│   ├── database/               # Database bootstrap, seeds, and SQL migrations
│   │   ├── schema/             # DDL table schemas (users, scans, findings, audits)
│   │   └── migrations/         # Sequential SQL patch migrations
│   ├── email/                  # Notification providers (Brevo, SMTP, Resend)
│   ├── findings/               # Finding triage, export, and query services
│   ├── github/                 # GitHub App OAuth, webhooks, and Check Runs
│   ├── middleware/             # Express auth guards, rate limiters, error handler
│   ├── notifications/          # Socket.IO gateway and Redis subscriber events
│   ├── pagination/             # Keyset-based cursor pagination utility
│   ├── queues/                 # BullMQ queue creators and worker schedulers
│   ├── repositories/           # Zero-ORM raw SQL queries with connection pooling
│   ├── routes/                 # Express route definitions mounted on /api/v1
│   ├── scanner/
│   │   ├── engines/            # Secret, Entropy, SAST, Taint, and SCA analyzers
│   │   ├── orchestrator/       # Scan lifecycle state machine & correlator
│   │   ├── sandbox/            # Worker thread boundary with memory guards
│   │   └── policies/           # Configurable severity weight definitions
│   ├── security/               # Algorithmic A-F posture grade calculator
│   ├── workers/                # BullMQ background workers (Scan, Outbox, Baseline)
│   └── workspaces/             # Multi-tenant workspace isolation management
│
├── Frontend/
│   └── src/
│       ├── app/                # Root App component and Tailwind design tokens
│       ├── components/
│       │   ├── layout/         # Top navigation, Sidebar, Notifications popover
│       │   ├── security/       # Severity badges, Risk dials, Status chips
│       │   ├── shared/         # Production ErrorBoundary, loading skeletons
│       │   └── ui/             # Accessible UI primitives (Button, Dialog, Card)
│       ├── features/
│       │   ├── analytics/      # Visual trend charts and distribution breakdowns
│       │   ├── auth/           # Login, register, and token refresh hooks
│       │   ├── dashboard/      # Executive posture dashboard
│       │   ├── developers/     # Developer leaderboard & security metrics
│       │   ├── export/         # SARIF, CSV, JSON streaming export controls
│       │   ├── findings/       # Virtualized finding table & triage drawer
│       │   ├── github/         # Organization repo synchronization panel
│       │   ├── health/         # System diagnostic telemetry cards
│       │   ├── repositories/   # Monitored repository catalog
│       │   ├── scans/          # Live terminal output and scan telemetry
│       │   └── settings/       # Workspace config & Developer API Token CRUD
│       ├── layouts/            # AuthLayout and DashboardLayout wrappers
│       ├── lib/                # Safe storage, date safety, and Axios interceptor
│       ├── providers/          # QueryClient, Socket, and Theme providers
│       ├── router/             # React Router with protected workspace routes
│       └── stores/             # Safe Zustand stores (Auth, Workspace, UI)
│
├── cli/
│   ├── bin/oculus.js           # CLI executable binary
│   ├── src/
│   │   ├── commands/           # auth, scan, findings, repo, config commands
│   │   └── utils/              # Terminal formatters, HTTP client, exit codes
│   └── ci/                     # Reusable CI workflow templates
└── 
>>>>>>> a1e4d7c70c57f4f34a26c5aa92e3992cec0c27ec
```

</details>

---

<<<<<<< HEAD
## 🗺️ Roadmap

- [x] Multi-engine vulnerability detection (Secret, Entropy, AST SAST, Taint, SCA)
- [x] Sandboxed worker thread execution with strict memory & CPU limits
- [x] Incremental pull request scanning (`DiffPlanner`)
- [x] Zero-config GitHub App integration with automated Check Runs
- [x] Real-time posture dashboard with dynamic A–F health grading
- [x] Single-flight refresh token rotation with memory-only access tokens
- [x] Headless CI/CD scanner CLI (`@oculus/cli`) with quality gate exit codes
=======
## 🌐 Production Deployment

| Component | Target Platform | Deployment Command / Hook | Notes |
|---|---|---|---|
| **Frontend** | [Vercel](https://vercel.com/) | `cd Frontend && vercel --prod` | Built with Vite. Static asset routing configured with SPA fallbacks. |
| **Backend API** | [Render](https://render.com/) | `npm run start` (Node Web Service) | Auto-deploys from `main` branch. Integrated with health check probes. |
| **Database** | [Supabase](https://supabase.com/) | Parameterized PostgreSQL connection | Multi-AZ managed PostgreSQL instance with connection pooling. |
| **Redis Cache** | [Upstash](https://upstash.com/) | Secure TLS connection (`rediss://`) | Serverless Redis for distributed queues and Socket.IO adapter. |
| **CLI Tool** | [npm](https://www.npmjs.com/) | `npm publish --access public` | Globally distributable CLI package `@oculus/cli`. |

---

## 🗺️ Roadmap

- [x] Multi-engine vulnerability scanner (Secret, Entropy, SAST, Taint, Dependency)
- [x] Sandboxed worker thread execution with execution timeouts
- [x] Incremental PR diff scanning with `DiffPlanner`
- [x] Zero-config GitHub App integration with Check Runs
- [x] Real-time posture dashboard with dynamic A–F grading
- [x] Single-flight refresh token rotation with memory-only access tokens
- [x] Resilient cross-browser storage with safe in-memory fallback
- [x] Headless CI/CD scanner CLI (`@oculus/cli`) with exit status gates
>>>>>>> a1e4d7c70c57f4f34a26c5aa92e3992cec0c27ec
- [x] Full finding triage audit trails with encrypted code evidence
- [x] Shadow scan comparison engine for new analyzer rule promotion
- [ ] Automated scheduled baseline scans on inactive repositories
- [ ] In-browser custom AST query authoring interface
<<<<<<< HEAD
- [ ] Single Sign-On (SAML / OIDC / Okta) enterprise integration
- [ ] Slack, Discord, and Microsoft Teams incident webhooks
- [ ] Automated PR inline comments on vulnerable code lines
=======
- [ ] Single Sign-On (SAML / OIDC / Okta) integration
- [ ] Slack, Discord, and Microsoft Teams incident webhooks
- [ ] Automatic PR inline comments on vulnerable lines of code
>>>>>>> a1e4d7c70c57f4f34a26c5aa92e3992cec0c27ec

---

## 🤝 Contributing Guidelines

<<<<<<< HEAD
We welcome contributions from the community! To contribute:

1. **Fork the Repository:** Create your topic branch (`git checkout -b feat/analyzer-enhancement`).
2. **Commit Changes:** Use conventional commit standards (`git commit -m 'feat: add support for rust cargo lockfile'`).
3. **Preserve Architectural Invariants:**
   - Presentation components must **never** call HTTP libraries directly — always use feature repositories and TanStack Query hooks.
   - Database operations must **never** use ORMs — write clear, parameterized SQL.
   - Access tokens must **never** be placed in persistent `localStorage`.
4. **Run Verification Suites:**
   ```bash
   # Backend tests
   cd Backend && npm test
   
   # Frontend build & lint
   cd ../Frontend && npm run build && npm run lint
   ```
5. **Open a Pull Request:** Provide a clear description of changes, test coverage, and security implications.
=======
Contributions are welcome! Please ensure that all changes adhere to Oculus's architectural boundaries:

1. **Fork the Repository:** Create your topic branch (`git checkout -b feature/analyzer-enhancement`).
2. **Commit Changes:** Adhere to conventional commit standards (`git commit -m 'feat: add support for rust cargo lockfile'`).
3. **Preserve Architectural Invariants:**
   - Presentation components must **never** call HTTP libraries directly — all calls flow through repositories and React Query hooks.
   - Database operations in the backend must **never** use ORMs — write clear, parameterized SQL.
   - Access tokens must **never** be placed in persistent `localStorage`.
4. **Run Verification Suites:**
   ```bash
   # In Backend/
   npm test
   
   # In Frontend/
   npm run build
   npm run lint
   ```
5. **Open a Pull Request:** Describe the rationale, testing steps, and security impact.
>>>>>>> a1e4d7c70c57f4f34a26c5aa92e3992cec0c27ec

---

## 📄 License

This project is licensed under the **ISC License**. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with 🛡️ for engineering teams who take code security seriously.**

[Website](https://oculus-psi.vercel.app) • [GitHub Repository](https://github.com/hashiraCoder/Oculus) • [Issues](https://github.com/hashiraCoder/Oculus/issues)

</div>
