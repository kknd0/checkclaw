import { Command } from 'commander';
import { api, ApiError } from '../lib/api.js';
import { requireAuth } from '../lib/config.js';
import { error, info, createTable, formatCurrency } from '../utils/format.js';
import type { Account } from '../types.js';

export function registerAccountsCommand(program: Command): void {
  program
    .command('accounts')
    .description('List connected accounts and balances')
    .option('--type <type>', 'Filter by account type (checking, savings, credit)')
    .action(async (opts: { type?: string }) => {
      try {
        requireAuth();

        let { accounts } = await api.get<{ accounts: Account[] }>(
          '/accounts/balance',
        );

        if (opts.type) {
          accounts = accounts.filter(
            (a) =>
              a.subtype === opts.type ||
              a.type === opts.type,
          );
        }

        if (accounts.length === 0) {
          info('No accounts found.');
          return;
        }

        const table = createTable([
          'Account',
          'Type',
          'Available',
          'Current',
        ]);
        for (const acct of accounts) {
          table.push([
            acct.name,
            acct.subtype,
            formatCurrency(acct.balance.available),
            formatCurrency(acct.balance.current),
          ]);
        }
        console.log(table.toString());
      } catch (err) {
        if (err instanceof ApiError) {
          error(err.message);
        } else {
          throw err;
        }
      }
    });
}
