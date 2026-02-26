import React from 'react';
import {
  CheckSquare,
  Camera,
  FileText,
  Star,
  TrendingUp,
  Shield,
  Clock,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SummaryStatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'purple';
};

const variantStyles = {
  default: 'bg-gray-50 border-gray-200 text-gray-900',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  info: 'bg-blue-50 border-blue-200 text-blue-900',
  purple: 'bg-purple-50 border-purple-200 text-purple-900',
};

function SummaryStatCard({
  icon,
  label,
  value,
  description,
  variant = 'default',
}: SummaryStatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all hover:shadow-md',
        variantStyles[variant]
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
          {icon}
        </div>
      </div>
      <div className="text-2xl font-extrabold mb-1">{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wider mb-0.5">
        {label}
      </div>
      {description && (
        <div className="text-[10px] opacity-70">{description}</div>
      )}
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
}: SummaryStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      <SummaryStatCard
        icon={<CheckSquare className="h-5 w-5 text-emerald-600" />}
        label="Checklist"
        value={`${checklistCompleted}/${checklistTotal}`}
        description={`${Math.round((checklistCompleted / checklistTotal) * 100)}% complété`}
        variant="success"
      />

      <SummaryStatCard
        icon={<Camera className="h-5 w-5 text-blue-600" />}
        label="Photos"
        value={photoCount}
        description="Documentées"
        variant="info"
      />

      {satisfaction !== null && satisfaction !== undefined && (
        <SummaryStatCard
          icon={<Star className="h-5 w-5 text-amber-600" />}
          label="Satisfaction"
          value={`${satisfaction}/5`}
          description="Note client"
          variant="warning"
        />
      )}

      {qualityScore !== null && qualityScore !== undefined && (
        <SummaryStatCard
          icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
          label="Qualité"
          value={`${qualityScore}%`}
          description="Score qualité"
          variant="purple"
        />
      )}

      <SummaryStatCard
        icon={<Shield className="h-5 w-5 text-emerald-600" />}
        label="Zones PPF"
        value={zonesCount}
        description="Traitées"
        variant="success"
      />

      {duration && (
        <SummaryStatCard
          icon={<Clock className="h-5 w-5 text-gray-600" />}
          label="Durée"
          value={duration}
          description="Temps total"
          variant="default"
        />
      )}

      {customerName && (
        <SummaryStatCard
          icon={<User className="h-5 w-5 text-blue-600" />}
          label="Client"
          value={customerName.split(' ').slice(0, 2).join(' ')}
          description="Destinataire"
          variant="info"
        />
      )}
    </div>
  );
}
