import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { apiRequest, requireAuth } from '../lib/api.js';
import { formatCurrencyPlain } from '../utils/format.js';

interface Plan {
  plan: string;
  price: number;
  currency: string;
  billing_cycle: string;
  current_period_end: string;
  limits: {
    bank_connections: number;
    monthly_queries: number;
  };
  usage: {
    bank_connections: number;
    monthly_queries: number;
  };
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  description?: string;
}

export function registerBillingCommand(program: Command): void {
  const billing = program
    .command('billing')
    .description('View subscription plan and billing info')
    .action(async () => {
      requireAuth();

      try {
        const res = await apiRequest<Plan>('/billing/plan');
        if (!res.ok) {
          console.error(chalk.red('Failed to fetch billing info.'));
          process.exit(1);
        }

        const plan = res.data;

        console.log(
          `\n${chalk.bold('Plan:')} ${plan.plan.charAt(0).toUpperCase() + plan.plan.slice(1)} (${formatCurrencyPlain(plan.price)}/${plan.billing_cycle === 'monthly' ? 'mo' : plan.billing_cycle})`
        );
        console.log(`${chalk.bold('Period:')} ... -> ${plan.current_period_end}`);

        console.log(`\n${chalk.bold('Usage:')}`);
        const connLimit =
          plan.limits.bank_connections === -1
            ? 'unlimited'
            : String(plan.limits.bank_connections);
        const queryLimit =
          plan.limits.monthly_queries === -1
            ? 'unlimited'
            : String(plan.limits.monthly_queries);

        console.log(
          `  Bank connections   ${plan.usage.bank_connections} / ${connLimit}`
        );
        console.log(
          `  API queries        ${plan.usage.monthly_queries} / ${queryLimit}`
        );

        console.log(
          `\n${chalk.dim(`Next invoice: ${formatCurrencyPlain(plan.price)} on ${plan.current_period_end}`)}`
        );
        console.log();
      } catch (err) {
        console.error(chalk.red(`Error: ${(err as Error).message}`));
        process.exit(1);
      }
    });

  billing
    .command('invoices')
    .description('View invoice history')
    .action(async () => {
      requireAuth();

      try {
        const res = await apiRequest<{ invoices: Invoice[] }>('/billing/invoices');
        if (!res.ok) {
          console.error(chalk.red('Failed to fetch invoices.'));
          process.exit(1);
        }

        const invoices = res.data.invoices || [];
        if (invoices.length === 0) {
          console.log(chalk.dim('No invoices yet.'));
          return;
        }

        const table = new Table({
          head: [
            chalk.bold('Date'),
            chalk.bold('Amount'),
            chalk.bold('Status'),
            chalk.bold('Description'),
          ],
          colAligns: ['left', 'right', 'left', 'left'],
        });

        for (const inv of invoices) {
          const statusColor = inv.status === 'paid' ? chalk.green : chalk.yellow;
          table.push([
            inv.date,
            formatCurrencyPlain(inv.amount),
            statusColor(inv.status),
            inv.description || '-',
          ]);
        }

        console.log(table.toString());
      } catch (err) {
        console.error(chalk.red(`Error: ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
