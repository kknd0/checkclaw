import { Command } from 'commander';
import { api, ApiError } from '../lib/api.js';
import { setApiKey, requireAuth } from '../lib/config.js';
import { success, error, info, createTable, formatCurrency } from '../utils/format.js';
import { prompt, promptSecret } from '../utils/prompt.js';
import { openUrl } from '../utils/browser.js';
import type { AuthResponse, UserInfo, BillingPlan, Invoice } from '../types.js';

export function registerAuthCommands(program: Command): void {
  program
    .command('signup')
    .description('Register a new checkclaw account')
    .action(async () => {
      try {
        const email = await prompt('Email: ');
        const password = await promptSecret('Password: ');
        const confirmPw = await promptSecret('Confirm password: ');

        if (password !== confirmPw) {
          error('Passwords do not match.');
          process.exit(1);
        }

        const res = await api.post<AuthResponse>('/auth/signup', {
          email,
          password,
        });

        setApiKey(res.api_key);
        success(`Account created! Logged in as ${res.user.email}`);
      } catch (err) {
        if (err instanceof ApiError) {
          error(err.message);
        } else {
          throw err;
        }
      }
    });

  program
    .command('login')
    .description('Log in to your checkclaw account')
    .option('--key <apiKey>', 'API key for direct login')
    .action(async (opts: { key?: string }) => {
      try {
        if (opts.key) {
          setApiKey(opts.key);
          const user = await api.get<UserInfo>('/auth/me');
          success(`Logged in as ${user.email}`);
          return;
        }

        const email = await prompt('Email: ');
        const password = await promptSecret('Password: ');

        const res = await api.post<AuthResponse>('/auth/login', {
          email,
          password,
        });

        setApiKey(res.api_key);
        success(`Logged in as ${res.user.email}`);
      } catch (err) {
        if (err instanceof ApiError) {
          error(err.message);
        } else {
          throw err;
        }
      }
    });

  const billing = program
    .command('billing')
    .description('View subscription plan and usage')
    .action(async () => {
      try {
        requireAuth();
        const plan = await api.get<BillingPlan>('/billing/plan');

        const queriesLimit =
          plan.limits.monthly_queries === -1
            ? 'unlimited'
            : String(plan.limits.monthly_queries);

        console.log(
          `\nPlan: ${plan.plan.charAt(0).toUpperCase() + plan.plan.slice(1)} (${formatCurrency(plan.price)}/${plan.billing_cycle === 'monthly' ? 'mo' : plan.billing_cycle})`,
        );
        console.log(
          `Period ends: ${plan.current_period_end}\n`,
        );
        console.log('Usage:');
        console.log(
          `  Bank connections   ${plan.usage.bank_connections} / ${plan.limits.bank_connections}`,
        );
        console.log(
          `  API queries        ${plan.usage.monthly_queries} / ${queriesLimit}`,
        );
        console.log(
          `\nNext invoice: ${formatCurrency(plan.price)} on ${plan.current_period_end}`,
        );
      } catch (err) {
        if (err instanceof ApiError) {
          error(err.message);
        } else {
          throw err;
        }
      }
    });

  billing
    .command('invoices')
    .description('View invoice history')
    .action(async () => {
      try {
        requireAuth();
        const { invoices } = await api.get<{ invoices: Invoice[] }>(
          '/billing/invoices',
        );

        if (invoices.length === 0) {
          info('No invoices found.');
          return;
        }

        const table = createTable(['Date', 'Description', 'Amount', 'Status']);
        for (const inv of invoices) {
          table.push([
            inv.date,
            inv.description,
            formatCurrency(inv.amount),
            inv.status,
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
