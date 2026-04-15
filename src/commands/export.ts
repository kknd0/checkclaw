import { Command } from 'commander';
import chalk from 'chalk';
import { apiRequest, requireAuth } from '../lib/api.js';
import { formatCurrencyPlain, barChart } from '../utils/format.js';
import { daysAgo, today, validateDaysInput, validateDateInput, displayDate } from '../utils/date.js';
import { stringify } from 'csv-stringify/sync';
import { writeFileSync } from 'fs';
import type { Transaction } from '../types.js';

export function registerExportCommand(program: Command): void {
  program
    .command('export')
    .description('Export transactions to CSV or JSON')
    .option('--format <format>', 'Output format: csv or json (default: csv)', 'csv')
    .option('--days <n>', 'Days to export (default: 30). Plaid history limited by days_requested at link time (default 90, max 730)', '30')
    .option('--from <date>', 'Start date YYYY-MM-DD')
    .option('--to <date>', 'End date YYYY-MM-DD (default: today)')
    .option('-o, --output <file>', 'Output file path')
    .option('--summary', 'Show category spending summary instead of raw data')
    .action(async (opts) => {
      requireAuth();

      try {
        const days = validateDaysInput(opts.days);
        const from = opts.from ? validateDateInput(opts.from, '--from') : daysAgo(days);
        const to = opts.to ? validateDateInput(opts.to, '--to') : today();

        if (from > to) {
          console.error(chalk.red('Error: --from date must be before --to date.'));
          process.exit(1);
        }

        // Fetch all transactions with auto-pagination
        const txns = await fetchAllExportTransactions(from, to);

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
            console.log(chalk.green(`Exported ${txns.length} transactions to ${opts.output}`));
          } else {
            console.log(json);
          }
        } else {
          // CSV — include authorized_date column
          const records = txns.map((tx) => ({
            date: tx.date,
            authorized_date: tx.authorized_date ?? '',
            merchant: tx.merchant || tx.name || '',
            amount: tx.amount,
            category: tx.category ? tx.category.join(' > ') : '',
            account_id: tx.account_id || '',
          }));

          const csv = stringify(records, {
            header: true,
            columns: ['date', 'authorized_date', 'merchant', 'amount', 'category', 'account_id'],
          });

          if (opts.output) {
            writeFileSync(opts.output, csv);
            console.log(chalk.green(`Exported ${txns.length} transactions to ${opts.output}`));
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

/**
 * Fetch all transactions with auto-pagination.
 * Backend supports high `limit` but `offset` is non-functional,
 * so we use date-range splitting as fallback.
 */
async function fetchAllExportTransactions(
  from: string,
  to: string
): Promise<Transaction[]> {
  const PAGE_LIMIT = 5000;

  const res = await apiRequest<{
    transactions: Transaction[];
    total?: number;
    has_more?: boolean;
  }>('/transactions', {
    query: { from, to, limit: PAGE_LIMIT },
  });

  if (!res.ok) {
    console.error(chalk.red('Failed to fetch transactions.'));
    process.exit(1);
  }

  const txns = res.data.transactions || [];
  if (!res.data.has_more) return txns;

  // Split date range in half and recurse
  const fromMs = new Date(from + 'T00:00:00').getTime();
  const toMs = new Date(to + 'T00:00:00').getTime();
  const midMs = fromMs + Math.floor((toMs - fromMs) / 2);
  const mid = new Date(midMs);
  const midStr = `${mid.getFullYear()}-${String(mid.getMonth() + 1).padStart(2, '0')}-${String(mid.getDate()).padStart(2, '0')}`;

  if (midStr <= from || midStr >= to) return txns;

  const [firstHalf, secondHalf] = await Promise.all([
    fetchAllExportTransactions(from, midStr),
    fetchAllExportTransactions(midStr, to),
  ]);

  const seen = new Set<string>();
  const merged: Transaction[] = [];
  for (const tx of [...firstHalf, ...secondHalf]) {
    if (!seen.has(tx.id)) {
      seen.add(tx.id);
      merged.push(tx);
    }
  }
  return merged;
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
