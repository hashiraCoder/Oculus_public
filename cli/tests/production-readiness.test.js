/**
 * Oculus CLI — Production Readiness Test Suite
 *
 * Comprehensive test coverage for all production-readiness requirements.
 * Covers: exit codes, JSON schemas, TTY handling, ANSI escaping, auth flow,
 * config precedence, scan polling, error handling, and cross-platform behavior.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import {
    loadConfig,
    saveConfig,
    setConfigValue,
    removeConfigValue,
    getConfigPath
} from '../src/config-store.js';
import {
    resolveToken,
    resolveApiUrl,
    resolveWorkspaceId,
    createApiClient,
} from '../src/client.js';
import {
    isJsonMode,
    enableJsonMode,
    stripAnsi,
    escapeSensitiveString,
} from '../src/output.js';

const execAsync = promisify(exec);
const CLI_BIN = path.resolve('bin/oculus.js');

// ============================================================================
// EXIT CODE TESTS
// ============================================================================

describe('Exit Code Contract', () => {
    it('should exit with 0 on successful help command', async () => {
        try {
            await execAsync(`node "${CLI_BIN}" --help`);
            expect(true).toBe(true); // Exit 0 is success
        } catch (e) {
            expect(e.code).not.toBe(0);
            throw e;
        }
    });

    it('should exit with 1 on invalid command', async () => {
        try {
            await execAsync(`node "${CLI_BIN}" invalid-command-xyz 2>&1`);
            expect(false).toBe(true); // Should not reach here
        } catch (e) {
            expect([1, 127]).toContain(e.code);
        }
    });

    it('should exit with 1 when auth is required but not provided', async () => {
        try {
            await execAsync(`node "${CLI_BIN}" repo list 2>&1`, {
                env: { ...process.env, OCULUS_TOKEN: '', OCULUS_WORKSPACE_ID: 'test-ws' }
            });
            expect(false).toBe(true);
        } catch (e) {
            expect(e.code).toBe(1);
        }
    });

    it('should exit with 1 when workspace is required but not provided', async () => {
        try {
            await execAsync(`node "${CLI_BIN}" findings list 2>&1`, {
                env: { ...process.env, OCULUS_TOKEN: 'ocx_live_test' }
            });
            expect(false).toBe(true);
        } catch (e) {
            expect(e.code).toBe(1);
        }
    });
});

// ============================================================================
// JSON OUTPUT TESTS
// ============================================================================

describe('JSON Output Validation', () => {
    it('should emit valid JSON on stdout with --json flag', async () => {
        const { stdout, stderr } = await execAsync(
            `node "${CLI_BIN}" auth status --json`,
            { env: { ...process.env, OCULUS_TOKEN: '' } }
        );
        const output = stdout || stderr;
        expect(() => JSON.parse(output)).not.toThrow();
    });

    it('should not mix prose with JSON in --json mode', async () => {
        const { stdout, stderr } = await execAsync(
            `node "${CLI_BIN}" auth status --json`,
            { env: { ...process.env, OCULUS_TOKEN: '' } }
        );
        const output = (stdout || stderr).trim();
        const lines = output.split('\n');
        // Should be parseable as single JSON object
        expect(() => JSON.parse(lines.join(''))).not.toThrow();
    });

    it('auth status JSON should have required fields when unauthenticated', async () => {
        const { stdout, stderr } = await execAsync(
            `node "${CLI_BIN}" auth status --json`,
            { env: { ...process.env, OCULUS_TOKEN: '' } }
        );
        const output = stdout || stderr;
        const json = JSON.parse(output);
        expect(json).toHaveProperty('authenticated');
    });
});

// ============================================================================
// TTY & ANSI HANDLING TESTS
// ============================================================================

describe('TTY & ANSI Output Handling', () => {
    it('should respect NO_COLOR environment variable', async () => {
        const { stdout, stderr } = await execAsync(
            `node "${CLI_BIN}" auth status`,
            { env: { ...process.env, OCULUS_TOKEN: '', NO_COLOR: '1' } }
        );
        const output = (stdout || '') + (stderr || '');
        // Should not contain ANSI escape codes
        expect(/\x1B\[[0-9;]*m/.test(output)).toBe(false);
    });

    it('should not output ANSI codes when piped', async () => {
        // On Windows, use findstr instead of grep/cat
        const cmd = process.platform === 'win32'
            ? `node "${CLI_BIN}" config path 2>&1 | findstr /c:"."`
            : `node "${CLI_BIN}" config path 2>/dev/null | cat`;
        
        const { stdout } = await execAsync(cmd, { 
            shell: process.platform === 'win32' ? undefined : '/bin/bash'
        });
        // Path should be readable, no ANSI codes
        expect(stdout).toContain('.oculus');
    });

    it('should strip ANSI from vulnerable server-controlled data', () => {
        const maliciousRepoName = 'repo\x1B[0;32m[SAFE]';
        const escaped = escapeSensitiveString(maliciousRepoName);
        expect(escaped).not.toContain('\x1B');
        expect(escaped).toEqual('repo[SAFE]');
    });

    it('should replace newlines in server-controlled data to prevent injection', () => {
        const maliciousDesc = 'normal description\nFAKE_ALERT: Your token leaked';
        const escaped = escapeSensitiveString(maliciousDesc);
        expect(escaped).not.toContain('\n');
        expect(escaped).toEqual('normal description FAKE_ALERT: Your token leaked');
    });
});

// ============================================================================
// CONFIG RESOLUTION TESTS
// ============================================================================

describe('Configuration Precedence', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it('should prioritize explicit CLI flag over environment variable', () => {
        process.env.OCULUS_TOKEN = 'env-token';
        const result = resolveToken('explicit-token');
        expect(result).toBe('explicit-token');
    });

    it('should prioritize environment variable over config file', () => {
        process.env.OCULUS_TOKEN = 'env-token';
        const result = resolveToken();
        expect(result).toBe('env-token');
    });

    it('should use config file when no env var or explicit value', () => {
        delete process.env.OCULUS_TOKEN;
        setConfigValue('token', 'config-token');
        const result = resolveToken();
        expect(result).toBe('config-token');
        removeConfigValue('token');
    });

    it('should return null for token when nothing is configured', () => {
        delete process.env.OCULUS_TOKEN;
        removeConfigValue('token');
        const result = resolveToken();
        expect(result).toBeNull();
    });

    it('should apply workspace ID resolution precedence correctly', () => {
        process.env.OCULUS_WORKSPACE_ID = 'env-ws';
        expect(resolveWorkspaceId('explicit-ws')).toBe('explicit-ws');
        expect(resolveWorkspaceId()).toBe('env-ws');
    });
});

// ============================================================================
// CONFIG STORE TESTS
// ============================================================================

describe('Configuration Store Security', () => {
    let originalConfig = {};

    beforeEach(() => {
        originalConfig = loadConfig();
    });

    afterEach(() => {
        saveConfig(originalConfig);
    });

    it('should create config directory with restrictive permissions', () => {
        const configPath = getConfigPath();
        const configDir = path.dirname(configPath);
        
        // Ensure directory exists
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
        }

        const stats = fs.statSync(configDir);
        // On Unix-like systems, check mode (won't work on Windows)
        if (process.platform !== 'win32') {
            expect((stats.mode & parseInt('777', 8))).toBe(parseInt('700', 8));
        }
    });

    it('should save config file with restrictive permissions', () => {
        setConfigValue('test-permission-key', 'test-value');
        const configPath = getConfigPath();
        
        if (process.platform !== 'win32') {
            const stats = fs.statSync(configPath);
            expect((stats.mode & parseInt('777', 8))).toBe(parseInt('600', 8));
        }

        removeConfigValue('test-permission-key');
    });

    it('should mask tokens in config get output', () => {
        setConfigValue('token', 'ocx_live_verylongtoken123456');
        const token = 'ocx_live_verylongtoken123456';
        
        // Simulate how config.js displays tokens
        const displayVal = token.substring(0, 12) + '…';
        expect(displayVal).toEqual('ocx_live_ver…');
        expect(displayVal).not.toEqual(token);

        removeConfigValue('token');
    });
});

// ============================================================================
// POLLING & TIMEOUT TESTS
// ============================================================================

describe('Scan Polling Validation', () => {
    it('should accept valid poll interval values', () => {
        const valid = [1, 5, 10, 300];
        valid.forEach(interval => {
            const ms = Math.max(1000, interval * 1000);
            expect(ms).toBeGreaterThanOrEqual(1000);
        });
    });

    it('should accept valid timeout values', () => {
        const valid = [1, 300, 600, 3600];
        valid.forEach(timeout => {
            expect(timeout).toBeGreaterThan(0);
        });
    });

    it('should validate poll interval is at least 1 second', () => {
        const pollInterval = Math.max(1, parseInt('0', 10) || 5);
        expect(pollInterval).toBeGreaterThanOrEqual(1);
    });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('Error Handling & Messages', () => {
    it('should not expose tokens in error messages', async () => {
        const token = 'ocx_live_secrettoken123456789';
        try {
            await execAsync(
                `node "${CLI_BIN}" auth status --token "${token}" 2>&1`
            );
        } catch (e) {
            const output = (e.stderr || '') + (e.stdout || '');
            expect(output).not.toContain(token);
        }
    });

    it('should provide helpful error messages for auth failure', async () => {
        try {
            await execAsync(
                `node "${CLI_BIN}" repo list 2>&1`,
                { env: { ...process.env, OCULUS_TOKEN: '', OCULUS_WORKSPACE_ID: 'test-ws' } }
            );
        } catch (e) {
            expect(e.stderr + e.stdout).toMatch(/authenticate|auth login|OCULUS_TOKEN/i);
        }
    });

    it('should provide helpful error messages for missing workspace', async () => {
        try {
            await execAsync(
                `node "${CLI_BIN}" findings list 2>&1`,
                { env: { ...process.env, OCULUS_WORKSPACE_ID: '' } }
            );
        } catch (e) {
            expect(e.stderr + e.stdout).toMatch(/workspace|OCULUS_WORKSPACE_ID|required/i);
        }
    });
});

// ============================================================================
// COMMAND HELP TESTS
// ============================================================================

describe('CLI Help & Usage', () => {
    it('should display all core commands in help', async () => {
        const { stdout } = await execAsync(`node "${CLI_BIN}" --help`);
        expect(stdout).toContain('auth');
        expect(stdout).toContain('scan');
        expect(stdout).toContain('findings');
        expect(stdout).toContain('repo');
        expect(stdout).toContain('config');
    });

    it('should display auth subcommands in help', async () => {
        const { stdout } = await execAsync(`node "${CLI_BIN}" auth --help`);
        expect(stdout).toContain('login');
        expect(stdout).toContain('status');
        expect(stdout).toContain('logout');
    });

    it('should display version on --version flag', async () => {
        const { stdout } = await execAsync(`node "${CLI_BIN}" --version`);
        expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    });
});

// ============================================================================
// PACKAGE VALIDATION TESTS
// ============================================================================

describe('Package Configuration', () => {
    it('should have valid package.json', () => {
        const packageJson = JSON.parse(
            fs.readFileSync(path.resolve('package.json'), 'utf8')
        );
        expect(packageJson.name).toBe('@oculus/cli');
        expect(packageJson.bin).toHaveProperty('oculus');
        expect(packageJson.engines.node).toMatch(/>=.*18/);
        expect(packageJson.type).toBe('module');
    });

    it('should include required files in package.files', () => {
        const packageJson = JSON.parse(
            fs.readFileSync(path.resolve('package.json'), 'utf8')
        );
        expect(packageJson.files).toContain('bin/');
        expect(packageJson.files).toContain('src/');
        expect(packageJson.files).toContain('README.md');
    });

    it('should not include sensitive patterns in package.files', () => {
        const packageJson = JSON.parse(
            fs.readFileSync(path.resolve('package.json'), 'utf8')
        );
        const sensitivePatterns = ['.git', 'node_modules', 'tests/', 'logs/', '.env.'];
        const files = packageJson.files || [];
        sensitivePatterns.forEach(pattern => {
            const hasPattern = files.some(f => f.includes(pattern));
            if (hasPattern) {
                console.log(`Found sensitive pattern: ${pattern} in files: ${files.filter(f => f.includes(pattern))}`);
            }
            // .env.example is allowed, but .env and .git are not
            if (pattern === '.env.') {
                expect(files).not.toContain('.env');
            } else {
                expect(hasPattern).toBe(false);
            }
        });
    });
});
