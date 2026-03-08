'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Camera, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ReportStepViewModel } from '../../services/report-view-model.types';

const STEP_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  completed: 'default',
  in_progress: 'secondary',
  pending: 'outline',
  paused: 'outline',
  failed: 'destructive',
  skipped: 'outline',
  rework: 'destructive',
};

interface ReportPreviewStepCardProps {
  step: ReportStepViewModel;
}

export function ReportPreviewStepCard({ step }: ReportPreviewStepCardProps) {
  const hasDefaults = step.defects.length > 0 || Boolean(step.rejectionReason);
  const [open, setOpen] = useState<boolean>(hasDefaults);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open ? true : false}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
            {step.number}
          </span>
          <div className="min-w-0">
            <p className="font-medium text-foreground text-sm truncate">{step.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {step.startedAt !== 'Non renseigné' ? step.startedAt : '—'}
              {step.completedAt !== 'Non renseigné' ? ` → ${step.completedAt}` : ''}
              {step.duration !== 'Non renseigné' ? ` · ${step.duration}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {step.photoCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Camera className="w-3.5 h-3.5" />
              {step.photoCount}
            </span>
          )}
          {step.defects.length > 0 && (
            <AlertTriangle className="w-4 h-4 text-destructive" />
          )}
          <Badge variant={STEP_STATUS_VARIANT[step.statusBadge] ?? 'outline'} className="text-xs">
            {step.status}
          </Badge>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/40">
          {/* Notes */}
          <div className="pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Observations</p>
            <p className="text-sm text-foreground">
              {step.notes !== 'Aucune observation' ? step.notes : <span className="italic text-muted-foreground">Aucune observation</span>}
            </p>
          </div>

          {/* Defects */}
          {step.defects.length > 0 && (
            <div>
              <p className="text-xs font-medium text-destructive mb-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Défauts détectés
              </p>
              <ul className="space-y-1">
                {step.defects.map((d, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-destructive mt-0.5">•</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Zones */}
          {step.zones.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Zones traitées</p>
              <div className="flex flex-wrap gap-1.5">
                {step.zones.map((z) => (
                  <Badge key={z} variant="secondary" className="text-xs font-normal">
                    {z.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Checklist */}
          {step.checklist.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Checklist</p>
              <ul className="space-y-1">
                {step.checklist.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2
                      className={`w-4 h-4 flex-shrink-0 ${item.checked ? 'text-primary' : 'text-muted-foreground/40'}`}
                    />
                    <span className={item.checked ? 'text-foreground' : 'text-muted-foreground'}>
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quality */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Score qualité</span>
            <span className="font-semibold text-foreground">{step.qualityScore}</span>
          </div>

          {/* Environment */}
          {step.environment.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Environnement</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {step.environment.map((e) => (
                  <div key={e.key} className="flex justify-between">
                    <span className="text-muted-foreground">{e.key}</span>
                    <span className="font-medium text-foreground">{e.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejection */}
          {step.rejectionReason && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-xs font-medium text-destructive mb-1">Motif de rejet</p>
              <p className="text-sm text-foreground">{step.rejectionReason}</p>
              {step.approvedBy !== 'Non renseigné' && (
                <p className="text-xs text-muted-foreground mt-1">Par : {step.approvedBy} · {step.approvedAt}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
