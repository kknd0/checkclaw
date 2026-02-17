export function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (amount < 0) return `-$${formatted}`;
  if (amount > 0) return `+$${formatted}`;
  return `$${formatted}`;
}

export function formatCurrencyPlain(amount: number): string {
  const abs = Math.abs(amount);
  return `$${abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len - 1) + '…';
}

export function barChart(fraction: number, maxWidth: number = 20): string {
  const width = Math.round(fraction * maxWidth);
  return '█'.repeat(width);
}
