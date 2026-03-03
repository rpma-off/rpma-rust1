import React, { memo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play,
  CheckCircle,
  Image as ImageIcon,
  MoreVertical,
  Edit,
  FileText,
  Phone,
  MessageSquare,
  Clock,
  AlertCircle,
  ArrowRight,
  User,
  Settings,
  Wrench,
  Shield,
  Camera,
  ClipboardCheck,
  Ruler,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { TaskStatus } from '@/lib/backend';
import { TaskWithDetails } from '@/types/task.types';
import { useTaskActions } from './useTaskActions';
import { PrimaryActionButton } from './PrimaryActionButton';
import { SecondaryActionsGrid } from './SecondaryActionsGrid';
import { IconActionButton } from './IconActionButton';
import { MoreActionsSection } from './MoreActionsSection';
import { StatusWarnings } from './StatusWarnings';
import { PrioritySelector } from './PrioritySelector';
import type { TaskActionItem } from './TaskActionButton';
import EditTaskModal from './EditTaskModal';
import SendMessageModal from './SendMessageModal';
import DelayTaskModal from './DelayTaskModal';
import ReportIssueModal from './ReportIssueModal';

interface BaseTaskActionPanelProps {
  task: TaskWithDetails;
  isAssignedToCurrentUser: boolean;
  isAvailable: boolean;
  canStartTask: boolean;
  compact?: boolean;
  mobileDocked?: boolean;
}

interface ManagedTaskActionPanelProps extends BaseTaskActionPanelProps {
  mode: 'managed';
  stickyOffsetClass?: string;
}

interface DelegatedTaskActionPanelProps extends BaseTaskActionPanelProps {
  mode: 'delegated';
  onPrimaryAction?: () => void;
  onSecondaryAction?: (actionId: string) => void;
  isPending?: boolean;
}

export type TaskActionPanelProps = ManagedTaskActionPanelProps | DelegatedTaskActionPanelProps;

type DelegatedActionItem = Omit<TaskActionItem, 'onClick'> & {
  variant?: 'primary' | 'secondary' | 'danger';
};

const DelegatedActionCard = ({
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

function ManagedTaskActionPanel({
  task,
  isAssignedToCurrentUser,
  isAvailable,
  canStartTask,
  compact = false,
  stickyOffsetClass,
  mobileDocked = false,
}: ManagedTaskActionPanelProps) {
  const router = useRouter();
  const actions = useTaskActions(task);

  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSendMessageModal, setShowSendMessageModal] = useState(false);
  const [showDelayTaskModal, setShowDelayTaskModal] = useState(false);
  const [showReportIssueModal, setShowReportIssueModal] = useState(false);
  const [notes, setNotes] = useState(task.note || '');

  const isInProgress = task.status === 'in_progress';
  const isCompleted = task.status === 'completed';
  const shouldShowDisabledReason = !canStartTask && !isInProgress && !isCompleted;

  const handleViewCompleted = () => {
    router.push(`/tasks/${task.id}/completed`);
  };

  const handleViewWorkflow = () => {
    router.push(`/tasks/${task.id}/workflow/ppf`);
  };

  const handleStartWorkflow = () => {
    actions.startIntervention();
  };

  const handleAssignToMe = () => {
    actions.assignToMe();
    setShowAssignmentDialog(false);
  };

  const handleSaveNotes = () => {
    if (notes !== task.note) {
      actions.updateNotes(notes);
      setShowNotesDialog(false);
    }
  };

  const handleActionClick = (action: () => void) => {
    action();
  };

  const executionActions: TaskActionItem[] = [
    {
      id: 'workflow',
      label: 'Voir le workflow',
      icon: Wrench,
      onClick: handleViewWorkflow,
      disabled: !isInProgress,
    },
    {
      id: 'before-photos',
      label: 'Photos avant',
      icon: ImageIcon,
      count: task.photos_before?.length || 0,
      onClick: () => router.push(`/tasks/${task.id}/photos/before`),
    },
    {
      id: 'after-photos',
      label: 'Photos après',
      icon: ImageIcon,
      count: task.photos_after?.length || 0,
      onClick: () => router.push(`/tasks/${task.id}/photos/after`),
      disabled: !isCompleted,
    },
  ];

  const communicationActions: TaskActionItem[] = [
    {
      id: 'call',
      label: 'Appeler le client',
      icon: Phone,
      onClick: () => actions.initiateCall(),
      disabled: !task.customer_phone,
    },
    {
      id: 'message',
      label: 'Envoyer un message',
      icon: MessageSquare,
      onClick: () => setShowSendMessageModal(true),
    },
  ];

  const administrationActions: TaskActionItem[] = [
    {
      id: 'status',
      label: 'Changer le statut',
      icon: Settings,
      onClick: () => setShowStatusDialog(true),
    },
    {
      id: 'assign',
      label: 'M&apos;assigner la tâche',
      icon: User,
      onClick: () => setShowAssignmentDialog(true),
      disabled: isAssignedToCurrentUser,
    },
    {
      id: 'notes',
      label: 'Modifier les notes',
      icon: FileText,
      onClick: () => setShowNotesDialog(true),
    },
    {
      id: 'edit',
      label: 'Modifier la tâche',
      icon: Edit,
      onClick: () => setShowEditModal(true),
    },
    {
      id: 'delay',
      label: 'Reporter la tâche',
      icon: Clock,
      onClick: () => setShowDelayTaskModal(true),
    },
    {
      id: 'report',
      label: 'Signaler un problème',
      icon: AlertCircle,
      onClick: () => setShowReportIssueModal(true),
    },
  ];

  const primaryDisabledReason = !isAvailable && !isAssignedToCurrentUser
    ? 'Intervention indisponible : cette tâche est déjà prise par un autre technicien.'
    : shouldShowDisabledReason
      ? `Cette tâche est au statut « ${task.status} » et ne peut pas être démarrée.`
      : null;

  const dockedQuickActions = [...executionActions.filter((action) => action.id !== 'workflow').slice(0, 2), communicationActions[1]];

  return (
    <div
      className={cn('rounded-xl overflow-hidden', compact ? 'bg-transparent border-0' : 'bg-background/40 border border-border/50', stickyOffsetClass)}
    >
      <div className={compact ? 'p-0' : 'p-5'}>
        {!mobileDocked && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Actions de l&apos;intervention</h3>
          </div>
        )}

        <div className={cn(mobileDocked ? 'space-y-2' : 'space-y-5')}>
          <div>
            {!mobileDocked && <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-border-light">Action principale</p>}
            <PrimaryActionButton
              isCompleted={isCompleted}
              isInProgress={isInProgress}
              canStartTask={canStartTask}
              isPending={actions.isStartingIntervention}
              onViewCompleted={handleViewCompleted}
              onViewWorkflow={handleViewWorkflow}
              onStartWorkflow={handleStartWorkflow}
              compact={mobileDocked}
            />
            {primaryDisabledReason && !mobileDocked && <p className="mt-2 text-xs text-amber-600">{primaryDisabledReason}</p>}
          </div>

          {mobileDocked ? (
            <div className="grid grid-cols-4 gap-2">
              {dockedQuickActions.map((action) => (
                <IconActionButton key={action.id} action={action} onActionClick={handleActionClick} compact />
              ))}
              <button
                type="button"
                onClick={() => setShowMoreActions((current) => !current)}
                className="rounded-lg border border-border/60 bg-background/60 px-2 py-2 text-xs text-border-light hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4 mx-auto mb-1" />
                Plus
              </button>

              {showMoreActions && (
                <div className="col-span-4 grid grid-cols-2 gap-2 pt-1">
                  {[...communicationActions, ...administrationActions].map((action) => (
                    <IconActionButton key={action.id} action={action} onActionClick={handleActionClick} compact />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-border-light">Exécution</p>
                <SecondaryActionsGrid actions={executionActions} onActionClick={handleActionClick} columns={3} />
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-border-light">Communication</p>
                <SecondaryActionsGrid actions={communicationActions} onActionClick={handleActionClick} columns={2} />
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-border-light">Administration</p>
                <MoreActionsSection
                  showMoreActions={showMoreActions}
                  toggleMoreActions={() => setShowMoreActions((current) => !current)}
                  actions={administrationActions}
                  onActionClick={handleActionClick}
                />
              </div>

              <StatusWarnings
                isAvailable={isAvailable}
                isAssignedToCurrentUser={isAssignedToCurrentUser}
                canStartTask={canStartTask}
                isInProgress={isInProgress}
                taskStatus={task.status}
              />

              <PrioritySelector
                value={task.priority || 'medium'}
                onChange={(value) => actions.updatePriority(value)}
                isPending={actions.isUpdatingPriority}
              />
            </>
          )}
        </div>

        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Changer le statut de la tâche</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="status-select">Nouveau statut</Label>
                <Select
                  value={task.status}
                  onValueChange={(value: string) => {
                    const statusValue = [
                      'draft',
                      'scheduled',
                      'in_progress',
                      'completed',
                      'cancelled',
                      'on_hold',
                      'pending',
                      'invalid',
                      'archived',
                      'failed',
                      'overdue',
                      'assigned',
                      'paused',
                    ].find((s) => s === value) as TaskStatus;
                    if (statusValue) actions.updateStatus(statusValue);
                  }}
                  disabled={actions.isUpdatingStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="scheduled">Planifiée</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="completed">Terminée</SelectItem>
                    <SelectItem value="cancelled">Annulée</SelectItem>
                    <SelectItem value="on_hold">En pause</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>S&apos;assigner cette tâche</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-foreground">
                Vous êtes sur le point de vous assigner cette tâche. Confirmez-vous ?
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAssignmentDialog(false)}
                  className="px-4 py-2 rounded-lg border border-border/50 bg-background/60 hover:bg-border/30 text-sm"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleAssignToMe}
                  disabled={actions.isAssigning}
                  className="px-4 py-2 rounded-lg bg-[hsl(var(--rpma-teal))] hover:bg-[hsl(var(--rpma-teal))]/90 text-background text-sm disabled:opacity-50"
                >
                  {actions.isAssigning ? 'Assignation...' : 'Confirmer'}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier les notes</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ajoutez des notes sur cette tâche..."
                  className="min-h-[150px]"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNotesDialog(false)}
                  className="px-4 py-2 rounded-lg border border-border/50 bg-background/60 hover:bg-border/30 text-sm"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={actions.isUpdatingNotes}
                  className="px-4 py-2 rounded-lg bg-[hsl(var(--rpma-teal))] hover:bg-[hsl(var(--rpma-teal))]/90 text-background text-sm disabled:opacity-50"
                >
                  {actions.isUpdatingNotes ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <EditTaskModal task={task} open={showEditModal} onOpenChange={setShowEditModal} />
        <SendMessageModal task={task} open={showSendMessageModal} onOpenChange={setShowSendMessageModal} />
        <DelayTaskModal task={task} open={showDelayTaskModal} onOpenChange={setShowDelayTaskModal} />
        <ReportIssueModal task={task} open={showReportIssueModal} onOpenChange={setShowReportIssueModal} />
      </div>
    </div>
  );
}

function DelegatedTaskActionPanel({
  task,
  isAssignedToCurrentUser: _isAssignedToCurrentUser,
  isAvailable: _isAvailable,
  canStartTask,
  onPrimaryAction,
  onSecondaryAction,
  compact = false,
  mobileDocked = false,
  isPending = false,
}: DelegatedTaskActionPanelProps) {
  const [showMoreActions, setShowMoreActions] = useState(false);
  const isInProgress = task.status === 'in_progress';
  const isCompleted = task.status === 'completed';
  const totalPhotos = (task.photos_before?.length || 0) + (task.photos_after?.length || 0);
  const hasChecklist = task.checklist_items && task.checklist_items.length > 0;
  const completedChecklistItems = task.checklist_items?.filter((item) => item.is_completed).length || 0;

  const executionActions: DelegatedActionItem[] = [
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

  const communicationActions: DelegatedActionItem[] = [
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

  const adminActions: DelegatedActionItem[] = [
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

      <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Exécution</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {executionActions.map((action) => (
            <DelegatedActionCard
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

      <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Communication</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {communicationActions.map((action) => (
            <DelegatedActionCard
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
                <DelegatedActionCard
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
}

export const TaskActionPanel = memo(function TaskActionPanel(props: TaskActionPanelProps) {
  if (props.mode === 'managed') {
    return <ManagedTaskActionPanel {...props} />;
  }
  return <DelegatedTaskActionPanel {...props} />;
});

