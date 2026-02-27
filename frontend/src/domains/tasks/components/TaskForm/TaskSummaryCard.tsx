import React from 'react';
import { Car, User, Shield, Calendar, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskFormData } from './types';

interface TaskSummaryCardProps {
  formData: TaskFormData;
  isEditing?: boolean;
}

export const TaskSummaryCard: React.FC<TaskSummaryCardProps> = React.memo(({
  formData,
  isEditing = false
}) => {
  const calculateSurfaceEstimate = () => {
    const zoneCount = formData.ppf_zones?.length || 0;
    if (zoneCount === 0) return '—';
    const avgSurfacePerZone = 1.2;
    return `${(zoneCount * avgSurfacePerZone).toFixed(1)} m²`;
  };

  const hasRequiredData = () => {
    return (
      formData.vehicle_make &&
      formData.vehicle_model &&
      formData.ppf_zones &&
      formData.ppf_zones.length > 0 &&
      formData.scheduled_date
    );
  };

  const getCompletionStatus = () => {
    const hasData = hasRequiredData();
    if (hasData) return { label: 'Prêt', color: 'text-emerald-600', icon: CheckCircle2 };
    return { label: 'En cours', color: 'text-amber-600', icon: Clock };
  };

  const status = getCompletionStatus();
  const StatusIcon = status.icon;

  return (
    <div className="rounded-xl border-l-4 border-emerald-500 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-2xl text-white">
            🚗
          </div>
          <div className="flex-1 min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
              {formData.priority && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-600">
                  Priorité {formData.priority}
                </span>
              )}
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Nouvelle tâche</span>
              {formData.scheduled_date && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                  Planifiée · {new Date(formData.scheduled_date).toLocaleDateString('fr-FR', { dateStyle: 'short' })}
                </span>
              )}
            </div>
            <div className="text-base font-extrabold text-foreground">
              {formData.vehicle_make || 'Véhicule'} {formData.vehicle_model || ''}{' '}
              {formData.vehicle_year ? `· ${formData.vehicle_year}` : ''}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              Client : {formData.customer_name || '—'} · {formData.customer_phone || '—'}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-extrabold text-emerald-600">
            {formData.ppf_zones?.length || 0} zones
          </div>
          <div className="text-xs text-muted-foreground">
            Surface estimée · {calculateSurfaceEstimate()}
          </div>
          <div className="mt-1 flex items-center justify-end gap-1 text-[10px] font-semibold">
            <StatusIcon className="w-3 h-3" />
            <span className={status.color}>{status.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

TaskSummaryCard.displayName = 'TaskSummaryCard';
