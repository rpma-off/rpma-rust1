import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Image as ImageIcon,
  MoreVertical,
  Edit,
  FileText,
  Phone,
  MessageSquare,
  Clock,
  AlertCircle,
  User,
  Settings,
  Wrench,
} from 'lucide-react';
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

interface ManagedTaskActionPanelProps {
  task: TaskWithDetails;
  isAssignedToCurrentUser: boolean;
  isAvailable: boolean;
  canStartTask: boolean;
  compact?: boolean;
  mobileDocked?: boolean;
  mode: 'managed';
  stickyOffsetClass?: string;
}

export function ManagedTaskActionPanel({
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
