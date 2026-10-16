# ENGINE DUPLICATION MAP
> **Project:** Oculus Security Engine Unification  
> **Audit Date:** 2026-08-31  
> **Base Path:** `d:\main_projects\Oculus\Backend\scanner\`

This document maps every identified duplication in the Oculus scanner codebase. Each entry states what is duplicated, which version is canonical, and what migration action is required.

---

## Summary Table

| Capability / Contract | Existing Implementations | Canonical Implementation | Duplicate? | Migration Action |
|----------------------|--------------------------|--------------------------|------------|-----------------|
| Secret detection | `SecretEngine` (V1) + `SecretEngineV2Adapter` (V2 wrapper) | `SecretAnalyzer` (to create) | **Yes — wrapper duplication** | Build self-contained `SecretAnalyzer extends IAnalyzer`; delete both V1 class and adapter |
| Entropy detection | `EntropyEngine` (V1) + `EntropyEngineV2Adapter` (V2 wrapper) | `EntropyAnalyzer` (to create) | **Yes — wrapper duplication** | Build self-contained `EntropyAnalyzer extends IAnalyzer`; absorb lockfile-skip logic; delete both |
| JS AST parsing | `JavascriptParser` (sast-engine/parsers) + `JsParser` (next/parsers/js-parser.js) | `JsParser` (next/parsers) | **Yes — two acorn parsers** | Migrate `SastEngine` to import `JsParser`; delete `JavascriptParser` |
| SCA / dependency scanning | `DependencyEngine` (mock, 4 pkgs) + `DependencyEngineNext` (real OSV.dev) | `DependencyEngineNext` → `ScaAnalyzer` | **Yes — same capability, different quality** | Delete `DependencyEngine` immediately; rename/wrap `DependencyEngineNext` as `ScaAnalyzer` |
| Engine contract | `IEngine` (engine.interface.js) | `IAnalyzer` (to create) | **Yes — rename required** | Create `IAnalyzer`; alias `IEngine = IAnalyzer` during migration; remove alias after cutover |
| Engine registry | `EngineRegistry` (engine-registry.js) | `AnalyzerRegistry` (to create) | **Yes — rename required** | Create `AnalyzerRegistry`; alias; remove old name after cutover |
| Engine result | `EngineResult` (engine-result.js) | `AnalyzerResult` (to create) | **Yes — rename required** | Create `AnalyzerResult` with same factory API; alias; remove after cutover |
| Analysis context | `AnalysisContext` (engine-context.js) | `AnalyzerContext` (to create) | **Yes — rename required** | Rename; update all references in worker and engine files |
| File-level scan dispatch | `scanFileV1()` + `scanFileV2()` (both in scanner-thread.worker.js) | `OculusSecurityEngine.scan()` (to create) | **Yes — procedural duplication** | Extract `OculusSecurityEngine` class; internalize registry + dispatch loop; delete both functions |

---

## Detailed Entries

---

### D-1: `SecretEngine` → `SecretEngineV2Adapter`

**What is duplicated:**  
Secret detection logic lives entirely in `engines/secret-engine/secret.engine.js` (`SecretEngine`). `SecretEngineV2Adapter` (`engines/secret-engine/secret-engine-v2-adapter.js`) does not implement any detection logic of its own. It wraps `SecretEngine`, adding:
1. readline streaming (reads file line-by-line)
2. `ruleType=SECRET` stamping on findings

The adapter is a mechanical V1→V2 shim, not a new capability. Two classes exist where one self-contained class should exist.

**Canonical version:** `SecretAnalyzer` (to be created in `engines/analyzers/secret.analyzer.js`)  
- Extends `IAnalyzer` (renamed `IEngine`)
- Internalizes readline streaming
- Internalizes rule-based regex matching (migrated from `SecretEngine`)
- Stamps `ruleType=SECRET`
- `constructor(rules)` preserved

**Migration action:**
1. Create `SecretAnalyzer` with internalized logic from both files.
2. Replace `SecretEngineV2Adapter` registration in `scanner-thread.worker.js` with `SecretAnalyzer`.
3. Remove `engines/secret-engine/secret-engine-v2-adapter.js`.
4. Remove `engines/secret-engine/secret.engine.js`.
5. Update test file `tests/scanner/secret-engine.test.js` to target `SecretAnalyzer`.

**Production risk:** Low — behavior is a strict superset of current adapter behavior.

---

### D-2: `EntropyEngine` → `EntropyEngineV2Adapter`

**What is duplicated:**  
Shannon entropy calculation (threshold 4.5) lives in `engines/entropy-engine/entropy.engine.js`. `EntropyEngineV2Adapter` (`engines/entropy-engine/entropy-engine-v2-adapter.js`) wraps it and adds:
1. Lockfile skip (files matching lockfile patterns are skipped entirely — only adapter-level behavior)
2. readline streaming
3. `ruleType=SECRET` stamping

The lockfile skip is the only behaviorally distinct addition. It should be part of the canonical implementation's `analyze()` preamble, not a wrapper concern.

**Canonical version:** `EntropyAnalyzer` (to be created in `engines/analyzers/entropy.analyzer.js`)  
- Extends `IAnalyzer`
- Internalizes Shannon entropy (threshold 4.5 promoted to named constant `ENTROPY_THRESHOLD = 4.5`)
- Internalizes lockfile skip
- Internalizes readline streaming
- Stamps `ruleType=SECRET`

**Migration action:**
1. Create `EntropyAnalyzer`.
2. Replace `EntropyEngineV2Adapter` registration in `scanner-thread.worker.js` with `EntropyAnalyzer`.
3. Remove `engines/entropy-engine/entropy-engine-v2-adapter.js`.
4. Remove `engines/entropy-engine/entropy.engine.js`.
5. Update `tests/scanner/entropy-engine.test.js` to target `EntropyAnalyzer`.

**Production risk:** Low — lockfile skip is additive; threshold unchanged.

---

### D-3: `JavascriptParser` (sast-engine) vs `JsParser` (next/parsers)

**What is duplicated:**  
Two independent acorn-based JavaScript parsers exist:

| | `JavascriptParser` | `JsParser` |
|--|-------------------|-----------|
| Location | `engines/sast-engine/parsers/` | `engines/next/parsers/js-parser.js` |
| Used by | `SastEngine` | `ProgramModel` (via TaintEngine) |
| Interface | Internal (no interface) | Extends `IParser` (`engines/next/parsers/parser.interface.js`) |
| Output | AST for rule matching | Symbols, imports, calls, exports — richer model |
| Production active | **Yes** | **No** (gated with NEXT) |

Both use acorn. Any acorn configuration change (ECMAScript version, plugin options, error recovery) must be applied in two places. `JsParser` is architecturally superior — it implements a formal interface and produces a richer program model.

**Canonical version:** `JsParser` (`engines/next/parsers/js-parser.js`)

**Migration action:**
1. Audit `JavascriptParser` for any acorn options or AST transformations not present in `JsParser`; port them to `JsParser`.
2. Refactor `SastEngine` to import and use `JsParser` instead of `JavascriptParser`.
3. Verify that the 5 SAST rules (`command-injection`, `path-traversal`, `sql-injection`, `unsafe-eval`, `xss`) in `engines/sast-engine/rules/javascript/` still operate correctly against `JsParser` output.
4. Delete `engines/sast-engine/parsers/` directory.
5. Update `tests/scanner/sast-engine.test.js` if parser-specific mocking is present.

**Production risk:** Medium — requires verifying that all 5 rule AST traversals are compatible with `JsParser` output format.

---

### D-4: `DependencyEngine` (mock) vs `DependencyEngineNext` (real)

**What is duplicated:**  
Both engines implement `IEngine` and perform dependency vulnerability scanning. They differ only in data quality:

| | `DependencyEngine` | `DependencyEngineNext` |
|--|-------------------|----------------------|
| Location | `engines/dependency-engine/dependency.engine.js` | `engines/dependency-engine-next/dependency-engine-next.js` |
| Data source | Hardcoded `ADVISORY_DB` (4 packages: lodash, express, react, axios) | Real OSV.dev API via `AdvisoryFetcher` |
| Cache | None | Redis TTL=24h, DB TTL=7d, in-flight dedup |
| Semver | Basic/none | Full semver via `SemverComparator` |
| Dependency depth | Unknown | `DIRECT` / `TRANSITIVE` distinction |
| Engine mode | `v2` only | `v2-sca`, `next`, `canonical`, `next-shadow` |
| Production active | **No** | **Yes** |

`DependencyEngine` is a development artifact that has been fully superseded. It carries a risk: if `SCANNER_ENGINE_VERSION` is accidentally set to `v2` (rather than `v2-sca`), production would silently use the 4-package mock advisory database.

**Canonical version:** `DependencyEngineNext` → to be renamed `ScaAnalyzer`

**Migration action:**
1. **Immediately:** Remove `DependencyEngine` from `scanner-thread.worker.js` imports and the `v2` branch registry population.
2. Delete `engines/dependency-engine/dependency.engine.js`.
3. (Later) Rename `DependencyEngineNext` to `ScaAnalyzer`; update all references.

**Production risk:** Zero for removal — it is unreachable in production.

---

### D-5: `IEngine` → `IAnalyzer` (contract rename)

**What is duplicated:**  
`IEngine` (`engines/core/engine.interface.js`) is the current abstract base class defining `getCapabilities()` and `analyze(context)`. In the canonical unified design, this contract is renamed to `IAnalyzer` to reflect the consolidated "analyzer" terminology consistent with `SecretAnalyzer`, `EntropyAnalyzer`, `TaintAnalyzer`, etc.

This is a name-duplication concern: during migration, both `IEngine` and `IAnalyzer` will exist and describe the same contract.

**Current implementors of `IEngine`:**  
`SecretEngineV2Adapter`, `EntropyEngineV2Adapter`, `SastEngine`, `TaintEngine`, `DependencyEngineNext`

**Canonical version:** `IAnalyzer`

**Migration action:**
1. Create `engines/core/analyzer.interface.js` exporting `IAnalyzer` with identical API to `IEngine`.
2. Add `module.exports.IEngine = IAnalyzer` backward-compat alias in `engine.interface.js`.
3. Migrate each implementor to extend `IAnalyzer` one at a time.
4. Once all implementors use `IAnalyzer`, remove `engine.interface.js`.

---

### D-6: `EngineRegistry` → `AnalyzerRegistry` (contract rename)

**What is duplicated:**  
`EngineRegistry` (`engines/core/engine-registry.js`) provides `register(engine)` and `getApplicableEngines(language)`. The canonical design renames it to `AnalyzerRegistry` to match the unified naming convention.

During migration, both `EngineRegistry` and `AnalyzerRegistry` will exist as the same object under different names.

**Canonical version:** `AnalyzerRegistry`

**Migration action:**
1. Create `engines/core/analyzer-registry.js` as a copy/re-export of `EngineRegistry`.
2. Update `scanner-thread.worker.js` to import `AnalyzerRegistry`.
3. Once `OculusSecurityEngine` is created (internalizing the registry), delete both files — the registry becomes an internal detail.

---

### D-7: `EngineResult` → `AnalyzerResult` (contract rename)

**What is duplicated:**  
`EngineResult` (`engines/core/engine-result.js`) provides factory methods `SUCCESS()`, `FAILED()`, `TIMEOUT()`, `SKIPPED()`. The canonical rename is `AnalyzerResult`.

Importers: all `IEngine` implementors, `scanFileV2()`, `FindingCorrelator`.

**Canonical version:** `AnalyzerResult`

**Migration action:**
1. Create `engines/core/analyzer-result.js` re-exporting all factory methods.
2. Add `EngineResult = AnalyzerResult` alias in `engine-result.js`.
3. Migrate importers.
4. Delete `engine-result.js`.

---

### D-8: `AnalysisContext` → `AnalyzerContext` (contract rename)

**What is duplicated:**  
`AnalysisContext` (`engines/core/engine-context.js`) carries `{ scanId, repositoryId, isBaseline, file, governor }` and is passed to every `analyze()` call. The canonical rename is `AnalyzerContext`.

**Canonical version:** `AnalyzerContext`

**Migration action:**
1. Rename class inside `engine-context.js` from `AnalysisContext` to `AnalyzerContext`.
2. Export both names during transition: `module.exports = { AnalyzerContext, AnalysisContext: AnalyzerContext }`.
3. Update all instantiation sites in `scanner-thread.worker.js` to use `AnalyzerContext`.
4. Remove `AnalysisContext` alias.

---

### D-9: `scanFileV1()` vs `scanFileV2()` vs `OculusSecurityEngine` (dispatch duplication)

**What is duplicated:**  
Two procedural functions within `scanner-thread.worker.js` implement file-level scan dispatch:

| | `scanFileV1()` | `scanFileV2()` |
|--|---------------|---------------|
| Lines | In dispatch block lines 396–441 | In dispatch block lines 396–441 |
| Engines invoked | V1 `SecretEngine.scanLine()`, `EntropyEngine.scanLine()` directly | Iterates `EngineRegistry.getApplicableEngines()`, calls `engine.analyze(context)` |
| Fail-closed check | Absent | Lines 446–448: error if no engines executed |
| Production active | No | Yes |

Both functions represent the same semantic intent (scan one file, collect findings) but implemented twice — once for the V1 engine protocol and once for the V2 `IEngine` protocol. Additionally, the engine mode dispatch logic itself (lines 289–327 plus 396–441 of `scanner-thread.worker.js`) is a long if/else chain that will become unmanageable as modes proliferate.

**Canonical version:** `OculusSecurityEngine` (class to be created in `engines/oculus-security-engine.js`)

**Proposed API:**
```js
class OculusSecurityEngine {
  constructor(analyzerRegistry, resourceGovernor) {}
  async scan(file, context) {}   // replaces scanFileV2()
}
```

**Migration action:**
1. Create `engines/oculus-security-engine.js` with `scan()` internalizing the `EngineRegistry` iteration, fail-closed check (lines 446–448), and result collection from `scanFileV2()`.
2. `scanner-thread.worker.js` becomes: instantiate `OculusSecurityEngine`, call `engine.scan(file, context)` per file.
3. Remove `scanFileV2()` local function.
4. Remove `scanFileV1()` and all `v1`/`shadow` mode branches once those modes are decommissioned.

---

## Visual Duplication Map

```
SECRET DETECTION
  engines/secret-engine/secret.engine.js          ← V1 inner impl (no IEngine)
       ↑ wrapped by
  engines/secret-engine/secret-engine-v2-adapter.js ← V2 wrapper (IEngine)
       ↓ should collapse to
  engines/analyzers/secret.analyzer.js            ← canonical (IAnalyzer)

