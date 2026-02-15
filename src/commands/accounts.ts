import { Command } from 'commander';
import { stub } from '../utils/format.js';

export function registerAccountsCommand(program: Command): void {
  program
    .command('accounts')
    .description('List connected accounts and balances')
    .option('--type <type>', 'Filter by account type (checking, savings, credit)')
    .action(() => {
      stub('accounts');
    });
}
