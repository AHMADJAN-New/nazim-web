export function formatMark(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);

  return numericValue.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

export function formatPercentage(value: number | string | null | undefined): string {
  const formattedValue = formatMark(value);
  return formattedValue === '-' ? '-' : `${formattedValue}%`;
}
