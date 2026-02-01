import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Plus, Search, Filter, RefreshCw } from 'lucide-react';

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

/**
 * Enhanced Empty State Component
 *
 * Provides contextual empty states with helpful guidance,
 * visual appeal, and actionable next steps.
 */
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
        return {
          iconBg: 'from-blue-500/20 to-blue-600/20',
          iconBorder: 'border-blue-500/30',
          iconColor: 'text-blue-400'
        };
      case 'filter':
        return {
          iconBg: 'from-purple-500/20 to-purple-600/20',
          iconBorder: 'border-purple-500/30',
          iconColor: 'text-purple-400'
        };
      case 'error':
        return {
          iconBg: 'from-red-500/20 to-red-600/20',
          iconBorder: 'border-red-500/30',
          iconColor: 'text-red-400'
        };
      default:
        return {
          iconBg: 'from-emerald-500/20 to-emerald-600/20',
          iconBorder: 'border-emerald-500/30',
          iconColor: 'text-emerald-400'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={cn('text-center py-12 md:py-16', className)}>
      {/* Icon */}
      <div className="relative mb-8">
        <div className={cn(
          'inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br mb-6 shadow-lg',
          styles.iconBg
        )}>
          <div className={cn('w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br flex items-center justify-center border', styles.iconBorder)}>
            {icon || <Plus className={cn('w-6 h-6 md:w-7 md:h-7', styles.iconColor)} />}
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
          <Plus className="h-3 w-3 text-white" />
        </div>
        <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full opacity-60"></div>
      </div>

      {/* Content */}
      <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-4 bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
        {title}
      </h3>

      <p className="text-zinc-400 mb-8 max-w-lg mx-auto text-base md:text-lg leading-relaxed">
        {description}
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
        {action && (
          <Button
            onClick={action.onClick}
            className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 hover:scale-105"
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
            className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-105"
            size="lg"
          >
            {secondaryAction.icon && <span className="h-5 w-5 mr-2 inline-flex items-center">{secondaryAction.icon}</span>}
            {secondaryAction.label}
          </Button>
        )}

        {/* Quick actions for specific variants */}
        {variant === 'search' && (
          <Button
            onClick={() => window.location.reload()}
            variant="ghost"
            className="text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50 px-4 py-2 rounded-lg"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        )}

        {variant === 'filter' && (
          <Button
            onClick={() => {
              // Could emit an event to clear filters
              window.location.reload();
            }}
            variant="ghost"
            className="text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50 px-4 py-2 rounded-lg"
          >
            <Filter className="h-4 w-4 mr-2" />
            Effacer les filtres
          </Button>
        )}
      </div>

      {/* Tips */}
      {tips && tips.length > 0 && (
        <div className="mt-12 pt-8 border-t border-zinc-700/50">
          <p className="text-sm text-zinc-500 mb-6">💡 Conseils pour commencer</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {tips.map((tip, index) => (
              <div
                key={index}
                className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-700/30 hover:border-emerald-500/30 transition-colors"
              >
                <div className="text-emerald-400 font-semibold mb-2">{tip.title}</div>
                <p className="text-xs text-zinc-400">{tip.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

EnhancedEmptyState.displayName = 'EnhancedEmptyState';