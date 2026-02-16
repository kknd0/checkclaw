import { Command } from 'commander';
import { api, ApiError } from '../lib/api.js';
import { requireAuth } from '../lib/config.js';
import { success, error, info, warn } from '../utils/format.js';
import { confirm, select } from '../utils/prompt.js';
import type { LinkItem } from '../types.js';

export function registerUnlinkCommand(program: Command): void {
  program
    .command('unlink')
    .description('Disconnect a bank account')
    .option('--all', 'Disconnect all bank accounts')
    .action(async (opts: { all?: boolean }) => {
      try {
        requireAuth();

        const { items } = await api.get<{ items: LinkItem[] }>(
          '/link/items',
        );

        if (items.length === 0) {
          info('No bank connections to disconnect.');
          return;
        }

        if (opts.all) {
          const confirmed = await confirm(
            `Disconnect all ${items.length} bank connection(s)?`,
          );
          if (!confirmed) {
            info('Cancelled.');
            return;
          }

          for (const item of items) {
            await api.delete(`/link/${item.id}`);
            success(`Disconnected ${item.institution}`);
          }
          return;
        }

        const itemId = await select(
          'Select a bank connection to disconnect:',
          items.map((item) => ({
            label: `${item.institution} (${item.accounts} account${item.accounts !== 1 ? 's' : ''})`,
            value: item.id,
          })),
        );

        const item = items.find((i) => i.id === itemId)!;
        const confirmed = await confirm(
          `Disconnect ${item.institution}?`,
        );
        if (!confirmed) {
          info('Cancelled.');
          return;
        }

        await api.delete(`/link/${itemId}`);
        success(`Disconnected ${item.institution}`);
      } catch (err) {
        if (err instanceof ApiError) {
          error(err.message);
        } else {
          throw err;
        }
      }
    });
}
