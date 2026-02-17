import { Command } from 'commander';
import { createInterface } from 'readline';
import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import chalk from 'chalk';
import { apiRequest } from '../lib/api.js';
import { saveApiKey, saveSession, clearAuth, isAuthenticated, getApiUrl } from '../lib/config.js';

function prompt(question: string, hide = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    if (hide) {
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
          process.exit(0);
        } else if (c === '\u007f' || c === '\b') {
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

async function openBrowser(url: string): Promise<void> {
  const { exec } = await import('child_process');
  const platform = process.platform;
  const cmd =
    platform === 'darwin' ? 'open' :
    platform === 'win32' ? 'start' :
    'xdg-open';

  return new Promise((resolve) => {
    exec(`${cmd} "${url}"`, (err) => {
      if (err) {
        // If open fails, just print the URL
        console.log(chalk.yellow(`\n  Could not open browser automatically.`));
        console.log(chalk.yellow(`  Open this URL manually:\n`));
        console.log(chalk.cyan(`  ${url}\n`));
      }
      resolve();
    });
  });
}

function startCallbackServer(): Promise<{ port: number; waitForKey: () => Promise<{ apiKey: string; email?: string }> }> {
  return new Promise((resolve, reject) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      // CORS headers for browser
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method === 'POST' && req.url === '/callback') {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));

            // Emit the data
            server.emit('auth-callback', data);
          } catch {
            res.writeHead(400);
            res.end('Invalid JSON');
          }
        });
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    });

    // Find a free port
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Failed to start local server'));
        return;
      }

      const port = addr.port;

      const waitForKey = (): Promise<{ apiKey: string; email?: string }> => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            server.close();
            reject(new Error('Timed out waiting for browser authorization (2 minutes)'));
          }, 120_000);

          server.on('auth-callback', (data: { apiKey: string; email?: string }) => {
            clearTimeout(timeout);
            server.close();
            resolve(data);
          });
        });
      };

      resolve({ port, waitForKey });
    });

    server.on('error', reject);
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
          console.log(chalk.dim('Run `checkclaw login` to sign in.'));
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
    .option('--email', 'Log in with email/password (no browser)')
    .action(async (opts) => {
      try {
        // Direct API key login
        if (opts.key) {
          saveApiKey(opts.key);
          console.log(chalk.green('✓ API key saved.'));

          const res = await apiRequest<{ id?: string; email?: string }>('/auth/me');
          if (res.ok && typeof res.data === 'object' && res.data?.email) {
            console.log(chalk.dim(`Logged in as ${res.data.email}`));
          }
          return;
        }

        // Email/password login
        if (opts.email) {
          const email = await prompt('Email: ');
          const password = await prompt('Password: ', true);

          if (!email || !password) {
            console.error(chalk.red('Email and password are required.'));
            process.exit(1);
          }

          console.log(chalk.dim('Logging in...'));

          // Sign in via API
          const signInRes = await apiRequest<{ token?: string; user?: { email: string }; error?: string }>(
            '/api/auth/sign-in/email',
            { method: 'POST', body: { email, password } }
          );

          if (!signInRes.ok) {
            const msg = typeof signInRes.data === 'object' && signInRes.data !== null
              ? (signInRes.data as Record<string, unknown>).message || JSON.stringify(signInRes.data)
              : String(signInRes.data);
            console.error(chalk.red(`Login failed: ${msg}`));
            process.exit(1);
          }

          // Create API key for CLI
          console.log(chalk.dim('Creating API key...'));
          const keyRes = await apiRequest<{ key?: string; error?: string }>(
            '/auth/api-keys',
            { method: 'POST', body: { name: `cli-${new Date().toISOString().slice(0, 10)}` } }
          );

          if (keyRes.ok && typeof keyRes.data === 'object' && keyRes.data?.key) {
            saveApiKey(keyRes.data.key);
            console.log(chalk.green('✓ Logged in successfully!'));
            console.log(chalk.dim(`Welcome, ${email}`));
          } else {
            console.error(chalk.red('Failed to create API key.'));
            process.exit(1);
          }
          return;
        }

        // Default: Browser-based login
        console.log(chalk.dim('Starting browser login...'));

        const { port, waitForKey } = await startCallbackServer();
        const authUrl = `https://checkclaw.com/cli-auth?port=${port}`;

        console.log();
        console.log(chalk.bold('  Opening browser to authorize...'));
        console.log();
        console.log(chalk.dim('  If the browser doesn\'t open, visit:'));
        console.log(chalk.cyan(`  ${authUrl}`));
        console.log();
        console.log(chalk.dim('  Waiting for authorization...'));

        await openBrowser(authUrl);

        const { apiKey, email } = await waitForKey();

        saveApiKey(apiKey);
        console.log();
        console.log(chalk.green('✓ Logged in successfully!'));
        if (email) {
          console.log(chalk.dim(`  Authenticated as ${email}`));
        }
        console.log(chalk.dim(`  API key saved to local config.`));
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

  program
    .command('whoami')
    .description('Show current authenticated user')
    .action(async () => {
      if (!isAuthenticated()) {
        console.log(chalk.dim('Not logged in. Run `checkclaw login` to authenticate.'));
        return;
      }

      const res = await apiRequest<{ id?: string; email?: string; name?: string; plan?: string }>('/auth/me');
      if (res.ok && typeof res.data === 'object' && res.data?.email) {
        console.log(chalk.bold(res.data.email));
        if (res.data.name) console.log(chalk.dim(`Name: ${res.data.name}`));
        if (res.data.plan) console.log(chalk.dim(`Plan: ${res.data.plan}`));
      } else {
        console.log(chalk.red('Session expired. Run `checkclaw login` to re-authenticate.'));
      }
    });
}
