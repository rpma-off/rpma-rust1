'use client';

import { formatCents } from '../utils/formatting';

export interface QuoteTotalsProps {
  subtotal: number;
  taxTotal: number;
  total: number;
}

export function QuoteTotals({ subtotal, taxTotal, total }: QuoteTotalsProps) {
  return (
    <div className="space-y-1 border-t pt-4 text-right">
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
