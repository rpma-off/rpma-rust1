import React from 'react';
import {
  Play,
  CheckCircle,
  Clock,
  ArrowRight,
  Shield,
  Ruler,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TaskWithDetails } from '@/types/task.types';

interface DelegatedTaskActionPanelProps {
  task: TaskWithDetails;
  isAssignedToCurrentUser: boolean;
  isAvailable: boolean;
  canStartTask: boolean;
  compact?: boolean;
  mobileDocked?: boolean;
  mode: 'delegated';
  onPrimaryAction?: () => void;
  onSecondaryAction?: (actionId: string) => void;
  isPending?: boolean;
}

export function DelegatedTaskActionPanel({
  task,
  canStartTask,
  onPrimaryAction,
  compact = false,
  mobileDocked = false,
  isPending = false,
}: DelegatedTaskActionPanelProps) {
  const isInProgress = task.status === 'in_progress';
  const isCompleted = task.status === 'completed';

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
          disabled={(!canStartTask && !isInProgress && !isCompleted) || isPending}
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
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
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
            disabled={(!canStartTask && !isInProgress && !isCompleted) || isPending}
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
    </div>
  );
}
