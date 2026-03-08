'use client';

import { formatCents } from '../utils/formatting';

export interface QuoteTotalsProps {
  subtotal: number;
  taxTotal: number;
  total: number;
  discountAmount?: number | null;
  currencyCode?: string;
}

export function QuoteTotals({ subtotal, taxTotal, total, discountAmount, currencyCode: _currencyCode = 'EUR' }: QuoteTotalsProps) {
  const subtotalBeforeDiscount = discountAmount ? subtotal + discountAmount : subtotal;

  return (
    <div className="space-y-1 border-t pt-4 text-right">
      {discountAmount !== null && discountAmount !== undefined && discountAmount > 0 && (
        <>
          <p className="text-sm text-gray-500">
            Sous-total HT (avant remise):{' '}
            <span className="font-medium text-gray-900">{formatCents(subtotalBeforeDiscount)}</span>
          </p>
          <p className="text-sm text-red-600">
            Remise:{' '}
            <span className="font-medium">-{formatCents(discountAmount)}</span>
          </p>
        </>
      )}

      <p className="text-sm text-gray-500">
        Sous-total HT:{' '}
        <span className="font-medium text-gray-900">{formatCents(subtotal)}</span>
      </p>

      <p className="text-sm text-gray-500">
        TVA:{' '}
        <span className="font-medium text-gray-900">{formatCents(taxTotal)}</span>
      </p>

      <p className="text-lg font-bold text-gray-900">
        Total TTC: {formatCents(total)}
      </p>
    </div>
  );
}
