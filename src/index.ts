import { Command } from 'commander';
import { registerAuthCommands } from './commands/auth.js';
import { registerLinkCommands } from './commands/link.js';
import { registerAccountsCommand } from './commands/accounts.js';
import { registerTransactionsCommand } from './commands/transactions.js';
import { registerExportCommand } from './commands/export.js';
import { registerBillingCommand } from './commands/billing.js';

const program = new Command();

program
  .name('checkclaw')
  .description('CLI for checkclaw — query bank accounts, transactions, and manage financial data')
  .version('1.0.0');

registerAuthCommands(program);
registerLinkCommands(program);
registerAccountsCommand(program);
registerTransactionsCommand(program);
registerExportCommand(program);
registerBillingCommand(program);

program.parse();
