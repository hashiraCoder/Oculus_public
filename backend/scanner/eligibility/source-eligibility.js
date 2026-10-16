/**
 * scanner/eligibility/source-eligibility.js
 *
 * Configurable file eligibility module.
 *
 * Previously, EXCLUDED_DIRS and EXCLUDED_EXTENSIONS were hardcoded constants
 * inside scanner-thread.worker.js. This module:
 *
 *   1. Extracts that logic into a reusable, testable module
 *   2. Makes the lists configurable via environment variables
 *   3. Provides a file classification for observability and per-engine overrides
 *
 * File Classifications:
 *   SOURCE     — eligible for all engines
 *   GENERATED  — auto-generated code (dist/, build/) — excluded
 *   BINARY     — binary file (by extension or null-byte detection) — excluded
 *   VENDOR     — third-party code (node_modules/, vendor/) — excluded
 *   CACHE      — build caches (.next/, .turbo/, .cache/) — excluded
 *   TEST       — test files (__tests__/, *.test.js, *.spec.js) — included by default
 *   CONFIG     — configuration files (.env, *.config.js) — included, high value for secrets
 *   DEPENDENCY — package manifests (package.json, go.mod) — included for SCA
 *   OVERSIZED  — exceeds MAX_FILE_SIZE — excluded
 *   UNKNOWN    — cannot classify — excluded for safety
 */

import path from 'path';

// Maximum file size eligible for analysis (1 MB)
const DEFAULT_MAX_FILE_SIZE = parseInt(process.env.GOVERNOR_MAX_FILE_SIZE || String(1 * 1024 * 1024), 10);

// Maximum line length before file is skipped (protects against minified code)
const DEFAULT_MAX_LINE_LENGTH = parseInt(process.env.GOVERNOR_MAX_LINE_LENGTH || '10000', 10);

// Directories excluded from analysis — configurable via env (comma-separated)
const DEFAULT_EXCLUDED_DIRS = [
    '.git', 'node_modules', '.next', '.nuxt', 'dist', 'build',
    'coverage', '.cache', '.turbo', '.vite', 'vendor', 'target',
    '__pycache__', '.mypy_cache', '.pytest_cache', '.tox',
];

const EXCLUDED_DIRS = process.env.EXCLUDED_DIRS
    ? process.env.EXCLUDED_DIRS.split(',').map(d => d.trim())
    : DEFAULT_EXCLUDED_DIRS;

// Extensions excluded from analysis — configurable via env (comma-separated)
const DEFAULT_EXCLUDED_EXTENSIONS = [
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg',
    '.mp4', '.mov', '.avi', '.mkv', '.webm', '.mp3', '.wav',
    '.pdf', '.zip', '.gz', '.tar', '.7z', '.rar',
    '.exe', '.dll', '.so', '.dylib', '.wasm',
    '.class', '.jar', '.war', '.ear',
    '.sst', '.meta', '.lock',
    '.min.js', // minified JS — considered generated
    '.min.css',
];

const EXCLUDED_EXTENSIONS = process.env.EXCLUDED_EXTENSIONS
    ? process.env.EXCLUDED_EXTENSIONS.split(',').map(e => e.trim())
    : DEFAULT_EXCLUDED_EXTENSIONS;

// Extensions used by the SCA/Dependency engine — eligible even if in node_modules
const DEPENDENCY_MANIFESTS = new Set([
    'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    'go.mod', 'go.sum', 'requirements.txt', 'Pipfile', 'Pipfile.lock',
    'Gemfile', 'Gemfile.lock', 'pom.xml', 'build.gradle', 'cargo.toml',
]);

/**
 * Classify a file based on its relative path.
 *
 * @param {string} relativePath - Path relative to repository root
 * @param {object} [overrides] - Database-driven configuration overrides
 * @returns {'SOURCE'|'GENERATED'|'BINARY'|'VENDOR'|'CACHE'|'TEST'|'CONFIG'|'DEPENDENCY'|'OVERSIZED'|'UNKNOWN'}
 */
