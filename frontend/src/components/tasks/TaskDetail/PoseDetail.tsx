import React, { useMemo, useCallback, memo, useRef, useState, useEffect } from 'react';
// Removed pose dependency - now works independently
import { TaskWithDetails, TaskDisplay, ChecklistItem } from '@/types/task.types';
import { useInterventionData } from '@/hooks/useInterventionData';
import { TaskStatus, TaskPriority, UpdateTaskRequest } from '@/lib/backend';
import { isoToBigint } from '@/lib/utils/timestamp-conversion';
import { convertTimestamps } from '@/lib/types';
import { Suspense } from 'react';

import { cn } from '@/lib/utils';
import { convertNullsToUndefined } from '@/lib/utils/data-normalization';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';
import { useInView } from '@/hooks/useInView';
// import { useVirtualizer } from '@tanstack/react-virtual'; // Uncomment when needed for virtual scrolling
import { useDebounce } from '@/hooks/useDebounce';
import { taskService } from '@/lib/services/entities/task.service';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/compatibility';
import { ipcClient } from '@/lib/ipc';
import { ChecklistProgress } from '@/tasks/TaskInfo/ChecklistProgress';

// Subcomponents
import { WorkflowStatusCard } from './WorkflowStatusCard';
import { PhotoSummaryCard } from './PhotoSummaryCard';
import TaskHeader from '../TaskOverview/TaskHeader';
import { VehicleInfoCard } from '../TaskOverview/VehicleInfoCard';
import ScheduleCard from '../TaskInfo/ScheduleCard';
import ActionsCard from '../TaskActions/ActionsCard';
// import TaskStatusBadge from './TaskStatusBadge'; // Uncomment when needed
import ErrorFallback from '@/components/ui/ErrorFallback';

interface PoseDetailProps {
  task?: TaskWithDetails | null;
  currentStatus?: string;
  onStartTask?: () => void;
  onCompleteTask?: () => void;
  onViewPhotos?: () => void;
  onViewChecklist?: () => void;
  currentUserId?: string;
}

