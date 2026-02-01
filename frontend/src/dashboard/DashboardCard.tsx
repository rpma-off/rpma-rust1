'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { FadeIn } from '@/components/animations/FadeIn';
import { PulseAnimation } from '@/components/animations/UILoader';

type CardVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  variant?: CardVariant;
  trend?: {
    value: number;
    label: string;
    positiveIsGood?: boolean;
  };
  className?: string;
  children?: ReactNode;
}

const variantClasses = {
  default: 'bg-muted border-border',
  primary: 'bg-accent/20 border-accent/30',
  success: 'bg-accent/30 border-accent',
  warning: 'bg-yellow-500/20 border-yellow-500/30',
  danger: 'bg-red-500/20 border-red-500/30',
};

const iconClasses = {
  default: 'text-border-light',
  primary: 'text-accent',
  success: 'text-accent',
  warning: 'text-yellow-400',
  danger: 'text-red-400',
};

export function DashboardCard({
  title,
  value,
  icon,
  variant = 'default',
  trend,
  className,
  children,
}: DashboardCardProps) {
  const getTrendColor = () => {
    if (!trend) return 'text-border-light';
    const isPositive = trend.value >= 0;
    const isGood = trend.positiveIsGood ? isPositive : !isPositive;

    if (isGood) return 'text-accent';
    return 'text-red-400';
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    const isPositive = trend.value >= 0;
    return isPositive ? '↑' : '↓';
  };

  return (
    <FadeIn>
      <PulseAnimation>
        <div
          className={cn(
            'rounded-lg border p-6 transition-all hover:shadow-md hover:scale-105 hover:border-accent/50',
            variantClasses[variant],
            className
          )}
        >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-border-light">{title}</p>
          <p className="mt-1 text-3xl font-semibold text-foreground">{value}</p>
          {trend && (
            <p className={`mt-1 flex items-center text-sm ${getTrendColor()}`}>
              <span className="font-medium">
                {getTrendIcon()} {Math.abs(trend.value)}%
              </span>
              <span className="ml-1 text-border-light">{trend.label}</span>
            </p>
          )}
        </div>
        <div
          className={cn(
            'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full',
            variant === 'default' ? 'bg-black' : 'bg-muted'
          )}
        >
          <div className={cn('h-6 w-6', iconClasses[variant])}>{icon}</div>
        </div>
        </div>
        {children && <div className="mt-4">{children}</div>}
      </div>
      </PulseAnimation>
    </FadeIn>
  );
}

// StatCard for displaying key metrics with optional comparison
interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label: string;
  };
  icon: ReactNode;
  className?: string;
}

export function StatCard({ title, value, change, icon, className }: StatCardProps) {
  const isPositive = change ? change.value >= 0 : null;
  
  return (
    <FadeIn>
      <div className={cn("bg-muted overflow-hidden shadow rounded-lg border border-border hover:scale-105 hover:border-accent/50 transition-all duration-200", className)}>
        <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0 bg-accent rounded-md p-3">
            <div className="h-6 w-6 text-foreground">{icon}</div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-border-light truncate">
                {title}
              </dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-foreground">
                  {value}
                </div>
                {change && (
                  <div
                    className={cn(
                      'ml-2 flex items-baseline text-sm font-semibold',
                      isPositive ? 'text-accent' : 'text-red-400'
                    )}
                  >
                    {isPositive ? '↑' : '↓'} {Math.abs(change.value)}%
                    <span className="sr-only">
                      {isPositive ? 'Increased' : 'Decreased'} by
                    </span>
                    <span className="ml-1 text-xs text-border-light">
                      {change.label}
                    </span>
                  </div>
                )}
              </dd>
            </dl>
          </div>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}
