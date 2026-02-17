import { Command } from 'commander';
import chalk from 'chalk';
import { apiRequest, requireAuth } from '../lib/api.js';
import { formatCurrencyPlain, barChart } from '../utils/format.js';
import { daysAgo, today } from '../utils/date.js';
import { stringify } from 'csv-stringify/sync';
import { writeFileSync } from 'fs';

interface Transaction {
  id: string;
  date: string;
  merchant?: string;
  name?: string;
  amount: number;
  category?: string[];
  account_id?: string;
}

export function registerExportCommand(program: Command): void {
  program
    .command('export')
    .description('Export transactions to CSV or JSON')
    .option('--format <format>', 'Output format: csv or json (default: csv)', 'csv')
    .option('--days <n>', 'Number of days to export (default: 30)', '30')
    .option('--from <date>', 'Start date (YYYY-MM-DD)')
    .option('--to <date>', 'End date (YYYY-MM-DD)')
    .option('-o, --output <file>', 'Output file path')
    .option('--summary', 'Show category spending summary instead of raw data')
    .action(async (opts) => {
      requireAuth();

      try {
        const from = opts.from || daysAgo(parseInt(opts.days, 10));
        const to = opts.to || today();

        // Fetch all transactions
        const res = await apiRequest<{ transactions: Transaction[] }>(
          '/transactions',
          {
            query: { from, to, limit: 1000 },
          }
        );

        if (!res.ok) {
          console.error(chalk.red('Failed to fetch transactions.'));
          process.exit(1);
        }

        const txns = res.data.transactions || [];
        if (txns.length === 0) {
          console.log(chalk.dim('No transactions found.'));
          return;
        }

        if (opts.summary) {
          showSummary(txns, from, to);
          return;
        }

        const format = opts.format.toLowerCase();

        if (format === 'json') {
          const json = JSON.stringify(txns, null, 2);
          if (opts.output) {
            writeFileSync(opts.output, json);
            console.log(chalk.green(`✓ Exported ${txns.length} transactions to ${opts.output}`));
          } else {
            console.log(json);
          }
        } else {
          // CSV
          const records = txns.map((tx) => ({
            date: tx.date,
            merchant: tx.merchant || tx.name || '',
            amount: tx.amount,
            category: tx.category ? tx.category.join(' > ') : '',
            account_id: tx.account_id || '',
          }));

          const csv = stringify(records, {
            header: true,
            columns: ['date', 'merchant', 'amount', 'category', 'account_id'],
          });

          if (opts.output) {
            writeFileSync(opts.output, csv);
            console.log(chalk.green(`✓ Exported ${txns.length} transactions to ${opts.output}`));
          } else {
            process.stdout.write(csv);
          }
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${(err as Error).message}`));
        process.exit(1);
      }
    });
}

function showSummary(transactions: Transaction[], from: string, to: string): void {
  // Group by top-level category
  const categories = new Map<string, number>();
  let totalSpent = 0;
  let totalIncome = 0;

  for (const tx of transactions) {
    if (tx.amount < 0) {
      const cat = tx.category?.[0] || 'Other';
      const existing = categories.get(cat) || 0;
      categories.set(cat, existing + Math.abs(tx.amount));
      totalSpent += Math.abs(tx.amount);
    } else {
      totalIncome += tx.amount;
    }
  }

  // Sort by amount descending
  const sorted = [...categories.entries()].sort((a, b) => b[1] - a[1]);

  console.log(`\n${chalk.bold(`Monthly Summary (${from} -> ${to})`)}`);
  console.log('─'.repeat(50));

  for (const [cat, amount] of sorted) {
    const pct = totalSpent > 0 ? amount / totalSpent : 0;
    const pctStr = `${Math.round(pct * 100)}%`;
    const bar = barChart(pct, 20);
    const catPadded = cat.padEnd(20);
    const amountStr = formatCurrencyPlain(amount).padStart(10);
    console.log(` ${catPadded} ${amountStr}  ${chalk.cyan(bar)} ${pctStr}`);
  }

  console.log('─'.repeat(50));
  console.log(` ${'Total Spending'.padEnd(20)} ${chalk.red(formatCurrencyPlain(totalSpent).padStart(10))}`);
  console.log(` ${'Total Income'.padEnd(20)} ${chalk.green(formatCurrencyPlain(totalIncome).padStart(10))}`);
  const net = totalIncome - totalSpent;
  const netColor = net >= 0 ? chalk.green : chalk.red;
  const netSign = net >= 0 ? '+' : '-';
  console.log(` ${'Net'.padEnd(20)} ${netColor(`${netSign}${formatCurrencyPlain(Math.abs(net))}`.padStart(10))}`);
  console.log();
}
