/**
 * Date utilities for the RPMA application
 */

import { format, parseISO, isValid, formatDistanceToNow, addDays, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Format a date for display
 */
export const formatDate = (date: Date | string | number, formatStr: string = 'dd/MM/yyyy'): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) return 'Invalid date';
    return format(dateObj, formatStr, { locale: fr });
  } catch {
    return 'Invalid date';
  }
};

/**
 * Format a date and time for display
 */
export const formatDateTime = (date: Date | string | number): string => {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
};

/**
 * Get relative time (e.g., "2 hours ago")
 */
export const getRelativeTime = (date: Date | string | number): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) return 'Invalid date';
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: fr });
  } catch {
    return 'Invalid date';
  }
};

/**
 * Check if a date is today
 */
export const isToday = (date: Date | string | number): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  const today = new Date();
  return dateObj.toDateString() === today.toDateString();
};

/**
 * Check if a date is in the past
 */
export const isPast = (date: Date | string | number): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  const now = new Date();
  return dateObj < now;
};

/**
 * Check if a date is in the future
 */
export const isFuture = (date: Date | string | number): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  const now = new Date();
  return dateObj > now;
};

/**
 * Add days to a date
 */
export const addDaysToDate = (date: Date | string | number, days: number): Date => {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  return addDays(dateObj, days);
};

/**
 * Subtract days from a date
 */
export const subDaysFromDate = (date: Date | string | number, days: number): Date => {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  return subDays(dateObj, days);
};

/**
 * Get the start of day
 */
export const startOfDay = (date: Date | string | number): Date => {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  const start = new Date(dateObj);
  start.setHours(0, 0, 0, 0);
  return start;
};

/**
 * Get the end of day
 */
export const endOfDay = (date: Date | string | number): Date => {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  const end = new Date(dateObj);
  end.setHours(23, 59, 59, 999);
  return end;
};