import { Command } from 'commander';
import { registerAuthCommands } from './commands/auth.js';
import { registerLinkCommand } from './commands/link.js';
import { registerUnlinkCommand } from './commands/unlink.js';
import { registerAccountsCommand } from './commands/accounts.js';
import { registerTransactionsCommand } from './commands/transactions.js';
import { registerExportCommand } from './commands/export.js';

const program = new Command();

program
  .name('checkclaw')
  .description('CLI tool for querying financial data via Plaid API')
  .version('0.0.1');

registerAuthCommands(program);
registerLinkCommand(program);
registerUnlinkCommand(program);
registerAccountsCommand(program);
registerTransactionsCommand(program);
registerExportCommand(program);

program.parse();
