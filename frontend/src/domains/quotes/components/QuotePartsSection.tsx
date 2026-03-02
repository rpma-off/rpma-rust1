'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCents } from '@/lib/format';
import { toast } from 'sonner';

export interface QuotePartInput {
  part_number: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

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
  currencyCode = 'EUR',
}: QuotePartsSectionProps) {
  const updatePart = useCallback(
    (index: number, field: keyof QuotePartInput, value: string | number) => {
      const updated = [...parts];
      const part = { ...updated[index], [field]: value };

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
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Pièces</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addPart}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Ajouter une pièce
        </Button>
      </div>

      {parts.length > 0 && (
        <>
          {/* Header */}
          <div className="hidden grid-cols-[1fr_2fr_0.7fr_1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground sm:grid">
            <span>N° Pièce</span>
            <span>Nom</span>
            <span>Qté</span>
            <span>Prix unitaire</span>
            <span>Total</span>
            <span />
          </div>

          {/* Parts */}
          {parts.map((part, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_2fr_0.7fr_1fr_1fr_auto]">
              <Input
                placeholder="N° Pièce"
                value={part.part_number ?? ''}
                onChange={(e) => updatePart(i, 'part_number', e.target.value)}
              />
              <Input
                placeholder="Nom de la pièce"
                value={part.name}
                onChange={(e) => updatePart(i, 'name', e.target.value)}
              />
              <Input
                type="number"
                min="0"
                step="1"
                value={part.quantity}
                onChange={(e) => updatePart(i, 'quantity', parseFloat(e.target.value) || 0)}
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={part.unit_price}
                onChange={(e) => updatePart(i, 'unit_price', parseFloat(e.target.value) || 0)}
              />
              <div className="flex items-center rounded-md bg-muted/50 px-3 text-sm font-medium">
                {formatCents(part.total)}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                onClick={() => removePart(i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {/* Add button */}
          <button
            type="button"
            className="flex w-full items-center justify-center rounded-md border border-dashed border-muted-foreground/25 py-1.5 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground"
            onClick={addPart}
          >
            <Plus className="h-4 w-4" />
          </button>

          {/* Subtotal */}
          <div className="flex justify-end pt-1 text-sm">
            <span className="font-medium">
              Sous-total pièces: {formatCents(partsSubtotal)}
            </span>
          </div>
        </>
      )}

      {parts.length === 0 && (
        <button
          type="button"
          className="flex w-full items-center justify-center rounded-md border border-dashed border-muted-foreground/25 py-1.5 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground"
          onClick={addPart}
        >
          <Plus className="mr-1 h-4 w-4" />
          <span className="text-sm">Ajouter une pièce</span>
        </button>
      )}
    </div>
  );
}
