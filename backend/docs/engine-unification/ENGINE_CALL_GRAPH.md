# ENGINE CALL GRAPH
> **Project:** Oculus Security Engine Unification  
> **Audit Date:** 2026-08-31  
> **Base Path:** `d:\main_projects\Oculus\Backend\scanner\`  
> **Production Mode:** `SCANNER_ENGINE_VERSION=v2-sca` (`.env.production` line 44)

---

## 1. Production Entry Point — Full Path

```
[BullMQ Queue]
  queues/scanner.queue.js
    attempts=5, exponential backoff
    │
    ▼
workers/scanner.worker.js                          concurrency=3
  WorkerLease.acquire()
  source acquisition:
    acquireFromTarball(job)  OR  acquireFromPullRequest(job)
    │
    ▼
orchestrator/scan-orchestrator.service.js
  ScanOrchestratorService.executeScan()
    idempotency guard (early-return if scan already running)
    ScanLifecycle.transition(QUEUED → RUNNING)
    DiffPlanner.plan()  [if ENABLE_INCREMENTAL_ANALYSIS]
    │
    ▼
sandbox/sandbox-manager.js
  SandboxManager.executeScan()
    spawns worker_thread → sandbox/scanner-thread.worker.js
    │
    ▼
sandbox/scanner-thread.worker.js
  reads: process.env.SCANNER_ENGINE_VERSION  [line 268]
  default: 'v2-sca'
  calls: [see per-mode sections below]
    │
    ▼ (after thread completes)
correlation/finding-correlator.js
  FindingCorrelator.correlate(allEngineResults)
    dedup by fingerprint
    corroboration score +15 per extra engine
    │
    ▼
DB transaction (findings persistence)
ScanLifecycle.transition(RUNNING → COMPLETED)
ScanTelemetry.recordBatch(events)
```

---

## 2. `scanner-thread.worker.js` Internal Structure

```
scanner-thread.worker.js
  │
  ├─ Line 268: engineMode = process.env.SCANNER_ENGINE_VERSION || 'v2-sca'
  │
  ├─ Lines 289–293: V1 Engine Initialization (conditional)
  │     if (engineMode === 'v1' || engineMode === 'shadow') {
  │       secretEngineV1   = new SecretEngine(rules)
  │       entropyEngineV1  = new EntropyEngine()
  │     }
  │
  ├─ Lines 299–327: V2/NEXT Registry Population (if/else if chain)
  │     [per-mode branches — see sections 3–8 below]
  │
  ├─ Lines 396–441: Per-File Dispatch
  │     for each file in fileList:
  │       eligibility = SourceEligibility.isEligibleFile(file)
  │       if (!eligible) continue
  │       if (engineMode === 'v1')          → scanFileV1(file)
  │       if (engineMode === 'shadow')      → scanFileV1(file) [auth] + scanFileV2(file) [shadow]
  │       if (engineMode === 'next-shadow') → scanFileV2(file) [auth] + scanFileV2(file) [next-registry, shadow]
  │       else                              → scanFileV2(file)
  │
  └─ Lines 446–448: Fail-Closed Check (inside scanFileV2)
        if (enginesExecuted === 0) throw Error('No engines executed — aborting')
```

---

## 3. V1 Mode Call Graph

**Activated by:** `SCANNER_ENGINE_VERSION=v1`  
**Production active:** NO

```
scanner-thread.worker.js [engineMode='v1']
  │
  ├─ Lines 289–293: instantiate V1 engines
  │     new SecretEngine(rules)    ← engines/secret-engine/secret.engine.js
  │     new EntropyEngine()        ← engines/entropy-engine/entropy.engine.js
  │
  └─ Per-File: scanFileV1(file)
        SecretEngine.scanLine(line, lineNumber, filePath)
          [for each line in file]
        EntropyEngine.scanLine(line, lineNumber, filePath)
          [for each line in file — Shannon entropy > 4.5]
        return { secretFindings, entropyFindings }

