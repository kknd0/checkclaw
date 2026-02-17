import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { apiRequest, requireAuth } from '../lib/api.js';
import { formatCurrency } from '../utils/format.js';
import { daysAgo, today } from '../utils/date.js';

interface Transaction {
  id: string;
  date: string;
  merchant?: string;
  name?: string;
  amount: number;
  category?: string[];
  account_id?: string;
}

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
    .option('--days <n>', 'Number of days to look back (default: 30)', '30')
    .option('--from <date>', 'Start date (YYYY-MM-DD)')
    .option('--to <date>', 'End date (YYYY-MM-DD)')
    .option('--category <category>', 'Filter by category')
    .option('--search <term>', 'Search merchant name')
    .option('--account <type>', 'Filter by account type')
    .option('--min <amount>', 'Minimum transaction amount')
    .option('--limit <n>', 'Limit number of results')
    .option('--recurring', 'Show recurring transactions only')
    .action(async (opts) => {
      requireAuth();

      try {
        if (opts.recurring) {
          await showRecurring();
          return;
        }

        const from = opts.from || daysAgo(parseInt(opts.days, 10));
        const to = opts.to || today();

        const query: Record<string, string | number | undefined> = {
          from,
          to,
        };
        if (opts.category) query.category = opts.category;
        if (opts.search) query.search = opts.search;
        if (opts.account) query.account = opts.account;
        if (opts.min) query.min = opts.min;
        if (opts.limit) query.limit = opts.limit;

        const res = await apiRequest<{
          transactions: Transaction[];
          total?: number;
          has_more?: boolean;
        }>('/transactions', { query });

        if (!res.ok) {
          console.error(chalk.red('Failed to fetch transactions.'));
          process.exit(1);
        }

        const txns = res.data.transactions || [];
        if (txns.length === 0) {
          console.log(chalk.dim('No transactions found.'));
          return;
        }

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

        for (const tx of txns) {
          const amount = tx.amount;
          const amountStr =
            amount < 0
              ? chalk.red(formatCurrency(amount))
              : chalk.green(formatCurrency(amount));
          const category = tx.category ? tx.category[0] : '-';

          table.push([
            tx.date,
            tx.merchant || tx.name || '-',
            amountStr,
            category,
          ]);

          if (amount < 0) totalSpent += amount;
          else totalIncome += amount;
        }

        console.log(table.toString());
        const parts = [
          ` ${txns.length} transactions`,
          `Total spent: ${chalk.red(formatCurrency(totalSpent))}`,
          `Total income: ${chalk.green(formatCurrency(totalIncome))}`,
        ];
        console.log(parts.join(' | '));

        if (res.data.has_more) {
          console.log(chalk.dim('\nMore results available. Use --limit to see more.'));
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${(err as Error).message}`));
        process.exit(1);
      }
    });
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
