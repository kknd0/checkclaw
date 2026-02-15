import { Command } from 'commander';
import { stub } from '../utils/format.js';

export function registerLinkCommand(program: Command): void {
  program
    .command('link')
    .description('Connect a bank account via Plaid Link')
    .option('--list', 'List authorized bank connections')
    .action(() => {
      stub('link');
    });
}
