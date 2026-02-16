import { Command } from 'commander';
import { api, ApiError } from '../lib/api.js';
import { requireAuth } from '../lib/config.js';
import { startLinkServer, LINK_URL } from '../lib/link-server.js';
import { success, error, info, createTable } from '../utils/format.js';
import { openUrl } from '../utils/browser.js';
import type { LinkItem } from '../types.js';

export function registerLinkCommand(program: Command): void {
  program
    .command('link')
    .description('Connect a bank account via Plaid Link')
    .option('--list', 'List authorized bank connections')
    .action(async (opts: { list?: boolean }) => {
      try {
        requireAuth();

        if (opts.list) {
          const { items } = await api.get<{ items: LinkItem[] }>(
            '/link/items',
          );

          if (items.length === 0) {
            info('No bank connections found. Run "checkclaw link" to connect one.');
            return;
          }

          const table = createTable([
            'Institution',
            'Accounts',
            'Status',
            'Connected',
          ]);
          for (const item of items) {
            table.push([
              item.institution,
              String(item.accounts),
              item.status,
              item.created_at,
            ]);
          }
          console.log(table.toString());
          return;
        }

        info('Requesting link token...');
        const { link_token } = await api.post<{ link_token: string }>(
          '/link/token',
        );

        info('Starting local server and opening browser...');
        openUrl(LINK_URL);

        const result = await startLinkServer(link_token);

        if ('error' in result) {
          error(`Bank connection cancelled: ${result.error}`);
          return;
        }

        info('Exchanging token...');
        await api.post('/link/exchange', {
          public_token: result.publicToken,
        });

        success('Bank account connected successfully!');
      } catch (err) {
        if (err instanceof ApiError) {
          error(err.message);
        } else {
          throw err;
        }
      }
    });
}
