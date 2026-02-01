import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface ProgressIndicatorProps {
  completed: number;
  total: number;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  showCounts?: boolean;
  className?: string;
  animated?: boolean;
}

/**
 * Standardized Progress Indicator Component
 *
 * Displays task completion progress with consistent styling
 * and optional percentage/counts display.
 */
export const ProgressIndicator = React.memo<ProgressIndicatorProps>(({
  completed,
  total,
  size = 'md',
  showPercentage = true,
  showCounts = true,
  className,
  animated = true
}) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const sizeClasses = {
    sm: {
      container: 'h-2',
      text: 'text-xs',
      icon: 'h-3 w-3'
    },
    md: {
      container: 'h-3',
      text: 'text-sm',
      icon: 'h-4 w-4'
    },
    lg: {
      container: 'h-4',
      text: 'text-base',
      icon: 'h-5 w-5'
    }
  };

  const getProgressColor = () => {
    if (percentage === 100) return 'bg-gradient-to-r from-emerald-500 to-emerald-400';
    if (percentage >= 75) return 'bg-gradient-to-r from-blue-500 to-blue-400';
    if (percentage >= 25) return 'bg-gradient-to-r from-amber-500 to-amber-400';
    return 'bg-gradient-to-r from-zinc-500 to-zinc-400';
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Header with counts and percentage */}
      {(showCounts || showPercentage) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className={cn('text-zinc-400', sizeClasses[size].icon)} />
            <span className={cn('font-medium text-zinc-300', sizeClasses[size].text)}>
              Progression
            </span>
          </div>
          <div className="flex items-center gap-2">
            {showCounts && (
              <span className={cn('font-bold text-white', sizeClasses[size].text)}>
                {completed}/{total}
              </span>
            )}
            {showPercentage && (
              <span className={cn('text-zinc-400', sizeClasses[size].text)}>
                ({percentage}%)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="relative">
        <div className={cn(
          'w-full bg-zinc-700/50 rounded-full overflow-hidden',
          sizeClasses[size].container
        )}>
          <div
            className={cn(
              'h-full rounded-full transition-all ease-out',
              animated && 'duration-500',
              getProgressColor()
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Completion indicator */}
        {percentage === 100 && (
          <div className="absolute -top-1 right-0 transform translate-x-1/2">
            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

ProgressIndicator.displayName = 'ProgressIndicator';