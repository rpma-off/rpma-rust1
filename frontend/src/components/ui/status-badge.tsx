import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from './badge';
import { CheckCircle2, Clock, Clock3, AlertCircle } from 'lucide-react';

export const STATUS_CONFIG = {
  pending: {
    color: 'bg-[var(--status-primary)]/20 text-[var(--status-primary-foreground)] border-[var(--status-primary)]/40',
    dot: 'bg-[var(--status-primary)]',
    icon: Clock3,
    label: 'En attente'
  },
  in_progress: {
    color: 'bg-[var(--status-warning)]/20 text-[var(--status-warning-foreground)] border-[var(--status-warning)]/40',
    dot: 'bg-[var(--status-warning)]',
    icon: Clock,
    label: 'En cours'
  },
  completed: {
    color: 'bg-[var(--status-success)]/20 text-[var(--status-success-foreground)] border-[var(--status-success)]/40',
    dot: 'bg-[var(--status-success)]',
    icon: CheckCircle2,
    label: 'Terminée'
  },
  cancelled: {
    color: 'bg-[var(--status-destructive)]/20 text-[var(--status-destructive-foreground)] border-[var(--status-destructive)]/40',
    dot: 'bg-[var(--status-destructive)]',
    icon: AlertCircle,
    label: 'Annulée'
  }
} as const;

export type CardStatus = keyof typeof STATUS_CONFIG;

interface StatusBadgeProps {
  status: CardStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

/**
 * Standardized Status Badge Component
 *
 * Provides consistent status display across the application
 * with proper colors, icons, and accessibility.
 */
export const StatusBadge = React.memo<StatusBadgeProps>(({
  status,
  size = 'md',
  showIcon = true,
  className
}) => {
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4'
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'border font-medium',
        config.color,
        sizeClasses[size],
        className
      )}
      aria-label={`Statut: ${config.label}`}
    >
      {showIcon && <StatusIcon className={cn('mr-1.5', iconSizes[size])} />}
      {config.label}
    </Badge>
  );
});

StatusBadge.displayName = 'StatusBadge';
