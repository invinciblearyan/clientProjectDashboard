export function formatDisplayDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function dateInputToIsoDateTime(dateValue: string): string {
  return `${dateValue}T00:00:00.000Z`;
}

export function dateInputToIsoEndOfDay(dateValue: string): string {
  return `${dateValue}T23:59:59.999Z`;
}

export function isValidDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed);
}
