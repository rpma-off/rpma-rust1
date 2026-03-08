'use client';

import { useCallback } from 'react';
import { Plus, Trash2, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCents, getCurrencySymbol } from '@/lib/format';

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
    <div className="space-y-4 pt-6 border-t border-border">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          Main d&apos;œuvre
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addLabor}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Ajouter
        </Button>
      </div>

      {laborItems.length > 0 && (
        <div className="space-y-3">
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
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] items-center">
              <Input
                placeholder="Description du travail"
                value={labor.description}
                onChange={(e) => updateLabor(i, 'description', e.target.value)}
                className="col-span-2 sm:col-span-1 h-8 text-sm"
              />
              <Input
                type="number"
                min="0"
                step="0.1"
                value={labor.hours}
                onChange={(e) => updateLabor(i, 'hours', parseFloat(e.target.value) || 0)}
                className="h-8 text-sm"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={labor.rate}
                onChange={(e) => updateLabor(i, 'rate', parseFloat(e.target.value) || 0)}
                className="h-8 text-sm"
              />
              <div className="flex items-center rounded-md bg-muted/50 px-3 text-sm font-medium h-8">
                {formatCents(labor.total)}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => removeLabor(i)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          {/* Add button */}
          <button
            type="button"
            className="flex w-full items-center justify-center rounded-md border border-dashed border-muted-foreground/25 py-2 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground"
            onClick={addLabor}
          >
            <Plus className="h-4 w-4" />
          </button>

          {/* Subtotal */}
          <div className="flex justify-end pt-2 text-sm border-t border-border">
            <span className="font-medium text-muted-foreground">
              Sous-total main d&apos;œuvre: <span className="text-foreground">{formatCents(laborSubtotal)}</span>
            </span>
          </div>
        </div>
      )}

      {laborItems.length === 0 && (
        <button
          type="button"
          className="flex w-full items-center justify-center rounded-md border border-dashed border-muted-foreground/25 py-4 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground"
          onClick={addLabor}
        >
          <Plus className="mr-2 h-4 w-4" />
          <span className="text-sm">Ajouter une ligne de main d&apos;œuvre</span>
        </button>
      )}
    </div>
  );
}
