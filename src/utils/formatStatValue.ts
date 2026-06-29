export function formatStatValue(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  if (Number.isInteger(value)) return value.toLocaleString();
  return value.toFixed(2);
}

export function formatStatValues(
  values: Array<number | undefined | null>,
): string {
  return values.map(formatStatValue).join(' ~ ');
}