const PoseDetail: React.FC<PoseDetailProps> = ({
  task: propTask,
  onStartTask,
  onCompleteTask,
  onViewPhotos: _onViewPhotos,
  onViewChecklist: _onViewChecklist,
  currentUserId: propCurrentUserId = '',
  currentStatus: propStatus,
}) => {
  const { user } = useAuth();
  const task = propTask ? convertTimestamps(propTask) : null;
  const currentUserId = propCurrentUserId || user?.id || '';
  const isLoading = false; // No longer loading from context
  const error = null; // No longer getting error from context
   const currentStatus = (propStatus || task?.status || 'pending') as TaskStatus;

  // Performance optimizations
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { threshold: 0.1 });
  const [isExpanded, setIsExpanded] = useState(false);
  const debouncedIsExpanded = useDebounce(isExpanded, 300);

  // Memoize task data with deep comparison to prevent unnecessary re-renders
  const safeTask = useMemo((): TaskWithDetails | null => {
    if (!task) {
      return null;
    }

    return {
      id: task.id || '',
      task_number: task.task_number || '',
      title: task.title || 'Sans titre',
      vehicle_plate: task.vehicle_plate || 'Non spécifiée',
      vehicle_model: task.vehicle_model || 'Non spécifié',
      vehicle_year: task.vehicle_year,
      vehicle_make: task.vehicle_make,
      vin: task.vin,
      date_rdv: task.date_rdv,
      heure_rdv: task.heure_rdv,
      lot_film: task.lot_film,
       notes: task.notes,

      checklist_items: task.checklist || [],
      status: currentStatus,
       priority: task.priority || 'medium',
      ppf_zones: task.ppf_zones || [],
      is_available: task.is_available ?? true,
      technician_id: task.technician_id,
      assigned_at: task.assigned_at,
      scheduled_date: task.scheduled_date,
      start_time: task.start_time,
      end_time: task.end_time,
      workflow_status: task.workflow_status,
      // Additional properties for compatibility
      photos: task.photos || { before: [], after: [], during: [] },
      checklist_completed: task.checklist_completed || false,
      progress: task.progress || 0,
      is_overdue: task.is_overdue || false,
         created_at: ((task.created_at as unknown as string) || new Date().toISOString()) as unknown as any,
         updated_at: new Date().toISOString() as unknown as any,
        synced: task.synced ?? false,
      description: task.description,
      current_workflow_step_id: task.current_workflow_step_id,
      created_by: task.created_by,
      external_id: null,
      template_id: task.template_id,
      started_at: task.started_at,
        completed_steps: typeof task.completed_steps === 'string'
          ? task.completed_steps
          : JSON.stringify(task.completed_steps || []),
      custom_ppf_zones: task.custom_ppf_zones || null,
      customer_name: task.customer_name,
      customer_email: task.customer_email,
      customer_phone: task.customer_phone,
      customer_address: task.customer_address,
      assigned_by: task.assigned_by,
      workflow_id: task.workflow_id,
      completed_at: task.completed_at,
      client_id: task.client_id,
      tags: task.tags,
      estimated_duration: task.estimated_duration,
      actual_duration: task.actual_duration,

      creator_id: task.creator_id,
      updated_by: task.updated_by,
      last_synced_at: task.last_synced_at,
      deleted_at: task.deleted_at || null,
      deleted_by: task.deleted_by || null,
    };
  }, [task, currentStatus]);

  const getChecklistStorageKey = useCallback((taskId: string) => `task-checklist:${taskId}`, []);

  const loadChecklistOverrides = useCallback((taskId: string) => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(getChecklistStorageKey(taskId));
      if (!raw) return null;
      return JSON.parse(raw) as Record<string, boolean>;
    } catch (error) {
      console.warn('Failed to load checklist overrides', error);
      return null;
    }
  }, [getChecklistStorageKey]);

  const saveChecklistOverrides = useCallback((taskId: string, items: ChecklistItem[]) => {
    if (typeof window === 'undefined') return;
    try {
      const map = items.reduce<Record<string, boolean>>((acc, item) => {
        acc[item.id] = item.is_completed;
        return acc;
      }, {});
      window.localStorage.setItem(getChecklistStorageKey(taskId), JSON.stringify(map));
    } catch (error) {
      console.warn('Failed to save checklist overrides', error);
    }
  }, [getChecklistStorageKey]);

  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(() => safeTask?.checklist_items || []);

  useEffect(() => {
    if (!safeTask?.id) {
      setChecklistItems([]);
      return;
    }

    const baseItems = safeTask.checklist_items || [];
    const overrides = loadChecklistOverrides(safeTask.id);

    if (!overrides) {
      setChecklistItems(baseItems);
      return;
    }

    const merged = baseItems.map(item => (
      overrides[item.id] !== undefined
        ? { ...item, is_completed: overrides[item.id] }
        : item
    ));
    setChecklistItems(merged);
  }, [safeTask?.id, safeTask?.checklist_items, loadChecklistOverrides]);

  // Get intervention data for progress tracking
  const { data: interventionData } = useInterventionData(safeTask?.id ?? '');

  // Memoize status information with stable reference
  const statusInfo = useMemo(() => {
    const statusMap = {
      pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
      en_attente: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
      in_progress: { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
      en_cours: { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
      completed: { label: 'Terminé', color: 'bg-green-100 text-green-800' },
      termine: { label: 'Terminé', color: 'bg-green-100 text-green-800' },
      default: { label: 'Inconnu', color: 'bg-gray-100 text-gray-800' },
    };
    return statusMap[safeTask?.status as keyof typeof statusMap] || statusMap.default;
  }, [safeTask?.status]);

  // Memoize derived state with stable references
  const derivedState = useMemo(() => {
    if (!safeTask) {
      return {
        isAssignedToCurrentUser: false,
        isAvailable: false,
        canStartTask: false,
        progress: 0,
        hasChecklist: false,
        hasPhotos: false,
      };
    }

    const isAssignedToCurrentUser = safeTask.technician_id === currentUserId;
    const isAvailable = Boolean(safeTask.is_available && !safeTask.technician_id);
    const canStartTask = safeTask.is_available || isAssignedToCurrentUser;

    // Calculate task progress efficiently
    const progress = checklistItems.length
      ? Math.round((checklistItems.filter((item: ChecklistItem) => item.is_completed).length / checklistItems.length) * 100)
      : 0;

    return {
      isAssignedToCurrentUser,
      isAvailable,
      canStartTask,
      progress,
      hasChecklist: checklistItems.length > 0,
      hasPhotos: Boolean(safeTask.photos?.before?.length || safeTask.photos?.after?.length || safeTask.photos?.during?.length),
    };
  }, [safeTask, currentUserId, checklistItems]);

  // Event handlers with stable references
  const _handleStartTask = useCallback(async () => {
    if (!safeTask?.id) {
      console.warn('Cannot start task: missing task ID');
      return;
    }

    try {
      if (onStartTask) {
        onStartTask();
            } else if (currentUserId) {
        const result = await taskService.assignTask(safeTask.id, currentUserId);

        if (!result.success) {
          console.error('[PoseDetail] Assignment error:', result.error);
          throw new Error(result.error || 'Failed to assign task');
        }

        console.log('[PoseDetail] Task assigned successfully:', result.data);
        toast.success('Intervention assignée avec succès');
      }    } catch (error) {
      console.error('Failed to start task:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors du démarrage de l\'intervention');
    }
  }, [onStartTask, currentUserId, safeTask?.id]);

  const _handleCompleteTask = useCallback(() => {
    if (onCompleteTask) {
      onCompleteTask();
    } else {
      // Task completion handled by parent component
      console.log('Task completion requested');
    }
  }, [onCompleteTask]);

  const _handleToggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const handleChecklistItemUpdate = useCallback(async (itemId: string, completed: boolean) => {
    if (!safeTask?.id || !user?.token) {
      console.error('Cannot update checklist item: missing task ID or user token');
      return;
    }

    try {
      const updatedItems = checklistItems.map(item =>
        item.id === itemId ? { ...item, is_completed: completed } : item
      );
      setChecklistItems(updatedItems);

      // For now, update the task's checklist_completed status
      // In a full implementation, this would update individual checklist items
      // and potentially workflow step data if this is part of a workflow

      // Check if this task has workflow/intervention data
      if (interventionData && interventionData.steps) {
        // If we have workflow data, try to update the workflow step
        // Find the current step that might contain checklist data
        const currentStep = interventionData.steps.find((step: any) =>
          step.collected_data &&
          (step.collected_data.checklist || step.collected_data.qc_checklist)
        );

        if (currentStep) {
          // Update the checklist in the workflow step
          const updatedCollectedData = { ...currentStep.collected_data };

          if (updatedCollectedData.checklist && updatedCollectedData.checklist[itemId] !== undefined) {
            updatedCollectedData.checklist[itemId] = completed;
          } else if (updatedCollectedData.qc_checklist && updatedCollectedData.qc_checklist[itemId] !== undefined) {
            updatedCollectedData.qc_checklist[itemId] = completed;
          }

          // Save the step progress
          await ipcClient.interventions.saveStepProgress({
            step_id: currentStep.id,
            collected_data: updatedCollectedData,
            notes: currentStep.notes,
            photos: currentStep.photo_urls
          }, user.token);

          saveChecklistOverrides(safeTask.id, updatedItems);
          toast.success('Élément de checklist mis à jour');
          return;
        }
      }

      // Fallback: Update task-level checklist completion status
      // This is a simplified implementation - in production you'd want individual item tracking
      const totalItems = updatedItems.length;
      const completedItems = updatedItems.filter(item => item.is_completed).length;
      const newChecklistCompleted = totalItems > 0 && completedItems === totalItems;

      // Update the task's checklist completion status
      const updateData: UpdateTaskRequest = {
        id: safeTask.id,
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
        checklist_completed: newChecklistCompleted,
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
      };
      await ipcClient.tasks.update(safeTask.id, updateData, user.token);

      saveChecklistOverrides(safeTask.id, updatedItems);
      toast.success('Statut de checklist mis à jour');

    } catch (error) {
      console.error('Failed to update checklist item:', error);
      toast.error('Erreur lors de la mise à jour de l\'élément de checklist');
    }
  }, [safeTask?.id, user?.token, interventionData, checklistItems, saveChecklistOverrides]);

  // Lazy load components only when in view
  const _shouldLoadHeavyComponents = isInView && !isLoading && !!safeTask;

  // Loading state with improved skeleton
  if (isLoading) {
    return (
      <div className="bg-muted/50 rounded-xl border border-border/20 p-6 animate-pulse shadow-lg backdrop-blur-sm">
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-32" />
            </div>
          </div>

          {/* Content skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state with retry functionality
  if (error) {
    return (
      <div className="bg-muted/50 rounded-xl border border-red-500/20 p-6 shadow-lg backdrop-blur-sm">
        <div className="text-center py-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <span className="text-red-400 text-xl">!</span>
          </div>
          <h3 className="mt-3 text-lg font-medium text-foreground">Erreur de chargement</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Impossible de charger les détails de la tâche. Veuillez réessayer.
          </p>
          <div className="mt-6 space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center rounded-md bg-[hsl(var(--rpma-teal))] px-3 py-2 text-sm font-semibold text-background shadow-sm hover:bg-[hsl(var(--rpma-teal))]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--rpma-teal))]"
            >
              Réessayer
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center rounded-md bg-gray-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
            >
              Recharger la page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No task selected
  if (!safeTask) {
    return (
      <div className="bg-muted/50 rounded-xl border border-border/20 p-6 text-center py-12 shadow-lg backdrop-blur-sm">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-12 h-12 mx-auto"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.135.845-2.098 1.976-2.193a48.422 48.422 0 011.123-.08h.256v2.25H15V3.75h.003z"
            />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune tâche sélectionnée</h3>
        <p className="mt-1 text-sm text-gray-500">Sélectionnez une tâche pour afficher les détails</p>
      </div>
    );
  }

  try {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
      <div
        ref={containerRef}
        className={cn(
          "bg-muted/50 rounded-xl border border-border/20 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/5 hover:border-[hsl(var(--rpma-teal))]/30 max-w-6xl mx-auto w-full shadow-lg backdrop-blur-sm",
          {
            'ring-2 ring-accent ring-offset-2 ring-offset-background': derivedState?.isAssignedToCurrentUser,
            'ring-1 ring-border/20': !derivedState?.isAssignedToCurrentUser,
            'scale-[0.98]': debouncedIsExpanded,
          })}
        >
            <TaskHeader
              task={safeTask}
             statusInfo={statusInfo}
             isAssignedToCurrentUser={derivedState?.isAssignedToCurrentUser || false}
           />

          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Vehicle Info and Schedule */}
              <div className="space-y-6 col-span-2">
                {task && <VehicleInfoCard task={task} />}
                   <ScheduleCard task={{
                     ...convertNullsToUndefined(convertTimestamps(safeTask) as unknown as TaskWithDetails),
                     completed_steps: safeTask.completed_steps
                       ? JSON.parse(safeTask.completed_steps)
                       : [],
                     custom_ppf_zones: safeTask.custom_ppf_zones || undefined,
                     description: safeTask.description || undefined,
                   } as unknown as TaskDisplay} />

                 {/* Checklist Progress */}
                 {derivedState?.hasChecklist && _shouldLoadHeavyComponents && (
                   <Suspense fallback={<Skeleton className="h-32 w-full" />}>
                     <ChecklistProgress
                       taskId={safeTask.id}
                       checklistItems={checklistItems}
                       onItemUpdate={handleChecklistItemUpdate}
                     />
                   </Suspense>
                 )}
              </div>

              {/* Right Column - Actions */}
              <div className="space-y-6">
                <ActionsCard
                  task={safeTask}
                  isAssignedToCurrentUser={derivedState?.isAssignedToCurrentUser || false}
                  isAvailable={derivedState?.isAvailable || false}
                  canStartTask={derivedState?.canStartTask || false}
                />

                {/* Workflow Status */}
                {safeTask.workflow_id && (
                  <WorkflowStatusCard
                    taskId={safeTask.id}
                    workflowId={safeTask.workflow_id}
                    currentStepId={safeTask.current_workflow_step_id || undefined}
                    status={safeTask.workflow_status || undefined}
                    progress={interventionData?.progress_percentage}
                  />
                )}

                 {/* Photo Summary */}
                {derivedState?.hasPhotos && (
                  <PhotoSummaryCard
                    taskId={safeTask.id}
                    photos={safeTask.photos}
                    onViewPhotos={_onViewPhotos}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('Error rendering PoseDetail:', error);
    return (
      <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <h3 className="text-sm font-medium text-red-800">
              Erreur lors du chargement de la tâche
            </h3>
          </div>
          <div className="mt-2 text-sm text-red-700">
            Une erreur inattendue s&apos;est produite. Veuillez rafraîchir la page.
          </div>
          <div className="mt-4">
            <Button
              onClick={() => window.location.reload()}
              size="sm"
              variant="outline"
            >
              Rafraîchir
            </Button>
          </div>
        </div>
      </ErrorBoundary>
    );
  }
};

export default memo(PoseDetail);




