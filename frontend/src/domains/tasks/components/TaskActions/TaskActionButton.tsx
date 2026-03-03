import React from 'react';
import { cn } from '@/lib/utils';

export interface TaskActionItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  disabled?: boolean;
  onClick: () => void;
}

interface TaskActionButtonProps {
  action: TaskActionItem;
  onActionClick: (action: () => void) => void;
  layout?: 'inline' | 'icon';
  compact?: boolean;
}

export function TaskActionButton({
  action,
  onActionClick,
  layout = 'icon',
  compact = false,
}: TaskActionButtonProps) {
  if (layout === 'inline') {
    return (
      <button
        type="button"
        onClick={() => onActionClick(action.onClick)}
        disabled={action.disabled}
        className={cn(
          'w-full flex items-center p-2.5 rounded-lg border text-xs transition-colors duration-200',
          action.disabled
            ? 'border-border/50 bg-background/30 cursor-not-allowed opacity-50'
            : 'border-border/50 bg-background/70 hover:border-accent/60 hover:bg-border/30',
        )}
      >
        <action.icon className={cn('h-3.5 w-3.5 mr-2', action.disabled ? 'text-border' : 'text-accent')} />
        <span className={cn(action.disabled ? 'text-border' : 'text-foreground')}>{action.label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onActionClick(action.onClick)}
      disabled={action.disabled}
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border transition-all duration-200',
        compact ? 'p-2 min-h-[56px]' : 'p-4',
        action.disabled
          ? 'border-border/50 bg-background/30 cursor-not-allowed opacity-50'
          : 'border-border/50 bg-background/60 hover:border-accent/60 hover:bg-border/30',
      )}
    >
      <div className="relative">
        <action.icon className={cn('h-5 w-5 mb-1', action.disabled ? 'text-border' : 'text-accent')} />
        {action.count && action.count > 0 && (
          <span className="absolute -top-2 -right-2 bg-accent text-background text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-4 flex items-center justify-center">
            {action.count}
          </span>
        )}
      </div>
      <span className={cn('text-xs font-medium text-center', action.disabled ? 'text-border' : 'text-border-light')}>
        {action.label}
      </span>
    </button>
  );
}
