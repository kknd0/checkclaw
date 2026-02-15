import { Command } from 'commander';
import { stub } from '../utils/format.js';

export function registerExportCommand(program: Command): void {
  program
    .command('export')
    .description('Export transaction data')
    .option('--format <type>', 'Output format (csv, json)', 'csv')
    .option('--days <n>', 'Number of days to export', '30')
    .option('--from <date>', 'Start date (YYYY-MM-DD)')
    .option('--to <date>', 'End date (YYYY-MM-DD)')
    .option('-o, --output <file>', 'Output file path')
    .option('--summary', 'Show category spending summary')
    .action(() => {
      stub('export');
    });
}
