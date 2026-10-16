import { program } from 'commander';
import dotenv from 'dotenv';
import { authCommand } from './commands/auth.js';
import { scanCommand } from './commands/scan.js';
import { findingsCommand } from './commands/findings.js';
import { repoCommand } from './commands/repo.js';
import { configCommand } from './commands/config.js';

dotenv.config();

program
  .name('oculus')
  .description('Command line interface for Oculus Security Scanning')
  .version('1.0.0');

program.addCommand(authCommand);
program.addCommand(scanCommand);
program.addCommand(findingsCommand);
program.addCommand(repoCommand);
program.addCommand(configCommand);

program.parse(process.argv);

