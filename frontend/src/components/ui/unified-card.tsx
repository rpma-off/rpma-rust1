import React from 'react';
import { cn } from '@/lib/utils';
import { StandardCard, CardHeader, CardContent, CardSection } from './standard-card';
import { cardStandards, animationStandards, responsiveStandards } from '@/lib/component-standards';
import { Badge } from './badge';
import { Button } from './button';
import { CheckCircle2, Clock, Clock3, AlertCircle, Car, UserCircle, Calendar, MoreVertical } from 'lucide-react';

// Status configuration for consistent display across all card types
export const STATUS_CONFIG = {
  pending: {
    color: 'bg-[var(--status-primary)]/20 text-[var(--status-primary-foreground)] border-[var(--status-primary)]/40',
    dot: 'bg-[var(--status-primary)]',
    icon: Clock3,
    label: 'En attente'
  },
  in_progress: {
    color: 'bg-[var(--status-warning)]/20 text-[var(--status-warning-foreground)] border-[var(--status-warning)]/40',
    dot: 'bg-[var(--status-warning)]',
    icon: Clock,
    label: 'En cours'
  },
  completed: {
    color: 'bg-[var(--status-success)]/20 text-[var(--status-success-foreground)] border-[var(--status-success)]/40',
    dot: 'bg-[var(--status-success)]',
    icon: CheckCircle2,
    label: 'Terminée'
  },
  cancelled: {
    color: 'bg-[var(--status-destructive)]/20 text-[var(--status-destructive-foreground)] border-[var(--status-destructive)]/40',
    dot: 'bg-[var(--status-destructive)]',
    icon: AlertCircle,
    label: 'Annulée'
  }
} as const;

export type CardStatus = keyof typeof STATUS_CONFIG;

// Base card props that all variants share
interface BaseCardProps {
  title: string;
  subtitle?: string;
  status?: CardStatus;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  actions?: React.ReactNode;
}

// Task card specific props
interface TaskCardProps extends BaseCardProps {
  variant: 'task';
  vehicle?: string;
  vehicleModel?: string;
  customerName?: string;
  technicianName?: string;
  scheduledDate?: string;
  zones?: string[];
  progress?: {
    completed: number;
    total: number;
  };
}

// Client card specific props
interface ClientCardProps extends BaseCardProps {
  variant: 'client';
  company?: string;
  email?: string;
  phone?: string;
  totalTasks?: number;
  activeTasks?: number;
  customerType?: 'individual' | 'business';
}

// Stat card specific props
interface StatCardProps extends BaseCardProps {
  variant: 'stat';
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  description?: string;
}

// Union type for all card variants
type UnifiedCardProps = TaskCardProps | ClientCardProps | StatCardProps;

/**
 * Unified Card Component
 *
 * A comprehensive card component that handles different content types
 * with consistent styling, interactions, and responsive behavior.
 */
