# OCULUS — FINAL CANONICAL SECURITY ENGINE ARCHITECTURE

## 1. Executive Summary

Oculus has completed the **Master Security Engine Recovery & Unification Mission**.
All historical engine generations (`V1`, `V2`, `v2-sca`, `NEXT`, `shadow`, `next-shadow`, `canonical`) and mode-selection environment variables (`SCANNER_ENGINE_VERSION`) have been decommissioned and permanently eliminated from the production execution path.

The production scanning engine is now unified under **`OculusSecurityEngine`**, orchestrating five canonical analyzers through a strict capability-based registry and a shared single-parse AST / Program Model.

```
                            Scan Job (BullMQ)
                                   │
                                   ▼
                       ScanOrchestratorService
                                   │
                                   ▼
                            SandboxManager
                                   │
                                   ▼ (Worker Thread)
                        scanner-thread.worker.js
                                   │
                                   ▼
                         OculusSecurityEngine
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
         Binary / Ignore    Language Detect    ProgramModel Build
             Gating          & AST Parsing        (JS/TS Single Parse)
                │                  │                  │
                └──────────────────┼──────────────────┘
                                   │
                                   ▼
                           AnalyzerRegistry
                     (getApplicableAnalyzers())
                                   │
         ┌──────────────┬──────────┴───┬──────────────┬──────────────┐
         ▼              ▼              ▼              ▼              ▼
   SecretAnalyzer EntropyAnalyzer SastAnalyzer   TaintAnalyzer   ScaAnalyzer
     [SECRET]       [SECRET]        [SAST]          [TAINT]        [SCA]
         │              │              │              │              │
         └──────────────┴──────────┬───┴──────────────┴──────────────┘
                                   │
                                   ▼
                        Telemetry & Audit Record
                         (ANALYZER_EVALUATION)
                                   │
                                   ▼
                            FindingCorrelator
                        (Deduplication & Cross-Engine
                           Corroboration Boost)
                                   │
                                   ▼
                           Finding Persistence
```

---

## 2. Core Architectural Invariants

1. **Single Entry Point**: Every scan job runs through `OculusSecurityEngine.analyzeFile()` inside `scanner-thread.worker.js`.
2. **Zero Engine Version Switches**: `SCANNER_ENGINE_VERSION` has been completely deleted. All applicable analyzers are invoked automatically.
3. **No Wrappers / Zero Delegation Overhead**: `SecretEngineV2Adapter` and `EntropyEngineV2Adapter` have been deleted; `SecretAnalyzer` and `EntropyAnalyzer` contain direct inline implementations.
4. **Single AST / ProgramModel Parse**: JavaScript and TypeScript files are parsed exactly **once** into `ProgramModel` by `JsParser`. Both `SastAnalyzer` and `TaintAnalyzer` consume this shared AST and DFG model without duplicate parsing.
5. **Universal Failure & Timeout Isolation**: Each analyzer executes within a bounded timeout (`DEFAULT_ANALYZER_TIMEOUT_MS = 15000`) protected with isolated unref timers and exception containment. An analyzer crash or timeout never impacts sibling analyzers or corrupts scan results.
6. **Zero Silent Skips (`ANALYZER_EVALUATION`)**: The registry deterministically tags every analyzer as either `EXECUTED`, `SKIPPED`, `FAILED`, or `TIMEOUT` with structured reason codes (`unsupported_language`, `unsupported_file_type`, `requires_program_model_unavailable`, `disabled_by_config`), writing full telemetry per file.
7. **Canonical Finding Schema**: All findings adhere to a uniform contract (`analyzerId`, `analyzerVersion`, `ruleId`, `ruleType`, `severity`, `confidence`, `confidenceScore`, `vulnerabilityClass`, `cwe`, `filePath`, `lineNumber`, `fingerprint`, `evidence`, `encryptedSnippet`).

---

## 3. Component Breakdown

### 3.1 Orchestration & Engine Core (`scanner/engine/`)

| File | Class / Module | Role |
| :--- | :--- | :--- |
| `analyzer.interface.js` | `IAnalyzer` | Abstract base class defining `getCapabilities()` and `analyze(context)`. |
| `analyzer-context.js` | `AnalyzerContext` | Read-only per-file context containing file paths, language, file classification, `ProgramModel`, and resource governor. |
| `analyzer-result.js` | `AnalyzerResult` | Standardized execution wrapper (`SUCCESS`, `FAILED`, `TIMEOUT`, `SKIPPED`). |
| `analyzer-registry.js` | `AnalyzerRegistry` | Capability-based registration and evaluation engine. Factory `createProductionAnalyzerRegistry()` instantiates production analyzers. |
| `finding.js` | Finding Crypto & Normalizer | AES-256-GCM snippet encryption, SHA-256 fingerprinting, and canonical finding normalization. |
| `oculus-security-engine.js` | `OculusSecurityEngine` | Central orchestration engine managing language detection, single-parse ProgramModel generation, parallel analyzer batches, and telemetry tracking. |

