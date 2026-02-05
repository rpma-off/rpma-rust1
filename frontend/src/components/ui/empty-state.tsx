"use client"

import React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, className, size = 'md', ...props }, ref) => {
    const sizeClasses = {
      sm: 'py-6',
      md: 'py-12',
      lg: 'py-16'
    };

    const iconSizeClasses = {
      sm: 'h-8 w-8',
      md: 'h-12 w-12',
      lg: 'h-16 w-16'
    };

    const titleSizeClasses = {
      sm: 'text-lg',
      md: 'text-xl',
      lg: 'text-2xl'
    };

    const descriptionSizeClasses = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg'
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center text-center rpma-empty',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {icon && (
          <div className={cn(
            'mb-4 text-muted-foreground',
            iconSizeClasses[size]
          )}>
            {icon}
          </div>
        )}
        <h3 className={cn(
          'font-semibold text-foreground mb-2',
          titleSizeClasses[size]
        )}>
          {title}
        </h3>
        {description && (
          <p className={cn(
            'text-muted-foreground mb-6 max-w-sm',
            descriptionSizeClasses[size]
          )}>
            {description}
          </p>
        )}
        {action && (
          <div className="flex flex-col sm:flex-row gap-2">
            {action}
          </div>
        )}
      </div>
    );
  }
);

EmptyState.displayName = 'EmptyState';

// Specialized empty states for common scenarios
interface NoDataEmptyStateProps extends Omit<EmptyStateProps, 'icon' | 'title' | 'description'> {
  type?: 'tasks' | 'clients' | 'interventions' | 'search' | 'error';
}

export const NoDataEmptyState = React.forwardRef<HTMLDivElement, NoDataEmptyStateProps>(
  ({ type = 'tasks', action, className, ...props }, ref) => {
    const configs = {
      tasks: {
        icon: '📋',
        title: 'Aucune tâche trouvée',
        description: 'Il n\'y a pas encore de tâches à afficher. Créez votre première tâche pour commencer.'
      },
      clients: {
        icon: '👥',
        title: 'Aucun client trouvé',
        description: 'Vous n\'avez pas encore ajouté de clients. Ajoutez votre premier client pour commencer.'
      },
      interventions: {
        icon: '🔧',
        title: 'Aucune intervention trouvée',
        description: 'Il n\'y a pas d\'interventions planifiées ou terminées à afficher.'
      },
      search: {
        icon: '🔍',
        title: 'Aucun résultat trouvé',
        description: 'Essayez de modifier vos critères de recherche ou vérifiez l\'orthographe.'
      },
      error: {
        icon: '⚠️',
        title: 'Une erreur est survenue',
        description: 'Impossible de charger les données. Veuillez réessayer plus tard.'
      }
    };

    const config = configs[type];

    return (
      <EmptyState
        ref={ref}
        icon={<span className="text-4xl">{config.icon}</span>}
        title={config.title}
        description={config.description}
        action={action}
        className={className}
        {...props}
      />
    );
  }
);

NoDataEmptyState.displayName = 'NoDataEmptyState';

export { type EmptyStateProps, type NoDataEmptyStateProps };
