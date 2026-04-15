import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { apiRequest, requireAuth } from '../lib/api.js';
import { formatCurrency } from '../utils/format.js';
import { daysAgo, today, validateDaysInput, validateDateInput, displayDate } from '../utils/date.js';
import type { Transaction } from '../types.js';

interface RecurringTransaction {
  id: string;
  merchant?: string;
  name?: string;
  amount: number;
  frequency?: string;
  category?: string[];
  lastDate?: string;
}

export function registerTransactionsCommand(program: Command): void {
  program
    .command('tx')
    .description('Query transaction history')
    .option('--days <n>', 'Days to look back (default: 30). Plaid history limited by days_requested at link time (default 90, max 730)', '30')
    .option('--from <date>', 'Start date YYYY-MM-DD. Data availability depends on when bank was linked and institution limits')
    .option('--to <date>', 'End date YYYY-MM-DD (default: today)')
    .option('--category <category>', 'Filter by category')
    .option('--search <term>', 'Search merchant name')
    .option('--account <type>', 'Filter by account type')
    .option('--min <amount>', 'Minimum transaction amount')
    .option('--limit <n>', 'Limit number of displayed results')
    .option('--recurring', 'Show recurring transactions only')
    .action(async (opts) => {
      requireAuth();

      try {
        if (opts.recurring) {
          await showRecurring();
          return;
        }

        const days = validateDaysInput(opts.days);
        const from = opts.from ? validateDateInput(opts.from, '--from') : daysAgo(days);
        const to = opts.to ? validateDateInput(opts.to, '--to') : today();

        if (from > to) {
          console.error(chalk.red('Error: --from date must be before --to date.'));
          process.exit(1);
        }

        const query: Record<string, string | number | undefined> = {
          from,
          to,
        };
        if (opts.category) query.category = opts.category;
        if (opts.search) query.search = opts.search;
        if (opts.account) query.account = opts.account;
        if (opts.min) query.min = opts.min;

        const allTxns = await fetchAllTransactions(query);

        if (allTxns.length === 0) {
          console.log(chalk.dim('No transactions found.'));
          console.log(chalk.dim('Possible reasons:'));
          console.log(chalk.dim('  - Plaid history is limited to the days_requested set at link time (default: 90 days, max: 730 days)'));
          console.log(chalk.dim('  - Some banks limit history (e.g., Capital One: 90 days only)'));
          console.log(chalk.dim('  - Try a shorter range with --days 30'));
          return;
        }

        // Apply display limit if specified
        const displayTxns = opts.limit
          ? allTxns.slice(0, parseInt(opts.limit, 10))
          : allTxns;

        const table = new Table({
          head: [
            chalk.bold('Date'),
            chalk.bold('Merchant'),
            chalk.bold('Amount'),
            chalk.bold('Category'),
          ],
          colAligns: ['left', 'left', 'right', 'left'],
        });

        let totalSpent = 0;
        let totalIncome = 0;

        for (const tx of displayTxns) {
          const amount = tx.amount;
          const amountStr =
            amount < 0
              ? chalk.red(formatCurrency(amount))
              : chalk.green(formatCurrency(amount));
          const category = tx.category ? tx.category[0] : '-';

          table.push([
            displayDate(tx),
            tx.merchant || tx.name || '-',
            amountStr,
            category,
          ]);

          if (amount < 0) totalSpent += amount;
          else totalIncome += amount;
        }

        console.log(table.toString());
        const parts = [
          ` ${displayTxns.length} transactions`,
          `Total spent: ${chalk.red(formatCurrency(totalSpent))}`,
          `Total income: ${chalk.green(formatCurrency(totalIncome))}`,
        ];
        console.log(parts.join(' | '));
        console.log(chalk.dim(`Query range: ${from} to ${to} | ${allTxns.length} total fetched`));

        if (opts.limit && allTxns.length > parseInt(opts.limit, 10)) {
          console.log(chalk.dim(`Showing ${displayTxns.length} of ${allTxns.length}. Remove --limit to see all.`));
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${(err as Error).message}`));
        process.exit(1);
      }
    });
}

/**
 * Fetch all transactions with automatic pagination.
 * The backend supports high `limit` values but `offset` is non-functional,
 * so we request up to 5000 per call. If has_more is still true, we split
 * the date range and recurse.
 */
async function fetchAllTransactions(
  query: Record<string, string | number | undefined>
): Promise<Transaction[]> {
  const PAGE_LIMIT = 5000;

  const res = await apiRequest<{
    transactions: Transaction[];
    total?: number;
    has_more?: boolean;
  }>('/transactions', {
    query: { ...query, limit: PAGE_LIMIT },
  });

  if (!res.ok) {
    console.error(chalk.red('Failed to fetch transactions.'));
    process.exit(1);
  }

  const txns = res.data.transactions || [];

  // If all data fetched in one shot, return
  if (!res.data.has_more) {
    return txns;
  }

  // has_more=true means more than PAGE_LIMIT txns in this range.
  // Split the date range in half and fetch each half separately.
  const from = String(query.from);
  const to = String(query.to);
  const fromMs = new Date(from + 'T00:00:00').getTime();
  const toMs = new Date(to + 'T00:00:00').getTime();
  const midMs = fromMs + Math.floor((toMs - fromMs) / 2);
  const mid = new Date(midMs);
  const midStr = `${mid.getFullYear()}-${String(mid.getMonth() + 1).padStart(2, '0')}-${String(mid.getDate()).padStart(2, '0')}`;

  // Avoid infinite loop if range can't be split further
  if (midStr <= from || midStr >= to) {
    return txns;
  }

  const [firstHalf, secondHalf] = await Promise.all([
    fetchAllTransactions({ ...query, from, to: midStr }),
    fetchAllTransactions({ ...query, from: midStr, to }),
  ]);

  // Deduplicate by id (midStr date transactions may appear in both halves)
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

async function showRecurring(): Promise<void> {
  const res = await apiRequest<{
    recurring: RecurringTransaction[];
  }>('/transactions/recurring');

  if (!res.ok) {
    console.error(chalk.red('Failed to fetch recurring transactions.'));
    process.exit(1);
  }

  const recurring = res.data.recurring || [];
  if (recurring.length === 0) {
    console.log(chalk.dim('No recurring transactions detected.'));
    return;
  }

  const table = new Table({
    head: [
      chalk.bold('Merchant'),
      chalk.bold('Amount'),
      chalk.bold('Frequency'),
      chalk.bold('Category'),
      chalk.bold('Last Date'),
    ],
    colAligns: ['left', 'right', 'left', 'left', 'left'],
  });

  for (const tx of recurring) {
    const amountStr =
      tx.amount < 0
        ? chalk.red(formatCurrency(tx.amount))
        : chalk.green(formatCurrency(tx.amount));
    const category = tx.category ? tx.category[0] : '-';

    table.push([
      tx.merchant || tx.name || '-',
      amountStr,
      tx.frequency || '-',
      category,
      tx.lastDate || '-',
    ]);
  }

  console.log(table.toString());
  console.log(chalk.dim(` ${recurring.length} recurring transaction(s) detected`));
}
