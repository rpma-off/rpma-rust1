'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCents, getCurrencySymbol } from '@/lib/format';
import { toast } from 'sonner';

export interface QuoteLaborInput {
  description: string;
  hours: number;
  rate: number;
  total: number;
}

interface QuoteLaborSectionProps {
  laborItems: QuoteLaborInput[];
  defaultRate?: number;
  onChange: (laborItems: QuoteLaborInput[]) => void;
  currencyCode?: string;
}

const makeEmptyLabor = (defaultRate: number = 0): QuoteLaborInput => ({
  description: '',
  hours: 0,
  rate: defaultRate,
  total: 0,
});

export function QuoteLaborSection({
  laborItems,
  defaultRate = 0,
  onChange,
  currencyCode = 'EUR',
}: QuoteLaborSectionProps) {
  const cs = getCurrencySymbol(currencyCode);

  const updateLabor = useCallback(
    (index: number, field: keyof QuoteLaborInput, value: string | number) => {
      const updated = [...laborItems];
      const labor = { ...updated[index], [field]: value };

      // Recalculate total when hours or rate changes
      if (field === 'hours' || field === 'rate') {
        labor.total = Number(labor.hours) * Number(labor.rate);
      }

      updated[index] = labor;
      onChange(updated);
    },
    [laborItems, onChange]
  );

  const addLabor = useCallback(() => {
    onChange([...laborItems, makeEmptyLabor(defaultRate)]);
  }, [laborItems, defaultRate, onChange]);

  const removeLabor = useCallback(
    (index: number) => {
      onChange(laborItems.filter((_, i) => i !== index));
    },
    [laborItems, onChange]
  );

  const laborSubtotal = laborItems.reduce((sum, labor) => sum + labor.total, 0);

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Main d'œuvre</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addLabor}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Ajouter une ligne
        </Button>
      </div>

      {laborItems.length > 0 && (
        <>
          {/* Header */}
          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground sm:grid">
            <span>Description</span>
            <span>Heures</span>
            <span>Taux ({cs})</span>
            <span>Total</span>
            <span />
          </div>

          {/* Labor items */}
          {laborItems.map((labor, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
              <Input
                placeholder="Description du travail"
                value={labor.description}
                onChange={(e) => updateLabor(i, 'description', e.target.value)}
                className="col-span-2 sm:col-span-1"
              />
              <Input
                type="number"
                min="0"
                step="0.1"
                value={labor.hours}
                onChange={(e) => updateLabor(i, 'hours', parseFloat(e.target.value) || 0)}
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={labor.rate}
                onChange={(e) => updateLabor(i, 'rate', parseFloat(e.target.value) || 0)}
              />
              <div className="flex items-center rounded-md bg-muted/50 px-3 text-sm font-medium">
                {formatCents(labor.total)}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                onClick={() => removeLabor(i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {/* Add button */}
          <button
            type="button"
            className="flex w-full items-center justify-center rounded-md border border-dashed border-muted-foreground/25 py-1.5 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground"
            onClick={addLabor}
          >
            <Plus className="h-4 w-4" />
          </button>

          {/* Subtotal */}
          <div className="flex justify-end pt-1 text-sm">
            <span className="font-medium">
              Sous-total main d'œuvre: {formatCents(laborSubtotal)}
            </span>
          </div>
        </>
      )}

      {laborItems.length === 0 && (
        <button
          type="button"
          className="flex w-full items-center justify-center rounded-md border border-dashed border-muted-foreground/25 py-1.5 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground"
          onClick={addLabor}
        >
          <Plus className="mr-1 h-4 w-4" />
          <span className="text-sm">Ajouter une ligne de main d'œuvre</span>
        </button>
      )}
    </div>
  );
}
