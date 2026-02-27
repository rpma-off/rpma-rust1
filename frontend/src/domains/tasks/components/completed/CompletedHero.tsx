import React from 'react';
import { CheckCircle, Clock, Camera, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

type CompletedHeroProps = {
  task: {
    title?: string;
    external_id?: string | null;
    vehicle_make?: string | null;
    vehicle_model?: string | null;
    vehicle_year?: string | null;
    customer_name?: string;
    start_time?: string | null;
    end_time?: string | null;
  };
  duration: string | null;
  photoCount: number;
  checklistCount: number;
  checklistTotal: number;
  progressPercentage: number;
};

export function CompletedHero({
  task,
  duration,
  photoCount,
  checklistCount,
  checklistTotal,
  progressPercentage,
}: CompletedHeroProps) {
  const vehicleInfo = [task.vehicle_make, task.vehicle_model, task.vehicle_year]
    .filter(Boolean)
    .join(' ');

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 px-6 py-6 text-white shadow-lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
              Intervention terminée
            </span>
            <span className="rounded-full bg-emerald-400/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]">
              ✓ 100% complété
            </span>
          </div>

          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-3xl shadow-sm">
              🎉
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                Félicitations !
              </h1>
              <p className="text-sm text-emerald-50">
                Intervention {task.title || `#${task.external_id?.slice(-8)}`} complétée avec succès
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/80">
            <span className="flex items-center gap-1">
              <span className="text-lg">🚗</span>
              {vehicleInfo || 'Véhicule'}
            </span>
            <span className="text-white/40">·</span>
            <span className="flex items-center gap-1">
              <span className="text-lg">👤</span>
              {task.customer_name || 'Client'}
            </span>
            <span className="text-white/40">·</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(task.end_time)}
            </span>
          </div>
        </div>

        <div className="flex flex-shrink-0 gap-4">
          <div className="rounded-lg bg-white/10 px-4 py-3 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-200" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-emerald-200">
                  Durée
                </div>
                <div className="text-lg font-bold">{duration || '—'}</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white/10 px-4 py-3 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-emerald-200" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-emerald-200">
                  Photos
                </div>
                <div className="text-lg font-bold">{photoCount}</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white/10 px-4 py-3 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-200" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-emerald-200">
                  Checklist
                </div>
                <div className="text-lg font-bold">
                  {checklistCount}/{checklistTotal}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-emerald-100">
          <span>Progression du workflow</span>
          <span>{progressPercentage}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/20">
          <div
            className="h-2 rounded-full bg-white transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
