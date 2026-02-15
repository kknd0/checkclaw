export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return formatDate(d);
}

export function parseDate(input: string): Date {
  const match = /^\d{4}-\d{2}-\d{2}$/.test(input);
  if (!match) {
    throw new Error(`Invalid date format: "${input}". Expected YYYY-MM-DD.`);
  }
  const date = new Date(input + 'T00:00:00');
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: "${input}".`);
  }
  return date;
}

export function buildDateRange(opts: {
  days?: number;
  from?: string;
  to?: string;
}): { from: string; to: string } {
  const to = opts.to || formatDate(new Date());
  const from = opts.from || daysAgo(opts.days || 30);
  return { from, to };
}
