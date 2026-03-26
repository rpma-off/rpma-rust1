import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, icon, actions, className, children }: PageHeaderProps) {
  return (
    <div className={cn('bg-white border border-[hsl(var(--rpma-border))] rounded-[10px] shadow-[var(--rpma-shadow-soft)]', className)}>
      <div className="px-5 py-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            {icon && (
              <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-[hsl(var(--rpma-surface))] border border-[hsl(var(--rpma-border))] rounded-full flex items-center justify-center">
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-foreground">
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
