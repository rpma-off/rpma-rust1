import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  Clock,
  Calendar,
  AlertCircle,
  XCircle,
  Pause,
  Play,
  Timer,
  Shield,
  Flag,
  Zap
} from 'lucide-react';

export type TaskStatusType =
  | 'completed'
  | 'in_progress'
  | 'pending'
  | 'scheduled'
  | 'on_hold'
  | 'cancelled'
  | 'failed'
  | 'overdue'
  | 'draft';

export type PriorityType = 'urgent' | 'high' | 'medium' | 'low';

type StatusBadgeProps = {
  status: TaskStatusType;
  showIcon?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

const statusConfig: Record<
  TaskStatusType,
  { label: string; icon: React.ComponentType<{ className?: string }>; colors: string }
> = {
  completed: {
    label: 'Terminé',
    icon: CheckCircle,
    colors: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40',
  },
  in_progress: {
    label: 'En cours',
    icon: Play,
    colors: 'bg-blue-500/10 text-blue-700 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40',
  },
  pending: {
    label: 'En attente',
    icon: Clock,
    colors: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40',
  },
  scheduled: {
    label: 'Planifié',
    icon: Calendar,
    colors: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/30 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/40',
  },
  on_hold: {
    label: 'En pause',
    icon: Pause,
    colors: 'bg-orange-500/10 text-orange-700 border-orange-500/30 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/40',
  },
  cancelled: {
    label: 'Annulé',
    icon: XCircle,
    colors: 'bg-gray-500/10 text-gray-700 border-gray-500/30 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-500/40',
  },
  failed: {
    label: 'Échoué',
    icon: AlertCircle,
    colors: 'bg-red-500/10 text-red-700 border-red-500/30 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/40',
  },
  overdue: {
    label: 'En retard',
    icon: Timer,
    colors: 'bg-red-500/10 text-red-700 border-red-500/30 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/40',
  },
  draft: {
    label: 'Brouillon',
    icon: Shield,
    colors: 'bg-slate-500/10 text-slate-700 border-slate-500/30 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/40',
  },
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-[10px] font-medium',
  md: 'px-2.5 py-1 text-xs font-semibold',
  lg: 'px-3 py-1.5 text-sm font-semibold',
};

export function StatusBadge({ status, showIcon = true, className, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn('inline-flex items-center gap-1.5 transition-all duration-200', config.colors, sizeClasses[size], className)}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}

type PriorityBadgeProps = {
  priority: PriorityType;
  showIcon?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

const priorityConfig: Record<
  PriorityType,
  { label: string; icon: React.ComponentType<{ className?: string }>; colors: string }
> = {
  urgent: {
    label: 'Urgente',
    icon: Zap,
    colors: 'bg-red-500/10 text-red-700 border-red-500/30 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/40',
  },
  high: {
    label: 'Haute',
    icon: Flag,
    colors: 'bg-orange-500/10 text-orange-700 border-orange-500/30 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/40',
  },
  medium: {
    label: 'Moyenne',
    icon: Clock,
    colors: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/40',
  },
  low: {
    label: 'Basse',
    icon: Shield,
    colors: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40',
  },
};

export function PriorityBadge({ priority, showIcon = true, className, size = 'md' }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn('inline-flex items-center gap-1.5 transition-all duration-200', config.colors, sizeClasses[size], className)}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}
