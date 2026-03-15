/**
 * Shared field-format validators for UI feedback.
 *
 * These functions are **display-only helpers** — the backend is the
 * authoritative source of validation.  Do not gate mutations on these alone.
 */

/**
 * Lightweight email format check (UX hint only; backend validates authoritatively).
 *
 * Returns `false` for an empty string so callers can treat it as "not provided"
 * rather than "invalid" when the field is optional.
 */
export function isValidEmailFormat(email: string): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