NOTE: EngineRegistry is NOT used in V1 mode.
NOTE: DependencyEngine is NOT called in V1 mode.
NOTE: SastEngine is NOT called in V1 mode.
```

---

## 4. V2 Mode Call Graph

**Activated by:** `SCANNER_ENGINE_VERSION=v2`  
**Production active:** NO (default is `v2-sca`)

```
scanner-thread.worker.js [engineMode='v2']
  │
  ├─ Lines 299–327 (v2 branch):
  │     registry = new EngineRegistry()
  │     registry.register(new SecretEngineV2Adapter())
  │         └─ SecretEngineV2Adapter constructor
  │               new SecretEngine(rules)   ← engines/secret-engine/secret.engine.js
  │     registry.register(new EntropyEngineV2Adapter())
  │         └─ EntropyEngineV2Adapter constructor
  │               new EntropyEngine()       ← engines/entropy-engine/entropy.engine.js
  │     registry.register(new SastEngine())
  │         └─ SastEngine constructor
  │               new JavascriptParser()    ← engines/sast-engine/parsers/
  │     registry.register(new DependencyEngine())
  │         └─ DependencyEngine()           ← engines/dependency-engine/dependency.engine.js
  │               ADVISORY_DB = {lodash, express, react, axios}  [MOCK]
  │
  └─ Per-File: scanFileV2(file)
        context = new AnalysisContext({ scanId, repositoryId, isBaseline, file, governor })
        engines = registry.getApplicableEngines(file.language)
        for each engine:
          result = await engine.analyze(context)   [30s timeout via ResourceGovernor]
          collect result → EngineResult.SUCCESS/FAILED/TIMEOUT/SKIPPED
        fail-closed check (lines 446–448)

ENGINES CALLED IN V2 MODE:
  SecretEngineV2Adapter.analyze(context)
    → readline file line-by-line
    → SecretEngine.scanLine(line, lineNumber, filePath)  [for each line]
    → stamp ruleType=SECRET on findings
  EntropyEngineV2Adapter.analyze(context)
    → skip if lockfile
    → readline file line-by-line
    → EntropyEngine.scanLine(line, lineNumber, filePath)  [Shannon entropy > 4.5]
    → stamp ruleType=SECRET
  SastEngine.analyze(context)
    → JavascriptParser.parse(fileContent)
    → apply 5 rules: command-injection, path-traversal, sql-injection, unsafe-eval, xss
  DependencyEngine.analyze(context)
    → match against ADVISORY_DB (4 packages only)  [MOCK — NOT real OSV.dev]
```

---

## 5. v2-sca Mode Call Graph (CURRENT PRODUCTION)

**Activated by:** `SCANNER_ENGINE_VERSION=v2-sca` — set in `.env.production` line 44  
**Production active:** YES

```
scanner-thread.worker.js [engineMode='v2-sca']
  │
  ├─ Lines 299–327 (v2-sca branch):
  │     registry = new EngineRegistry()
  │     registry.register(new SecretEngineV2Adapter())
  │         └─ new SecretEngine(rules)   ← engines/secret-engine/secret.engine.js
  │     registry.register(new EntropyEngineV2Adapter())
  │         └─ new EntropyEngine()       ← engines/entropy-engine/entropy.engine.js
  │     registry.register(new SastEngine())
  │         └─ new JavascriptParser()   ← engines/sast-engine/parsers/
  │     registry.register(new DependencyEngineNext())
  │         └─ new AdvisoryFetcher()    ← sca/advisory-fetcher.js
  │               [Redis TTL=24h, DB TTL=7d, in-flight dedup, OSV.dev API]
  │
  └─ Per-File: scanFileV2(file)
        context = new AnalysisContext({ scanId, repositoryId, isBaseline, file, governor })
        engines = registry.getApplicableEngines(file.language)
        for each engine:
          result = await engine.analyze(context)
        fail-closed check (lines 446–448)

ENGINES CALLED IN v2-sca MODE:
  SecretEngineV2Adapter.analyze(context)
    → readline → SecretEngine.scanLine()
  EntropyEngineV2Adapter.analyze(context)
    → lockfile-skip → readline → EntropyEngine.scanLine()
  SastEngine.analyze(context)
    → JavascriptParser.parse() → 5 rule checks
  DependencyEngineNext.analyze(context)
    → SemverComparator.isVersionVulnerable()
    → AdvisoryFetcher.fetch(packageName, version)
          → Redis cache check (TTL 24h)
          → DB cache check (TTL 7d)
          → OSV.dev API (if both miss)
          → in-flight dedup (concurrent requests for same pkg merged)

