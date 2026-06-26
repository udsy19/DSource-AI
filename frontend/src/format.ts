export function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

export function score(value: number): string {
  return value.toFixed(3);
}

export function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}
