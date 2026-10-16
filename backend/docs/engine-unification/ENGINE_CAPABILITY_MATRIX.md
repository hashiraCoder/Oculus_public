# ENGINE CAPABILITY MATRIX
> **Project:** Oculus Security Engine Unification  
> **Audit Date:** 2026-08-31  
> **Production Mode:** `SCANNER_ENGINE_VERSION=v2-sca` (`.env.production` line 44)

---

## Reading Guide

- **V1 Implementation** — code that predates the `IEngine` contract; typically accessed via `scanLine()`.
- **V2 Implementation** — code that implements `IEngine` (`getCapabilities`, `analyze`); either native or an adapter wrapping V1.
- **NEXT Implementation** — code in `engines/next/` using `ProgramModel`, CFG, DFG, and taint infrastructure.
- **Canonical Target** — the intended single implementation after unification.
- **Status in Production** — based on `SCANNER_ENGINE_VERSION=v2-sca` in `.env.production` line 44.

---

## Capability Matrix

| Capability | V1 Implementation | V2 Implementation | NEXT Implementation | Canonical Target | Status in Production |
|------------|-------------------|-------------------|---------------------|-----------------|---------------------|
| **Secret Detection** | `SecretEngine` (`engines/secret-engine/secret.engine.js`) — line-by-line `scanLine()`, rule-based regex | `SecretEngineV2Adapter` (`engines/secret-engine/secret-engine-v2-adapter.js`) — wraps V1, adds readline streaming, stamps `ruleType=SECRET` | None | `SecretAnalyzer` (to be created) — self-contained, extends `IAnalyzer` | **ACTIVE** via `SecretEngineV2Adapter` → `SecretEngine` |
| **Entropy Detection** | `EntropyEngine` (`engines/entropy-engine/entropy.engine.js`) — Shannon entropy, threshold 4.5, line-by-line | `EntropyEngineV2Adapter` (`engines/entropy-engine/entropy-engine-v2-adapter.js`) — wraps V1, adds lockfile skip + readline | None | `EntropyAnalyzer` (to be created) — self-contained with lockfile skip built in | **ACTIVE** via `EntropyEngineV2Adapter` → `EntropyEngine` |
| **AST-based SAST** | None | `SastEngine` (`engines/sast-engine/sast.engine.js`) — acorn AST, 5 JS rules via `JavascriptParser` (local) | None | `SastAnalyzer` (rename/refactor of `SastEngine`, migrate to canonical `JsParser`) | **ACTIVE** directly |
| **Intra-procedural Taint Analysis** | None | None | `TaintEngine` (`engines/next/taint/taint-engine.js`) — `ProgramModel` + `DfgBuilder`, 14 sources, 9 sink categories, sanitizer patterns | `TaintAnalyzer` (rename of `TaintEngine`) | **NOT ACTIVE** — gated behind `next`/`canonical` modes; not registered in `v2-sca` branch of `scanner-thread.worker.js` |
| **SCA / Dependency Scanning** | `DependencyEngine` (`engines/dependency-engine/dependency.engine.js`) — mock `ADVISORY_DB`, 4 packages only | `DependencyEngineNext` (`engines/dependency-engine-next/dependency-engine-next.js`) — real OSV.dev via `AdvisoryFetcher`, Redis+DB 2-tier cache, `DIRECT`/`TRANSITIVE` | None (same `DependencyEngineNext` used) | `ScaAnalyzer` (rename of `DependencyEngineNext`) | **ACTIVE** via `DependencyEngineNext` (`v2-sca` branch); mock `DependencyEngine` NOT active |
| **CFG Construction** | None | None | `CfgBuilder` (`engines/next/cfg/cfg-builder.js`) — intra-procedural, limits: 5,000 nodes/fn, 500 fns/file | `CfgBuilder` (unchanged — already canonical) | **NOT ACTIVE** — only reachable when `TaintEngine` is invoked |
| **DFG Construction** | None | None | `DfgBuilder` (`engines/next/dfg/dfg-builder.js`) — intra-procedural, limits: 10,000 nodes, 50,000 edges | `DfgBuilder` (unchanged) | **NOT ACTIVE** — same gate as `TaintEngine` |
| **JS Parsing** | None | `JavascriptParser` (`engines/sast-engine/parsers/`) — acorn, used only by `SastEngine` | `JsParser` (`engines/next/parsers/js-parser.js`) — acorn, implements `IParser`, produces symbols/imports/calls/exports | `JsParser` (next/parsers) — `JavascriptParser` to be migrated to use this | **PARTIAL** — `JavascriptParser` active (via SastEngine); `JsParser` not active (gated with NEXT) |
| **Finding Correlation** | None | `FindingCorrelator` (`correlation/finding-correlator.js`) — dedup by fingerprint, corroboration score +15 per engine | Same `FindingCorrelator` used | `FindingCorrelator` (unchanged) | **ACTIVE** |
| **Incremental Analysis** | None | `DiffPlanner` (`incremental/diff-planner.js`) — SHA256 hash cache, import graph BFS, `FileCache` + `ImportGraph` | Same | `DiffPlanner` (unchanged) | **CONDITIONAL** — requires `ENABLE_INCREMENTAL_ANALYSIS` env var |
| **Source Eligibility** | None | `SourceEligibility` (`eligibility/source-eligibility.js`) — `isEligibleFile`, `classifyFile` (10 classes) | Same | `SourceEligibility` (unchanged) | **ACTIVE** |
| **Resource Governance** | None | `ResourceGovernor` (`resource/resource-governor.js`) — `maxCpuTimeMs=5min`, `maxMemory=1GB`, `maxFiles=10k`, `maxExtractedBytes=500MB`, `engineTimeoutMs=30s` | Same | `ResourceGovernor` (unchanged) | **ACTIVE** |

