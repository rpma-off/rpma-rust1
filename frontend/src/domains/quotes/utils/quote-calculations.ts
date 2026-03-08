/**
 * Centralized quote calculation utilities.
 *
 * These functions mirror the backend's `recalculate_totals` logic in
 * `src-tauri/src/domains/quotes/infrastructure/quote.rs`.
 *
 * All monetary values are in **cents** (integer), matching the backend.
 */

export interface QuoteItemForCalc {
  qty: number;
  /** Unit price in cents */
  unit_price: number;
  /** Tax rate as a percentage, e.g. 20 for 20% */
  tax_rate?: number | null;
}

export interface QuoteTotals {
  /** Sum of (qty * unit_price) for all items, after discount, in cents */
  subtotal: number;
  /** Tax amount (calculated on discounted subtotal), in cents */
  taxTotal: number;
  /** subtotal + taxTotal, in cents */
  total: number;
  /** Discount applied, in cents (0 if none) */
  discountAmount: number;
  /** Subtotal before discount was applied, in cents */
  subtotalBeforeDiscount: number;
}

/**
 * Compute the discount amount in cents given a subtotal, discount type and value.
 *
 * @param subtotal - pre-discount subtotal in cents
 * @param discountType - 'percentage' | 'fixed' | null/undefined (no discount)
 * @param discountValue - percentage (0-100) or fixed amount in cents
 */
export function computeDiscountAmount(
  subtotal: number,
  discountType?: string | null,
  discountValue?: number | null
): number {
  if (!discountType || discountValue == null) return 0;
  if (discountType === 'percentage') {
    return Math.round(subtotal * (discountValue / 100));
  }
  if (discountType === 'fixed') {
    return Math.max(0, Math.min(discountValue, subtotal));
  }
  return 0;
}

/**
 * Compute all quote totals from a list of items and optional discount settings.
 * Mirrors the backend `recalculate_totals` function exactly.
 */
export function computeQuoteTotals(
  items: QuoteItemForCalc[],
  discountType?: string | null,
  discountValue?: number | null
): QuoteTotals {
  // 1. Compute per-item line totals (ROUND_HALF_UP like the backend: (qty * unit_price).round())
  const lineTotals = items.map(item => Math.round(item.qty * item.unit_price));

  // 2. Raw subtotal
  const rawSubtotal = lineTotals.reduce((sum, lt) => sum + lt, 0);

  // 3. Discount
  const discountAmount = computeDiscountAmount(rawSubtotal, discountType, discountValue);
  const subtotal = Math.max(0, rawSubtotal - discountAmount);

  // 4. Tax per-item, then scale proportionally if a discount was applied
  let rawTax = 0;
  for (let i = 0; i < items.length; i++) {
    const rate = items[i].tax_rate;
    if (rate) {
      rawTax += Math.round(lineTotals[i] * (rate / 100));
    }
  }

  const taxTotal =
    discountAmount > 0
      ? Math.round((rawTax * subtotal) / Math.max(1, rawSubtotal))
      : rawTax;

  const total = subtotal + taxTotal;

  return {
    subtotal,
    taxTotal,
    total,
    discountAmount,
    subtotalBeforeDiscount: rawSubtotal,
  };
}

/**
 * Compute totals from pre-aggregated subtotals (in cents) and a single tax rate.
 * Used for the quote creation form preview where a global tax rate is applied.
 *
 * @param rawSubtotal - pre-discount subtotal in cents
 * @param taxRate - tax rate as a percentage, e.g. 20 for 20%
 * @param discountType - 'percentage' | 'fixed' | 'none' | null/undefined
 * @param discountValue - percentage (0-100) or fixed amount in cents
 */
export function computeTotalsFromSubtotals(
  rawSubtotal: number,
  taxRate: number,
  discountType?: string | null,
  discountValue?: number | null
): QuoteTotals {
  const discountAmount = computeDiscountAmount(
    rawSubtotal,
    discountType === 'none' ? null : discountType,
    discountValue
  );
  const subtotal = Math.max(0, rawSubtotal - discountAmount);
  const taxTotal = Math.round(subtotal * (taxRate / 100));
  const total = subtotal + taxTotal;

  return {
    subtotal,
    taxTotal,
    total,
    discountAmount,
    subtotalBeforeDiscount: rawSubtotal,
  };
}
