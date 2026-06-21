/**
 * All monetary values are stored as integer minor units (paisa / cents).
 * Formatting happens only at the view layer — never store or compute with floats.
 */

export function formatMoney(
  minorUnits: number,
  currency: string = 'PKR',
  locale: string = 'en-PK',
): string {
  const major = minorUnits / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(major);
}

export function toMinorUnits(major: number): number {
  return Math.round(major * 100);
}

export function toMajorUnits(minor: number): number {
  return minor / 100;
}
