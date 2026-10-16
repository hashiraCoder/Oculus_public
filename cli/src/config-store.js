import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_DIR  = path.join(os.homedir(), '.oculus');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * Ensures the ~/.oculus directory exists with tight permissions (owner-only).
 */
function ensureConfigDir() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    }
}

/**
 * Reads user configuration from ~/.oculus/config.json.
 * Returns an empty object when the file is absent or corrupt.
 * @returns {Record<string, string>}
 */
export function loadConfig() {
    try {
        if (!fs.existsSync(CONFIG_FILE)) return {};
        const data = fs.readFileSync(CONFIG_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

/**
 * Saves user configuration to ~/.oculus/config.json (mode 0600 — owner read/write only).
 * @param {Record<string, string>} config
 */
export function saveConfig(config) {
    ensureConfigDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}

/**
 * Sets a specific config key.
 * @param {string} key
 * @param {string} value
 */
export function setConfigValue(key, value) {
    const current = loadConfig();
    current[key] = value;
    saveConfig(current);
}

/**
 * Gets a specific config key with optional fallback.
 * @param {string} key
 * @param {string} [fallback]
 * @returns {string|undefined}
 */
export function getConfigValue(key, fallback = undefined) {
    const current = loadConfig();
    return current[key] !== undefined ? current[key] : fallback;
}

/**
 * Removes a specific config key.
 * @param {string} key
 */
export function removeConfigValue(key) {
    const current = loadConfig();
    delete current[key];
    saveConfig(current);
}

/**
 * Returns the path to the config file.
 * @returns {string}
 */
export function getConfigPath() {
    return CONFIG_FILE;
}

/**
 * Emits a one-time security notice after a token is first persisted.
 * Called by auth login after successful token write.
 * Keeps the notice out of every saveConfig call to avoid noise.
 */
export function markTokenSaved() {
    // Use stderr so the notice does not pollute JSON or piped stdout.
    // Only print on Unix-style TTY terminals; CI environments will have NO_COLOR or non-TTY.
    if (process.stderr.isTTY && !process.env.NO_COLOR && !process.env.CI) {
        process.stderr.write(
            '\x1B[33mSecurity notice:\x1B[0m Developer token is stored in plaintext at ' +
            CONFIG_FILE +
            ' (mode 0600). Protect this file accordingly.\n'
        );
    }
}
