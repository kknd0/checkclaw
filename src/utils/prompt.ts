import * as readline from 'readline';

export function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function promptSecret(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      terminal: true,
    });
    process.stdout.write(question);
    (rl as any)._writeToOutput = () => {};
    rl.on('line', (line) => {
      rl.close();
      process.stdout.write('\n');
      resolve(line.trim());
    });
  });
}

export async function confirm(question: string): Promise<boolean> {
  const answer = await prompt(`${question} (y/N) `);
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

export async function select(
  question: string,
  options: { label: string; value: string }[],
): Promise<string> {
  console.log(question);
  options.forEach((opt, i) => {
    console.log(`  ${i + 1}) ${opt.label}`);
  });
  const answer = await prompt('Select: ');
  const index = parseInt(answer, 10) - 1;
  if (index >= 0 && index < options.length) {
    return options[index].value;
  }
  throw new Error('Invalid selection');
}
