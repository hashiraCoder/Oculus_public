/**
 * scanner/incremental/diff-planner.js
 *
 * DiffPlanner — computes the minimal affected file set for an incremental scan.
 *
 * Given the full list of files in the scan (prFiles) and the set of files
 * that changed according to the PR diff (changedFiles), the planner:
 *
 *   1. Computes SHA-256 hashes of all files on disk
 *   2. Checks the FileCache for each file's previous hash
 *   3. Builds an ImportGraph from the imports found in unchanged files
 *   4. Expands the changed set via import-graph BFS to find all transitively
 *      affected importers
 *   5. Returns the final set of files that MUST be analyzed this scan
 *
 * Files NOT in the affected set are skipped — their cached findings from
 * previous scans remain authoritative.
 *
 * Rollback: if ENABLE_INCREMENTAL_ANALYSIS=false, returns all files as affected.
 */

import crypto from 'crypto';
import fs from 'fs';
import { FileCache } from './file-cache.js';
import { ImportGraph } from './import-graph.js';

const INCREMENTAL_ENABLED = process.env.ENABLE_INCREMENTAL_ANALYSIS !== 'false';
const IMPORT_GRAPH_MAX_DEPTH = parseInt(process.env.INCREMENTAL_IMPORT_DEPTH ?? '5', 10);

export class DiffPlanner {
    constructor(repositoryId) {
        this.repositoryId = repositoryId;
        this.cache = new FileCache(repositoryId);
        this.importGraph = new ImportGraph();
    }

    /**
     * Plan the incremental scan.
     *
     * @param {object} opts
     * @param {Array<{ filename: string, status: string }>} opts.prFiles
     *        Full file list (all files in the scan directory)
     * @param {string} opts.tempDir
     *        Absolute path to the extracted scan directory
     * @param {boolean} opts.isBaseline
     *        Baseline scans always analyze everything and seed the cache
     * @param {string[]} [opts.explicitlyChanged]
     *        Filenames reported as changed by GitHub PR API.
     *        If provided, these are always included regardless of hash match.
     *
     * @returns {Promise<IncrementalPlan>}
     */
    async plan({ prFiles, tempDir, isBaseline, explicitlyChanged = [] }) {
        // Baseline: analyze everything and seed cache
        if (isBaseline || !INCREMENTAL_ENABLED) {
            const allFiles = prFiles.filter(f => f.status !== 'removed').map(f => f.filename);
            return {
                mode: isBaseline ? 'baseline' : 'disabled',
                affectedFiles: new Set(allFiles),
                skippedFiles: new Set(),
                cacheHits: 0,
                totalFiles: allFiles.length,
                importGraphEdges: 0
            };
        }

        const affected = new Set(explicitlyChanged.map(f => f.replace(/\\/g, '/')));
        const skipped = new Set();
        let cacheHits = 0;

        const cacheUpdates = [];
        const path = await import('path');

        // ── Phase 1: Hash all files + check cache ────────────────────────────
        for (const file of prFiles) {
            if (file.status === 'removed') {
                skipped.add(file.filename);
                continue;
            }

            const absolutePath = path.default.join(tempDir, file.filename);
            const normalized = file.filename.replace(/\\/g, '/');

            // Compute hash
            let hash;
            try {
                const content = fs.readFileSync(absolutePath);
                hash = crypto.createHash('sha256').update(content).digest('hex');
            } catch {
                // Can't hash → treat as changed
                affected.add(normalized);
                continue;
            }

            // Check cache
            const cacheResult = await this.cache.check(normalized, hash);

            if (cacheResult === 'HIT' && !explicitlyChanged.includes(normalized)) {
                // File unchanged since last scan — skip unless import graph later pulls it in
                skipped.add(normalized);
                cacheHits++;
            } else {
                // MISS or CHANGED — must analyze
                affected.add(normalized);
            }

            // Always queue hash update (even for hits — refreshes TTL)
            cacheUpdates.push({ relativePath: normalized, hash });
        }

        // ── Phase 2: Build import graph from ALL files (including unchanged) ──
        // We use a lightweight pass: read the cached model's imports from what
        // we already have via the js-parser. For simplicity in V1 NEXT, we
        // build the import graph from a fast regex-based import scan rather than
        // full AST parse of every file.
        for (const file of prFiles) {
            if (file.status === 'removed') continue;
            const absolutePath = path.default.join(tempDir, file.filename);
            const normalized = file.filename.replace(/\\/g, '/');

            try {
                const imports = fastExtractImports(absolutePath, normalized);
                this.importGraph.addImports(normalized, imports);
            } catch {
                // Non-fatal: skip import graph for this file
            }
        }

        // ── Phase 3: Expand affected set via import graph BFS ────────────────
        const { affectedFiles } = this.importGraph.computeAffected(
            [...affected],
            IMPORT_GRAPH_MAX_DEPTH
        );

        // Files that were skipped but are now pulled in by the import graph
        for (const f of affectedFiles) {
            if (skipped.has(f)) {
                skipped.delete(f);
                cacheHits--; // No longer a true cache hit
                affected.add(f);
            }
        }

        // ── Phase 4: Update cache (non-blocking) ─────────────────────────────
        this.cache.bulkSet(cacheUpdates).catch(err =>
            console.error('[DiffPlanner] Cache update failed (non-fatal):', err.message)
        );

        const allNonRemoved = prFiles.filter(f => f.status !== 'removed').length;

        return {
            mode: 'incremental',
            affectedFiles,
            skippedFiles: skipped,
            cacheHits: Math.max(0, cacheHits),
            totalFiles: allNonRemoved,
            importGraphEdges: this.importGraph.edgeCount
        };
    }
}

/**
 * @typedef {object} IncrementalPlan
 * @property {'baseline'|'incremental'|'disabled'} mode
 * @property {Set<string>} affectedFiles  — must be analyzed
 * @property {Set<string>} skippedFiles   — skipped (cache hit, not in import graph)
 * @property {number} cacheHits
 * @property {number} totalFiles
 * @property {number} importGraphEdges
 */

// ── Fast import extractor (regex-based, no full parse needed) ────────────────
// Used for building the import graph during the planning pass.
// We don't need a full AST here — just the raw import specifiers.
const IMPORT_RE = /(?:^|\n)\s*import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
const REQUIRE_RE = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function fastExtractImports(absolutePath, relativePath) {
    let content;
    try {
        content = fs.readFileSync(absolutePath, 'utf8');
    } catch {
        return [];
    }

    const imports = [];
    let m;

    // ES import
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(content)) !== null) {
        const from = m[1];
        imports.push({ from, isRelative: from.startsWith('.'), resolvedFile: null });
    }

    // CJS require
    REQUIRE_RE.lastIndex = 0;
    while ((m = REQUIRE_RE.exec(content)) !== null) {
        const from = m[1];
        imports.push({ from, isRelative: from.startsWith('.'), resolvedFile: null });
    }

    return imports;
}
