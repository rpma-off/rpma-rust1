/**
 * Convert bigint timestamp to ISO string
 */
export function bigintToIso(timestamp: bigint | null | undefined): string | null {
  if (!timestamp) return null;
  return new Date(Number(timestamp)).toISOString();
}

/**
 * Convert ISO string to bigint timestamp
 */
export function isoToBigint(iso: string | null | undefined): bigint | null {
  if (!iso) return null;
  return BigInt(new Date(iso).getTime());
}

/**
 * Convert bigint timestamp to number for Date constructor
 */
export function bigintToNumber(timestamp: bigint | null | undefined): number | null {
  if (!timestamp) return null;
  return Number(timestamp);
}