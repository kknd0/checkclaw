import { Command } from 'commander';
import { stub } from '../utils/format.js';

export function registerTransactionsCommand(program: Command): void {
  program
    .command('tx')
    .description('Query transaction history')
    .option('--days <n>', 'Number of days to look back', '30')
    .option('--from <date>', 'Start date (YYYY-MM-DD)')
    .option('--to <date>', 'End date (YYYY-MM-DD)')
    .option('--category <name>', 'Filter by category')
    .option('--search <term>', 'Search merchant name')
    .option('--account <type>', 'Filter by account type')
    .option('--min <amount>', 'Minimum transaction amount')
    .option('--limit <n>', 'Limit number of results')
    .option('--recurring', 'Show recurring transactions only')
    .action(() => {
      stub('tx');
    });
}
