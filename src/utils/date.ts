export function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatDate(d);
}

export function today(): string {
  return formatDate(new Date());
}

export function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(str: string): Date {
  const d = new Date(str + 'T00:00:00');
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${str}. Use YYYY-MM-DD format.`);
  }
  return d;
}
