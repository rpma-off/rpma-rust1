import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Plus, Filter, RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  tips?: Array<{
    title: string;
    description: string;
  }>;
  variant?: 'default' | 'search' | 'filter' | 'error';
  className?: string;
}

export const EnhancedEmptyState = React.memo<EmptyStateProps>(({
  title,
  description,
  icon,
  action,
  secondaryAction,
  tips,
  variant = 'default',
  className
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'search':
      case 'filter':
      case 'error':
      default:
        return {
          iconBg: 'from-slate-200 to-slate-100',
          iconBorder: 'border-slate-300',
          iconColor: 'text-slate-700'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={cn('text-center py-12 md:py-16', className)}>
      <div className="relative mb-6">
        <div className={cn(
          'inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br mb-4 border',
          styles.iconBg,
          styles.iconBorder
        )}>
          <div className={cn('w-9 h-9 md:w-10 md:h-10 rounded-full bg-white flex items-center justify-center border', styles.iconBorder)}>
            {icon || <Plus className={cn('w-6 h-6 md:w-7 md:h-7', styles.iconColor)} />}
          </div>
        </div>
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-[hsl(var(--rpma-teal))] rounded-full"></div>
      </div>

      <h3 className="text-xl md:text-2xl font-semibold text-foreground mb-3">
        {title}
      </h3>

      <p className="text-muted-foreground mb-6 max-w-lg mx-auto text-base leading-relaxed">
        {description}
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
        {action && (
          <Button
            onClick={action.onClick}
            className="bg-[hsl(var(--rpma-teal))] text-white px-6 py-2 rounded-[6px] font-semibold shadow-sm hover:shadow-md transition-all duration-200"
            size="lg"
          >
            {action.icon && <span className="h-5 w-5 mr-2 inline-flex items-center">{action.icon}</span>}
            {action.label}
          </Button>
        )}

        {secondaryAction && (
          <Button
            onClick={secondaryAction.onClick}
            variant="outline"
            className="border-border text-foreground hover:bg-[hsl(var(--rpma-surface))] px-6 py-2 rounded-[6px] font-medium transition-all duration-200"
            size="lg"
          >
            {secondaryAction.icon && <span className="h-5 w-5 mr-2 inline-flex items-center">{secondaryAction.icon}</span>}
            {secondaryAction.label}
          </Button>
        )}

        {variant === 'search' && (
          <Button
            onClick={() => window.location.reload()}
            variant="ghost"
            className="text-muted-foreground hover:text-foreground px-4 py-2 rounded-[6px]"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        )}

        {variant === 'filter' && (
          <Button
            onClick={() => {
              window.location.reload();
            }}
            variant="ghost"
            className="text-muted-foreground hover:text-foreground px-4 py-2 rounded-[6px]"
          >
            <Filter className="h-4 w-4 mr-2" />
            Effacer les filtres
          </Button>
        )}
      </div>

      {tips && tips.length > 0 && (
        <div className="mt-10 pt-6 border-t border-[hsl(var(--rpma-border))]">
          <p className="text-sm text-muted-foreground mb-6">Conseils pour commencer</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {tips.map((tip, index) => (
              <div
                key={index}
                className="bg-white rounded-lg p-4 border border-[hsl(var(--rpma-border))] hover:border-[hsl(var(--rpma-teal))]/40 transition-colors"
              >
                <div className="text-foreground font-semibold mb-2">{tip.title}</div>
                <p className="text-xs text-muted-foreground">{tip.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

EnhancedEmptyState.displayName = 'EnhancedEmptyState';
