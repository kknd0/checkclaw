import { Command } from 'commander';
import { api } from '../lib/api.js';
import { requireAuth } from '../lib/config.js';
import { info, createTable, formatCurrency, handleError } from '../utils/format.js';
import { buildDateRange } from '../utils/date.js';
import type { TransactionsResponse } from '../types.js';

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
    .action(
      async (opts: {
        days?: string;
        from?: string;
        to?: string;
        category?: string;
        search?: string;
        account?: string;
        min?: string;
        limit?: string;
        recurring?: boolean;
      }) => {
        try {
          requireAuth();

          if (opts.recurring) {
            const { transactions } = await api.get<TransactionsResponse>(
              '/transactions/recurring',
            );
            displayTransactions(transactions);
            return;
          }

          const range = buildDateRange({
            days: opts.days ? parseInt(opts.days, 10) : undefined,
            from: opts.from,
            to: opts.to,
          });

          const { transactions, total } =
            await api.get<TransactionsResponse>('/transactions', {
              from: range.from,
              to: range.to,
              category: opts.category,
              search: opts.search,
              account: opts.account,
              min: opts.min,
              limit: opts.limit,
            });

          displayTransactions(transactions);

          if (total > transactions.length) {
            info(
              `Showing ${transactions.length} of ${total} transactions. Use --limit to see more.`,
            );
          }
        } catch (err) {
          handleError(err);
        }
      },
    );
}

function displayTransactions(
  transactions: TransactionsResponse['transactions'],
): void {
  if (transactions.length === 0) {
    info('No transactions found.');
    return;
  }

  const table = createTable(['Date', 'Merchant', 'Amount', 'Category']);
  let totalSpent = 0;
  let totalIncome = 0;

  for (const tx of transactions) {
    table.push([
      tx.date,
      tx.merchant,
      formatCurrency(tx.amount),
      tx.category.join(' > '),
    ]);

    if (tx.amount < 0) {
      totalSpent += tx.amount;
    } else {
      totalIncome += tx.amount;
    }
  }

  console.log(table.toString());
  console.log(
    ` ${transactions.length} transactions | Total spent: ${formatCurrency(totalSpent)} | Total income: ${formatCurrency(totalIncome)}`,
  );
}