NOT CALLED IN v2-sca MODE:
  ✗ TaintEngine         ← NOT REGISTERED (see Section 9)
  ✗ ProgramModel        ← not instantiated
  ✗ CfgBuilder          ← not instantiated
  ✗ DfgBuilder          ← not instantiated
  ✗ SourceRegistry      ← not consulted
  ✗ SinkRegistry        ← not consulted
  ✗ SanitizerRegistry   ← not consulted
  ✗ JsParser (next)     ← not instantiated
```

---

## 6. `next` / `canonical` Mode Call Graph

**Activated by:** `SCANNER_ENGINE_VERSION=next` or `SCANNER_ENGINE_VERSION=canonical`  
**Production active:** NO

```
scanner-thread.worker.js [engineMode='next' | 'canonical']
  │
  ├─ Lines 299–327 (next/canonical branch):
  │     registry = new EngineRegistry()
  │     registry.register(new SecretEngineV2Adapter())
  │     registry.register(new EntropyEngineV2Adapter())
  │     registry.register(new SastEngine())
  │     registry.register(new TaintEngine())      ← engines/next/taint/taint-engine.js
  │     registry.register(new DependencyEngineNext())
  │
  └─ Per-File: scanFileV2(file)
        [same dispatch as v2-sca, plus TaintEngine]

ADDITIONAL ENGINE IN next/canonical:
  TaintEngine.analyze(context)
    → ProgramModel(file)         ← engines/next/program-model.js
          → JsParser.parse()     ← engines/next/parsers/js-parser.js  (IParser)
          → build: symbols, imports, exports, calls
          → [lazy] CfgBuilder.build()  ← engines/next/cfg/cfg-builder.js
                (intra-procedural CFG, max 5000 nodes/fn, 500 fns/file)
          → [lazy] DfgBuilder.build()  ← engines/next/dfg/dfg-builder.js
                (intra-procedural DFG, max 10000 nodes, 50000 edges)
    → for each taint source in SourceRegistry (14 sources):
          identify source nodes in DFG
    → propagate taint forward through DFG edges
    → for each taint sink in SinkRegistry (9 categories):
          check if tainted flow reaches sink
    → for each taint path found:
          check SanitizerRegistry — if sanitizer on path, suppress finding
    → return EngineResult.SUCCESS(findings)
```

---

## 7. Shadow Mode Call Graphs

### 7a. `shadow` Mode (V1 authoritative, V2 shadow)

**Activated by:** `SCANNER_ENGINE_VERSION=shadow`  
**Production active:** NO

```
scanner-thread.worker.js [engineMode='shadow']
  │
  ├─ V1 initialization (lines 289–293):
  │     new SecretEngine(rules)
  │     new EntropyEngine()
  │
  ├─ V2 registry population (same as v2 branch):
  │     registry registers: SecretEngineV2Adapter, EntropyEngineV2Adapter, SastEngine, DependencyEngine
  │
  └─ Per-File:
        [AUTHORITATIVE] scanFileV1(file)   ← results used for production
        [SHADOW]        scanFileV2(file)   ← results logged/compared, not surfaced
```

### 7b. `next-shadow` Mode (V2 authoritative, NEXT shadow)

**Activated by:** `SCANNER_ENGINE_VERSION=next-shadow`  
**Production active:** NO

```
scanner-thread.worker.js [engineMode='next-shadow']
  │
  ├─ V2 registry (authoritative):
  │     SecretEngineV2Adapter, EntropyEngineV2Adapter, SastEngine, DependencyEngineNext
  │
  ├─ NEXT registry (shadow):
  │     SecretEngineV2Adapter, EntropyEngineV2Adapter, SastEngine, TaintEngine, DependencyEngineNext
  │
  └─ Per-File:
        [AUTHORITATIVE] scanFileV2(file) using V2 registry
        [SHADOW]        scanFileV2(file) using NEXT registry (includes TaintEngine)
