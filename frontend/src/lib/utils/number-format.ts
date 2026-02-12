/**
 * Number formatting utilities for the RPMA application
 * All utilities use French locale (fr-FR)
 */

/**
 * Format a number with French locale
 * Example: 1234567.89 -> 1 234 567,89
 */
export function formatNumber(num: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat('fr-FR', options).format(num);
}

/**
 * Format a number as currency (EUR by default)
 * Example: 1234.56 -> 1 234,56 €
 */
export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format a number as percentage
 * Example: 75 -> 75 %
 */
export function formatPercent(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/**
 * Format a number with specified decimal places
 * Example: 1234.5678 -> 1 234,57 (with decimals = 2)
 */
export function formatDecimal(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format a number as compact notation
 * Example: 1234567 -> 1,2 M
 */
export function formatCompact(num: number): string {
  return new Intl.NumberFormat('fr-FR', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(num);
}
