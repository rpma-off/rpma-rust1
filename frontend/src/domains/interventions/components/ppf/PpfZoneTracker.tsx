'use client';

import React from 'react';
import { getPpfZoneLabel } from '@/lib/i18n/status-labels';
import { cn } from '@/lib/utils';

export type PpfZoneStatus = 'pending' | 'in_progress' | 'completed';

export type PpfZone = {
  id: string;
  name: string;
  area?: string;
  film?: string;
  status: PpfZoneStatus;
  score?: number | null;
};

type PpfZoneTrackerProps = {
  zones: PpfZone[];
  activeZoneId?: string | null;
  onSelect: (zoneId: string) => void;
};

export function PpfZoneTracker({ zones, activeZoneId, onSelect }: PpfZoneTrackerProps) {
  const completed = zones.filter((zone) => zone.status === 'completed').length;
  const inProgress = zones.filter((zone) => zone.status === 'in_progress').length;
  const remaining = zones.length - completed - inProgress;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">Zones PPF · Avancement</div>
        <div className="flex gap-2 text-[10px] font-semibold">
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
            {completed} terminée{completed > 1 ? 's' : ''}
          </span>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">{inProgress} en cours</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-muted-foreground">
            {remaining} restante{remaining > 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {zones.map((zone) => {
          const isActive = zone.id === activeZoneId;
          const isDone = zone.status === 'completed';
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => onSelect(zone.id)}
              className={cn(
                'flex flex-col gap-1 rounded-xl border px-4 py-3 text-left transition',
                isDone && 'border-emerald-400/60 bg-emerald-50',
                isActive && 'border-blue-500 bg-blue-50',
                !isDone &&
                  !isActive &&
                  'border-[hsl(var(--rpma-border))] bg-white hover:border-emerald-400/40'
              )}
            >
              <div className="text-sm font-semibold text-foreground">
                {getPpfZoneLabel(zone.name || zone.id)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {zone.area ?? '—'} · {zone.film ?? 'Film PPF'}
              </div>
              <div className="text-xs font-semibold text-foreground">
                {zone.status === 'completed'
                  ? `${zone.score?.toFixed(1) ?? '—'} · Posée`
                  : zone.status === 'in_progress'
                    ? 'En cours de pose'
                    : 'En attente'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
