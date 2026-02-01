import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from './badge';
import { STATUS_CONFIG, type CardStatus } from './unified-card';

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

// Export the status configuration for external use
export { STATUS_CONFIG };
export type { CardStatus };