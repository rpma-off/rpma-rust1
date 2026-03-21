'use client';

import { useCallback } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { QuotePartInput } from '@/types/quote.types';

export type { QuotePartInput };

interface QuotePartsSectionProps {
  parts: QuotePartInput[];
  onChange: (parts: QuotePartInput[]) => void;
  currencyCode?: string;
}

const emptyPart = (): QuotePartInput => ({
  part_number: '',
  name: '',
  quantity: 1,
  unit_price: 0,
  total: 0,
});

export function QuotePartsSection({
  parts,
  onChange,
}: QuotePartsSectionProps) {
  const updatePart = useCallback(
    (index: number, field: keyof QuotePartInput, value: string | number) => {
      const updated = [...parts];
      const existing = updated[index];
      if (!existing) return;
      const part = { ...existing, [field]: value };

      // Recalculate total when quantity or unit price changes
      if (field === 'quantity' || field === 'unit_price') {
        part.total = Number(part.quantity) * Number(part.unit_price);
      }

      updated[index] = part;
      onChange(updated);
    },
    [parts, onChange]
  );

  const addPart = useCallback(() => {
    onChange([...parts, emptyPart()]);
  }, [parts, onChange]);

  const removePart = useCallback(
    (index: number) => {
      onChange(parts.filter((_, i) => i !== index));
    },
    [parts, onChange]
  );

  const partsSubtotal = parts.reduce((sum, part) => sum + part.total, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Package className="h-4 w-4 text-muted-foreground" />
          Pièces
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addPart}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Ajouter
        </Button>
      </div>

      {parts.length > 0 && (
        <div className="space-y-3">
          {/* Header */}
          <div className="hidden grid-cols-[1fr_2fr_0.7fr_1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground sm:grid">
            <span>Référence</span>
            <span>Nom</span>
            <span>Qté</span>
            <span>Prix unit.</span>
            <span>Total</span>
            <span />
          </div>

          {/* Parts */}
          {parts.map((part, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_2fr_0.7fr_1fr_1fr_auto] items-center">
              <Input
                placeholder="Réf."
                value={part.part_number ?? ''}
                onChange={(e) => updatePart(i, 'part_number', e.target.value)}
                className="h-8 text-sm"
              />
              <Input
                placeholder="Nom de la pièce"
                value={part.name}
                onChange={(e) => updatePart(i, 'name', e.target.value)}
                className="h-8 text-sm"
              />
              <Input
                type="number"
                min="0"
                step="1"
                value={part.quantity}
                onChange={(e) => updatePart(i, 'quantity', parseFloat(e.target.value) || 0)}
                className="h-8 text-sm"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={part.unit_price}
                onChange={(e) => updatePart(i, 'unit_price', parseFloat(e.target.value) || 0)}
                className="h-8 text-sm"
              />
              <div className="flex items-center rounded-md bg-muted/50 px-3 text-sm font-medium h-8">
                {formatCurrency(part.total, 'EUR')}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => removePart(i)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          {/* Add button */}
          <button
            type="button"
            className="flex w-full items-center justify-center rounded-md border border-dashed border-muted-foreground/25 py-2 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground"
            onClick={addPart}
          >
            <Plus className="h-4 w-4" />
          </button>

          {/* Subtotal */}
          <div className="flex justify-end pt-2 text-sm border-t border-border">
            <span className="font-medium text-muted-foreground">
              Sous-total pièces: <span className="text-foreground">{formatCurrency(partsSubtotal, 'EUR')}</span>
            </span>
          </div>
        </div>
      )}

      {parts.length === 0 && (
        <button
          type="button"
          className="flex w-full items-center justify-center rounded-md border border-dashed border-muted-foreground/25 py-4 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground"
          onClick={addPart}
        >
          <Plus className="mr-2 h-4 w-4" />
          <span className="text-sm">Ajouter une pièce</span>
        </button>
      )}
    </div>
  );
}
