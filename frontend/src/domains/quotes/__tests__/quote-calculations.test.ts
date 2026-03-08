import {
  computeQuoteTotals,
  computeDiscountAmount,
  computeTotalsFromSubtotals,
} from '../utils/quote-calculations';

describe('computeQuoteTotals', () => {
  it('rounds line totals to nearest integer (ROUND_HALF_UP)', () => {
    // qty=1.5, unit_price=333 → 1.5 * 333 = 499.5 → rounds to 500
    const result = computeQuoteTotals([{ qty: 1.5, unit_price: 333, tax_rate: null }]);
    expect(result.subtotal).toBe(500);
  });

  it('matches backend rounding for fractional quantities', () => {
    // qty=2.3, unit_price=1500 → 2.3 * 1500 = 3450 → exactly 3450
    const result = computeQuoteTotals([{ qty: 2.3, unit_price: 1500, tax_rate: 20 }]);
    expect(result.subtotal).toBe(3450);
    // tax = round(3450 * 20/100) = round(690) = 690
    expect(result.taxTotal).toBe(690);
    expect(result.total).toBe(4140);
  });

  it('computes percentage discount correctly', () => {
    const items = [{ qty: 1, unit_price: 10000, tax_rate: 20 }];
    const result = computeQuoteTotals(items, 'percentage', 10);
    // Raw subtotal = 10000
    // Discount = round(10000 * 10/100) = 1000
    // Subtotal after discount = 9000
    expect(result.discountAmount).toBe(1000);
    expect(result.subtotal).toBe(9000);
  });

  it('computes fixed discount correctly', () => {
    const items = [{ qty: 1, unit_price: 10000, tax_rate: 20 }];
    const result = computeQuoteTotals(items, 'fixed', 2500);
    expect(result.discountAmount).toBe(2500);
    expect(result.subtotal).toBe(7500);
  });

  it('caps fixed discount at subtotal', () => {
    const items = [{ qty: 1, unit_price: 1000, tax_rate: null }];
    const result = computeQuoteTotals(items, 'fixed', 5000);
    expect(result.discountAmount).toBe(1000); // capped at subtotal
    expect(result.subtotal).toBe(0);
    expect(result.total).toBe(0);
  });

  it('handles empty items', () => {
    const result = computeQuoteTotals([]);
    expect(result.subtotal).toBe(0);
    expect(result.taxTotal).toBe(0);
    expect(result.total).toBe(0);
  });

  it('handles items without tax', () => {
    const items = [{ qty: 2, unit_price: 5000, tax_rate: null }];
    const result = computeQuoteTotals(items);
    expect(result.subtotal).toBe(10000);
    expect(result.taxTotal).toBe(0);
    expect(result.total).toBe(10000);
  });
});

describe('computeDiscountAmount', () => {
  it('returns 0 for no discount', () => {
    expect(computeDiscountAmount(10000, null, null)).toBe(0);
    expect(computeDiscountAmount(10000, undefined, undefined)).toBe(0);
  });

  it('computes percentage discount', () => {
    expect(computeDiscountAmount(10000, 'percentage', 15)).toBe(1500);
  });

  it('computes fixed discount', () => {
    expect(computeDiscountAmount(10000, 'fixed', 3000)).toBe(3000);
  });

  it('caps fixed discount at subtotal', () => {
    expect(computeDiscountAmount(1000, 'fixed', 5000)).toBe(1000);
  });
});

describe('computeTotalsFromSubtotals', () => {
  it('computes totals from raw subtotal and tax rate', () => {
    const result = computeTotalsFromSubtotals(10000, 20);
    expect(result.subtotal).toBe(10000);
    expect(result.taxTotal).toBe(2000);
    expect(result.total).toBe(12000);
  });

  it('applies discount before tax', () => {
    const result = computeTotalsFromSubtotals(10000, 20, 'percentage', 10);
    expect(result.discountAmount).toBe(1000);
    expect(result.subtotal).toBe(9000);
    expect(result.taxTotal).toBe(1800);
    expect(result.total).toBe(10800);
  });

  it('treats "none" discount type as no discount', () => {
    const result = computeTotalsFromSubtotals(10000, 20, 'none', 500);
    expect(result.discountAmount).toBe(0);
    expect(result.subtotal).toBe(10000);
  });
});
