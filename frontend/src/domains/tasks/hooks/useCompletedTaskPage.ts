import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from '@/shared/hooks';
import {
  PPF_STEP_CONFIG,
  buildStepExportPayload,
  getEffectiveStepData,
  getPPFStepPath,
  useInterventionData,
  useWorkflowStepData,
} from '@/domains/interventions';
import type { Intervention } from '@/shared/types';
import type { InterventionStep, StepType } from '@/lib/backend';
import type { MaterialConsumption } from '@/shared/types/inventory.types';
import { interventionKeys } from '@/lib/query-keys';
import { printCompletedInterventionReport, saveCompletedInterventionReport } from '../services/completed-task-report.service';
import { downloadJsonFile } from '@/domains/interventions';
import type { TaskWithDetails } from '@/types/task.types';
import { useCustomerDisplayName, useCustomerInfo } from './useNormalizedTask';
import { taskGateway } from '../api/taskGateway';
import { inventoryIpc } from '@/domains/inventory';
import { useAuth } from '@/domains/auth';

export function useCompletedTaskPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { session } = useAuth();

  const [task, setTask] = useState<TaskWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [materials, setMaterials] = useState<MaterialConsumption[]>([]);
  const [expandedWorkflowSteps, setExpandedWorkflowSteps] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [lastExportTime, setLastExportTime] = useState<Date | null>(null);

  const customerInfo = useCustomerInfo(task);
  const customerDisplayName = useCustomerDisplayName(task);

  const { data: interventionData } = useInterventionData(taskId);
  const workflowSteps = useWorkflowStepData(interventionData || null);
  const fullInterventionData = interventionData as Intervention | null;

  const workflowStepsArray = useMemo(() =>
    Object.entries(workflowSteps).map(([stepId, stepData]) => ({
      id: stepId,
      title: PPF_STEP_CONFIG[stepId as keyof typeof PPF_STEP_CONFIG]?.label || stepId,
      status: stepData?.step_status || 'pending',
      completed_at: stepData?.completed_at,
      collected_data: stepData?.collected_data ?? null,
      step_data: stepData?.step_data ?? null,
      effective_data: stepData ? getEffectiveStepData(stepData) : {},
      notes: stepData?.notes ?? null,
      photo_urls: stepData?.photo_urls ?? null,
      measurements: stepData?.measurements ?? null,
      observations: stepData?.observations ?? null,
      validation_data: stepData?.validation_data ?? null,
    })), [workflowSteps],
  );

  const fetchTask = useCallback(async () => {
    if (!taskId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await taskGateway.getTaskById(taskId);
      if (result.error) {
        throw new Error(result.error);
      }

      setTask(result.data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch task');
      console.error('Error fetching task:', err);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void fetchTask();
  }, [fetchTask]);

  // Redirect if the intervention is loaded but not yet completed
  useEffect(() => {
    if (interventionData && interventionData.status !== 'completed') {
      router.push(`/tasks/${taskId}/workflow/ppf`);
    }
  }, [interventionData, router, taskId]);

  // Fetch materials consumption when an intervention ID is known
  useEffect(() => {
    if (!interventionData?.id || !session?.token) return;

    inventoryIpc
      .getInterventionConsumption(interventionData.id)
      .then(setMaterials)
      .catch((err) => {
        console.error('Failed to load materials consumption:', err);
        setMaterials([]);
      });
  }, [interventionData?.id, session?.token]);

  const handleSaveReport = useCallback(async () => {
    if (!task || !fullInterventionData?.id) {
      toast.error(t('errors.interventionDataUnavailable'));
      return;
    }

    try {
      await saveCompletedInterventionReport(fullInterventionData.id, t);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde du rapport:', err);
      toast.error(t('reports.pdfSaveError'));
    }
  }, [fullInterventionData, t, task]);

  const handleShareTask = useCallback(() => {
    if (!task) {
      return;
    }

    const taskUrl = `${window.location.origin}/tasks/${task.id}`;
    navigator.clipboard
      .writeText(taskUrl)
      .then(() => toast.success(t('reports.linkCopied')))
      .catch(() => toast.error(t('reports.linkCopyError')));
  }, [task, t]);

  const handlePrintReport = useCallback(async () => {
    if (!task || !fullInterventionData?.id) {
      toast.error(t('errors.interventionDataUnavailable'));
      return;
    }

    if (isExporting) {
      toast.info(t('reports.exportInProgress'));
      return;
    }

    setIsExporting(true);
    setExportProgress(t('reports.preparingExport'));

    try {
      await queryClient.invalidateQueries({ queryKey: interventionKeys.byTaskData(taskId) });
      await queryClient.refetchQueries({ queryKey: interventionKeys.byTaskData(taskId) });
      const refreshed = queryClient.getQueryData(interventionKeys.byTaskData(taskId)) as Intervention | null;

      if (!refreshed?.id) {
        throw new Error(t('errors.interventionDataRefreshFailed'));
      }

      await printCompletedInterventionReport({
        queryClient,
        taskId,
        interventionId: refreshed.id,
        t,
        onProgress: setExportProgress,
        onExported: () => setLastExportTime(new Date()),
        onRetry: () => undefined,
      });
    } catch (err) {
      console.error('Erreur lors de l\'impression:', err);

      let errorMessage = t('errors.printPreparationError');
      if (err instanceof Error) {
        if (err.message.includes('popup') || err.message.includes('bloquée')) {
          errorMessage = t('errors.printWindowBlocked');
        } else if (err.message.includes('téléchargement')) {
          errorMessage = t('errors.fileAccessProblem');
        } else if (err.message.includes('timeout')) {
          errorMessage = t('errors.generationTimeout');
        } else {
          errorMessage = err.message;
        }
      }

      toast.error(errorMessage, {
        duration: 6000,
        action: {
          label: t('common.retry'),
          onClick: () => {
            void handlePrintReport();
          },
        },
      });
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  }, [fullInterventionData, isExporting, queryClient, t, task, taskId]);

  const handleDownloadDataJson = useCallback(() => {
    if (!fullInterventionData) {
      toast.error(t('errors.interventionDataUnavailable'));
      return;
    }

    const nowDate = new Date().toISOString().split('T')[0];
    const payload = {
      exported_at: new Date().toISOString(),
      task_id: taskId,
      intervention: fullInterventionData,
      steps: workflowStepsArray,
    };
    const fileName = `intervention-${fullInterventionData.id}-workflow-data-${nowDate}.json`;
    downloadJsonFile(payload, fileName);
    toast.success('Donnees JSON telechargees');
  }, [fullInterventionData, t, taskId, workflowStepsArray]);

  const handleEditStep = useCallback((stepId: string) => {
    const stepType = stepId as StepType;
    router.push(`/tasks/${taskId}/workflow/ppf/${getPPFStepPath(stepType)}`);
  }, [router, taskId]);

  const handleDownloadStepData = useCallback((stepId: string) => {
    if (!fullInterventionData) {
      toast.error(t('errors.interventionDataUnavailable'));
      return;
    }

    const stepData = workflowSteps[stepId as keyof typeof workflowSteps];
    if (!stepData) {
      toast.error('Etape introuvable');
      return;
    }

    const nowDate = new Date().toISOString().split('T')[0];
    const fileName = `intervention-${fullInterventionData.id}-step-${stepId}-${nowDate}.json`;
    const payload = buildStepExportPayload(taskId, fullInterventionData.id, stepData as unknown as InterventionStep);
    downloadJsonFile(payload, fileName);
  }, [fullInterventionData, t, taskId, workflowSteps]);

  const toggleWorkflowStep = useCallback((stepId: string) => {
    setExpandedWorkflowSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  }, []);

  const duration = useMemo(() => {
    const startStr = (task?.start_time as string | null | undefined)
      || (fullInterventionData as { started_at?: string | null } | null)?.started_at;
    const endStr = (task?.end_time as string | null | undefined)
      || (fullInterventionData as { completed_at?: string | null } | null)?.completed_at;

    if (startStr && endStr) {
      const diffMs = new Date(endStr).getTime() - new Date(startStr).getTime();
      if (diffMs > 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${diffHours}h ${diffMins}min`;
      }
    }

    const actualMins = (fullInterventionData as { actual_duration?: number | null } | null)?.actual_duration;
    if (actualMins && actualMins > 0) {
      const h = Math.floor(actualMins / 60);
      const m = actualMins % 60;
      return `${h}h ${m}min`;
    }

    return null;
  }, [task?.start_time, task?.end_time, fullInterventionData]);

  const allStepPhotoUrls = useMemo(() =>
    workflowStepsArray.flatMap(s => s.photo_urls ?? []),
    [workflowStepsArray],
  );

  const photoCount =
    (task?.photos_before?.length || 0) +
    (task?.photos_after?.length || 0) +
    (task?.photos?.during?.length || 0);
  const checklistCount = task?.checklist_items?.filter((item: { is_completed?: boolean }) => item.is_completed).length || 0;
  const checklistTotal = task?.checklist_items?.length || 0;
  const progressPercentage = interventionData?.progress_percentage || 100;

  return {
    taskId,
    task,
    loading,
    error,
    customerInfo,
    customerDisplayName,
    fullInterventionData,
    materials,
    workflowStepsArray,
    workflowSteps,
    expandedWorkflowSteps,
    duration,
    photoCount,
    allStepPhotoUrls,
    checklistCount,
    checklistTotal,
    progressPercentage,
    isExporting,
    exportProgress,
    lastExportTime,
    handleSaveReport,
    handleShareTask,
    handlePrintReport,
    handleDownloadDataJson,
    handleEditStep,
    handleDownloadStepData,
    toggleWorkflowStep,
    refetchTask: fetchTask,
  };
}

