import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import {
    loadConfig,
    saveConfig,
    setConfigValue,
    getConfigValue,
    removeConfigValue,
    getConfigPath
} from '../src/config-store.js';
import {
    resolveToken,
    resolveApiUrl,
    resolveWorkspaceId
} from '../src/client.js';

const execAsync = promisify(exec);
const CLI_BIN = path.resolve('bin/oculus.js');

describe('CLI Configuration Store Unit Tests', () => {
    let originalConfig = {};

    beforeEach(() => {
        originalConfig = loadConfig();
    });

    afterEach(() => {
        saveConfig(originalConfig);
    });

    it('should set, retrieve, and remove config keys', () => {
        setConfigValue('test-key', 'test-value-123');
        expect(getConfigValue('test-key')).toBe('test-value-123');

        removeConfigValue('test-key');
        expect(getConfigValue('test-key')).toBeUndefined();
    });

    it('should return default fallback when key is not present', () => {
        expect(getConfigValue('non-existent-key', 'my-fallback')).toBe('my-fallback');
    });

    it('should provide a valid config file path in home directory', () => {
        const configPath = getConfigPath();
        expect(configPath).toContain('.oculus');
        expect(configPath).toContain('config.json');
    });
});

describe('CLI API Client Resolution Tests', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it('should prioritize explicit parameters over env vars and config', () => {
        process.env.OCULUS_TOKEN = 'env-token';
        process.env.OCULUS_API_URL = 'http://env-url/api/v1';
        process.env.OCULUS_WORKSPACE_ID = 'env-workspace';

        expect(resolveToken('explicit-token')).toBe('explicit-token');
        expect(resolveApiUrl('http://explicit-url/api/v1')).toBe('http://explicit-url/api/v1');
        expect(resolveWorkspaceId('explicit-workspace')).toBe('explicit-workspace');
    });

    it('should fallback to environment variables when explicit options are absent', () => {
        process.env.OCULUS_TOKEN = 'env-token-456';
        process.env.OCULUS_API_URL = 'http://localhost:8000/api/v1';
        process.env.OCULUS_WORKSPACE_ID = 'workspace-789';

        expect(resolveToken()).toBe('env-token-456');
        expect(resolveApiUrl()).toBe('http://localhost:8000/api/v1');
        expect(resolveWorkspaceId()).toBe('workspace-789');
    });

    it('should fallback to default API URL when neither explicit nor env is set', () => {
        delete process.env.OCULUS_API_URL;
        expect(resolveApiUrl()).toBe('http://localhost:3000/api/v1');
    });
});

describe('CLI Command Execution Suite', () => {
    it('should execute "oculus --help" and display all 5 core subcommands', async () => {
        const { stdout } = await execAsync(`node "${CLI_BIN}" --help`);

        expect(stdout).toContain('auth');
        expect(stdout).toContain('scan');
        expect(stdout).toContain('findings');
        expect(stdout).toContain('repo');
        expect(stdout).toContain('config');
    });

    it('should execute "oculus config path" successfully', async () => {
        const { stdout } = await execAsync(`node "${CLI_BIN}" config path`);
        expect(stdout).toContain('.oculus');
    });

    it('should fail with exit code 1 when "oculus scan" is missing required arguments', async () => {
        try {
            await execAsync(`node "${CLI_BIN}" scan`);
            expect.unreachable('Should have failed due to missing arguments');
        } catch (err) {
            expect(err.code).toBe(1);
            expect(err.stderr || err.stdout).toContain('required option');
        }
    });

    it('should fail with exit code 1 when "oculus findings list" has no workspace configured', async () => {
        try {
            await execAsync(`node "${CLI_BIN}" findings list`, {
                env: { ...process.env, OCULUS_TOKEN: 'mock_token', OCULUS_WORKSPACE_ID: '' }
            });
            expect.unreachable('Should have failed due to missing workspace');
        } catch (err) {
            expect(err.code).toBe(1);
            expect(err.stderr || err.stdout).toContain('Workspace ID is required');
        }
    });
});
