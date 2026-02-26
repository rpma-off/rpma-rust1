import React, { memo, useState } from 'react';
import {
  Play,
  CheckCircle,
  MoreVertical,
  Phone,
  MessageSquare,
  Clock,
  AlertCircle,
  ArrowRight,
  Settings,
  Wrench,
  Shield,
  Camera,
  ClipboardCheck,
  Ruler
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TaskWithDetails } from '@/types/task.types';

interface EnhancedActionsCardProps {
  task: TaskWithDetails;
  isAssignedToCurrentUser: boolean;
  isAvailable: boolean;
  canStartTask: boolean;
  onPrimaryAction?: () => void;
  onSecondaryAction?: (actionId: string) => void;
  compact?: boolean;
  mobileDocked?: boolean;
  isPending?: boolean;
}

type ActionItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
};

const ActionCard = ({
  icon: Icon,
  label,
  count,
  onClick,
  disabled,
  active,
  variant = 'primary',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}) => {
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

const EnhancedActionsCard: React.FC<EnhancedActionsCardProps> = ({
  task,
  isAssignedToCurrentUser: _isAssignedToCurrentUser,
  isAvailable: _isAvailable,
  canStartTask,
  onPrimaryAction,
  onSecondaryAction,
  compact = false,
  mobileDocked = false,
  isPending = false,
}) => {
  const [showMoreActions, setShowMoreActions] = useState(false);
  const isInProgress = task.status === 'in_progress';
  const isCompleted = task.status === 'completed';
  const totalPhotos = (task.photos_before?.length || 0) + (task.photos_after?.length || 0);
  const hasChecklist = task.checklist_items && task.checklist_items.length > 0;
  const completedChecklistItems = task.checklist_items?.filter((item) => item.is_completed).length || 0;

  const executionActions: ActionItem[] = [
    {
      id: 'workflow',
      label: 'Workflow',
      icon: Wrench,
      count: isInProgress ? 1 : undefined,
      disabled: !isInProgress && !isCompleted,
      variant: 'primary',
    },
    {
      id: 'photos',
      label: 'Photos',
      icon: Camera,
      count: totalPhotos,
      disabled: totalPhotos === 0,
      variant: 'secondary',
    },
    {
      id: 'checklist',
      label: 'Checklist',
      icon: ClipboardCheck,
      count: hasChecklist ? completedChecklistItems : undefined,
      disabled: !hasChecklist,
      variant: 'primary',
    },
  ];

  const communicationActions: ActionItem[] = [
    {
      id: 'call',
      label: 'Appeler',
      icon: Phone,
      variant: 'primary',
    },
    {
      id: 'message',
      label: 'Message',
      icon: MessageSquare,
      variant: 'secondary',
    },
  ];

  const adminActions: ActionItem[] = [
    {
      id: 'edit',
      label: 'Modifier',
      icon: Settings,
      variant: 'primary',
    },
    {
      id: 'delay',
      label: 'Reporter',
      icon: Clock,
      variant: 'secondary',
    },
    {
      id: 'report',
      label: 'Signaler',
      icon: AlertCircle,
      variant: 'danger',
    },
  ];

  const getPrimaryButtonStyle = () => {
    if (isCompleted) {
      return 'bg-emerald-600 hover:bg-emerald-700 text-white';
    }
    if (isInProgress) {
      return 'bg-[hsl(var(--rpma-teal))] hover:bg-[hsl(var(--rpma-teal))]/90 text-white';
    }
    if (canStartTask) {
      return 'bg-[hsl(var(--rpma-teal))] hover:bg-[hsl(var(--rpma-teal))]/90 text-white';
    }
    return 'bg-gray-300/70 text-gray-600 cursor-not-allowed';
  };

  const getPrimaryButtonLabel = () => {
    if (isCompleted) return 'Voir le rapport';
    if (isInProgress) return 'Continuer l\'intervention';
    if (canStartTask) return 'Démarrer l\'intervention';
    return 'Non disponible';
  };

  const getPrimaryButtonIcon = () => {
    if (isCompleted) return CheckCircle;
    if (isInProgress) return ArrowRight;
    return Play;
  };

  const PrimaryIcon = getPrimaryButtonIcon();

  if (mobileDocked) {
    return (
      <div className="flex items-center gap-2 p-2 bg-[hsl(var(--rpma-surface))]/95 backdrop-blur border-t border-[hsl(var(--rpma-border))]">
        <Button
          onClick={onPrimaryAction}
          disabled={!canStartTask && !isInProgress && !isCompleted || isPending}
          className={cn(
            'flex-1 h-12 text-sm font-semibold transition-all duration-200',
            getPrimaryButtonStyle(),
            isPending && 'opacity-70'
          )}
        >
          {isPending ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
              Chargement...
            </>
          ) : (
            <>
              <PrimaryIcon className="h-5 w-5 mr-2" />
              {getPrimaryButtonLabel()}
            </>
          )}
        </Button>
        <div className="flex gap-2">
          {executionActions.slice(0, 2).map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => onSecondaryAction?.(action.id)}
              disabled={action.disabled}
              className={cn(
                'p-3 rounded-lg border transition-all duration-200',
                action.disabled
                  ? 'border-border/30 bg-background/30 cursor-not-allowed opacity-50'
                  : 'border-border/50 bg-background/60 hover:border-accent/50 hover:bg-accent/10'
              )}
            >
              <action.icon className={cn('h-5 w-5', action.disabled ? 'text-muted-foreground' : 'text-accent')} />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowMoreActions(!showMoreActions)}
            className="p-3 rounded-lg border border-border/50 bg-background/60 hover:border-accent/50 hover:bg-accent/10 transition-all duration-200"
          >
            <MoreVertical className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
      {/* Primary Action Card */}
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-900">Action principale</span>
            </div>
            {isInProgress && (
              <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                <Clock className="h-3 w-3 mr-1" />
                En cours
              </Badge>
            )}
            {isCompleted && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                Terminé
              </Badge>
            )}
          </div>
          <Button
            onClick={onPrimaryAction}
            disabled={!canStartTask && !isInProgress && !isCompleted || isPending}
            className={cn(
              'w-full h-12 text-sm font-semibold transition-all duration-200',
              getPrimaryButtonStyle(),
              isPending && 'opacity-70'
            )}
          >
            {isPending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                Chargement...
              </>
            ) : (
              <>
                <PrimaryIcon className="h-5 w-5 mr-2" />
                {getPrimaryButtonLabel()}
              </>
            )}
          </Button>
          {task.ppf_zones && task.ppf_zones.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Ruler className="h-3.5 w-3.5 text-emerald-600" />
              <span>
                {task.ppf_zones.length} zone{task.ppf_zones.length > 1 ? 's' : ''} PPF
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Execution Actions Grid */}
      <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Exécution</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {executionActions.map((action) => (
            <ActionCard
              key={action.id}
              icon={action.icon}
              label={action.label}
              count={action.count}
              onClick={() => onSecondaryAction?.(action.id)}
              disabled={action.disabled}
              variant={action.variant}
            />
          ))}
        </div>
      </div>

      {/* Communication & Admin */}
      <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Communication</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {communicationActions.map((action) => (
            <ActionCard
              key={action.id}
              icon={action.icon}
              label={action.label}
              onClick={() => onSecondaryAction?.(action.id)}
              disabled={action.disabled}
              variant={action.variant}
            />
          ))}
        </div>

        <div className="pt-3 border-t border-border/50">
          <button
            type="button"
            onClick={() => setShowMoreActions(!showMoreActions)}
            className="w-full flex items-center justify-center p-3 rounded-lg border border-border/50 bg-background/60 hover:bg-accent/5 hover:border-accent/30 transition-all duration-200"
            aria-expanded={showMoreActions}
          >
            <Settings className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Administration</span>
            <MoreVertical className="h-4 w-4 ml-2 text-muted-foreground" />
          </button>

          {showMoreActions && (
            <div className="mt-3 grid grid-cols-3 gap-3">
              {adminActions.map((action) => (
                <ActionCard
                  key={action.id}
                  icon={action.icon}
                  label={action.label}
                  onClick={() => onSecondaryAction?.(action.id)}
                  disabled={action.disabled}
                  variant={action.variant}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(EnhancedActionsCard);