---

## Production Coverage Summary (v2-sca mode)

```
Capability                       Active in Production?   Implementation Active
──────────────────────────────── ───────────────────── ─────────────────────────────────────────
Secret Detection                 YES                    SecretEngineV2Adapter → SecretEngine
Entropy Detection                YES                    EntropyEngineV2Adapter → EntropyEngine
AST-based SAST (5 JS rules)      YES                    SastEngine → JavascriptParser
Intra-procedural Taint Analysis  NO  ← COVERAGE GAP     TaintEngine exists but NOT registered
SCA / Dependency Scanning        YES                    DependencyEngineNext → AdvisoryFetcher
CFG Construction                 NO                     CfgBuilder (taint-gated)
DFG Construction                 NO                     DfgBuilder (taint-gated)
Finding Correlation              YES                    FindingCorrelator
Incremental Analysis             CONDITIONAL            DiffPlanner (env-gated)
Source Eligibility               YES                    SourceEligibility
Resource Governance              YES                    ResourceGovernor
```

---

## Capability Gap Analysis

### Gap 1: Taint Analysis Not in Production

`TaintEngine` is implemented and tested (`tests/scanner/taint-engine.test.js`) but is only registered in the `next` and `canonical` branches of `scanner-thread.worker.js` (lines 299–327). The production branch `v2-sca` (`.env.production` line 44) does **not** register `TaintEngine`. This means:

- 14 taint sources are defined but never evaluated in production.
- 9 sink categories (`CMDI`, `SQLI`, `PATH_TRAVERSAL`, `XSS`×2, `SSRF`, `CODE_INJECTION`, `NOSQLI`, `OPEN_REDIRECT`) are defined but never matched in production.
- Intra-procedural data flow analysis (DFG) is never executed in production.

The AST-based `SastEngine` (5 pattern-match rules) is the only SAST mechanism active in production, providing no data-flow tracking.

### Gap 2: Mock SCA Remains in Codebase

`DependencyEngine` (mock, 4 packages) is still registered in the `v2` branch and imported in `scanner-thread.worker.js`. It is dead code relative to production but still present. Risk: a misconfiguration that accidentally sets `SCANNER_ENGINE_VERSION=v2` would activate the mock instead of `DependencyEngineNext`.

### Gap 3: Two Acorn Parsers

Both `JavascriptParser` (sast-engine) and `JsParser` (next/parsers) wrap acorn. Any future acorn upgrade or parse option change must be applied in both places. This creates a maintenance split.

---

## Canonical Capability Targets

After unification, each capability should have exactly one canonical implementation:

| Capability | Canonical Class | Canonical File (proposed) |
|------------|----------------|--------------------------|
| Secret Detection | `SecretAnalyzer` | `engines/analyzers/secret.analyzer.js` |
| Entropy Detection | `EntropyAnalyzer` | `engines/analyzers/entropy.analyzer.js` |
| AST-based SAST | `SastAnalyzer` | `engines/analyzers/sast.analyzer.js` |
| Taint Analysis | `TaintAnalyzer` | `engines/analyzers/taint.analyzer.js` |
| SCA | `ScaAnalyzer` | `engines/analyzers/sca.analyzer.js` |
| JS Parsing | `JsParser` | `engines/next/parsers/js-parser.js` (existing) |
| Correlation | `FindingCorrelator` | `correlation/finding-correlator.js` (existing) |
| Incremental | `DiffPlanner` | `incremental/diff-planner.js` (existing) |
| Eligibility | `SourceEligibility` | `eligibility/source-eligibility.js` (existing) |
| Governance | `ResourceGovernor` | `resource/resource-governor.js` (existing) |