### 3.2 Canonical Analyzers (`scanner/analyzers/`)

| Directory | Analyzer Class | Capabilities & Rules |
| :--- | :--- | :--- |
| `analyzers/secret/` | `SecretAnalyzer` | High-performance regex engine detecting AWS Keys, GitHub Tokens, Database Passwords, Private Keys, Slack Tokens, Stripe Keys, JWTs, Generic API Keys. |
| `analyzers/entropy/` | `EntropyAnalyzer` | Shannon entropy algorithm (threshold 4.5) with security context keyword filtering and lockfile exclusions. |
| `analyzers/sast/` | `SastAnalyzer` | AST SAST rules (`JS-SQL-001`, `JS-CMD-001`, `JS-PATH-001`, `JS-EVAL-001`, `JS-XSS-001`, `JS-XSS-002`) consuming shared AST. |
| `analyzers/taint/` | `TaintAnalyzer` | Intra-procedural source-to-sink dataflow tracker with 14 taint sources, 9 sink categories, and sanitizer recognition. |
| `analyzers/sca/` | `ScaAnalyzer` | Real SCA engine querying OSV.dev with Redis + PostgreSQL 2-tier caching, SemVer range comparison, and Direct/Transitive reachability classification. |

### 3.3 Shared Program Model (`scanner/program-model/`)

| File | Component | Responsibility |
| :--- | :--- | :--- |
| `program-model.js` | `ProgramModel` | Unified code representation holding AST, symbols, imports, exports, and call graphs. |
| `parsers/js-parser.js` | `JsParser` | Single-pass acorn parser extracting structural symbols and call sites. |
| `cfg/cfg-builder.js` | `CfgBuilder` | Intra-procedural control flow graph builder (retained for future inter-procedural analysis). |
| `dfg/dfg-builder.js` | `DfgBuilder` | Intra-procedural data flow graph builder with def-use chaining. |

---

## 4. Execution Flow Matrix

| File Type / Extension | SecretAnalyzer | EntropyAnalyzer | SastAnalyzer | TaintAnalyzer | ScaAnalyzer |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **JavaScript / TypeScript** (`.js`, `.ts`, `.jsx`, `.tsx`) | **EXECUTED** | **EXECUTED** | **EXECUTED** | **EXECUTED** | SKIPPED (`unsupported_file_type`) |
| **Manifests** (`package.json`) | **EXECUTED** | **EXECUTED** | SKIPPED (`unsupported_language`) | SKIPPED (`requires_program_model_unavailable`) | **EXECUTED** |
| **Lockfiles** (`package-lock.json`) | **EXECUTED** | SKIPPED (`lockfile_excluded`) | SKIPPED (`unsupported_language`) | SKIPPED (`requires_program_model_unavailable`) | **EXECUTED** |
| **Config / Env** (`.env`, `.yml`, `.json`) | **EXECUTED** | **EXECUTED** | SKIPPED (`unsupported_language`) | SKIPPED (`requires_program_model_unavailable`) | SKIPPED (`unsupported_file_type`) |
| **Binary / Media** (`.png`, `.exe`, `.mp4`) | *Filtered by eligibility filter before analyzer dispatch* |

---

## 5. Decommissioned & Deleted Legacy Artifacts

The following obsolete artifacts have been completely deleted from the codebase:
- `scanner/engines/secret-engine/` (V1 SecretEngine & SecretEngineV2Adapter)
- `scanner/engines/entropy-engine/` (V1 EntropyEngine & EntropyEngineV2Adapter)
- `scanner/engines/dependency-engine/` (Mock 4-package advisory DB)
- `scanner/engines/dependency-engine-next/` (Replaced by `analyzers/sca/sca-analyzer.js`)
- `scanner/engines/sast-engine/` (Replaced by `analyzers/sast/sast-analyzer.js`)
- `scanner/engines/next/` (TaintEngine & duplicate parsers replaced by canonical locations)
- `scanner/engines/core/` (Replaced by `scanner/engine/`)
- All legacy mode branches (`v1`, `v2`, `v2-sca`, `next`, `canonical`, `shadow`, `next-shadow`) in `scanner-thread.worker.js`.
