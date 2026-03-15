import React, { useMemo, useCallback, memo, useState, useEffect } from 'react';
import { Suspense } from 'react';
import { AlertCircle } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';
import { toast } from 'sonner';
import type { UpdateTaskRequest } from '@/lib/backend';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useIntersectionObserver } from '@/shared/hooks/useIntersectionObserver';
import { Skeleton, Button, ErrorFallback } from '@/shared/ui';
import { convertTimestamps, cn, convertNullsToUndefined } from '@/shared/utils';
import { TaskWithDetails, TaskDisplay, ChecklistItem, TaskStatus, JsonValue } from '@/shared/types';
import { useAuth } from '@/shared/hooks/useAuth';
import { useInterventionData } from '@/domains/interventions/api';
import { useInterventionActions } from '@/domains/interventions/hooks/useInterventionActions';
import { useTaskMutations } from '../../hooks/useTaskMutations';
import { ChecklistProgress } from '../TaskInfo/ChecklistProgress';

// Subcomponents
import TaskHeader from '../TaskOverview/TaskHeader';
import { VehicleInfoCard } from '../TaskOverview/VehicleInfoCard';
import ScheduleCard from '../TaskInfo/ScheduleCard';
import ActionsCard from '../TaskActions/ActionsCard';
import { PhotoSummaryCard } from './PhotoSummaryCard';
import { WorkflowStatusCard } from './WorkflowStatusCard';

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
  const isLoading = false;
  const error = null;
  const currentStatus = (propStatus || task?.status || 'pending') as TaskStatus;

  // Performance optimizations
  const { ref: containerRef, isVisible: isInView } = useIntersectionObserver({ threshold: 0.1 });
  const [isExpanded, setIsExpanded] = useState(false);
  const debouncedIsExpanded = useDebounce(isExpanded, 300);

  const { updateTask } = useTaskMutations();
  const { saveStepProgressMutation } = useInterventionActions({ taskId: task?.id });

  // Memoize task data
  const safeTask = useMemo((): TaskWithDetails | null => {
    if (!task) return null;

    return {
      ...task,
      status: currentStatus,
      priority: task.priority || 'medium',
      photos: task.photos || { before: [], after: [], during: [] },
      created_at: ((task.created_at as unknown as string) || new Date().toISOString()),
      updated_at: new Date().toISOString(),
      completed_steps: typeof task.completed_steps === 'string'
        ? task.completed_steps
        : JSON.stringify(task.completed_steps || []),
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
        ? { ...item, is_completed: overrides[item.id] ?? false }
        : item
    ));
    setChecklistItems(merged);
  }, [safeTask?.id, safeTask?.checklist_items, loadChecklistOverrides]);

  const { data: interventionData } = useInterventionData(safeTask?.id ?? '');

  const allStepPhotoUrls = useMemo(() =>
    (interventionData?.steps ?? []).flatMap(
      (s: { photo_urls?: string[] | null }) => s.photo_urls ?? []
    ),
    [interventionData?.steps],
  );

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

  const derivedState = useMemo(() => {
    if (!safeTask) return null;

    const isAssignedToCurrentUser = safeTask.technician_id === currentUserId;
    const isAvailable = Boolean(safeTask.is_available && !safeTask.technician_id);
    const canStartTask = safeTask.is_available || isAssignedToCurrentUser;

    const progress = checklistItems.length
      ? Math.round((checklistItems.filter((item: ChecklistItem) => item.is_completed).length / checklistItems.length) * 100)
      : 0;

    return {
      isAssignedToCurrentUser,
      isAvailable,
      canStartTask,
      progress,
      hasChecklist: checklistItems.length > 0,
      hasPhotos: Boolean(
        safeTask.photos?.before?.length ||
        safeTask.photos?.after?.length ||
        safeTask.photos?.during?.length ||
        allStepPhotoUrls.length > 0
      ),
    };
  }, [safeTask, currentUserId, checklistItems, allStepPhotoUrls]);

  const _handleStartTask = useCallback(async () => {
    if (!safeTask?.id) return;

    try {
      if (onStartTask) {
        onStartTask();
      } else if (currentUserId) {
        await updateTask.mutateAsync({
          taskId: safeTask.id,
          data: { technician_id: currentUserId } as UpdateTaskRequest
        });
        toast.success('Intervention assignée avec succès');
      }
    } catch (error) {
      console.error('Failed to start task:', error);
      toast.error('Erreur lors du démarrage de l\'intervention');
    }
  }, [onStartTask, currentUserId, safeTask?.id, updateTask]);

  const handleChecklistItemUpdate = useCallback(async (itemId: string, completed: boolean) => {
    if (!safeTask?.id || !user?.token) return;

    try {
      const updatedItems = checklistItems.map(item =>
        item.id === itemId ? { ...item, is_completed: completed } : item
      );
      setChecklistItems(updatedItems);

      if (interventionData && interventionData.steps) {
        const currentStep = interventionData.steps.find((step) =>
          step.collected_data && (step.collected_data.checklist || step.collected_data.qc_checklist)
        );

        if (currentStep) {
          const updatedCollectedData = { ...currentStep.collected_data } as Record<string, Record<string, unknown>>;
          if (updatedCollectedData.checklist && updatedCollectedData.checklist[itemId] !== undefined) {
            updatedCollectedData.checklist[itemId] = completed;
          } else if (updatedCollectedData.qc_checklist && updatedCollectedData.qc_checklist[itemId] !== undefined) {
            updatedCollectedData.qc_checklist[itemId] = completed;
          }

          await saveStepProgressMutation.mutateAsync({
            stepId: currentStep.id,
            collectedData: updatedCollectedData,
            notes: currentStep.notes ?? undefined,
            photos: currentStep.photo_urls ?? undefined
          });

          saveChecklistOverrides(safeTask.id, updatedItems);
          toast.success('Élément de checklist mis à jour');
          return;
        }
      }

      const totalItems = updatedItems.length;
      const completedItems = updatedItems.filter(item => item.is_completed).length;
      const newChecklistCompleted = totalItems > 0 && completedItems === totalItems;

      await updateTask.mutateAsync({
        taskId: safeTask.id,
        data: { checklist_completed: newChecklistCompleted } as UpdateTaskRequest
      });

      saveChecklistOverrides(safeTask.id, updatedItems);
      toast.success('Statut de checklist mis à jour');
    } catch (error) {
      console.error('Failed to update checklist item:', error);
      toast.error('Erreur lors de la mise à jour de l\'élément de checklist');
    }
  }, [safeTask?.id, user?.token, interventionData, checklistItems, saveChecklistOverrides, updateTask, saveStepProgressMutation]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !safeTask) return <ErrorFallback error={error || new Error('Task not found')} resetErrorBoundary={() => window.location.reload()} />;

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
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
              <div className="space-y-6 col-span-2">
                <VehicleInfoCard task={safeTask} />
                   <ScheduleCard task={{
                     ...convertNullsToUndefined(convertTimestamps(safeTask) as unknown as TaskWithDetails),
                     completed_steps: safeTask.completed_steps ? JSON.parse(safeTask.completed_steps) : [],
                   } as unknown as TaskDisplay} />

                 {derivedState?.hasChecklist && isInView && (
                   <Suspense fallback={<Skeleton className="h-32 w-full" />}>
                     <ChecklistProgress
                       taskId={safeTask.id}
                       checklistItems={checklistItems}
                       onItemUpdate={handleChecklistItemUpdate}
                     />
                   </Suspense>
                 )}
              </div>

              <div className="space-y-6">
                <ActionsCard
                  task={safeTask}
                  isAssignedToCurrentUser={derivedState?.isAssignedToCurrentUser || false}
                  isAvailable={derivedState?.isAvailable || false}
                  canStartTask={derivedState?.canStartTask || false}
                />

                {safeTask.workflow_id && (
                  <WorkflowStatusCard
                    taskId={safeTask.id}
                    workflowId={safeTask.workflow_id}
                    currentStepId={safeTask.current_workflow_step_id || undefined}
                    status={safeTask.workflow_status || undefined}
                    progress={interventionData?.progress_percentage}
                  />
                )}

                {derivedState?.hasPhotos && (
                  <PhotoSummaryCard
                    taskId={safeTask.id}
                    photos={safeTask.photos}
                    stepPhotoUrls={allStepPhotoUrls}
                    onViewPhotos={_onViewPhotos}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </ErrorBoundary>
  );
};

export default memo(PoseDetail);
