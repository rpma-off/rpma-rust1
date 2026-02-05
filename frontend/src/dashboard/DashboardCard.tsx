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
  default: 'bg-white border-[hsl(var(--rpma-border))]',
  primary: 'bg-white border-[hsl(var(--rpma-border))]',
  success: 'bg-white border-[hsl(var(--rpma-border))]',
  warning: 'bg-white border-[hsl(var(--rpma-border))]',
  danger: 'bg-white border-[hsl(var(--rpma-border))]',
};

const iconClasses = {
  default: 'text-muted-foreground',
  primary: 'text-[hsl(var(--rpma-teal))]',
  success: 'text-[hsl(var(--rpma-teal))]',
  warning: 'text-yellow-500',
  danger: 'text-red-500',
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
    if (!trend) return 'text-muted-foreground';
    const isPositive = trend.value >= 0;
    const isGood = trend.positiveIsGood ? isPositive : !isPositive;

    if (isGood) return 'text-[hsl(var(--rpma-teal))]';
    return 'text-red-500';
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
            'rpma-shell rounded-lg border p-6 transition-shadow hover:shadow-md',
            variantClasses[variant],
            className
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">{value}</p>
              {trend && (
                <p className={`mt-1 flex items-center text-sm ${getTrendColor()}`}>
                  <span className="font-medium">
                    {getTrendIcon()} {Math.abs(trend.value)}%
                  </span>
                  <span className="ml-1 text-muted-foreground">{trend.label}</span>
                </p>
              )}
            </div>
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[hsl(var(--rpma-teal))]/10">
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
      <div
        className={cn(
          'rpma-shell overflow-hidden rounded-lg border border-[hsl(var(--rpma-border))] transition-shadow hover:shadow-md',
          className
        )}
      >
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-[hsl(var(--rpma-teal))]/10 rounded-md p-3">
              <div className="h-6 w-6 text-[hsl(var(--rpma-teal))]">{icon}</div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-muted-foreground truncate">
                  {title}
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-foreground">{value}</div>
                  {change && (
                    <div
                      className={cn(
                        'ml-2 flex items-baseline text-sm font-semibold',
                        isPositive ? 'text-[hsl(var(--rpma-teal))]' : 'text-red-500'
                      )}
                    >
                      {isPositive ? '↑' : '↓'} {Math.abs(change.value)}%
                      <span className="sr-only">
                        {isPositive ? 'Increased' : 'Decreased'} by
                      </span>
                      <span className="ml-1 text-xs text-muted-foreground">{change.label}</span>
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
