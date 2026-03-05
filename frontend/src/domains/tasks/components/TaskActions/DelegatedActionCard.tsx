import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DelegatedActionCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

const variantStyles = {
  primary: 'border-border/50 bg-background/60 hover:border-emerald-500/50 hover:bg-emerald-50/50',
  secondary: 'border-border/50 bg-background/60 hover:border-blue-500/50 hover:bg-blue-50/50',
  danger: 'border-red-500/30 bg-red-50/30 hover:border-red-500/50 hover:bg-red-50/50',
};

const iconColors = {
  primary: 'text-emerald-600',
  secondary: 'text-blue-600',
  danger: 'text-red-600',
};

export const DelegatedActionCard = ({
  icon: Icon,
  label,
  count,
  onClick,
  disabled,
  active,
  variant = 'primary',
}: DelegatedActionCardProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 group',
        active && 'ring-2 ring-emerald-500/20 ring-offset-2',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'hover:shadow-md hover:scale-[1.02]',
        variantStyles[variant]
      )}
    >
      <div className="relative mb-2">
        <Icon className={cn('h-6 w-6 transition-colors', iconColors[variant], disabled && 'text-muted-foreground')} />
        {count !== undefined && count > 0 && (
          <Badge
            variant="default"
            className={cn(
              'absolute -top-2 -right-2 h-5 min-w-[20px] px-1.5 flex items-center justify-center text-[10px] font-bold',
              variant === 'danger' ? 'bg-red-600' : 'bg-emerald-600'
            )}
          >
            {count}
          </Badge>
        )}
      </div>
      <span className={cn('text-xs font-semibold text-center leading-tight', disabled ? 'text-muted-foreground' : 'text-foreground')}>
        {label}
      </span>
      <div className="mt-2 flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn('h-0.5 w-3 rounded-full', i < 2 ? 'bg-current opacity-100' : 'bg-current opacity-30')}
          />
        ))}
      </div>
    </button>
  );
};
