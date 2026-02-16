import chalk from 'chalk';
import Table from 'cli-table3';

export function formatCurrency(amount: number): string {
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
  if (amount < 0) return chalk.red(`-${formatted}`);
  if (amount > 0) return chalk.green(`+${formatted}`);
  return formatted;
}

export function createTable(headers: string[]): InstanceType<typeof Table> {
  return new Table({
    head: headers.map((h) => chalk.bold(h)),
    style: { head: [], border: [] },
  });
}

export function info(message: string): void {
  console.log(chalk.blue('ℹ'), message);
}

export function success(message: string): void {
  console.log(chalk.green('✔'), message);
}

export function warn(message: string): void {
  console.log(chalk.yellow('!'), message);
}

export function error(message: string): void {
  console.log(chalk.red('✖'), message);
}

export function stub(commandName: string): void {
  warn(`"${commandName}" is not yet implemented. Coming soon.`);
}

export function handleError(err: unknown): void {
  if (err instanceof Error) {
    error(err.message);
  } else {
    error(String(err));
  }
  process.exitCode = 1;
}
