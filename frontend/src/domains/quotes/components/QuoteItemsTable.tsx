'use client';

import { Trash2 } from 'lucide-react';
import type { QuoteItem, QuoteItemKind } from '@/types/quote.types';
import { formatCents } from '../utils/formatting';

const KIND_LABELS: Record<QuoteItemKind, string> = {
  labor: "Main d'œuvre",
  material: 'Matériel',
  service: 'Service',
  discount: 'Remise',
};

export interface QuoteItemsTableProps {
  items: QuoteItem[];
  editable?: boolean;
  onDeleteItem?: (itemId: string) => void;
}

export function QuoteItemsTable({ items, editable = false, onDeleteItem }: QuoteItemsTableProps) {
  if (items.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-gray-500">Aucun article</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Article</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qté</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">P.U.</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">TVA</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total HT</th>
            {editable && <th className="px-4 py-2" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.map(item => {
            const lineTotal = item.qty * item.unit_price;
            return (
              <tr key={item.id}>
                <td className="px-4 py-2 text-sm">{item.label}</td>
                <td className="px-4 py-2 text-sm text-gray-500">
                  {KIND_LABELS[item.kind]}
                </td>
                <td className="px-4 py-2 text-right text-sm">{item.qty}</td>
                <td className="px-4 py-2 text-right text-sm">{formatCents(item.unit_price)}</td>
                <td className="px-4 py-2 text-right text-sm">{item.tax_rate ?? 0}%</td>
                <td className="px-4 py-2 text-right text-sm font-medium">
                  {formatCents(lineTotal)}
                </td>
                {editable && (
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onDeleteItem?.(item.id)}
                      className="text-red-500 hover:text-red-700"
                      aria-label={`Supprimer ${item.label}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
