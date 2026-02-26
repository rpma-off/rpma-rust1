'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PpfChecklistItem = {
  id: string;
  title: string;
  description?: string;
  required?: boolean;
};

type PpfChecklistProps = {
  items: PpfChecklistItem[];
  values: Record<string, boolean>;
  onToggle: (id: string) => void;
};

export function PpfChecklist({ items, values, onToggle }: PpfChecklistProps) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const isChecked = Boolean(values[item.id]);
        const isRequired = item.required && !isChecked;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            className={cn(
              'flex items-start gap-3 rounded-md border px-3 py-3 text-left transition',
              isChecked && 'border-emerald-500 bg-emerald-50',
              !isChecked && 'border-[hsl(var(--rpma-border))] bg-white hover:border-emerald-400/40',
              isRequired && 'border-amber-300 bg-amber-50'
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-4 w-4 items-center justify-center rounded border-2 text-transparent',
                isChecked ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-[hsl(var(--rpma-border))]'
              )}
            >
              <Check className="h-3 w-3" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-foreground">{item.title}</span>
              {item.description && (
                <span className="block text-xs text-muted-foreground">{item.description}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
