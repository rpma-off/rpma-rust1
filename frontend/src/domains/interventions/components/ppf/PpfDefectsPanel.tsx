'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PpfDefectType = 'scratch' | 'dent' | 'chip' | 'paint_issue' | 'crack';
export type PpfDefectSeverity = 'low' | 'medium' | 'high';

export type PpfDefectItem = {
  id: string;
  zone: string;
  type: PpfDefectType;
  severity?: PpfDefectSeverity;
  notes?: string | null;
};

type PpfDefectsPanelProps = {
  defects: PpfDefectItem[];
  onAdd: (defect: PpfDefectItem) => void;
  onRemove: (id: string) => void;
};

const DEFECT_TYPE_LABELS: Record<PpfDefectType, string> = {
  scratch: 'Rayure',
  dent: 'Bosselure',
  chip: 'Impact',
  paint_issue: 'Défaut peinture',
  crack: 'Fissure',
};

const DEFECT_SEVERITY_LABELS: Record<PpfDefectSeverity, string> = {
  low: 'Faible',
  medium: 'Moyen',
  high: 'Élevé',
};

const defaultDefect: Omit<PpfDefectItem, 'id'> = {
  zone: '',
  type: 'scratch',
  severity: 'low',
  notes: '',
};

export function PpfDefectsPanel({ defects, onAdd, onRemove }: PpfDefectsPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState(defaultDefect);

  const handleSubmit = () => {
    if (!form.zone.trim()) return;
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    onAdd({
      id,
      zone: form.zone,
      type: form.type,
      severity: form.severity,
      notes: form.notes,
    });
    setForm(defaultDefect);
    setIsAdding(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">⚠️ Défauts constatés</div>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md border border-[hsl(var(--rpma-border))] px-2 py-1 text-xs font-semibold text-foreground transition hover:border-emerald-400/60 hover:bg-emerald-50"
          onClick={() => setIsAdding((prev) => !prev)}
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter défaut
        </button>
      </div>

      {isAdding && (
        <div className="rounded-md border border-[hsl(var(--rpma-border))] bg-white p-3">
          <div className="grid gap-2">
            <input
              type="text"
              placeholder="Zone (ex: Aile avant droite)"
              className="w-full rounded-md border border-[hsl(var(--rpma-border))] px-3 py-2 text-sm"
              value={form.zone}
              onChange={(event) => setForm((prev) => ({ ...prev, zone: event.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                className="w-full rounded-md border border-[hsl(var(--rpma-border))] px-2 py-2 text-xs"
                value={form.type}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, type: event.target.value as PpfDefectType }))
                }
              >
                <option value="scratch">Rayure</option>
                <option value="dent">Bosselure</option>
                <option value="chip">Impact</option>
                <option value="paint_issue">Défaut peinture</option>
                <option value="crack">Fissure</option>
              </select>
              <select
                className="w-full rounded-md border border-[hsl(var(--rpma-border))] px-2 py-2 text-xs"
                value={form.severity}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, severity: event.target.value as PpfDefectSeverity }))
                }
              >
                <option value="low">Faible</option>
                <option value="medium">Moyen</option>
                <option value="high">Élevé</option>
              </select>
            </div>
            <textarea
              className="w-full rounded-md border border-[hsl(var(--rpma-border))] px-3 py-2 text-xs"
              placeholder="Notes..."
              rows={2}
              value={form.notes ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-[hsl(var(--rpma-border))] px-3 py-1 text-xs"
                onClick={() => setIsAdding(false)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
                onClick={handleSubmit}
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {defects.length === 0 && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          Cliquez sur une zone du diagramme pour ajouter un défaut localisé.
        </div>
      )}

      <div className="space-y-2">
        {defects.map((defect) => (
          <div
            key={defect.id}
            className={cn(
              'flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs'
            )}
          >
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            <div className="flex-1">
              <div className="font-semibold text-foreground">{defect.zone}</div>
              <div className="text-muted-foreground">
                {DEFECT_TYPE_LABELS[defect.type] ?? defect.type} · Sévérité :{' '}
                {defect.severity ? DEFECT_SEVERITY_LABELS[defect.severity] : '—'} {defect.notes ? `· ${defect.notes}` : ''}
              </div>
            </div>
            <button
              type="button"
              className="text-red-500 hover:text-red-600"
              onClick={() => onRemove(defect.id)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