```

---

## 8. Test Entry Points

```
tests/scanner/secret-engine.test.js
  directly instantiates SecretEngine and/or SecretEngineV2Adapter

tests/scanner/entropy-engine.test.js
  directly instantiates EntropyEngine and/or EntropyEngineV2Adapter

tests/scanner/sast-engine.test.js
  directly instantiates SastEngine

tests/scanner/taint-engine.test.js
  directly instantiates TaintEngine
  → exercises ProgramModel, JsParser, CfgBuilder, DfgBuilder
  → exercises SourceRegistry, SinkRegistry, SanitizerRegistry
  NOTE: this is the ONLY path where TaintEngine is invoked in any test

tests/scanner/dependency-engine-next.test.js
  directly instantiates DependencyEngineNext
  → exercises AdvisoryFetcher, SemverComparator

tests/scanner/finding-correlator.test.js
  directly instantiates FindingCorrelator with mock EngineResults

tests/scanner/engine-comprehensive.test.js
  exercises full pipeline (likely via SandboxManager mock or full worker thread)

tests/scanner/engine-pipeline-recovery.test.js
  exercises error recovery paths (FAILED, TIMEOUT, SKIPPED EngineResult states)
  → tests fail-closed check (lines 446–448 of scanner-thread.worker.js)

tests/scanner/security-sandbox.test.js
  tests SandboxManager isolation and worker_thread lifecycle
```

---

## 9. TaintEngine Production Gap — Formal Proof

**Claim:** TaintEngine is never called in production (`SCANNER_ENGINE_VERSION=v2-sca`).

**Proof chain:**

1. Production configuration:  
   `.env.production` line 44: `SCANNER_ENGINE_VERSION=v2-sca`

2. `scanner-thread.worker.js` line 268:  
   ```js
   const engineMode = process.env.SCANNER_ENGINE_VERSION || 'v2-sca';
   // → engineMode = 'v2-sca'
   ```

3. Lines 299–327 — registry population is an `if/else if` chain:
   ```js
   if (engineMode === 'v1') {
     // no registry registrations
   } else if (engineMode === 'v2') {
     registry.register(new SecretEngineV2Adapter());
     registry.register(new EntropyEngineV2Adapter());
     registry.register(new SastEngine());
     registry.register(new DependencyEngine());       // mock
   } else if (engineMode === 'v2-sca') {              // ← PRODUCTION BRANCH
     registry.register(new SecretEngineV2Adapter());
     registry.register(new EntropyEngineV2Adapter());
     registry.register(new SastEngine());
     registry.register(new DependencyEngineNext());   // real OSV.dev
     // TaintEngine is NOT registered here
   } else if (engineMode === 'next' || engineMode === 'canonical') {
     registry.register(new SecretEngineV2Adapter());
     registry.register(new EntropyEngineV2Adapter());
     registry.register(new SastEngine());
     registry.register(new TaintEngine());            // ← only registered here
     registry.register(new DependencyEngineNext());
   }
   // [shadow and next-shadow branches follow]
   ```

4. With `engineMode='v2-sca'`, the `else if (engineMode === 'v2-sca')` branch executes.  
   `TaintEngine` is instantiated only in the `next`/`canonical` branch.  
   Therefore `TaintEngine` is **never instantiated** in production.

5. `scanFileV2()` iterates `registry.getApplicableEngines(language)`.  
   Since `TaintEngine` was never registered, it is never in the registry.  
   Therefore `TaintEngine.analyze()` is **never called** in production.

6. Consequence: `ProgramModel`, `JsParser` (next), `CfgBuilder`, `DfgBuilder`, `SourceRegistry`, `SinkRegistry`, and `SanitizerRegistry` are also **never instantiated or called** in production.

**Summary:** The full intra-procedural taint analysis stack (14 sources, 9 sink categories, DFG propagation) exists, is tested, and is non-trivially implemented, but has **zero production coverage** as of the `v2-sca` default in `.env.production`.

---

## 10. Canonical Future Call Graph

After unification, the call graph should be:

```
[BullMQ Queue]
  queues/scanner.queue.js
    │
    ▼
