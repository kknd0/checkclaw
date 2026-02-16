import { writeFileSync } from 'fs';
import { Command } from 'commander';
import { stringify } from 'csv-stringify/sync';
import chalk from 'chalk';
import { api, ApiError } from '../lib/api.js';
import { requireAuth } from '../lib/config.js';
import {
  error,
  info,
  success,
  createTable,
  formatCurrency,
} from '../utils/format.js';
import { buildDateRange } from '../utils/date.js';
import type { TransactionsResponse, Transaction } from '../types.js';

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
    .action(
      async (opts: {
        format: string;
        days?: string;
        from?: string;
        to?: string;
        output?: string;
        summary?: boolean;
      }) => {
        try {
          requireAuth();

          const range = buildDateRange({
            days: opts.days ? parseInt(opts.days, 10) : undefined,
            from: opts.from,
            to: opts.to,
          });

          const { transactions } = await api.get<TransactionsResponse>(
            '/transactions',
            {
              from: range.from,
              to: range.to,
              limit: 1000,
            },
          );

          if (transactions.length === 0) {
            info('No transactions found for the given period.');
            return;
          }

          if (opts.summary) {
            printSummary(transactions, range.from, range.to);
            return;
          }

          const output = formatData(transactions, opts.format);

          if (opts.output) {
            writeFileSync(opts.output, output, 'utf-8');
            success(`Exported ${transactions.length} transactions to ${opts.output}`);
          } else {
            console.log(output);
          }
        } catch (err) {
          if (err instanceof ApiError) {
            error(err.message);
          } else {
            throw err;
          }
        }
      },
    );
}

function formatData(transactions: Transaction[], format: string): string {
  if (format === 'json') {
    return JSON.stringify(transactions, null, 2);
  }

  return stringify(
    transactions.map((tx) => ({
      date: tx.date,
      merchant: tx.merchant,
      amount: tx.amount,
      category: tx.category.join(' > '),
      account_id: tx.account_id,
    })),
    { header: true },
  );
}

function printSummary(
  transactions: Transaction[],
  from: string,
  to: string,
): void {
  const categoryTotals: Record<string, number> = {};
  let totalSpent = 0;
  let totalIncome = 0;

  for (const tx of transactions) {
    if (tx.amount < 0) {
      const cat = tx.category[0] || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(tx.amount);
      totalSpent += Math.abs(tx.amount);
    } else {
      totalIncome += tx.amount;
    }
  }

  const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const maxBarWidth = 20;

  console.log(`\nMonthly Summary (${from} -> ${to})`);
  console.log('─'.repeat(45));

  for (const [cat, amount] of sorted) {
    const pct = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
    const barLen = totalSpent > 0 ? Math.round((amount / totalSpent) * maxBarWidth) : 0;
    const bar = chalk.cyan('█'.repeat(barLen));
    const amountStr = amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
    console.log(
      ` ${cat.padEnd(20)} ${amountStr.padStart(10)}  ${bar} ${pct}%`,
    );
  }

  console.log('─'.repeat(45));
  console.log(
    ` ${'Total Spending'.padEnd(20)} ${totalSpent.toLocaleString('en-US', { style: 'currency', currency: 'USD' }).padStart(10)}`,
  );
  console.log(
    ` ${'Total Income'.padEnd(20)} ${totalIncome.toLocaleString('en-US', { style: 'currency', currency: 'USD' }).padStart(10)}`,
  );

  const net = totalIncome - totalSpent;
  console.log(` ${'Net'.padEnd(20)} ${formatCurrency(net).padStart(10)}`);
}
