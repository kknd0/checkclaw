import { Command } from 'commander';
import { stub } from '../utils/format.js';

export function registerUnlinkCommand(program: Command): void {
  program
    .command('unlink')
    .description('Disconnect a bank account')
    .option('--all', 'Disconnect all bank accounts')
    .action(() => {
      stub('unlink');
    });
}
