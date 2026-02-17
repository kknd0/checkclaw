import { Command } from 'commander';
import { createInterface } from 'readline';
import chalk from 'chalk';
import { apiRequest } from '../lib/api.js';
import { saveApiKey, saveSession, clearAuth, isAuthenticated } from '../lib/config.js';

function prompt(question: string, hide = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    if (hide) {
      // For password input, we write the question manually
      process.stdout.write(question);
      const stdin = process.stdin;
      const wasRaw = stdin.isRaw;
      if (stdin.setRawMode) stdin.setRawMode(true);
      let input = '';
      const onData = (ch: Buffer) => {
        const c = ch.toString();
        if (c === '\n' || c === '\r') {
          if (stdin.setRawMode) stdin.setRawMode(wasRaw ?? false);
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          rl.close();
          resolve(input);
        } else if (c === '\u0003') {
          // Ctrl+C
          process.exit(0);
        } else if (c === '\u007f' || c === '\b') {
          // Backspace
          if (input.length > 0) {
            input = input.slice(0, -1);
          }
        } else {
          input += c;
        }
      };
      stdin.on('data', onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

export function registerAuthCommands(program: Command): void {
  program
    .command('signup')
    .description('Create a new checkclaw account')
    .action(async () => {
      try {
        const name = await prompt('Name: ');
        const email = await prompt('Email: ');
        const password = await prompt('Password: ', true);

        if (!name || !email || !password) {
          console.error(chalk.red('All fields are required.'));
          process.exit(1);
        }

        console.log(chalk.dim('Creating account...'));

        const res = await apiRequest<{ user?: { email: string }; error?: string }>(
          '/api/auth/sign-up/email',
          {
            method: 'POST',
            body: { name, email, password },
          }
        );

        if (res.ok) {
          console.log(chalk.green('✓ Account created successfully!'));
          console.log(chalk.dim('You are now logged in.'));
        } else {
          const msg =
            typeof res.data === 'object' && res.data !== null
              ? (res.data as Record<string, unknown>).message || (res.data as Record<string, unknown>).error || JSON.stringify(res.data)
              : String(res.data);
          console.error(chalk.red(`Signup failed: ${msg}`));
          process.exit(1);
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${(err as Error).message}`));
        process.exit(1);
      }
    });

  program
    .command('login')
    .description('Log in to your checkclaw account')
    .option('--key <api-key>', 'Log in with an API key directly')
    .action(async (opts) => {
      try {
        if (opts.key) {
          saveApiKey(opts.key);
          console.log(chalk.green('✓ API key saved.'));

          // Verify the key works
          const res = await apiRequest<{ user?: { email: string } }>('/api/auth/me');
          if (res.ok && typeof res.data === 'object' && res.data?.user) {
            console.log(chalk.dim(`Logged in as ${res.data.user.email}`));
          }
          return;
        }

        const email = await prompt('Email: ');
        const password = await prompt('Password: ', true);

        if (!email || !password) {
          console.error(chalk.red('Email and password are required.'));
          process.exit(1);
        }

        console.log(chalk.dim('Logging in...'));

        const res = await apiRequest<{ user?: { email: string }; error?: string }>(
          '/api/auth/sign-in/email',
          {
            method: 'POST',
            body: { email, password },
          }
        );

        if (res.ok) {
          console.log(chalk.green('✓ Logged in successfully!'));
          if (typeof res.data === 'object' && res.data?.user) {
            console.log(chalk.dim(`Welcome back, ${res.data.user.email}`));
          }
        } else {
          const msg =
            typeof res.data === 'object' && res.data !== null
              ? (res.data as Record<string, unknown>).message || (res.data as Record<string, unknown>).error || JSON.stringify(res.data)
              : String(res.data);
          console.error(chalk.red(`Login failed: ${msg}`));
          process.exit(1);
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${(err as Error).message}`));
        process.exit(1);
      }
    });

  program
    .command('logout')
    .description('Clear stored credentials')
    .action(() => {
      if (!isAuthenticated()) {
        console.log(chalk.dim('Not currently logged in.'));
        return;
      }
      clearAuth();
      console.log(chalk.green('✓ Logged out.'));
    });
}
