import { Command } from 'commander';
import { stub } from '../utils/format.js';

export function registerAuthCommands(program: Command): void {
  program
    .command('signup')
    .description('Register a new checkclaw account')
    .action(() => {
      stub('signup');
    });

  program
    .command('login')
    .description('Log in to your checkclaw account')
    .option('--key <apiKey>', 'API key for direct login')
    .action(() => {
      stub('login');
    });

  const billing = program
    .command('billing')
    .description('View subscription plan and usage')
    .action(() => {
      stub('billing');
    });

  billing
    .command('invoices')
    .description('View invoice history')
    .action(() => {
      stub('billing invoices');
    });
}
