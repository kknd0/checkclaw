import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { createInterface } from 'readline';
import { apiRequest, requireAuth } from '../lib/api.js';

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

interface LinkItem {
  itemId: string;
  institutionName?: string;
  institutionId?: string;
  status?: string;
  createdAt?: string;
}

export function registerLinkCommands(program: Command): void {
  program
    .command('link')
    .description('Connect a bank account via Plaid Link')
    .option('--list', 'List connected bank accounts')
    .action(async (opts) => {
      requireAuth();

      try {
        if (opts.list) {
          const res = await apiRequest<{ items: LinkItem[] }>('/link/items');
          if (!res.ok) {
            console.error(chalk.red('Failed to fetch linked accounts.'));
            process.exit(1);
          }
          const items = res.data.items || [];
          if (items.length === 0) {
            console.log(chalk.dim('No bank accounts connected.'));
            console.log(chalk.dim('Run `checkclaw link` to connect one.'));
            return;
          }

          const table = new Table({
            head: [
              chalk.bold('Institution'),
              chalk.bold('Item ID'),
              chalk.bold('Status'),
              chalk.bold('Connected'),
            ],
          });

          for (const item of items) {
            table.push([
              item.institutionName || item.institutionId || 'Unknown',
              item.itemId,
              item.status || 'active',
              item.createdAt || '-',
            ]);
          }

          console.log(table.toString());
          console.log(chalk.dim(`\n ${items.length} bank(s) connected`));
          return;
        }

        // Create Link Token
        console.log(chalk.dim('Creating link token...'));
        const tokenRes = await apiRequest<{ linkToken?: string; linkUrl?: string; link_token?: string }>(
          '/link/token',
          { method: 'POST' }
        );

        if (!tokenRes.ok) {
          console.error(chalk.red('Failed to create link token.'));
          process.exit(1);
        }

        const linkUrl = tokenRes.data.linkUrl;
        if (linkUrl) {
          console.log(chalk.green('✓ Link token created.'));
          console.log(`\nOpen this URL in your browser to connect a bank:\n`);
          console.log(chalk.cyan(linkUrl));

          // Try to open the browser
          try {
            const open = (await import('open')).default;
            await open(linkUrl);
            console.log(chalk.dim('\nBrowser opened. Complete the Plaid Link flow there.'));
          } catch {
            console.log(chalk.dim('\nCopy the URL above and open it in your browser.'));
          }
        } else {
          console.log(chalk.dim('Link token created. Complete the flow on the web dashboard.'));
          console.log(chalk.dim(JSON.stringify(tokenRes.data, null, 2)));
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${(err as Error).message}`));
        process.exit(1);
      }
    });

  program
    .command('unlink')
    .description('Disconnect a bank account')
    .option('--all', 'Disconnect all bank accounts')
    .action(async (opts) => {
      requireAuth();

      try {
        // Get linked items
        const res = await apiRequest<{ items: LinkItem[] }>('/link/items');
        if (!res.ok) {
          console.error(chalk.red('Failed to fetch linked accounts.'));
          process.exit(1);
        }

        const items = res.data.items || [];
        if (items.length === 0) {
          console.log(chalk.dim('No bank accounts connected.'));
          return;
        }

        if (opts.all) {
          for (const item of items) {
            const delRes = await apiRequest(`/link/${item.itemId}`, { method: 'DELETE' });
            if (delRes.ok) {
              console.log(chalk.green(`✓ Disconnected ${item.institutionName || item.itemId}`));
            } else {
              console.error(chalk.red(`Failed to disconnect ${item.institutionName || item.itemId}`));
            }
          }
          return;
        }

        // Interactive selection
        console.log('\nConnected banks:\n');
        items.forEach((item, i) => {
          console.log(`  ${chalk.bold(String(i + 1))}. ${item.institutionName || item.itemId}`);
        });
        console.log();

        const answer = await prompt('Select bank to disconnect (number): ');
        const idx = parseInt(answer, 10) - 1;
        if (isNaN(idx) || idx < 0 || idx >= items.length) {
          console.error(chalk.red('Invalid selection.'));
          process.exit(1);
        }

        const selected = items[idx];
        const delRes = await apiRequest(`/link/${selected.itemId}`, { method: 'DELETE' });
        if (delRes.ok) {
          console.log(chalk.green(`✓ Disconnected ${selected.institutionName || selected.itemId}`));
        } else {
          console.error(chalk.red('Failed to disconnect bank account.'));
          process.exit(1);
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
