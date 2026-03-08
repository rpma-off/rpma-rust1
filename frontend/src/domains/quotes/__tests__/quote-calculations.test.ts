import {
  computeDiscountAmount,
  computeQuoteTotals,
} from '../utils/quote-calculations';

describe('quote-calculations', () => {
  it('clamps fixed discounts to a non-negative amount', () => {
    expect(computeDiscountAmount(1000, 'fixed', -500)).toBe(0);
  });

  it('keeps frontend quote totals aligned with backend rounded line totals', () => {
    const totals = computeQuoteTotals([
      { qty: 1.5, unit_price: 333, tax_rate: 20 },
    ]);

    expect(totals).toEqual({
      subtotal: 500,
      taxTotal: 100,
      total: 600,
      discountAmount: 0,
      subtotalBeforeDiscount: 500,
    });
  });
});
