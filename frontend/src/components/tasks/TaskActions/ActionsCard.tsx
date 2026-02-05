import React, { memo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play, CheckCircle, Image as ImageIcon, ListChecks,
  MoreVertical, Edit, FileText, Phone, MessageSquare, Clock, AlertCircle, ArrowRight,
  User, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { TaskStatus, TaskPriority, UpdateTaskRequest } from '@/lib/backend';
import { TaskWithDetails } from '@/types/task.types';
import toast from 'react-hot-toast';
import { interventionKeys } from '@/lib/query-keys';
import { useAuth } from '@/contexts/AuthContext';
import { taskService } from '@/lib/services/entities/task.service';
import { ipcClient } from '@/lib/ipc';
import { InterventionWorkflowService } from '@/lib/services/ppf/intervention-workflow.service';
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
}

const ActionsCard: React.FC<ActionsCardProps> = ({
  task,
  isAssignedToCurrentUser,
  isAvailable,
  canStartTask,
}) => {
  // Helper functions to create proper UpdateTaskRequest objects
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

  // Update task status
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: TaskStatus) => {
      if (!user?.token) throw new Error('User not authenticated');
      return await taskService.updateTask(task.id, createStatusUpdate(newStatus));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', task.id] });
      toast.success('Statut mis Ã  jour avec succÃ¨s');
      setShowStatusDialog(false);
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise Ã  jour du statut');
      console.error('Status update error:', error);
    }
  });

  // Update task priority
  const updatePriorityMutation = useMutation({
    mutationFn: async (newPriority: TaskPriority) => {
      if (!user?.token) throw new Error('User not authenticated');
      return await taskService.updateTask(task.id, createPriorityUpdate(newPriority));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', task.id] });
      toast.success('PrioritÃ© mise Ã  jour avec succÃ¨s');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise Ã  jour de la prioritÃ©');
      console.error('Priority update error:', error);
    }
  });

  // Assign task to current user
  const assignToMeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.token) throw new Error('User not authenticated');
      return await taskService.updateTask(task.id, createTechnicianUpdate(user.id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', task.id] });
      toast.success('TÃ¢che assignÃ©e avec succÃ¨s');
      setShowAssignmentDialog(false);
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'assignation');
      console.error('Assignment error:', error);
    }
  });

  // Update task notes
  const updateNotesMutation = useMutation({
    mutationFn: async (newNotes: string) => {
      if (!user?.token) throw new Error('User not authenticated');
      return await taskService.updateTask(task.id, createNotesUpdate(newNotes));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', task.id] });
      toast.success('Notes mises Ã  jour avec succÃ¨s');
      setShowNotesDialog(false);
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise Ã  jour des notes');
      console.error('Notes update error:', error);
    }
  });

  const toggleMoreActions = () => setShowMoreActions(!showMoreActions);

  const handleActionClick = (action: () => void) => {
    setShowMoreActions(false);
    action();
  };

  // Start intervention mutation
  const startInterventionMutation = useMutation({
    mutationFn: async () => {
      if (!user?.token) throw new Error('User not authenticated');

      // Prepare intervention data with defaults
      const interventionData = {
        task_id: task.id,
        intervention_number: null,
        intervention_type: 'ppf',
        priority: task.priority || 'medium',
        ppf_zones: task.ppf_zones || [],
        custom_ppf_zones: task.custom_ppf_zones || null,
        film_type: 'standard', // Default
        film_brand: null,
        film_model: null,
        weather_condition: 'sunny', // Default
        lighting_condition: 'natural', // Default
        work_location: 'outdoor', // Default
        temperature: null,
        humidity: null,
        technician_id: task.technician_id || user.id,
        assistant_ids: null,
        scheduled_start: new Date().toISOString(),
        estimated_duration: task.estimated_duration || 120, // Default 2 hours
        gps_coordinates: null,
        address: task.customer_address || null,
        notes: task.notes || null,
        customer_requirements: null,
        special_instructions: null,
      };

      const response = await InterventionWorkflowService.startIntervention(task.id, interventionData, user.token);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to start intervention');
      }
      return response.data;
    },
    onSuccess: () => {
      // Invalidate queries in sequence to prevent race conditions
      queryClient.invalidateQueries({ queryKey: ['tasks', task.id] });
      // Delay other invalidations slightly to prevent race conditions
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: interventionKeys.ppfIntervention(task.id) });
        queryClient.invalidateQueries({ queryKey: ['interventions', task.id, 'photos'] });
      }, 100);
      toast.success('Intervention dÃ©marrÃ©e avec succÃ¨s');
      router.push(`/tasks/${task.id}/workflow/ppf`);
    },
     onError: (error) => {
       const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue lors du dÃ©marrage de l\'intervention';
       toast.error(`Erreur lors du dÃ©marrage de l'intervention: ${errorMessage}`);
       console.error('Start intervention error:', error);
     }
  });

   const handleStartWorkflow = () => {
     console.log('Starting intervention for task:', task.id, 'status:', task.status);
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


  // Secondary actions (photos, checklist, etc.)
  const secondaryActions = [
    {
      id: 'photos',
      label: 'Voir les photos',
      icon: ImageIcon,
      count: (hasBeforePhotos ? task.photos_before?.length || 0 : 0) +
             (hasAfterPhotos ? task.photos_after?.length || 0 : 0),
      onClick: handleViewPhotosPage,
      disabled: !hasBeforePhotos && !hasAfterPhotos,
    },
    {
      id: 'checklist',
      label: 'Voir la check-list',
      icon: ListChecks,
      count: hasChecklist ? task.checklist_items?.length : 0,
      onClick: handleViewChecklistPage,
      disabled: !hasChecklist,
    },
  ];

  // More actions dropdown items
  const moreActions = [
    {
      id: 'status',
      label: 'Changer le statut',
      icon: Settings,
      onClick: () => setShowStatusDialog(true)
    },
    {
      id: 'assign',
      label: 'M\'assigner la tÃ¢che',
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
      label: 'Modifier la tÃ¢che',
      icon: Edit,
      onClick: () => setShowEditModal(true)
    },
    {
      id: 'call',
      label: 'Appeler le client',
      icon: Phone,
      onClick: async () => {
        try {
          // Get client phone number from task data
          const phoneNumber = task?.client?.phone;
          if (!phoneNumber) {
            toast.error('Aucun numÃ©ro de tÃ©lÃ©phone disponible pour ce client');
            return;
          }

          // Call backend to initiate phone call
          await ipcClient.ui.initiateCustomerCall(phoneNumber);

          toast.success(`Appel initiÃ© vers ${phoneNumber}`);
        } catch (error) {
          console.error('Failed to initiate call:', error);
          toast.error('Erreur lors de l\'initiation de l\'appel');
        }
      }
    },
    {
      id: 'message',
      label: 'Envoyer un message',
      icon: MessageSquare,
      onClick: () => setShowSendMessageModal(true)
    },
    {
      id: 'delay',
      label: 'Reporter la tÃ¢che',
      icon: Clock,
      onClick: () => setShowDelayTaskModal(true)
    },
    {
      id: 'report',
      label: 'Signaler un problÃ¨me',
      icon: AlertCircle,
      onClick: () => setShowReportIssueModal(true)
    },
  ];

  return (
    <div className="bg-muted border border-border rounded-lg overflow-hidden">
      <div className="p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-foreground">Actions</h3>
        </div>

        <div className="space-y-4">
          {/* Primary Action Button */}
          <div>
            <PrimaryActionButton
              isCompleted={isCompleted}
              isInProgress={isInProgress}
              canStartTask={canStartTask}
              isPending={startInterventionMutation.isPending}
              onViewCompleted={handleViewCompleted}
              onViewWorkflow={handleViewWorkflow}
              onStartWorkflow={handleStartWorkflow}
            />
          </div>

          {/* Quick Actions Grid */}
          <SecondaryActionsGrid
            actions={secondaryActions}
            onActionClick={handleActionClick}
          />

          {/* Additional Actions */}
          <MoreActionsSection
            showMoreActions={showMoreActions}
            toggleMoreActions={toggleMoreActions}
            actions={moreActions}
            onActionClick={handleActionClick}
          />

           {/* Status Warnings */}
           <StatusWarnings
             isAvailable={isAvailable}
             isAssignedToCurrentUser={isAssignedToCurrentUser}
             canStartTask={canStartTask}
             isInProgress={isInProgress}
             taskStatus={task.status}
           />

          {/* Priority Selector */}
          <PrioritySelector
            value={task.priority || 'medium'}
            onChange={(value) => updatePriorityMutation.mutate(value)}
            isPending={updatePriorityMutation.isPending}
          />
        </div>

        {/* Status Update Dialog */}
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Changer le statut de la tÃ¢che</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="status-select">Nouveau statut</Label>
                <Select
                  value={task.status}
                  onValueChange={(value: string) => {
                    // Convert string value back to TaskStatus enum
                    const statusValue = ['draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold', 'pending', 'invalid', 'archived', 'failed', 'overdue', 'assigned', 'paused'].find(s => s === value) as TaskStatus;
                    if (statusValue) updateStatusMutation.mutate(statusValue);
                  }}
                  disabled={updateStatusMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="scheduled">PlanifiÃ©e</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="completed">TerminÃ©e</SelectItem>
                    <SelectItem value="cancelled">AnnulÃ©e</SelectItem>
                    <SelectItem value="on_hold">En pause</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {updateStatusMutation.isPending && (
                <p className="text-sm text-muted-foreground">Mise Ã  jour en cours...</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Assignment Dialog */}
        <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assigner la tÃ¢che</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>ÃŠtes-vous sÃ»r de vouloir vous assigner cette tÃ¢che ?</p>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAssignmentDialog(false)}
                  disabled={assignToMeMutation.isPending}
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => assignToMeMutation.mutate()}
                  disabled={assignToMeMutation.isPending}
                >
                  {assignToMeMutation.isPending ? 'Assignation...' : 'M\'assigner'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Notes Dialog */}
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
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ajoutez des notes pour cette tÃ¢che..."
                  rows={4}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNotesDialog(false)}
                  disabled={updateNotesMutation.isPending}
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => updateNotesMutation.mutate(notes)}
                  disabled={updateNotesMutation.isPending}
                >
                  {updateNotesMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Task Modal */}
        <EditTaskModal
          task={task}
          open={showEditModal}
          onOpenChange={setShowEditModal}
        />

        {/* Send Message Modal */}
        <SendMessageModal
          task={task}
          open={showSendMessageModal}
          onOpenChange={setShowSendMessageModal}
        />

        {/* Delay Task Modal */}
        <DelayTaskModal
          task={task}
          open={showDelayTaskModal}
          onOpenChange={setShowDelayTaskModal}
        />

        {/* Report Issue Modal */}
        <ReportIssueModal
          task={task}
          open={showReportIssueModal}
          onOpenChange={setShowReportIssueModal}
        />
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
}