ENTROPY DETECTION
  engines/entropy-engine/entropy.engine.js        ← V1 inner impl (no IEngine)
       ↑ wrapped by
  engines/entropy-engine/entropy-engine-v2-adapter.js ← V2 wrapper (IEngine)
       ↓ should collapse to
  engines/analyzers/entropy.analyzer.js           ← canonical (IAnalyzer)

JS PARSING
  engines/sast-engine/parsers/                    ← acorn parser #1 (no interface)
  engines/next/parsers/js-parser.js               ← acorn parser #2 (IParser) ← CANONICAL
       ↓ sast-engine/parsers/ should be removed after migrating SastEngine

SCA
  engines/dependency-engine/dependency.engine.js  ← mock (4 packages) ← DELETE NOW
  engines/dependency-engine-next/dependency-engine-next.js ← real OSV.dev ← CANONICAL

CORE CONTRACTS (rename-duplication during migration)
  IEngine         → IAnalyzer
  EngineRegistry  → AnalyzerRegistry
  EngineResult    → AnalyzerResult
  AnalysisContext → AnalyzerContext

SCAN DISPATCH
  scanFileV1()  ← V1 direct call, production-dead
  scanFileV2()  ← V2 registry loop, production-active
       ↓ both should collapse to
  OculusSecurityEngine.scan()  ← canonical
```
