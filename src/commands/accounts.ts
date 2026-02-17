import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { apiRequest, requireAuth } from '../lib/api.js';
import { formatCurrencyPlain } from '../utils/format.js';

interface Account {
  id: string;
  name: string;
  type: string;
  subtype: string;
  balance: {
    available: number | null;
    current: number | null;
    currency: string;
  };
}

export function registerAccountsCommand(program: Command): void {
  program
    .command('accounts')
    .description('List all connected accounts with balances')
    .option('--type <type>', 'Filter by account type (checking, savings, credit)')
    .action(async (opts) => {
      requireAuth();

      try {
        const res = await apiRequest<{ accounts: Account[] }>('/accounts/balance');
        if (!res.ok) {
          console.error(chalk.red('Failed to fetch accounts.'));
          process.exit(1);
        }

        let accounts = res.data.accounts || [];
        if (accounts.length === 0) {
          console.log(chalk.dim('No accounts found.'));
          console.log(chalk.dim('Run `checkclaw link` to connect a bank first.'));
          return;
        }

        if (opts.type) {
          accounts = accounts.filter(
            (a) =>
              a.type.toLowerCase() === opts.type.toLowerCase() ||
              a.subtype.toLowerCase() === opts.type.toLowerCase()
          );
        }

        const table = new Table({
          head: [
            chalk.bold('Account'),
            chalk.bold('Type'),
            chalk.bold('Available'),
            chalk.bold('Current'),
          ],
          colAligns: ['left', 'left', 'right', 'right'],
        });

        for (const acc of accounts) {
          table.push([
            acc.name,
            acc.subtype || acc.type,
            acc.balance.available !== null
              ? formatCurrencyPlain(acc.balance.available)
              : '-',
            acc.balance.current !== null
              ? formatCurrencyPlain(acc.balance.current)
              : '-',
          ]);
        }

        console.log(table.toString());
      } catch (err) {
        console.error(chalk.red(`Error: ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
