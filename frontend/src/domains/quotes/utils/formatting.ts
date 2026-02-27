/**
 * Formats a price stored in cents to a locale string in euros.
 * Example: 15000 → "150.00 €"
 */
export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2) + ' €';
}
