import { Command } from 'commander';
import { setConfigValue, getConfigValue, loadConfig, getConfigPath } from '../config-store.js';
import { print, printError, color } from '../output.js';

export const configCommand = new Command('config')
    .description('Manage local CLI persistent configuration');

// ---------------------------------------------------------------------------
// config set
// ---------------------------------------------------------------------------
configCommand
    .command('set')
    .description('Set a configuration parameter')
    .argument('<key>', 'Configuration key (e.g., token, api-url, workspace)')
    .argument('<value>', 'Configuration value')
    .action((key, value) => {
        const allowedKeys = ['token', 'api-url', 'workspace'];
        if (!allowedKeys.includes(key)) {
            print(color.warn(`Notice: "${key}" is not a standard key (${allowedKeys.join(', ')}). Setting anyway.`));
        }

        setConfigValue(key, value);
        const displayValue = key === 'token' ? '***' : value;
        print(color.success(`✓ Set configuration ${color.bold(key)} = ${color.cyan(displayValue)}`));
    });

// ---------------------------------------------------------------------------
// config get
// ---------------------------------------------------------------------------
configCommand
    .command('get')
    .description('Get a configuration value or display all configuration')
    .argument('[key]', 'Configuration key to inspect')
    .action((key) => {
        if (key) {
            const val = getConfigValue(key);
            if (val === undefined) {
                print(color.warn(`Key "${key}" is not set.`));
            } else {
                const displayVal = key === 'token' ? `${String(val).substring(0, 12)}…` : val;
                print(`${key}: ${color.cyan(displayVal)}`);
            }
        } else {
            const all = loadConfig();
            if (Object.keys(all).length === 0) {
                print(color.warn('No local configuration set.'));
            } else {
                print(color.bold('Current Configuration:'));
                Object.entries(all).forEach(([k, v]) => {
                    const displayVal = k === 'token' ? `${String(v).substring(0, 12)}…` : v;
                    print(`  ${k}: ${color.cyan(displayVal)}`);
                });
            }
        }
    });

// ---------------------------------------------------------------------------
// config path
// ---------------------------------------------------------------------------
configCommand
    .command('path')
    .description('Show the filesystem path to the CLI configuration file')
    .action(() => {
        print(color.muted('Configuration file path:'));
        print(color.cyan(getConfigPath()));
    });
