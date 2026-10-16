/**
 * Oculus CLI — Shared Output Utility
 *
 * Handles three rendering modes:
 *   1. JSON mode  : --json flag or OCULUS_JSON=1 env → emit raw JSON only, no chalk
 *   2. Plain mode : NO_COLOR=1 env OR stdout is not a TTY (pipe/redirect) → strip chalk
 *   3. Rich mode  : interactive terminal → full chalk colour output (default)
 *
 * All commands should import from here instead of using chalk/console directly,
 * so that piped output is always machine-readable and CI logs are clean.
 */

import chalk from 'chalk';

// ---------------------------------------------------------------------------
// Mode detection (evaluated once at module load)
// ---------------------------------------------------------------------------

/** True when the caller explicitly requested JSON output. */
let _jsonMode = false;

/**
 * Activate JSON mode. Call this early in a command's .action() handler
 * when the --json flag is present.
 */
export function enableJsonMode() {
    _jsonMode = true;
}

/** Returns true when JSON mode is active. */
export function isJsonMode() {
    return _jsonMode;
}

/**
 * Returns true when chalk colours should be suppressed:
 * - NO_COLOR env var set (https://no-color.org/)
 * - stdout is not a TTY (piped to file or another process)
 * - JSON mode is active
 */
function isPlainMode() {
    if (_jsonMode) return true;
    if (process.env.NO_COLOR !== undefined) return true;
    if (!process.stdout.isTTY) return true;
    return false;
}

// ---------------------------------------------------------------------------
// Core primitives
// ---------------------------------------------------------------------------

/**
 * Strips ANSI escape codes from a string.
 * Used in plain/JSON mode so piped output is clean.
 * @param {string} str
 * @returns {string}
 */
export function stripAnsi(str) {
    // eslint-disable-next-line no-control-regex
    return String(str).replace(/\x1B\[[0-9;]*m/g, '');
}

/**
 * Escapes ANSI control sequences in server-controlled strings to prevent terminal injection.
 * Converts newlines to spaces to prevent log injection.
 * @param {string} str
 * @returns {string}
 */
export function escapeSensitiveString(str) {
    if (typeof str !== 'string') return String(str);
    return str
        .replace(/\x1B\[[0-9;]*m/g, '')  // Remove standard ANSI color codes
        .replace(/\x1B\[0m/g, '')        // Remove ANSI reset codes
        .replace(/\x1B\[[0-9;]*[A-Za-z]/g, '') // Remove other ANSI sequences
        .replace(/\x1B/g, '')              // Remove any remaining ESC characters
        .replace(/\n/g, ' ')               // Replace newlines with spaces
        .replace(/\r/g, '')                // Remove carriage returns
        .replace(/\t/g, ' ');              // Replace tabs with spaces
}

/**
 * Print a message to stdout. Strips colour in plain/JSON mode.
 * @param {string} message
 */
export function print(message) {
    if (isPlainMode()) {
        process.stdout.write(stripAnsi(message) + '\n');
    } else {
        process.stdout.write(message + '\n');
    }
}

/**
 * Print a message to stderr. Strips colour in plain/JSON mode.
 * @param {string} message
 */
export function printError(message) {
    if (isPlainMode()) {
        process.stderr.write(stripAnsi(message) + '\n');
    } else {
        process.stderr.write(message + '\n');
    }
}

/**
 * Emit a JSON payload to stdout (used in --json mode).
 * Always writes clean JSON with no surrounding prose.
 * @param {object} payload
 */
export function printJson(payload) {
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
}

/**
 * Print a progress character (dot, exclamation) inline without newline.
 * Suppressed entirely in JSON mode to keep stdout parseable.
 * @param {string} char
 */
export function printProgress(char) {
    if (_jsonMode) return;
    if (isPlainMode()) {
        process.stdout.write(stripAnsi(char));
    } else {
        process.stdout.write(char);
    }
}

// ---------------------------------------------------------------------------
// Semantic helpers (mirrors the chalk calls used across commands)
// ---------------------------------------------------------------------------

export const color = {
    success: (s) => isPlainMode() ? String(s) : chalk.green(s),
    error:   (s) => isPlainMode() ? String(s) : chalk.red(s),
    warn:    (s) => isPlainMode() ? String(s) : chalk.yellow(s),
    info:    (s) => isPlainMode() ? String(s) : chalk.blue(s),
    muted:   (s) => isPlainMode() ? String(s) : chalk.gray(s),
    bold:    (s) => isPlainMode() ? String(s) : chalk.bold(s),
    cyan:    (s) => isPlainMode() ? String(s) : chalk.cyan(s),
    magenta: (s) => isPlainMode() ? String(s) : chalk.magenta(s),
    // Severity
    CRITICAL: (s) => isPlainMode() ? `[CRITICAL] ${s}` : chalk.bgRed.white.bold(s),
    HIGH:     (s) => isPlainMode() ? `[HIGH] ${s}`     : chalk.red.bold(s),
    MEDIUM:   (s) => isPlainMode() ? `[MEDIUM] ${s}`   : chalk.yellow.bold(s),
    LOW:      (s) => isPlainMode() ? `[LOW] ${s}`      : chalk.blue.bold(s),
    // Risk grade
    A: (s) => isPlainMode() ? s : chalk.green.bold(s),
    B: (s) => isPlainMode() ? s : chalk.cyan.bold(s),
    C: (s) => isPlainMode() ? s : chalk.yellow.bold(s),
    D: (s) => isPlainMode() ? s : chalk.magenta.bold(s),
    F: (s) => isPlainMode() ? s : chalk.red.bold(s),
};