workers/scanner.worker.js
  WorkerLease + source acquisition (unchanged)
    │
    ▼
orchestrator/scan-orchestrator.service.js
  ScanOrchestratorService.executeScan()
    ScanLifecycle, DiffPlanner, idempotency (unchanged)
    │
    ▼
sandbox/sandbox-manager.js
  SandboxManager.executeScan() → worker_thread
    │
    ▼
sandbox/scanner-thread.worker.js   [SIMPLIFIED]
  No engineMode if/else chain for registry population.
  Single instantiation:
    analyzerRegistry = new AnalyzerRegistry()
    analyzerRegistry.register(new SecretAnalyzer(rules))
    analyzerRegistry.register(new EntropyAnalyzer())
    analyzerRegistry.register(new SastAnalyzer())
    analyzerRegistry.register(new TaintAnalyzer())
    analyzerRegistry.register(new ScaAnalyzer())
    engine = new OculusSecurityEngine(analyzerRegistry, resourceGovernor)
    │
    ▼
engines/oculus-security-engine.js
  OculusSecurityEngine.scan(file, context)
    context = new AnalyzerContext({ scanId, repositoryId, isBaseline, file, governor })
    analyzers = analyzerRegistry.getApplicableAnalyzers(file.language)
    for each analyzer:
      result = await analyzer.analyze(context)   [governed by ResourceGovernor, 30s timeout]
      collect → AnalyzerResult.SUCCESS/FAILED/TIMEOUT/SKIPPED
    if (analyzersExecuted === 0) throw Error('fail-closed: no analyzers ran')
    return results

ANALYZERS (all extend IAnalyzer, no wrappers, no inner V1 classes):
  SecretAnalyzer.analyze(context)
    → readline → rule-based regex → findings
  EntropyAnalyzer.analyze(context)
    → lockfile skip → readline → Shannon entropy (threshold 4.5) → findings
  SastAnalyzer.analyze(context)
    → JsParser.parse()  [canonical — engines/next/parsers/js-parser.js]
    → 5 rule checks (command-injection, path-traversal, sql-injection, unsafe-eval, xss)
  TaintAnalyzer.analyze(context)
    → ProgramModel(file) → JsParser → CfgBuilder → DfgBuilder
    → SourceRegistry (14 sources) → DFG propagation → SinkRegistry (9 sinks)
    → SanitizerRegistry → findings
  ScaAnalyzer.analyze(context)
    → AdvisoryFetcher → Redis/DB cache → OSV.dev API
    → SemverComparator.isVersionVulnerable()
    → DIRECT/TRANSITIVE findings
    │
    ▼ (all analyzer results collected)
correlation/finding-correlator.js
  FindingCorrelator.correlate(results)
    dedup by fingerprint
    corroboration score +15 per corroborating analyzer
    │
    ▼
DB transaction + ScanLifecycle.COMPLETED + ScanTelemetry
```

**Key differences from current architecture:**

| Current (v2-sca) | Canonical |
|------------------|-----------|
| `engineMode` if/else chain (lines 299–327, 396–441) | No mode branching — single `OculusSecurityEngine` |
| `SecretEngine` + `SecretEngineV2Adapter` (2 classes) | `SecretAnalyzer` (1 class) |
| `EntropyEngine` + `EntropyEngineV2Adapter` (2 classes) | `EntropyAnalyzer` (1 class) |
| `JavascriptParser` (sast-local) + `JsParser` (next) (2 parsers) | `JsParser` (next) only |
| `DependencyEngine` (mock) still in codebase | Deleted |
| `TaintEngine` gated behind `next`/`canonical` mode | `TaintAnalyzer` always registered |
| `IEngine`, `EngineRegistry`, `EngineResult`, `AnalysisContext` | `IAnalyzer`, `AnalyzerRegistry`, `AnalyzerResult`, `AnalyzerContext` |
| `scanFileV1()`, `scanFileV2()` local functions | `OculusSecurityEngine.scan()` |
