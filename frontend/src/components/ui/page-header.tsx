import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  stats?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, icon, actions, stats, className, children }: PageHeaderProps) {
  return (
    <div className={cn('border-b border-border/20 bg-background', className)}>
      <div className="px-4 py-4 sm:px-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            {icon && (
              <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-accent/10 border border-accent/30 rounded-[6px] flex items-center justify-center">
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
                {title}
              </h1>
              {subtitle && (
                <p className="text-muted-foreground text-sm sm:text-base mt-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {actions && (
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>

        {stats && (
          <div className="mt-6 pt-6 border-t border-border/10">
            {stats}
          </div>
        )}

        {children && (
          <div className="mt-4">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export interface HeaderActionButtonProps {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'default' | 'lg';
  disabled?: boolean;
  className?: string;
}

export function HeaderActionButton({ label, icon, onClick, variant = 'default', size = 'sm', disabled, className }: HeaderActionButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{label.split(' ')[0]}</span>
    </Button>
  );
}

export interface StatCardProps {
  value: string | number;
  label: string;
  icon?: LucideIcon;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'accent';
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  className?: string;
}

export function StatCard({ value, label, icon: Icon, color = 'accent', trend, className }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 border-blue-200',
    green: 'bg-green-100 text-green-600 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-600 border-yellow-200',
    red: 'bg-red-100 text-red-600 border-red-200',
    purple: 'bg-purple-100 text-purple-600 border-purple-200',
    accent: 'bg-accent/10 text-accent border-accent/30',
  };

  return (
    <div className={cn('p-4 rounded-[6px] bg-muted/10 border border-border/10 hover:border-border/20 hover:shadow-sm transition-all duration-200', className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-xs sm:text-sm text-muted-foreground font-medium mb-1">
            {label}
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate">
            {value}
          </div>
        </div>
        {Icon && (
          <div className={cn('p-2 rounded-[6px] flex-shrink-0', colorClasses[color])}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          {trend.direction === 'up' && (
            <span className="text-success">↑ {trend.value}</span>
          )}
          {trend.direction === 'down' && (
            <span className="text-error">↓ {trend.value}</span>
          )}
          {trend.direction === 'neutral' && (
            <span className="text-muted-foreground">→ {trend.value}</span>
          )}
        </div>
      )}
    </div>
  );
}
