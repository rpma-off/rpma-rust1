import React from 'react';
import { Badge, Car, CheckCircle, Clock, Mail, MapPin, Phone, Shield, Thermometer, User } from 'lucide-react';
import { getPpfZoneLabel } from '@/lib/i18n/status-labels';
import { Badge as UIBadge } from '@/components/ui/badge';
import { useTranslation } from '@/shared/hooks';

type CompletedSidebarProps = {
  task: {
    id?: string;
    task_number?: string;
    external_id?: string | null;
    priority?: string;
    lot_film?: string | null;
    vehicle_make?: string | null;
    vehicle_model?: string | null;
    vehicle_year?: string | null;
    vin?: string | null;
    ppf_zones?: Array<string> | null;
  };
  customer: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  intervention: {
    temperature_celsius?: number | null;
    humidity_percentage?: number | null;
  };
  workflowProgress: number;
  duration: string | null;
  workflowSnapshot: {
    completedSteps: number;
    totalSteps: number;
    defectCount: number;
    zonesCompleted: number;
    zonesTotal: number;
    totalPhotos: number;
    customerSatisfaction: number | null;
    qualityScore: number | null;
    hasSignature: boolean;
  };
};

export function CompletedSidebar({
  task,
  customer,
  intervention,
  workflowProgress,
  duration,
  workflowSnapshot,
}: CompletedSidebarProps) {
  const { t } = useTranslation();
  const vehicleDisplay = [task.vehicle_make, task.vehicle_model, task.vehicle_year].filter(Boolean).join(' ');

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-success/30 bg-gradient-to-br from-success/5 to-success/10 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-success">{t('completed.status')}</span>
          <CheckCircle className="h-5 w-5 text-success" />
        </div>

        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs text-success">
            <span>{t('completed.progression')}</span>
            <span className="font-bold">{workflowProgress}%</span>
          </div>
          <div className="h-2 rounded-full bg-success/20">
            <div className="h-2 rounded-full bg-success transition-all duration-500" style={{ width: `${workflowProgress}%` }} />
          </div>
        </div>

        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground/70">Etapes</span>
            <span className="font-medium text-foreground">
              {workflowSnapshot.completedSteps}/{workflowSnapshot.totalSteps}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground/70">Zones</span>
            <span className="font-medium text-foreground">
              {workflowSnapshot.zonesCompleted}/{workflowSnapshot.zonesTotal}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground/70">{t('completed.taskId')}</span>
            <span className="font-mono text-foreground">{task.id?.slice(-8) || '—'}</span>
          </div>
          {task.task_number && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground/70">{t('completed.taskNumber')}</span>
              <span className="font-medium text-foreground">{task.task_number}</span>
            </div>
          )}
          {task.external_id && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground/70">{t('completed.externalId')}</span>
              <span className="font-medium text-foreground">{task.external_id}</span>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10">
            <Car className="h-4 w-4 text-info" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('completed.vehicle')}</span>
        </div>

        <div className="space-y-3 text-sm">
          <div className="text-base font-bold text-foreground">{vehicleDisplay || '—'}</div>

          {task.vin && (
            <div className="flex items-start gap-2 rounded-lg bg-muted p-2">
              <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground/50" />
              <div className="text-xs">
                <div className="text-muted-foreground">VIN</div>
                <div className="font-mono text-foreground">{task.vin}</div>
              </div>
            </div>
          )}

          {task.lot_film && (
            <div className="flex items-center justify-between rounded-lg bg-muted p-2">
              <span className="text-xs text-muted-foreground">{t('completed.batch')} Film</span>
              <span className="text-sm font-medium text-foreground">{task.lot_film}</span>
            </div>
          )}

          {task.ppf_zones && task.ppf_zones.length > 0 && (
            <div>
              <div className="mb-1 text-xs text-muted-foreground">{t('tasks.ppfZone')}</div>
              <div className="flex flex-wrap gap-1">
                {task.ppf_zones.slice(0, 6).map((zone, index) => (
                  <UIBadge key={index} variant="secondary" className="text-[10px] font-normal">
                    {getPpfZoneLabel(zone)}
                  </UIBadge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
            <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('completed.client')}</span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="font-semibold text-foreground">{customer.name || '—'}</div>
          {customer.email && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="truncate">{customer.email}</span>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="truncate">{customer.phone}</span>
            </div>
          )}
          {customer.address && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
              <span className="line-clamp-2">{customer.address}</span>
            </div>
          )}
        </div>
      </div>

      {(intervention.temperature_celsius !== null || intervention.humidity_percentage !== null) && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
              <Thermometer className="h-4 w-4 text-warning" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('completed.conditions')}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {intervention.temperature_celsius !== null && (
              <div className="rounded-lg bg-red-50 p-3 text-center dark:bg-red-950/30">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{intervention.temperature_celsius}°C</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-red-500">{t('completed.temperature')}</div>
              </div>
            )}
            {intervention.humidity_percentage !== null && (
              <div className="rounded-lg bg-blue-50 p-3 text-center dark:bg-blue-950/30">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{intervention.humidity_percentage}%</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-blue-500">{t('completed.humidity')}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cloture client</div>
        <div className="space-y-2 text-sm">
          <Row label="Signature" value={workflowSnapshot.hasSignature ? 'Capturee' : 'Absente'} />
          <Row
            label="Satisfaction"
            value={workflowSnapshot.customerSatisfaction !== null ? `${workflowSnapshot.customerSatisfaction}/5` : '—'}
          />
          <Row
            label="Score qualite"
            value={workflowSnapshot.qualityScore !== null ? `${workflowSnapshot.qualityScore}%` : '—'}
          />
          <Row label="Photos workflow" value={String(workflowSnapshot.totalPhotos)} />
          <Row label="Defauts releves" value={String(workflowSnapshot.defectCount)} />
        </div>
      </div>

      {duration && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
              <Clock className="h-4 w-4 text-success" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('completed.duration')}</span>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{duration}</div>
            <div className="mt-1 text-xs text-muted-foreground">{t('completed.totalDuration')}</div>
          </div>
        </div>
      )}

      {task.priority && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
              <Badge className="h-4 w-4 text-warning" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('completed.priority')}</span>
          </div>

          <UIBadge
            variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}
            className="w-full justify-center"
          >
            {task.priority === 'high'
              ? t('completed.priorityHigh')
              : task.priority === 'medium'
                ? t('completed.priorityMedium')
                : t('completed.priorityLow')}
          </UIBadge>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
