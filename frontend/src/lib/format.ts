import { format as formatFn } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Format currency value (stored as cents) to display format
 */
export function formatCents(cents: number): string {
  const euros = cents / 100;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(euros);
}

/**
 * Format currency with custom code
 */
export function formatCurrency(amount: number, currencyCode: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get currency symbol for a currency code
 */
export function getCurrencySymbol(currencyCode: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currencyCode,
  })
    .formatToParts(1)
    .find((part) => part.type === 'currency')?.value || '€';
}

/**
 * Format a date to locale string
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatFn(dateObj, 'PPP', { locale: fr });
}

/**
 * Format a date to short string
 */
export function formatDateShort(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatFn(dateObj, 'P', { locale: fr });
}

/**
 * Format a date to time string
 */
export function formatTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatFn(dateObj, 'HH:mm', { locale: fr });
}

/**
 * Format a date to date and time string
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatFn(dateObj, 'PPP HH:mm', { locale: fr });
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
