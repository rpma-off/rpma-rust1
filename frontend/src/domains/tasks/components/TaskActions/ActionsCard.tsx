import React, { memo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play,
  CheckCircle,
  Image as ImageIcon,
  ListChecks,
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
  Wrench
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { TaskStatus, TaskPriority, UpdateTaskRequest } from '@/lib/backend';
import { TaskWithDetails } from '@/types/task.types';
import toast from 'react-hot-toast';
import { interventionKeys } from '@/lib/query-keys';
import { useAuth } from '@/domains/auth';
import { taskService } from '../../services/task.service';
import { ipcClient } from '@/lib/ipc';
import { InterventionWorkflowService } from '@/domains/interventions';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import EditTaskModal from './EditTaskModal';
import SendMessageModal from './SendMessageModal';
import DelayTaskModal from './DelayTaskModal';
import ReportIssueModal from './ReportIssueModal';

interface ActionsCardProps {
  task: TaskWithDetails;
  isAssignedToCurrentUser: boolean;
  isAvailable: boolean;
  canStartTask: boolean;
  compact?: boolean;
  stickyOffsetClass?: string;
  mobileDocked?: boolean;
}

type ActionItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  onClick: () => void;
  disabled?: boolean;
};

const ActionsCard: React.FC<ActionsCardProps> = ({
  task,
  isAssignedToCurrentUser,
  isAvailable,
  canStartTask,
  compact = false,
  stickyOffsetClass,
  mobileDocked = false
}) => {
  const createStatusUpdate = (status: TaskStatus): UpdateTaskRequest => ({
    id: null,
    title: null,
    description: null,
    priority: null,
    status,
    vehicle_plate: null,
    vehicle_model: null,
    vehicle_year: null,
    vehicle_make: null,
    vin: null,
    ppf_zones: null,
    custom_ppf_zones: null,
    client_id: null,
    customer_name: null,
    customer_email: null,
    customer_phone: null,
    customer_address: null,
    external_id: null,
    lot_film: null,
    checklist_completed: null,
    scheduled_date: null,
    start_time: null,
    end_time: null,
    date_rdv: null,
    heure_rdv: null,
    template_id: null,
    workflow_id: null,
    estimated_duration: null,
    notes: null,
    tags: null,
    technician_id: null
  });

  const createPriorityUpdate = (priority: TaskPriority): UpdateTaskRequest => ({
    id: null,
    title: null,
    description: null,
    priority,
    status: null,
    vehicle_plate: null,
    vehicle_model: null,
    vehicle_year: null,
    vehicle_make: null,
    vin: null,
    ppf_zones: null,
    custom_ppf_zones: null,
    client_id: null,
    customer_name: null,
    customer_email: null,
    customer_phone: null,
    customer_address: null,
    external_id: null,
    lot_film: null,
    checklist_completed: null,
    scheduled_date: null,
    start_time: null,
    end_time: null,
    date_rdv: null,
    heure_rdv: null,
    template_id: null,
    workflow_id: null,
    estimated_duration: null,
    notes: null,
    tags: null,
    technician_id: null
  });

  const createTechnicianUpdate = (technician_id: string): UpdateTaskRequest => ({
    id: null,
    title: null,
    description: null,
    priority: null,
    status: null,
    vehicle_plate: null,
    vehicle_model: null,
    vehicle_year: null,
    vehicle_make: null,
    vin: null,
    ppf_zones: null,
    custom_ppf_zones: null,
    client_id: null,
    customer_name: null,
    customer_email: null,
    customer_phone: null,
    customer_address: null,
    external_id: null,
    lot_film: null,
    checklist_completed: null,
    scheduled_date: null,
    start_time: null,
    end_time: null,
    date_rdv: null,
    heure_rdv: null,
    template_id: null,
    workflow_id: null,
    estimated_duration: null,
    notes: null,
    tags: null,
    technician_id
  });

  const createNotesUpdate = (notes: string): UpdateTaskRequest => ({
    id: null,
    title: null,
    description: null,
    priority: null,
    status: null,
    vehicle_plate: null,
    vehicle_model: null,
    vehicle_year: null,
    vehicle_make: null,
    vin: null,
    ppf_zones: null,
    custom_ppf_zones: null,
    client_id: null,
    customer_name: null,
    customer_email: null,
    customer_phone: null,
    customer_address: null,
    external_id: null,
    lot_film: null,
    checklist_completed: null,
    scheduled_date: null,
    start_time: null,
    end_time: null,
    date_rdv: null,
    heure_rdv: null,
    template_id: null,
    workflow_id: null,
    estimated_duration: null,
    notes,
    tags: null,
    technician_id: null
  });

  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
  const hasBeforePhotos = task.photos_before && task.photos_before.length > 0;
  const hasAfterPhotos = task.photos_after && task.photos_after.length > 0;
  const hasChecklist = task.checklist_items && task.checklist_items.length > 0;
  const shouldShowDisabledReason = !canStartTask && !isInProgress && !isCompleted;

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: TaskStatus) => {
      if (!user?.token) throw new Error('Utilisateur non authentifié');
      return await taskService.updateTask(task.id, createStatusUpdate(newStatus));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', task.id] });
      toast.success('Statut mis Ã  jour avec succès');
      setShowStatusDialog(false);
    },
    onError: error => {
      toast.error('Erreur lors de la mise Ã  jour du statut');
      console.error('Status update error:', error);
    }
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async (newPriority: TaskPriority) => {
      if (!user?.token) throw new Error('Utilisateur non authentifié');
      return await taskService.updateTask(task.id, createPriorityUpdate(newPriority));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', task.id] });
      toast.success('Priorité mise Ã  jour avec succès');
    },
    onError: error => {
      toast.error('Erreur lors de la mise Ã  jour de la priorité');
      console.error('Priority update error:', error);
    }
  });

  const assignToMeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.token) throw new Error('Utilisateur non authentifié');
      return await taskService.updateTask(task.id, createTechnicianUpdate(user.id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', task.id] });
      toast.success('Tâche assignée avec succès');
      setShowAssignmentDialog(false);
    },
    onError: error => {
      toast.error('Erreur lors de l\'assignation');
      console.error('Assignment error:', error);
    }
  });

  const updateNotesMutation = useMutation({
    mutationFn: async (newNotes: string) => {
      if (!user?.token) throw new Error('Utilisateur non authentifié');
      return await taskService.updateTask(task.id, createNotesUpdate(newNotes));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', task.id] });
      toast.success('Notes mises Ã  jour avec succès');
      setShowNotesDialog(false);
    },
    onError: error => {
      toast.error('Erreur lors de la mise Ã  jour des notes');
      console.error('Notes update error:', error);
    }
  });

  const startInterventionMutation = useMutation({
    mutationFn: async () => {
      if (!user?.token) throw new Error('Utilisateur non authentifié');

      const interventionData = {
        task_id: task.id,
        intervention_number: null,
        intervention_type: 'ppf',
        priority: task.priority || 'medium',
        ppf_zones: task.ppf_zones || [],
        custom_ppf_zones: task.custom_ppf_zones || null,
        film_type: 'standard',
        film_brand: null,
        film_model: null,
        weather_condition: 'sunny',
        lighting_condition: 'natural',
        work_location: 'outdoor',
        temperature: null,
        humidity: null,
        technician_id: task.technician_id || user.id,
        assistant_ids: null,
        scheduled_start: new Date().toISOString(),
        estimated_duration: task.estimated_duration || 120,
        gps_coordinates: null,
        address: task.customer_address || null,
        notes: task.notes || null,
        customer_requirements: null,
        special_instructions: null
      };

      const response = await InterventionWorkflowService.startIntervention(task.id, interventionData, user.token);
      if (!response.success) {
        throw new Error(response.error?.message || 'Impossible de démarrer l\'intervention');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', task.id] });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: interventionKeys.ppfIntervention(task.id) });
        queryClient.invalidateQueries({ queryKey: ['interventions', task.id, 'photos'] });
      }, 100);
      toast.success('Intervention démarrée avec succès');
      router.push(`/tasks/${task.id}/workflow/ppf`);
    },
    onError: error => {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue lors du démarrage de l\'intervention';
      toast.error(`Erreur au démarrage de l'intervention : ${errorMessage}`);
      console.error('Start intervention error:', error);
    }
  });

  const handleActionClick = (action: () => void) => {
    setShowMoreActions(false);
    action();
  };

  const handleStartWorkflow = () => {
    startInterventionMutation.mutate();
  };

  const handleViewWorkflow = () => {
    router.push(`/tasks/${task.id}/workflow/ppf`);
  };

  const handleViewChecklistPage = () => {
    router.push(`/tasks/${task.id}/checklist`);
  };

  const handleViewPhotosPage = () => {
    router.push(`/tasks/${task.id}/photos`);
  };

  const handleViewCompleted = () => {
    router.push(`/tasks/${task.id}/completed`);
  };

  const executionActions: ActionItem[] = [
    {
      id: 'workflow',
      label: 'Workflow',
      icon: Wrench,
      onClick: isCompleted ? handleViewCompleted : handleViewWorkflow,
      disabled: !isInProgress && !isCompleted
    },
    {
      id: 'photos',
      label: 'Photos',
      icon: ImageIcon,
      count: (hasBeforePhotos ? task.photos_before?.length || 0 : 0) + (hasAfterPhotos ? task.photos_after?.length || 0 : 0),
      onClick: handleViewPhotosPage,
      disabled: !hasBeforePhotos && !hasAfterPhotos
    },
    {
      id: 'checklist',
      label: 'Checklist',
      icon: ListChecks,
      count: hasChecklist ? task.checklist_items?.length : 0,
      onClick: handleViewChecklistPage,
      disabled: !hasChecklist
    }
  ];

  const communicationActions: ActionItem[] = [
    {
      id: 'call',
      label: 'Appeler le client',
      icon: Phone,
      onClick: async () => {
        try {
          const phoneNumber = task?.client?.phone;
          if (!phoneNumber) {
            toast.error('Aucun numéro de téléphone disponible pour ce client');
            return;
          }

          await ipcClient.ui.initiateCustomerCall(phoneNumber);
          toast.success(`Appel lancé vers ${phoneNumber}`);
        } catch (error) {
          console.error('Failed to initiate call:', error);
          toast.error('Erreur lors de l\'appel client');
        }
      }
    },
    {
      id: 'message',
      label: 'Envoyer un message',
      icon: MessageSquare,
      onClick: () => setShowSendMessageModal(true)
    }
  ];

  const administrationActions: ActionItem[] = [
    {
      id: 'status',
      label: 'Changer le statut',
      icon: Settings,
      onClick: () => setShowStatusDialog(true)
    },
    {
      id: 'assign',
      label: 'M\'assigner la tâche',
      icon: User,
      onClick: () => setShowAssignmentDialog(true),
      disabled: isAssignedToCurrentUser
    },
    {
      id: 'notes',
      label: 'Modifier les notes',
      icon: FileText,
      onClick: () => setShowNotesDialog(true)
    },
    {
      id: 'edit',
      label: 'Modifier la tâche',
      icon: Edit,
      onClick: () => setShowEditModal(true)
    },
    {
      id: 'delay',
      label: 'Reporter la tâche',
      icon: Clock,
      onClick: () => setShowDelayTaskModal(true)
    },
    {
      id: 'report',
      label: 'Signaler un problème',
      icon: AlertCircle,
      onClick: () => setShowReportIssueModal(true)
    }
  ];

  const primaryDisabledReason = !isAvailable && !isAssignedToCurrentUser
    ? 'Intervention indisponible : cette tâche est déjÃ  prise par un autre technicien.'
    : shouldShowDisabledReason
      ? `Cette tâche est au statut Â« ${task.status} Â» et ne peut pas être démarrée.`
      : null;

  const dockedQuickActions = [...executionActions.filter(action => action.id !== 'workflow').slice(0, 2), communicationActions[1]];

  return (
    <div className={cn(
      'rounded-xl overflow-hidden',
      compact ? 'bg-transparent border-0' : 'bg-background/40 border border-border/50',
      stickyOffsetClass
    )}>
      <div className={compact ? 'p-0' : 'p-5'}>
        {!mobileDocked && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Actions de l&apos;intervention</h3>
          </div>
        )}

        <div className={cn(mobileDocked ? 'space-y-2' : 'space-y-5')}>
          <div>
            {!mobileDocked && (
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-border-light">Action principale</p>
            )}
            <PrimaryActionButton
              isCompleted={isCompleted}
              isInProgress={isInProgress}
              canStartTask={canStartTask}
              isPending={startInterventionMutation.isPending}
              onViewCompleted={handleViewCompleted}
              onViewWorkflow={handleViewWorkflow}
              onStartWorkflow={handleStartWorkflow}
              compact={mobileDocked}
            />
            {primaryDisabledReason && !mobileDocked && <p className="mt-2 text-xs text-amber-600">{primaryDisabledReason}</p>}
          </div>

          {mobileDocked ? (
            <div className="grid grid-cols-4 gap-2">
              {dockedQuickActions.map(action => (
                <IconActionButton key={action.id} action={action} onActionClick={handleActionClick} compact />
              ))}
              <button
                type="button"
                onClick={() => setShowMoreActions(current => !current)}
                className="rounded-lg border border-border/60 bg-background/60 px-2 py-2 text-xs text-border-light hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4 mx-auto mb-1" />
                Plus
              </button>

              {showMoreActions && (
                <div className="col-span-4 grid grid-cols-2 gap-2 pt-1">
                  {[...communicationActions, ...administrationActions].map(action => (
                    <InlineActionButton key={action.id} action={action} onActionClick={handleActionClick} />
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
                  toggleMoreActions={() => setShowMoreActions(current => !current)}
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
                onChange={value => updatePriorityMutation.mutate(value)}
                isPending={updatePriorityMutation.isPending}
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
                      'paused'
                    ].find(s => s === value) as TaskStatus;
                    if (statusValue) updateStatusMutation.mutate(statusValue);
                  }}
                  disabled={updateStatusMutation.isPending}
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
              {updateStatusMutation.isPending && <p className="text-sm text-muted-foreground">Mise Ã  jour en cours...</p>}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assigner la tâche</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>Voulez-vous vous assigner cette tâche ?</p>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAssignmentDialog(false)} disabled={assignToMeMutation.isPending}>
                  Annuler
                </Button>
                <Button onClick={() => assignToMeMutation.mutate()} disabled={assignToMeMutation.isPending}>
                  {assignToMeMutation.isPending ? 'Assignation...' : "M'assigner"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Modifier les notes</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="notes-textarea">Notes</Label>
                <Textarea
                  id="notes-textarea"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ajoutez des notes pour cette tâche..."
                  rows={4}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowNotesDialog(false)} disabled={updateNotesMutation.isPending}>
                  Annuler
                </Button>
                <Button onClick={() => updateNotesMutation.mutate(notes)} disabled={updateNotesMutation.isPending}>
                  {updateNotesMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
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
};

export default memo(ActionsCard);

interface PrimaryActionButtonProps {
  isCompleted: boolean;
  isInProgress: boolean;
  canStartTask: boolean;
  isPending: boolean;
  onViewCompleted: () => void;
  onViewWorkflow: () => void;
  onStartWorkflow: () => void;
  compact?: boolean;
}

const PrimaryActionButton: React.FC<PrimaryActionButtonProps> = ({
  isCompleted,
  isInProgress,
  canStartTask,
  isPending,
  onViewCompleted,
  onViewWorkflow,
  onStartWorkflow,
  compact = false
}) => {
  if (isCompleted) {
    return (
      <Button onClick={onViewCompleted} className={cn('w-full bg-emerald-600 hover:bg-emerald-700', compact && 'h-10 text-sm')}>
        <CheckCircle className="h-5 w-5 mr-2" />
        Voir le rapport final
      </Button>
    );
  }

  if (isInProgress) {
    return (
      <Button
        onClick={onViewWorkflow}
        className={cn('w-full bg-[hsl(var(--rpma-teal))] hover:bg-[hsl(var(--rpma-teal))]/90', compact && 'h-10 text-sm')}
      >
        <ArrowRight className="h-5 w-5 mr-2" />
        Continuer l&apos;intervention
      </Button>
    );
  }

  return (
    <Button
      onClick={onStartWorkflow}
      disabled={!canStartTask || isPending}
      className={cn(
        'w-full transition-colors duration-200',
        compact && 'h-10 text-sm',
        canStartTask && !isPending
          ? 'bg-[hsl(var(--rpma-teal))] hover:bg-[hsl(var(--rpma-teal))]/90'
          : 'bg-gray-300/70 text-gray-600 cursor-not-allowed'
      )}
    >
      <Play className="h-5 w-5 mr-2" />
      {isPending ? 'Démarrage...' : "Démarrer l'intervention"}
    </Button>
  );
};

interface SecondaryActionsGridProps {
  actions: ActionItem[];
  onActionClick: (action: () => void) => void;
  columns?: 2 | 3;
}

const SecondaryActionsGrid: React.FC<SecondaryActionsGridProps> = ({ actions, onActionClick, columns = 2 }) => (
  <div className={cn('grid gap-3', columns === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2')}>
    {actions.map(action => (
      <IconActionButton key={action.id} action={action} onActionClick={onActionClick} />
    ))}
  </div>
);

const IconActionButton = ({
  action,
  onActionClick,
  compact = false
}: {
  action: ActionItem;
  onActionClick: (action: () => void) => void;
  compact?: boolean;
}) => (
  <button
    type="button"
    onClick={() => onActionClick(action.onClick)}
    disabled={action.disabled}
    className={cn(
      'flex flex-col items-center justify-center rounded-lg border transition-all duration-200',
      compact ? 'p-2 min-h-[56px]' : 'p-4',
      action.disabled
        ? 'border-border/50 bg-background/30 cursor-not-allowed opacity-50'
        : 'border-border/50 bg-background/60 hover:border-accent/60 hover:bg-border/30'
    )}
  >
    <div className="relative">
      <action.icon className={cn('h-5 w-5 mb-1', action.disabled ? 'text-border' : 'text-accent')} />
      {action.count && action.count > 0 && (
        <span className="absolute -top-2 -right-2 bg-accent text-background text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-4 flex items-center justify-center">
          {action.count}
        </span>
      )}
    </div>
    <span className={cn('text-xs font-medium text-center', action.disabled ? 'text-border' : 'text-border-light')}>{action.label}</span>
  </button>
);

const InlineActionButton = ({
  action,
  onActionClick
}: {
  action: ActionItem;
  onActionClick: (action: () => void) => void;
}) => (
  <button
    type="button"
    onClick={() => onActionClick(action.onClick)}
    disabled={action.disabled}
    className={cn(
      'w-full flex items-center p-2.5 rounded-lg border text-xs transition-colors duration-200',
      action.disabled
        ? 'border-border/50 bg-background/30 cursor-not-allowed opacity-50'
        : 'border-border/50 bg-background/70 hover:border-accent/60 hover:bg-border/30'
    )}
  >
    <action.icon className={cn('h-3.5 w-3.5 mr-2', action.disabled ? 'text-border' : 'text-accent')} />
    <span className={cn(action.disabled ? 'text-border' : 'text-foreground')}>{action.label}</span>
  </button>
);

interface MoreActionsSectionProps {
  showMoreActions: boolean;
  toggleMoreActions: () => void;
  actions: ActionItem[];
  onActionClick: (action: () => void) => void;
}

const MoreActionsSection: React.FC<MoreActionsSectionProps> = ({ showMoreActions, toggleMoreActions, actions, onActionClick }) => (
  <div className="pt-1">
    <button
      type="button"
      onClick={toggleMoreActions}
      className="w-full flex items-center justify-center p-3 rounded-lg border border-border/60 bg-background/40 hover:bg-border/30 transition-colors duration-200"
      aria-expanded={showMoreActions}
    >
      <Settings className="h-4 w-4 mr-2 text-border-light" />
      <span className="text-sm font-medium text-border-light">Plus d&apos;actions</span>
      <MoreVertical className="h-4 w-4 ml-2 text-border-light" />
    </button>

    {showMoreActions && (
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {actions.map(action => (
          <InlineActionButton key={action.id} action={action} onActionClick={onActionClick} />
        ))}
      </div>
    )}
  </div>
);

interface StatusWarningsProps {
  isAvailable: boolean;
  isAssignedToCurrentUser: boolean;
  canStartTask: boolean;
  isInProgress: boolean;
  taskStatus: TaskStatus;
}

const StatusWarnings: React.FC<StatusWarningsProps> = ({
  isAvailable,
  isAssignedToCurrentUser,
  canStartTask,
  isInProgress,
  taskStatus
}) => (
  <>
    {!isAvailable && !isAssignedToCurrentUser && (
      <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
        <div className="flex items-start">
          <AlertCircle className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-foreground/85">Cette tâche est déjÃ  assignée Ã  un autre technicien.</p>
        </div>
      </div>
    )}

    {!canStartTask && !isInProgress && taskStatus !== 'completed' && (
      <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg">
        <div className="flex items-start">
          <AlertCircle className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-foreground/85">
            Statut incompatible avec le démarrage d&apos;intervention : {taskStatus}
          </p>
        </div>
      </div>
    )}
  </>
);

interface PrioritySelectorProps {
  value: TaskPriority;
  onChange: (value: TaskPriority) => void;
  isPending: boolean;
}

const PrioritySelector: React.FC<PrioritySelectorProps> = ({ value, onChange, isPending }) => (
  <div className="pt-4 border-t border-border">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-foreground">Priorité</span>
      <Select
        value={value}
        onValueChange={(value: string) => {
          const priorityValue = ['low', 'medium', 'high', 'urgent'].find(p => p === value) as TaskPriority;
          if (priorityValue) onChange(priorityValue);
        }}
        disabled={isPending}
      >
        <SelectTrigger className="w-32 border-border bg-muted text-foreground hover:bg-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-muted border-border">
          <SelectItem value="low" className="text-foreground hover:bg-border focus:bg-border">Basse</SelectItem>
          <SelectItem value="medium" className="text-foreground hover:bg-border focus:bg-border">Moyenne</SelectItem>
          <SelectItem value="high" className="text-foreground hover:bg-border focus:bg-border">Haute</SelectItem>
          <SelectItem value="urgent" className="text-foreground hover:bg-border focus:bg-border">Urgente</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
);




