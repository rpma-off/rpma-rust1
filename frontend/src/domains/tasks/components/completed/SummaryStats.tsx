import React from 'react';
import { Camera, CheckSquare, PenLine, Shield, Star, TrendingUp, TriangleAlert, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/shared/hooks';

type SummaryStatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'purple';
};

const variantStyles = {
  default: 'bg-muted/50 border-border text-foreground',
  success: 'bg-success/10 border-success/20 text-success',
  warning: 'bg-warning/10 border-warning/20 text-warning',
  info: 'bg-info/10 border-info/20 text-info',
  purple: 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400',
};

function SummaryStatCard({
  icon,
  label,
  value,
  description,
  variant = 'default',
}: SummaryStatCardProps) {
  return (
    <div className={cn('rounded-xl border p-4 transition-all hover:shadow-md animate-fadeIn', variantStyles[variant])}>
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-background shadow-sm">{icon}</div>
      <div className="mb-1 text-2xl font-bold">{value}</div>
      <div className="mb-0.5 text-xs font-semibold uppercase tracking-wider">{label}</div>
      {description && <div className="text-[10px] opacity-70">{description}</div>}
    </div>
  );
}

type SummaryStatsProps = {
  checklistCompleted: number;
  checklistTotal: number;
  photoCount: number;
  satisfaction?: number | null;
  qualityScore?: number | null;
  zonesCount: number;
  duration?: string | null;
  customerName?: string;
  defectCount?: number;
  completedSteps?: number;
  totalSteps?: number;
  signatureCaptured?: boolean;
};

export function SummaryStats({
  checklistCompleted,
  checklistTotal,
  photoCount,
  satisfaction,
  qualityScore,
  zonesCount,
  duration,
  customerName,
  defectCount = 0,
  completedSteps = checklistCompleted,
  totalSteps = checklistTotal,
  signatureCaptured = false,
}: SummaryStatsProps) {
  const { t } = useTranslation();
  const checklistPercent = checklistTotal > 0 ? Math.round((checklistCompleted / checklistTotal) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
      <SummaryStatCard
        icon={<CheckSquare className="h-5 w-5 text-success" />}
        label="Etapes"
        value={`${completedSteps}/${totalSteps}`}
        description="Workflow termine"
        variant="success"
      />

      <SummaryStatCard
        icon={<Shield className="h-5 w-5 text-success" />}
        label="QC final"
        value={`${checklistCompleted}/${checklistTotal}`}
        description={`${checklistPercent}% ${t('completed.stepCompleted').toLowerCase()}`}
        variant="success"
      />

      <SummaryStatCard
        icon={<Camera className="h-5 w-5 text-info" />}
        label={t('completed.photos')}
        value={photoCount}
        description={t('completed.documented')}
        variant="info"
      />

      <SummaryStatCard
        icon={<TriangleAlert className="h-5 w-5 text-warning" />}
        label="Defauts"
        value={defectCount}
        description="Inspection initiale"
        variant="warning"
      />

      <SummaryStatCard
        icon={<Shield className="h-5 w-5 text-success" />}
        label={t('tasks.ppfZone')}
        value={zonesCount}
        description={t('completed.treated')}
        variant="success"
      />

      <SummaryStatCard
        icon={<PenLine className="h-5 w-5 text-info" />}
        label="Signature"
        value={signatureCaptured ? 'Oui' : 'Non'}
        description="Validation client"
        variant={signatureCaptured ? 'info' : 'default'}
      />

      {satisfaction !== null && satisfaction !== undefined && (
        <SummaryStatCard
          icon={<Star className="h-5 w-5 text-warning" />}
          label={t('completed.customerSatisfaction')}
          value={`${satisfaction}/5`}
          description={t('completed.qualityDesc')}
          variant="warning"
        />
      )}

      {qualityScore !== null && qualityScore !== undefined && (
        <SummaryStatCard
          icon={<TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
          label={t('completed.qualityScore')}
          value={`${qualityScore}%`}
          description={t('completed.qualityDesc')}
          variant="purple"
        />
      )}

      {duration && (
        <SummaryStatCard
          icon={<Shield className="h-5 w-5 text-muted-foreground" />}
          label={t('completed.duration')}
          value={duration}
          description={t('completed.totalDuration')}
          variant="default"
        />
      )}

      {customerName && (
        <SummaryStatCard
          icon={<User className="h-5 w-5 text-info" />}
          label={t('completed.client')}
          value={customerName.split(' ').slice(0, 2).join(' ')}
          description={t('completed.recipient')}
          variant="info"
        />
      )}
    </div>
  );
}
