# ENGINE UNIFICATION AUDIT — Forensic Component Inventory
> **Project:** Oculus Security Engine Unification  
> **Audit Date:** 2026-08-31  
> **Base Path:** `d:\main_projects\Oculus\Backend\scanner\`  
> **Production Mode:** `SCANNER_ENGINE_VERSION=v2-sca` (`.env.production` line 44)

---

## How to Read This Document

Each component entry answers ten questions:

| # | Question |
|---|----------|
| 1 | **Definition** — exact file path |
| 2 | **Importers** — every file that `require`/`import`s it |
| 3 | **Instantiation** — where `new X()` is called |
| 4 | **Callers** — who invokes its public API |
| 5 | **Engine modes** — which `SCANNER_ENGINE_VERSION` values reach it |
| 6 | **Production reachable** — yes/no under `v2-sca` |
| 7 | **Duplicated** — yes/no, and by what |
| 8 | **Wrapper** — yes/no, wraps what |
| 9 | **Required by canonical component** — yes/no |
| 10 | **Removal verdict** — Now / Later / Never |

---

## Group 1 — V1 Components

### 1.1 `SecretEngine` (V1)

| Field | Value |
|-------|-------|
| **1. Definition** | `engines/secret-engine/secret.engine.js` |
| **2. Importers** | `engines/secret-engine/secret-engine-v2-adapter.js` · `sandbox/scanner-thread.worker.js` |
| **3. Instantiation** | `scanner-thread.worker.js` lines 289–293 (guarded: `engineMode === 'v1' \|\| engineMode === 'shadow'`) · `secret-engine-v2-adapter.js` constructor |
| **4. Callers** | `scanFileV1()` in `scanner-thread.worker.js` (V1 path) · `SecretEngineV2Adapter.analyze()` (V2 path) |
| **5. Engine modes** | `v1`, `shadow` (direct); `v2`, `v2-sca`, `next`, `canonical`, `next-shadow` (via adapter) |
| **6. Production reachable** | **Yes** — indirectly via `SecretEngineV2Adapter` under `v2-sca` |
| **7. Duplicated** | Yes — secret detection is also the responsibility of `SecretEngineV2Adapter`; V1 is the inner implementation |
| **8. Wrapper** | No — it is *the* wrapped object |
| **9. Required by canonical** | Yes — `SecretEngineV2Adapter` delegates all logic here |
| **10. Removal verdict** | **Later** — retire once `SecretEngineV2Adapter` is replaced by a self-contained `SecretAnalyzer` |

**Notes:**  
API: `constructor(rules)` + `scanLine(line, lineNumber, filePath)`. Uses a line-by-line scan model; does not implement `IEngine`. All rule-matching logic lives here; the adapter merely adds `readline` streaming and `ruleType=SECRET` stamping.

---

### 1.2 `EntropyEngine` (V1)

| Field | Value |
|-------|-------|
| **1. Definition** | `engines/entropy-engine/entropy.engine.js` |
| **2. Importers** | `engines/entropy-engine/entropy-engine-v2-adapter.js` · `sandbox/scanner-thread.worker.js` |
| **3. Instantiation** | `scanner-thread.worker.js` lines 289–293 (same guard as SecretEngine) · `entropy-engine-v2-adapter.js` constructor |
| **4. Callers** | `scanFileV1()` · `EntropyEngineV2Adapter.analyze()` |
| **5. Engine modes** | `v1`, `shadow` (direct); all other modes via adapter |
| **6. Production reachable** | **Yes** — via `EntropyEngineV2Adapter` under `v2-sca` |
| **7. Duplicated** | Yes — `EntropyEngineV2Adapter` is the canonical V2 wrapper for this capability |
| **8. Wrapper** | No — inner implementation |
| **9. Required by canonical** | Yes — `EntropyEngineV2Adapter` delegates Shannon entropy calculation here |
| **10. Removal verdict** | **Later** — retire once `EntropyAnalyzer` (self-contained) is built |

**Notes:**  
Shannon entropy threshold is hardcoded at **4.5** inside this file. Does not implement `IEngine`; exposes `scanLine(line, lineNumber, filePath)`.

---

### 1.3 `DependencyEngine` (V1 — Mock)

| Field | Value |
|-------|-------|
| **1. Definition** | `engines/dependency-engine/dependency.engine.js` |
| **2. Importers** | `sandbox/scanner-thread.worker.js` |
| **3. Instantiation** | `scanner-thread.worker.js` (inside `v2` branch of registry population, lines 299–327) |
| **4. Callers** | `scanFileV2()` via `EngineRegistry.getApplicableEngines()` |
| **5. Engine modes** | `v2` only |
| **6. Production reachable** | **No** — production uses `v2-sca` which substitutes `DependencyEngineNext` |
| **7. Duplicated** | Yes — `DependencyEngineNext` provides the same capability with a real data source |
| **8. Wrapper** | No |
| **9. Required by canonical** | No |
| **10. Removal verdict** | **Now** — zero production exposure; mock advisory DB (4 packages) has no value beyond local smoke-testing |

**Notes:**  
Internal `ADVISORY_DB` covers only: `lodash`, `express`, `react`, `axios`. Implements `IEngine` directly. Superseded entirely by `DependencyEngineNext`.

---

### 1.4 `scanFileV1()` (function)

| Field | Value |
|-------|-------|
| **1. Definition** | `sandbox/scanner-thread.worker.js` |
| **2. Importers** | N/A — local function, not exported |
| **3. Instantiation** | N/A — function, not a class |
| **4. Callers** | `scanner-thread.worker.js` lines 396–441 (dispatch block, guarded `engineMode === 'v1'`) · shadow mode calls it as the authoritative path |
| **5. Engine modes** | `v1`, `shadow` |
| **6. Production reachable** | **No** |
| **7. Duplicated** | Yes — `scanFileV2()` is the production equivalent |
| **8. Wrapper** | No — direct caller of V1 engine `scanLine()` methods |
| **9. Required by canonical** | No |
| **10. Removal verdict** | **Later** — remove when `shadow` mode is fully decommissioned |

---

## Group 2 — V2 Adapters and Engines

### 2.1 `SecretEngineV2Adapter`

| Field | Value |
|-------|-------|
| **1. Definition** | `engines/secret-engine/secret-engine-v2-adapter.js` |
| **2. Importers** | `sandbox/scanner-thread.worker.js` |
| **3. Instantiation** | `scanner-thread.worker.js` lines 299–327 (all non-v1 modes) |
| **4. Callers** | `scanFileV2()` via `EngineRegistry.getApplicableEngines().forEach(engine => engine.analyze(context))` |
| **5. Engine modes** | `v2`, `v2-sca`, `next`, `canonical`, `shadow` (shadow role), `next-shadow` |
| **6. Production reachable** | **Yes** |
| **7. Duplicated** | Yes — wraps `SecretEngine` (V1); does not add detection logic |
| **8. Wrapper** | **Yes** — wraps `SecretEngine`; adds readline streaming + `ruleType=SECRET` stamp |
| **9. Required by canonical** | Yes — secret detection in all current non-V1 modes routes through this |
| **10. Removal verdict** | **Later** — replace with a self-contained `SecretAnalyzer` extending `IEngine`; retire adapter and V1 inner class together |

---

### 2.2 `EntropyEngineV2Adapter`

| Field | Value |
|-------|-------|
| **1. Definition** | `engines/entropy-engine/entropy-engine-v2-adapter.js` |
| **2. Importers** | `sandbox/scanner-thread.worker.js` |
| **3. Instantiation** | `scanner-thread.worker.js` (all non-v1 modes) |
| **4. Callers** | `scanFileV2()` via `EngineRegistry` |
| **5. Engine modes** | `v2`, `v2-sca`, `next`, `canonical`, `shadow` (shadow role), `next-shadow` |
| **6. Production reachable** | **Yes** |
| **7. Duplicated** | Yes — wraps `EntropyEngine` (V1) |
| **8. Wrapper** | **Yes** — wraps `EntropyEngine`; adds lockfile skip + readline + `ruleType=SECRET` stamp |
| **9. Required by canonical** | Yes |
| **10. Removal verdict** | **Later** — same pattern as `SecretEngineV2Adapter` |

**Notes:**  
The lockfile skip is adapter-level logic, not present in the V1 inner class. This is the only *new behaviour* the adapter adds beyond delegation.

---

### 2.3 `SastEngine`

| Field | Value |
|-------|-------|
| **1. Definition** | `engines/sast-engine/sast.engine.js` |
| **2. Importers** | `sandbox/scanner-thread.worker.js` |
| **3. Instantiation** | `scanner-thread.worker.js` (all non-v1 modes) |
| **4. Callers** | `scanFileV2()` via `EngineRegistry` |
| **5. Engine modes** | `v2`, `v2-sca`, `next`, `canonical`, `shadow` (shadow role), `next-shadow` |
| **6. Production reachable** | **Yes** |
| **7. Duplicated** | Partial — `TaintEngine` covers a superset of JS vulnerabilities via DFG, but `SastEngine` is still the sole AST rule-based engine for the 5 JS rules in production |
| **8. Wrapper** | No — extends `IEngine` directly |
| **9. Required by canonical** | Yes |
| **10. Removal verdict** | **Never** (until TaintEngine rules cover the same 5 patterns and are proven in production) |

**Notes:**  
Uses `JavascriptParser` (sast-engine local parser, acorn), NOT the `JsParser` in `engines/next/parsers/`. 5 rules: `command-injection`, `path-traversal`, `sql-injection`, `unsafe-eval`, `xss`.

---

### 2.4 `JavascriptParser` (sast-engine)

| Field | Value |
|-------|-------|
| **1. Definition** | `engines/sast-engine/parsers/` |
| **2. Importers** | `engines/sast-engine/sast.engine.js` |
| **3. Instantiation** | Inside `SastEngine` |
| **4. Callers** | `SastEngine.analyze()` |
| **5. Engine modes** | Same as `SastEngine` |
| **6. Production reachable** | **Yes** |
| **7. Duplicated** | **Yes** — `JsParser` in `engines/next/parsers/js-parser.js` is a second acorn-based JS parser |
| **8. Wrapper** | No |
| **9. Required by canonical** | Yes (transitively via SastEngine) |
| **10. Removal verdict** | **Later** — consolidate into a single `JsParser`; migrate `SastEngine` to use `engines/next/parsers/js-parser.js` |

---

### 2.5 `scanFileV2()` (function)

| Field | Value |
|-------|-------|
| **1. Definition** | `sandbox/scanner-thread.worker.js` |
| **2. Importers** | N/A — local function |
| **3. Instantiation** | N/A |
| **4. Callers** | `scanner-thread.worker.js` dispatch block (lines 396–441) — called for `v2`, `v2-sca`, `next`, `canonical`, `next-shadow` (authoritative leg) |
| **5. Engine modes** | All non-v1 production modes |
| **6. Production reachable** | **Yes** |
| **7. Duplicated** | Yes — to be replaced by `OculusSecurityEngine.scan()` in the canonical design |
| **8. Wrapper** | No — iterates registry, collects results, enforces fail-closed check (lines 446–448) |
| **9. Required by canonical** | No — the canonical design replaces this with a proper class |
| **10. Removal verdict** | **Later** — replaced by `OculusSecurityEngine` |

---

## Group 3 — NEXT Engines

### 3.1 `TaintEngine`

| Field | Value |
|-------|-------|
| **1. Definition** | `engines/next/taint/taint-engine.js` |
| **2. Importers** | `sandbox/scanner-thread.worker.js` |
| **3. Instantiation** | `scanner-thread.worker.js` (inside `next`/`canonical`/`next-shadow` branches) |
| **4. Callers** | `scanFileV2()` via `EngineRegistry` (when mode includes `next`/`canonical`) |
| **5. Engine modes** | `next`, `canonical`, `next-shadow` |
| **6. Production reachable** | **NO** — production is `v2-sca`; TaintEngine is NOT registered in the `v2-sca` branch |
| **7. Duplicated** | Partial — `SastEngine` covers overlapping vulnerability classes via simpler AST pattern matching |
| **8. Wrapper** | No — extends `IEngine` directly |
| **9. Required by canonical** | Yes — the canonical target includes TaintEngine |
| **10. Removal verdict** | **Never** |

> **CRITICAL:** TaintEngine is NOT production-reachable under `SCANNER_ENGINE_VERSION=v2-sca`. Its 9 sink categories and 14 taint sources are fully implemented but gated behind `next`/`canonical` mode flags that are not set in `.env.production` (line 44).

---

### 3.2 `ProgramModel`

| Field | Value |
|-------|-------|
| **1. Definition** | `engines/next/program-model.js` |
| **2. Importers** | `engines/next/taint/taint-engine.js` |
| **3. Instantiation** | `TaintEngine.analyze()` |
| **4. Callers** | `TaintEngine` — builds AST, symbols, imports, exports, calls; lazily triggers CFG/DFG |
| **5. Engine modes** | `next`, `canonical`, `next-shadow` |
| **6. Production reachable** | **No** (same gate as TaintEngine) |
| **7. Duplicated** | No — unique abstraction |
| **8. Wrapper** | No |
| **9. Required by canonical** | Yes |
| **10. Removal verdict** | **Never** |

---

### 3.3 `JsParser` (next/parsers)

| Field | Value |
|-------|-------|
| **1. Definition** | `engines/next/parsers/js-parser.js` |
| **2. Importers** | `engines/next/program-model.js` (via ProgramModel AST construction) |
| **3. Instantiation** | Inside `ProgramModel` |
| **4. Callers** | `ProgramModel` |
| **5. Engine modes** | `next`, `canonical`, `next-shadow` |
| **6. Production reachable** | **No** |
| **7. Duplicated** | **Yes** — `JavascriptParser` in sast-engine is a second acorn parser |
| **8. Wrapper** | No — extends `IParser` |
| **9. Required by canonical** | Yes |
| **10. Removal verdict** | **Never** — this is the *canonical* parser; `JavascriptParser` should migrate to use this |

---

### 3.4 `IParser`

| Field | Value |
|-------|-------|
| **1. Definition** | `engines/next/parsers/parser.interface.js` |
| **2. Importers** | `engines/next/parsers/js-parser.js` |
| **3. Instantiation** | N/A — interface |
| **4. Callers** | N/A |
| **5. Engine modes** | `next`, `canonical`, `next-shadow` |
| **6. Production reachable** | **No** |
| **7. Duplicated** | No |
| **8. Wrapper** | No |
| **9. Required by canonical** | Yes |
| **10. Removal verdict** | **Never** |

---

### 3.5 `CfgBuilder`

| Field | Value |
|-------|-------|
| **1. Definition** | `engines/next/cfg/cfg-builder.js` |
| **2. Importers** | `engines/next/program-model.js` (lazy CFG trigger) |
| **3. Instantiation** | `ProgramModel` on-demand |
| **4. Callers** | `DfgBuilder` (DFG requires CFG); `TaintEngine` (indirectly via ProgramModel) |
| **5. Engine modes** | `next`, `canonical`, `next-shadow` |
| **6. Production reachable** | **No** |
| **7. Duplicated** | No |
| **8. Wrapper** | No |
| **9. Required by canonical** | Yes |
| **10. Removal verdict** | **Never** |

**Notes:** Hard limits — 5,000 nodes per function, 500 functions per file.

---

### 3.6 `DfgBuilder`

| Field | Value |
|-------|-------|
| **1. Definition** | `engines/next/dfg/dfg-builder.js` |
| **2. Importers** | `engines/next/program-model.js` (lazy DFG trigger) |
| **3. Instantiation** | `ProgramModel` on-demand |
| **4. Callers** | `TaintEngine` (requires DFG for taint propagation) |
| **5. Engine modes** | `next`, `canonical`, `next-shadow` |
| **6. Production reachable** | **No** |
| **7. Duplicated** | No |
| **8. Wrapper** | No |
| **9. Required by canonical** | Yes |
| **10. Removal verdict** | **Never** |

**Notes:** Hard limits — 10,000 nodes, 50,000 edges.

---

### 3.7 `SourceRegistry`

| Field | Value |
|-------|-------|
| **1. Definition** | `engines/next/taint/source-registry.js` |
| **2. Importers** | `engines/next/taint/taint-engine.js` |
| **3. Instantiation** | Module-level (registry pattern) |
| **4. Callers** | `TaintEngine` — consulted during taint source identification |
| **5. Engine modes** | `next`, `canonical`, `next-shadow` |
| **6. Production reachable** | **No** |
| **7. Duplicated** | No |
| **8. Wrapper** | No |
| **9. Required by canonical** | Yes |
| **10. Removal verdict** | **Never** |

**Notes:** 14 sources including `req.query`, `req.params`, `req.body`, `req.headers`, `req.cookies`, `process.env`, `process.argv`, etc.

---

### 3.8 `SinkRegistry`

| Field | Value |
|-------|-------|
| **1. Definition** | `engines/next/taint/sink-registry.js` |
| **2. Importers** | `engines/next/taint/taint-engine.js` |
| **3. Instantiation** | Module-level |
| **4. Callers** | `TaintEngine` — consulted during taint sink matching |
| **5. Engine modes** | `next`, `canonical`, `next-shadow` |
| **6. Production reachable** | **No** |
| **7. Duplicated** | No |
| **8. Wrapper** | No |
| **9. Required by canonical** | Yes |
| **10. Removal verdict** | **Never** |

**Notes:** 9 sink categories — `CMDI`, `SQLI`, `PATH_TRAVERSAL`, `XSS` (x2), `SSRF`, `CODE_INJECTION`, `NOSQLI`, `OPEN_REDIRECT`.

---

### 3.9 `SanitizerRegistry`

| Field | Value |
|-------|-------|
| **1. Definition** | `engines/next/taint/sanitizer-registry.js` |
| **2. Importers** | `engines/next/taint/taint-engine.js` |
| **3. Instantiation** | Module-level |
| **4. Callers** | `TaintEngine` — consulted to break taint chains at sanitizer call sites |
| **5. Engine modes** | `next`, `canonical`, `next-shadow` |
| **6. Production reachable** | **No** |
| **7. Duplicated** | No |
| **8. Wrapper** | No |
| **9. Required by canonical** | Yes |
| **10. Removal verdict** | **Never** |

---

### 3.10 `DependencyEngineNext`

| Field | Value |
|-------|-------|
| **1. Definition** | `engines/dependency-engine-next/dependency-engine-next.js` |
| **2. Importers** | `sandbox/scanner-thread.worker.js` |
| **3. Instantiation** | `scanner-thread.worker.js` (inside `v2-sca`, `next`, `canonical`, `next-shadow` branches) |
| **4. Callers** | `scanFileV2()` via `EngineRegistry` |
| **5. Engine modes** | `v2-sca`, `next`, `canonical`, `next-shadow` |
| **6. Production reachable** | **Yes** |
| **7. Duplicated** | Yes — supersedes `DependencyEngine` (mock) |
| **8. Wrapper** | No — extends `IEngine` directly |
| **9. Required by canonical** | Yes |
| **10. Removal verdict** | **Never** |

**Notes:** Uses real OSV.dev API via `AdvisoryFetcher`. Redis + DB 2-tier cache, semver-aware, distinguishes `DIRECT`/`TRANSITIVE` dependencies.

---

## Group 4 — Core Infrastructure

### 4.1 `IEngine`

| Field | Value |
|-------|-------|
| **1. Definition** | `engines/core/engine.interface.js` |
| **2. Importers** | `SecretEngineV2Adapter` · `EntropyEngineV2Adapter` · `SastEngine` · `TaintEngine` · `DependencyEngineNext` |
| **3. Instantiation** | N/A — abstract base class |
| **4. Callers** | `EngineRegistry` calls `engine.getCapabilities()` and `engine.analyze(context)` · `scanFileV2()` |
| **5. Engine modes** | All non-V1 modes |
| **6. Production reachable** | **Yes** |
| **7. Duplicated** | No (will be renamed to `IAnalyzer` in canonical design) |
| **8. Wrapper** | No |
| **9. Required by canonical** | Yes (as `IAnalyzer`) |
| **10. Removal verdict** | **Later** — rename to `IAnalyzer`; maintain backward-compatible alias during migration |

---

### 4.2 `EngineRegistry`

| Field | Value |
|-------|-------|
| **1. Definition** | `engines/core/engine-registry.js` |
| **2. Importers** | `sandbox/scanner-thread.worker.js` |
| **3. Instantiation** | `scanner-thread.worker.js` — one registry instantiated per worker thread |
| **4. Callers** | `scanFileV2()` calls `registry.getApplicableEngines(language)` |
| **5. Engine modes** | All non-V1 modes |
| **6. Production reachable** | **Yes** |
| **7. Duplicated** | No (will be renamed to `AnalyzerRegistry` in canonical design) |
| **8. Wrapper** | No |
| **9. Required by canonical** | Yes |
| **10. Removal verdict** | **Later** — rename; `register(engine)` and `getApplicableEngines(language)` API to be preserved |

---

### 4.3 `AnalysisContext`

| Field | Value |
|-------|-------|
| **1. Definition** | `engines/core/engine-context.js` |
| **2. Importers** | `sandbox/scanner-thread.worker.js` · all `IEngine` implementations (receive as argument) |
| **3. Instantiation** | `scanner-thread.worker.js` — constructed per file scan |
| **4. Callers** | Every engine's `analyze(context)` method |
| **5. Engine modes** | All non-V1 modes |
| **6. Production reachable** | **Yes** |
| **7. Duplicated** | No (will be renamed to `AnalyzerContext`) |
| **8. Wrapper** | No — plain data object carrying `scanId`, `repositoryId`, `isBaseline`, `file`, `governor` |
| **9. Required by canonical** | Yes |
| **10. Removal verdict** | **Later** — rename to `AnalyzerContext` |

---

### 4.4 `EngineResult`

| Field | Value |
|-------|-------|
| **1. Definition** | `engines/core/engine-result.js` |
| **2. Importers** | All `IEngine` implementations · `scanFileV2()` · `FindingCorrelator` |
| **3. Instantiation** | Via factory methods: `EngineResult.SUCCESS()`, `.FAILED()`, `.TIMEOUT()`, `.SKIPPED()` |
| **4. Callers** | Every engine `analyze()` return site · `FindingCorrelator` consumes results |
| **5. Engine modes** | All non-V1 modes |
| **6. Production reachable** | **Yes** |
| **7. Duplicated** | No (will be renamed to `AnalyzerResult`) |
| **8. Wrapper** | No |
| **9. Required by canonical** | Yes |
| **10. Removal verdict** | **Later** — rename to `AnalyzerResult`; factory method API stable |

---

## Group 5 — SCA Infrastructure

### 5.1 `AdvisoryFetcher`

| Field | Value |
|-------|-------|
| **1. Definition** | `sca/advisory-fetcher.js` |
| **2. Importers** | `engines/dependency-engine-next/dependency-engine-next.js` |
| **3. Instantiation** | Inside `DependencyEngineNext` |
| **4. Callers** | `DependencyEngineNext.analyze()` |
| **5. Engine modes** | `v2-sca`, `next`, `canonical`, `next-shadow` |
| **6. Production reachable** | **Yes** |
| **7. Duplicated** | No |
| **8. Wrapper** | No — encapsulates OSV.dev HTTP calls, Redis TTL=24h, DB TTL=7d, in-flight dedup |
| **9. Required by canonical** | Yes |
| **10. Removal verdict** | **Never** |

---

### 5.2 `SemverComparator`

| Field | Value |
|-------|-------|
| **1. Definition** | `sca/semver-comparator.js` |
| **2. Importers** | `engines/dependency-engine-next/dependency-engine-next.js` |
| **3. Instantiation** | Module-level utilities (`isVersionVulnerable`, `mapSeverity`, `parseVersion`) |
| **4. Callers** | `DependencyEngineNext.analyze()` |
| **5. Engine modes** | `v2-sca`, `next`, `canonical`, `next-shadow` |
| **6. Production reachable** | **Yes** |
| **7. Duplicated** | No |
| **8. Wrapper** | No |
| **9. Required by canonical** | Yes |
| **10. Removal verdict** | **Never** |

---

## Group 6 — Shared Infrastructure

### 6.1 `SandboxManager`

| Field | Value |
|-------|-------|
| **1. Definition** | `sandbox/sandbox-manager.js` |
| **2. Importers** | `orchestrator/scan-orchestrator.service.js` |
| **3. Instantiation** | `ScanOrchestratorService.executeScan()` |
| **4. Callers** | `ScanOrchestratorService` |
| **5. Engine modes** | All |
| **6. Production reachable** | **Yes** |
| **7. Duplicated** | No |
| **8. Wrapper** | No — spawns `worker_thread` running `scanner-thread.worker.js` |
| **9. Required by canonical** | Yes |
| **10. Removal verdict** | **Never** |

---

### 6.2 `ScanOrchestratorService`

| Field | Value |
|-------|-------|
| **1. Definition** | `orchestrator/scan-orchestrator.service.js` |
| **2. Importers** | `workers/scanner.worker.js` |
| **3. Instantiation** | Inside `scanner.worker.js` |
| **4. Callers** | `scanner.worker.js` (BullMQ job handler) |
| **5. Engine modes** | All |
| **6. Production reachable** | **Yes** |
| **7. Duplicated** | No |
| **8. Wrapper** | No — owns idempotency guard, calls `SandboxManager`, `FindingCorrelator`, DB transaction |
| **9. Required by canonical** | Yes |
| **10. Removal verdict** | **Never** |

---

### 6.3 `FindingCorrelator`

| Field | Value |
|-------|-------|
| **1. Definition** | `correlation/finding-correlator.js` |
| **2. Importers** | `orchestrator/scan-orchestrator.service.js` |
| **3. Instantiation** | Inside `ScanOrchestratorService` |
| **4. Callers** | `ScanOrchestratorService.executeScan()` — post-scan, receives all `EngineResult` collections |
| **5. Engine modes** | All |
| **6. Production reachable** | **Yes** |
| **7. Duplicated** | No |
| **8. Wrapper** | No — dedup by fingerprint, corroboration score +15 per corroborating engine |
| **9. Required by canonical** | Yes |
| **10. Removal verdict** | **Never** |

---

### 6.4 `SourceEligibility`

| Field | Value |
|-------|-------|
| **1. Definition** | `eligibility/source-eligibility.js` |
| **2. Importers** | `sandbox/scanner-thread.worker.js` (consulted before per-file engine dispatch) |
| **3. Instantiation** | Module-level utility |
| **4. Callers** | `scanner-thread.worker.js` dispatch block |
| **5. Engine modes** | All |
| **6. Production reachable** | **Yes** |
| **7. Duplicated** | No |
| **8. Wrapper** | No |
| **9. Required by canonical** | Yes |
| **10. Removal verdict** | **Never** |

**Notes:** Classifies files as `SOURCE` / `DEPENDENCY` / `TEST` / `CONFIG` / `VENDOR` / `GENERATED` / `CACHE` / `BINARY` / `OVERSIZED` / `UNKNOWN`.

---

### 6.5 `ResourceGovernor`

| Field | Value |
|-------|-------|
| **1. Definition** | `resource/resource-governor.js` |
| **2. Importers** | `engines/core/engine-context.js` (carried inside `AnalysisContext`) |
| **3. Instantiation** | `scanner-thread.worker.js` — constructed once per worker thread, passed into every `AnalysisContext` |
| **4. Callers** | Engines poll governor limits; `SandboxManager` enforces hard kill |
| **5. Engine modes** | All |
| **6. Production reachable** | **Yes** |
| **7. Duplicated** | No |
| **8. Wrapper** | No |
| **9. Required by canonical** | Yes |
| **10. Removal verdict** | **Never** |

**Limits:** `maxCpuTimeMs=5min`, `maxMemory=1GB`, `maxFiles=10,000`, `maxExtractedBytes=500MB`, `engineTimeoutMs=30s`.

---

### 6.6 `DiffPlanner`

| Field | Value |
|-------|-------|
| **1. Definition** | `incremental/diff-planner.js` |
| **2. Importers** | `orchestrator/scan-orchestrator.service.js` (conditional on `ENABLE_INCREMENTAL_ANALYSIS`) |
| **3. Instantiation** | `ScanOrchestratorService` when incremental mode enabled |
| **4. Callers** | `ScanOrchestratorService.executeScan()` |
| **5. Engine modes** | All (orthogonal to engine mode) |
| **6. Production reachable** | **Conditional** — only if `ENABLE_INCREMENTAL_ANALYSIS` env var is set |
| **7. Duplicated** | No |
| **8. Wrapper** | No — SHA256 hash cache + import graph BFS |
| **9. Required by canonical** | Yes |
| **10. Removal verdict** | **Never** |

---

### 6.7 `ScanTelemetry`

| Field | Value |
|-------|-------|
| **1. Definition** | `telemetry/telemetry.js` |
| **2. Importers** | Multiple scanner components |
| **3. Instantiation** | Module-level singleton |
| **4. Callers** | `record(event)` / `recordBatch(events)` → `scan_stage_telemetry` DB table |
| **5. Engine modes** | All |
| **6. Production reachable** | **Yes** |
| **7. Duplicated** | No |
| **8. Wrapper** | No |
| **9. Required by canonical** | Yes |
| **10. Removal verdict** | **Never** |

---

### 6.8 `ScanLifecycle`

| Field | Value |
|-------|-------|
| **1. Definition** | `lifecycle/scan-lifecycle.js` |
| **2. Importers** | `orchestrator/scan-orchestrator.service.js` |
| **3. Instantiation** | Inside `ScanOrchestratorService` |
| **4. Callers** | `ScanOrchestratorService.executeScan()` — drives state machine transitions |
| **5. Engine modes** | All |
| **6. Production reachable** | **Yes** |
| **7. Duplicated** | No |
| **8. Wrapper** | No — state machine |
| **9. Required by canonical** | Yes |
| **10. Removal verdict** | **Never** |

---

### 6.9 `scanner.worker.js` (BullMQ)

| Field | Value |
|-------|-------|
| **1. Definition** | `workers/scanner.worker.js` |
| **2. Importers** | Queue consumer (process entry point) |
| **3. Instantiation** | Process-level; BullMQ `concurrency=3` |
| **4. Callers** | `scannerQueue` (BullMQ) |
| **5. Engine modes** | All |
| **6. Production reachable** | **Yes** |
| **7. Duplicated** | No |
| **8. Wrapper** | No — source acquisition (`acquireFromTarball` / `acquireFromPullRequest`) + orchestrator delegation |
| **9. Required by canonical** | Yes |
| **10. Removal verdict** | **Never** |

---

## Summary Removal Verdict Table

| Component | File | Removal Verdict | Reason |
|-----------|------|----------------|--------|
| `DependencyEngine` (mock) | `engines/dependency-engine/dependency.engine.js` | **Now** | Zero production exposure; 4-package mock advisory DB |
| `SecretEngine` (V1) | `engines/secret-engine/secret.engine.js` | **Later** | Retire with adapter once `SecretAnalyzer` is built |
| `EntropyEngine` (V1) | `engines/entropy-engine/entropy.engine.js` | **Later** | Retire with adapter once `EntropyAnalyzer` is built |
| `SecretEngineV2Adapter` | `engines/secret-engine/secret-engine-v2-adapter.js` | **Later** | Replace with self-contained `SecretAnalyzer` |
| `EntropyEngineV2Adapter` | `engines/entropy-engine/entropy-engine-v2-adapter.js` | **Later** | Replace with self-contained `EntropyAnalyzer` |
| `JavascriptParser` (sast) | `engines/sast-engine/parsers/` | **Later** | Merge into canonical `JsParser` (next/parsers) |
| `scanFileV1()` | `sandbox/scanner-thread.worker.js` | **Later** | Remove when `shadow` mode decommissioned |
| `scanFileV2()` | `sandbox/scanner-thread.worker.js` | **Later** | Replace with `OculusSecurityEngine.scan()` |
| `IEngine` | `engines/core/engine.interface.js` | **Later** | Rename to `IAnalyzer` |
| `EngineRegistry` | `engines/core/engine-registry.js` | **Later** | Rename to `AnalyzerRegistry` |
| `AnalysisContext` | `engines/core/engine-context.js` | **Later** | Rename to `AnalyzerContext` |
| `EngineResult` | `engines/core/engine-result.js` | **Later** | Rename to `AnalyzerResult` |
| All other components | — | **Never** | Core infrastructure or canonical implementation |
