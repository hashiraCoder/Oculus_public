/**
 * scanner/incremental/import-graph.js
 *
 * Import graph builder — constructs a lightweight directed graph of
 * which files import which other files, derived from ProgramModel.imports.
 *
 * Purpose: Given a set of directly changed files (from the PR diff), expand
 * the affected set to include all files that import the changed files.
 * This ensures that a change to a shared utility module causes all its
 * importers to be re-analyzed.
 *
 * Scope: Intra-repository relative imports only (Phase 1 NEXT).
 *        External package imports are ignored.
 *
 * The graph is built lazily per-scan using the ProgramModels already
 * constructed during the file walk, so there is no extra I/O cost.
 *
 * Graph representation:
 *   importedBy: Map<relativePath, Set<relativePath>>
 *     e.g. { 'src/utils.js': Set { 'src/controller.js', 'src/service.js' } }
 *
 * This is an INVERTED adjacency list (reverse import direction) so that
 * "who is affected by a change to X?" is O(1) instead of O(N).
 */

import path from 'path';

export class ImportGraph {
    constructor() {
        /**
         * Inverted adjacency: file → set of files that import it
         * @type {Map<string, Set<string>>}
         */
        this.importedBy = new Map();
    }

    /**
     * Register all imports from a single ProgramModel.
     * Call this for every file processed during a scan.
     *
     * @param {string} filePath — relative path of the file that contains the imports
     * @param {Array<{ from: string, isRelative: boolean, resolvedFile: string|null }>} imports
     */
    addImports(filePath, imports) {
        for (const imp of imports) {
            if (!imp.isRelative) continue; // skip external packages

            // Resolve the target path relative to the importing file
            const resolved = imp.resolvedFile ?? this._resolveRelative(filePath, imp.from);
            if (!resolved) continue;

            const normalized = this._normalize(resolved);

            if (!this.importedBy.has(normalized)) {
                this.importedBy.set(normalized, new Set());
            }
            this.importedBy.get(normalized).add(this._normalize(filePath));
        }
    }

    /**
     * Given a set of directly changed files, compute the full affected set
     * by traversing the inverted import graph (BFS).
     *
     * @param {string[]} changedFiles — relative paths of directly changed files
     * @param {number} [maxDepth=5] — max import depth to follow
     * @returns {{ affectedFiles: Set<string>, depth: Map<string, number> }}
     */
    computeAffected(changedFiles, maxDepth = 5) {
        const affected = new Set(changedFiles.map(f => this._normalize(f)));
        const depth = new Map();
        const queue = [...changedFiles.map(f => ({ file: this._normalize(f), d: 0 }))];

        for (const f of changedFiles) depth.set(this._normalize(f), 0);

        while (queue.length > 0) {
            const { file, d } = queue.shift();
            if (d >= maxDepth) continue;

            const importers = this.importedBy.get(file);
            if (!importers) continue;

            for (const importer of importers) {
                if (!affected.has(importer)) {
                    affected.add(importer);
                    depth.set(importer, d + 1);
                    queue.push({ file: importer, d: d + 1 });
                }
            }
        }

        return { affectedFiles: affected, depth };
    }

    /**
     * Attempt to resolve a relative import path.
     * Handles bare paths without extensions by trying common JS extensions.
     */
    _resolveRelative(fromFile, importPath) {
        try {
            const dir = path.posix.dirname(fromFile.replace(/\\/g, '/'));
            const joined = path.posix.join(dir, importPath.replace(/\\/g, '/'));
            // Strip query strings or hash fragments
            return joined.split('?')[0].split('#')[0];
        } catch {
            return null;
        }
    }

    _normalize(filePath) {
        return filePath.replace(/\\/g, '/');
    }

    /**
     * Total number of unique file edges in the graph.
     */
    get edgeCount() {
        let count = 0;
        for (const importers of this.importedBy.values()) count += importers.size;
        return count;
    }
}