const PrimaryActionButton: React.FC<PrimaryActionButtonProps> = ({
  isCompleted,
  isInProgress,
  canStartTask,
  isPending,
  onViewCompleted,
  onViewWorkflow,
  onStartWorkflow,
}) => {
  if (isCompleted) {
    return (
      <Button
        onClick={onViewCompleted}
        className="w-full bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
      >
        <CheckCircle className="h-5 w-5 mr-2" />
        Voir le rapport final
      </Button>
    );
  }

  if (isInProgress) {
    return (
      <Button
        onClick={onViewWorkflow}
        className="w-full bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
        "w-full transition-colors duration-200",
        canStartTask && !isPending
          ? "bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          : "bg-gray-300 cursor-not-allowed"
      )}
    >
      <Play className="h-5 w-5 mr-2" />
      {isPending ? 'DÃ©marrage...' : 'DÃ©marrer l\'intervention'}
    </Button>
  );
};

type ActionItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  onClick: () => void;
  disabled?: boolean;
};

interface SecondaryActionsGridProps {
  actions: ActionItem[];
  onActionClick: (action: () => void) => void;
}

const SecondaryActionsGrid: React.FC<SecondaryActionsGridProps> = ({
  actions,
  onActionClick,
}) => (
  <div className="grid grid-cols-2 gap-3">
    {actions.map((action) => (
      <button
        key={action.id}
        onClick={() => onActionClick(action.onClick)}
        disabled={action.disabled}
        className={cn(
          "flex flex-col items-center justify-center p-4 rounded-lg border transition-all duration-200 hover:scale-105",
          action.disabled
            ? "border-border/50 bg-background/30 cursor-not-allowed opacity-50"
            : "border-border bg-background/50 hover:border-[hsl(var(--rpma-teal))] hover:bg-[hsl(var(--rpma-surface))]"
        )}
      >
        <div className="relative">
          <action.icon className={cn(
            "h-6 w-6 mb-2",
            action.disabled ? "text-muted-foreground" : "text-[hsl(var(--rpma-teal))]"
          )} />
          {action.count && action.count > 0 && (
            <span className="absolute -top-2 -right-2 bg-[hsl(var(--rpma-teal))] text-background text-xs font-bold px-2 py-1 rounded-full min-w-[20px] h-5 flex items-center justify-center">
              {action.count}
            </span>
          )}
        </div>
        <span className={cn(
          "text-xs font-medium text-center",
          action.disabled ? "text-muted-foreground" : "text-muted-foreground-light"
        )}>
          {action.label}
        </span>
      </button>
    ))}
  </div>
);

