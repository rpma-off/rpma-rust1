/**
 * Client-safe CSRF utilities
 *
 * This module provides CSRF utilities that can be safely used in client-side code
 */

// Constants
const CSRF_HEADER = 'x-csrf-token';

/**
 * Gets the CSRF header name for client-side use
 */
export function getCSRFHeaderName(): string {
  return CSRF_HEADER;
}

/**
 * Gets the CSRF token from cookies (client-side)
 */
export function getCSRFToken(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'rpma_csrf') {
      return decodeURIComponent(value);
    }
  }
  return null;
}