export const UnifiedCard = React.memo<UnifiedCardProps>((props) => {
  const { variant, title, subtitle, status, onClick, className, size = 'md', actions } = props;

  const isInteractive = !!onClick;
  const StatusIcon = status ? STATUS_CONFIG[status].icon : null;

  // Render status badge
  const renderStatusBadge = () => {
    if (!status) return null;

    const config = STATUS_CONFIG[status];
    return (
      <Badge
        variant="outline"
        className={cn('text-xs px-2 py-1 border', config.color)}
      >
        {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
        {config.label}
      </Badge>
    );
  };

  // Render task-specific content
  const renderTaskContent = (props: TaskCardProps) => (
    <div className="space-y-4">
      {/* Vehicle Info */}
      {(props.vehicle || props.vehicleModel) && (
        <div className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
          <Car className="h-5 w-5 text-accent flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-sm text-zinc-400 block">Véhicule</span>
            <span className="text-base font-semibold text-white truncate">
              {props.vehicle} {props.vehicleModel}
            </span>
          </div>
        </div>
      )}

      {/* Zones */}
      {props.zones && props.zones.length > 0 && (
        <div className="flex items-start gap-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
          <div className="h-5 w-5 flex items-center justify-center text-accent flex-shrink-0 rounded bg-accent/20">
            <span className="text-xs font-bold">PPF</span>
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-sm text-zinc-400 block">Zones</span>
            <span className="text-base font-semibold text-white truncate">
              {props.zones.join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* Customer & Technician */}
      <div className="grid grid-cols-1 gap-3">
        {props.customerName && (
          <div className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
            <UserCircle className="h-5 w-5 text-accent flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-sm text-zinc-400 block">Client</span>
              <span className="text-base font-semibold text-white truncate">
                {props.customerName}
              </span>
            </div>
          </div>
        )}

        {props.technicianName && (
          <div className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
            <UserCircle className="h-5 w-5 text-accent flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-sm text-zinc-400 block">Technicien</span>
              <span className="text-base font-semibold text-white truncate">
                {props.technicianName}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Scheduled Date */}
      {props.scheduledDate && (
        <div className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
          <Calendar className="h-5 w-5 text-accent flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-sm text-zinc-400 block">Date prévue</span>
            <span className="text-base font-semibold text-white">
              {new Date(props.scheduledDate).toLocaleDateString('fr-FR')}
            </span>
          </div>
        </div>
      )}

      {/* Progress */}
      {props.progress && (
        <div className="border-t border-zinc-700/50 pt-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-300">Progression</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                {props.progress.completed}/{props.progress.total}
              </span>
              <span className="text-xs text-zinc-400">
                ({Math.round((props.progress.completed / props.progress.total) * 100)}%)
              </span>
            </div>
          </div>
          <div className="relative">
            <div className="w-full bg-zinc-700/50 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-accent to-accent/80"
                style={{ width: `${(props.progress.completed / props.progress.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render client-specific content
  const renderClientContent = (props: ClientCardProps) => (
    <div className="space-y-4">
      {/* Contact Info */}
      <div className="grid grid-cols-1 gap-3">
        {props.company && (
          <div className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
            <div className="h-5 w-5 flex items-center justify-center text-accent flex-shrink-0 rounded bg-accent/20">
              <span className="text-xs font-bold">🏢</span>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm text-zinc-400 block">Entreprise</span>
              <span className="text-base font-semibold text-white truncate">
                {props.company}
              </span>
            </div>
          </div>
        )}

        {props.email && (
          <div className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
            <div className="h-5 w-5 flex items-center justify-center text-accent flex-shrink-0 rounded bg-accent/20">
              <span className="text-xs font-bold">@</span>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm text-zinc-400 block">Email</span>
              <span className="text-base font-semibold text-white truncate">
                {props.email}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Task Stats */}
      {(props.totalTasks !== undefined || props.activeTasks !== undefined) && (
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-700/50">
          {props.totalTasks !== undefined && (
            <div className="text-center p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
              <p className="text-xl font-bold text-white mb-1">{props.totalTasks}</p>
              <p className="text-xs text-zinc-400 font-medium">Total tâches</p>
            </div>
          )}
          {props.activeTasks !== undefined && (
            <div className="text-center p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
              <p className="text-xl font-bold text-accent mb-1">{props.activeTasks}</p>
              <p className="text-xs text-zinc-400 font-medium">En cours</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Render stat-specific content
  const renderStatContent = (props: StatCardProps) => (
    <div className="text-center space-y-4">
      {/* Value */}
      <div className="space-y-2">
        <div className="text-4xl md:text-5xl font-bold text-white">
          {props.value}
        </div>
        {props.description && (
          <p className="text-sm text-zinc-400">{props.description}</p>
        )}
      </div>

      {/* Trend */}
      {props.trend && (
        <div className="flex items-center justify-center gap-2">
          <span className={cn(
            'text-sm font-medium',
            props.trend.direction === 'up' ? 'text-emerald-400' :
            props.trend.direction === 'down' ? 'text-red-400' : 'text-zinc-400'
          )}>
            {props.trend.direction === 'up' ? '↗' :
             props.trend.direction === 'down' ? '↘' : '→'}
            {Math.abs(props.trend.value)}%
          </span>
          <span className="text-xs text-zinc-400">vs période précédente</span>
        </div>
      )}
    </div>
  );

  // Render content based on variant
  const renderContent = () => {
    switch (variant) {
      case 'task':
        return renderTaskContent(props as TaskCardProps);
      case 'client':
        return renderClientContent(props as ClientCardProps);
      case 'stat':
        return renderStatContent(props as StatCardProps);
      default:
        return null;
    }
  };

  return (
    <StandardCard
      interactive={isInteractive}
      size={size}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden',
        // Status indicator stripe
        status && `border-l-4 ${STATUS_CONFIG[status].dot}`,
        className
      )}
    >
      {/* Header */}
      <CardHeader
        title={title}
        subtitle={subtitle}
        actions={
          <div className="flex items-center gap-2">
            {renderStatusBadge()}
            {actions}
          </div>
        }
      />

      {/* Content */}
      <CardContent>
        {renderContent()}
      </CardContent>
    </StandardCard>
  );
});

UnifiedCard.displayName = 'UnifiedCard';

// Export types for external use
export type { UnifiedCardProps, TaskCardProps, ClientCardProps, StatCardProps };