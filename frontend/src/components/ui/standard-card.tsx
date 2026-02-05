import React from 'react';
import { cn } from '@/lib/utils';
import { cardStandards, createCardClass } from '@/lib/component-standards';

interface StandardCardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

/**
 * Standardized card component that follows the design system
 * Uses the new design tokens for consistent styling across the app
 */
export const StandardCard: React.FC<StandardCardProps> = ({
  children,
  className,
  interactive = false,
  size = 'md',
  onClick,
}) => {
  const cardClasses = createCardClass(interactive, size);

  return (
    <div
      className={cn(cardClasses, className)}
      onClick={interactive ? onClick : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      } : undefined}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  icon,
  actions,
  className,
}) => {
  return (
    <div className={cn(cardStandards.header, className)}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {icon && (
          <div className="flex-shrink-0 w-8 h-8 bg-[hsl(var(--rpma-teal))]/10 rounded-lg flex items-center justify-center">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn(cardStandards.section, className)}>
      {children}
    </div>
  );
};

interface CardSectionProps {
  title?: string;
  children: React.ReactNode;
  bordered?: boolean;
  className?: string;
}

export const CardSection: React.FC<CardSectionProps> = ({
  title,
  children,
  bordered = false,
  className,
}) => {
  return (
    <div className={cn(
      bordered ? cardStandards.sectionBordered : cardStandards.section,
      className
    )}>
      {title && (
        <h4 className="text-sm font-medium text-foreground mb-2">
          {title}
        </h4>
      )}
      {children}
    </div>
  );
};