interface MoreActionsSectionProps {
  showMoreActions: boolean;
  toggleMoreActions: () => void;
  actions: ActionItem[];
  onActionClick: (action: () => void) => void;
}

const MoreActionsSection: React.FC<MoreActionsSectionProps> = ({
  showMoreActions,
  toggleMoreActions,
  actions,
  onActionClick,
}) => (
  <div className="pt-4 border-t border-border">
    <button
      onClick={toggleMoreActions}
      className="w-full flex items-center justify-center p-3 rounded-lg border border-border bg-background/30 hover:bg-[hsl(var(--rpma-surface))] transition-colors duration-200"
    >
      <Settings className="h-4 w-4 mr-2 text-muted-foreground-light" />
      <span className="text-sm font-medium text-muted-foreground-light">Plus d&apos;actions</span>
      <MoreVertical className="h-4 w-4 ml-2 text-muted-foreground-light" />
    </button>

    {showMoreActions && (
      <div className="mt-3 space-y-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => onActionClick(action.onClick)}
            disabled={action.disabled}
            className={cn(
              "w-full flex items-center p-3 rounded-lg border transition-colors duration-200",
              action.disabled
                ? "border-border/50 bg-background/30 cursor-not-allowed opacity-50"
                : "border-border bg-background/50 hover:border-[hsl(var(--rpma-teal))] hover:bg-[hsl(var(--rpma-surface))]"
            )}
          >
            <action.icon className={cn(
              "h-4 w-4 mr-3",
              action.disabled ? "text-muted-foreground" : "text-[hsl(var(--rpma-teal))]"
            )} />
            <span className={cn(
              "text-sm font-medium",
              action.disabled ? "text-muted-foreground" : "text-foreground"
            )}>
              {action.label}
            </span>
          </button>
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
  taskStatus,
}) => (
  <>
    {!isAvailable && !isAssignedToCurrentUser && (
      <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <div className="flex items-start">
          <AlertCircle className="h-4 w-4 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-yellow-200">
            Cette tÃ¢che est dÃ©jÃ  assignÃ©e Ã  un autre technicien.
          </p>
        </div>
      </div>
    )}

    {!canStartTask && !isInProgress && taskStatus !== 'completed' && (
      <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
        <div className="flex items-start">
          <AlertCircle className="h-4 w-4 text-orange-400 mr-2 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-orange-200">
            Statut de tÃ¢che incompatible avec le dÃ©marrage d&apos;intervention: {taskStatus}
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

const PrioritySelector: React.FC<PrioritySelectorProps> = ({
  value,
  onChange,
  isPending,
}) => (
  <div className="mt-4 pt-4 border-t border-border">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-foreground">PrioritÃ©</span>
      <Select
        value={value}
        onValueChange={(value: string) => {
          const priorityValue = ['low', 'medium', 'high', 'urgent'].find(p => p === value) as TaskPriority;
          if (priorityValue) onChange(priorityValue);
        }}
        disabled={isPending}
      >
        <SelectTrigger className="w-32 border-border bg-muted text-foreground hover:bg-[hsl(var(--rpma-surface))]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-muted border-border">
          <SelectItem value="low" className="text-foreground hover:bg-[hsl(var(--rpma-surface))] focus:bg-border">Basse</SelectItem>
          <SelectItem value="medium" className="text-foreground hover:bg-[hsl(var(--rpma-surface))] focus:bg-border">Moyenne</SelectItem>
          <SelectItem value="high" className="text-foreground hover:bg-[hsl(var(--rpma-surface))] focus:bg-border">Haute</SelectItem>
          <SelectItem value="urgent" className="text-foreground hover:bg-[hsl(var(--rpma-surface))] focus:bg-border">Urgente</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
);