export function classifyFile(relativePath, overrides = {}) {
    const basename = path.basename(relativePath).toLowerCase();
    const ext = path.extname(relativePath).toLowerCase();
    const parts = relativePath.split(/[/\\]/);

    const activeExcludedDirs = overrides.excludedDirs || EXCLUDED_DIRS;
    const activeExcludedExtensions = overrides.excludedExtensions || EXCLUDED_EXTENSIONS;

    // Dependency manifests are always eligible (for SCA)
    if (DEPENDENCY_MANIFESTS.has(basename)) return 'DEPENDENCY';

    // Vendor / third-party code
    if (parts.some(p => p === 'node_modules' || p === 'vendor')) return 'VENDOR';

    // Generated / build artifacts
    if (parts.some(p => ['dist', 'build', 'out', 'target', 'compiled'].includes(p))) return 'GENERATED';

    // Cache directories
    if (parts.some(p => ['.next', '.nuxt', '.cache', '.turbo', '.vite', '__pycache__'].includes(p))) return 'CACHE';

    // Other excluded directories
    if (parts.some(p => activeExcludedDirs.includes(p))) return 'UNKNOWN';

    // Binary by extension
    if (activeExcludedExtensions.some(excl => relativePath.toLowerCase().endsWith(excl))) return 'BINARY';

    // Test files — classified separately (included by default, some engines may skip)
    if (
        parts.some(p => ['__tests__', 'test', 'tests', 'spec', 'specs', '__mocks__'].includes(p)) ||
        /\.(test|spec)\.[jt]sx?$/.test(relativePath)
    ) return 'TEST';

    // Config files — high value for secrets scanning
    if (
        basename.startsWith('.env') ||
        /\.(config|rc)\.[jt]sx?$/.test(relativePath) ||
        ['.env', '.env.local', '.env.production', '.env.development'].includes(basename)
    ) return 'CONFIG';

    return 'SOURCE';
}

/**
 * Determines whether a file is eligible for analysis by the standard engine pipeline.
 *
 * @param {string} relativePath - Path relative to repository root
 * @param {{ size: number }} stats - fs.Stats or equivalent with `size` field
 * @param {object} [options]
 * @param {boolean} [options.includeDependencyManifests=true] - Allow DEPENDENCY files
 * @param {boolean} [options.includeTestFiles=true] - Allow TEST files
 * @param {boolean} [options.includeConfigFiles=true] - Allow CONFIG files
 * @param {number} [options.maxFileSize] - Override max file size
 * @param {string[]} [options.excludedDirs] - Override excluded dirs
 * @param {string[]} [options.excludedExtensions] - Override excluded extensions
 * @returns {{ eligible: boolean, reason: string, classification: string }}
 */
export function isEligibleFile(relativePath, stats, options = {}) {
    const {
        includeDependencyManifests = true,
        includeTestFiles = true,
        includeConfigFiles = true,
        maxFileSize = DEFAULT_MAX_FILE_SIZE,
    } = options;

    if (stats.size > maxFileSize) {
        return { eligible: false, reason: 'oversized', classification: 'OVERSIZED' };
    }

    const classification = classifyFile(relativePath, options);

    switch (classification) {
        case 'DEPENDENCY':
            return { eligible: includeDependencyManifests, reason: includeDependencyManifests ? 'eligible' : 'dependency_excluded', classification };
        case 'TEST':
            return { eligible: includeTestFiles, reason: includeTestFiles ? 'eligible' : 'test_excluded', classification };
        case 'CONFIG':
            return { eligible: includeConfigFiles, reason: includeConfigFiles ? 'eligible' : 'config_excluded', classification };
        case 'SOURCE':
            return { eligible: true, reason: 'eligible', classification };
        default:
            // GENERATED, BINARY, VENDOR, CACHE, UNKNOWN
            return { eligible: false, reason: classification.toLowerCase(), classification };
    }
}

export { DEFAULT_MAX_FILE_SIZE, DEFAULT_MAX_LINE_LENGTH, EXCLUDED_DIRS, EXCLUDED_EXTENSIONS };
