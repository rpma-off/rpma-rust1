import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { InterventionStep, StepType } from "@/lib/backend";
import { interventionKeys, taskKeys, inventoryKeys } from "@/lib/query-keys";
import type { MaterialConsumption } from "@/shared/types/inventory.types";
import type { Intervention } from "@/shared/types";
import { useTranslation } from "@/shared/hooks";
import type { TaskWithDetails } from "@/types/task.types";
import { useAuth } from "@/shared/hooks/useAuth";
// ❌ CROSS-DOMAIN IMPORT — TODO(ADR-002): Move to shared/ or use public index
import {
  PPF_STEP_CONFIG,
  buildStepExportPayload,
  getEffectiveStepData,
  getPPFStepPath,
  useInterventionData,
  useWorkflowStepData,
} from "@/domains/interventions";
// TODO(ADR-003): Cross-domain import — tasks should not import directly from interventions.
//   **Problem**: downloadJsonFile is a utility that belongs in shared/utils, not interventions.
//   **ADRs violated**: ADR-003, ADR-002
//   **Proposed split**: move downloadJsonFile to `lib/utils/file-download.ts`
import { downloadJsonFile } from "@/domains/interventions";
// TODO(ADR-003): Cross-domain import — tasks should not import directly from inventory.
//   **Problem**: inventoryIpc creates tight coupling between tasks and inventory domains.
//   **ADRs violated**: ADR-003, ADR-002
//   **Proposed split**: create a shared coordination layer or use event-based communication
//   through a shared hook in `lib/hooks/useInventoryLookup.ts`
import { inventoryIpc } from "@/domains/inventory";
import {
  printCompletedInterventionReport,
  saveCompletedInterventionReport,
} from "../services/completed-task-report.service";
import { taskIpc } from "../ipc/task.ipc";
import { useCustomerDisplayName, useCustomerInfo } from "./useNormalizedTask";

export function useCompletedTaskPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { session } = useAuth();

  // ✅ ADR-014: Server state via useQuery instead of useState + useEffect
  const {
    data: taskData,
    isLoading: taskLoading,
    error: taskError,
    refetch: refetchTask,
  } = useQuery({
    queryKey: taskKeys.byId(taskId),
    queryFn: async () => {
      const result = await taskIpc.get(taskId);
      if (!result) throw new Error("Task not found");
      return result as TaskWithDetails;
    },
    enabled: !!taskId,
  });
  // Map to TaskWithDetails | null for backward-compatible return type
  const task = taskData ?? null;

  // UI-only state (ADR-014: useState is correct for local UI state)
  const [expandedWorkflowSteps, setExpandedWorkflowSteps] = useState<
    Set<string>
  >(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const [lastExportTime, setLastExportTime] = useState<Date | null>(null);

  const customerInfo = useCustomerInfo(task);
  const customerDisplayName = useCustomerDisplayName(task);

  const { data: interventionData } = useInterventionData(taskId);
  const workflowSteps = useWorkflowStepData(interventionData || null);
  const fullInterventionData = interventionData as Intervention | null;

  // ✅ ADR-014: Dependent query for materials consumption
  const { data: materials = [] } = useQuery<MaterialConsumption[]>({
    queryKey: inventoryKeys.interventionConsumption(interventionData?.id ?? ""),
    queryFn: () =>
      inventoryIpc.getInterventionConsumption(interventionData!.id),
    enabled: !!interventionData?.id && !!session?.token,
  });

  // Derive loading/error for backward-compatible return interface
  const loading = taskLoading;
  const error = taskError?.message ?? null;
  const isTaskCompleted =
    task?.status === "completed" ||
    task?.workflow_status === "completed" ||
    !!task?.completed_at;

  const workflowStepsArray = useMemo(
    () =>
      Object.entries(workflowSteps).map(([stepId, stepData]) => ({
        id: stepId,
        title:
          PPF_STEP_CONFIG[stepId as keyof typeof PPF_STEP_CONFIG]?.label ||
          stepId,
        status: stepData?.step_status || "pending",
        completed_at: stepData?.completed_at,
        collected_data: stepData?.collected_data ?? null,
        step_data: stepData?.step_data ?? null,
        effective_data: stepData ? getEffectiveStepData(stepData) : {},
        notes: stepData?.notes ?? null,
        photo_urls: stepData?.photo_urls ?? null,
        measurements: stepData?.measurements ?? null,
        observations: stepData?.observations ?? null,
        validation_data: stepData?.validation_data ?? null,
      })),
    [workflowSteps],
  );

  // Redirect if the intervention is loaded but not yet completed
  useEffect(() => {
    if (loading || isTaskCompleted) {
      return;
    }

    if (interventionData && interventionData.status !== "completed") {
      router.push(`/tasks/${taskId}/workflow/ppf`);
    }
  }, [interventionData, isTaskCompleted, loading, router, taskId]);

  const handleSaveReport = useCallback(async () => {
    if (!task || !fullInterventionData?.id) {
      toast.error(t("errors.interventionDataUnavailable"));
      return;
    }

    try {
      await saveCompletedInterventionReport(fullInterventionData.id, t);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde du rapport:", err);
      toast.error(t("reports.pdfSaveError"));
    }
  }, [fullInterventionData, t, task]);

  const handleShareTask = useCallback(() => {
    if (!task) {
      return;
    }

    const taskUrl = `${window.location.origin}/tasks/${task.id}`;
    navigator.clipboard
      .writeText(taskUrl)
      .then(() => toast.success(t("reports.linkCopied")))
      .catch(() => toast.error(t("reports.linkCopyError")));
  }, [task, t]);

  const handlePrintReport = useCallback(async () => {
    if (!task || !fullInterventionData?.id) {
      toast.error(t("errors.interventionDataUnavailable"));
      return;
    }

    if (isExporting) {
      toast.info(t("reports.exportInProgress"));
      return;
    }

    setIsExporting(true);
    setExportProgress(t("reports.preparingExport"));

    try {
      await queryClient.refetchQueries({
        queryKey: interventionKeys.byTaskData(taskId),
      });
      const refreshed = queryClient.getQueryData(
        interventionKeys.byTaskData(taskId),
      ) as Intervention | null;

      if (!refreshed?.id) {
        throw new Error(t("errors.interventionDataRefreshFailed"));
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
      console.error("Erreur lors de l'impression:", err);

      let errorMessage = t("errors.printPreparationError");
      if (err instanceof Error) {
        if (err.message.includes("popup") || err.message.includes("bloquée")) {
          errorMessage = t("errors.printWindowBlocked");
        } else if (err.message.includes("téléchargement")) {
          errorMessage = t("errors.fileAccessProblem");
        } else if (err.message.includes("timeout")) {
          errorMessage = t("errors.generationTimeout");
        } else {
          errorMessage = err.message;
        }
      }

      toast.error(errorMessage, {
        duration: 6000,
        action: {
          label: t("common.retry"),
          onClick: () => {
            void handlePrintReport();
          },
        },
      });
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  }, [fullInterventionData, isExporting, queryClient, t, task, taskId]);

  const handleDownloadDataJson = useCallback(() => {
    if (!fullInterventionData) {
      toast.error(t("errors.interventionDataUnavailable"));
      return;
    }

    const nowDate = new Date().toISOString().split("T")[0];
    const payload = {
      exported_at: new Date().toISOString(),
      task_id: taskId,
      intervention: fullInterventionData,
      steps: workflowStepsArray,
    };
    const fileName = `intervention-${fullInterventionData.id}-workflow-data-${nowDate}.json`;
    downloadJsonFile(payload, fileName);
    toast.success("Donnees JSON telechargees");
  }, [fullInterventionData, t, taskId, workflowStepsArray]);

  const handleEditStep = useCallback(
    (stepId: string) => {
      const stepType = stepId as StepType;
      router.push(`/tasks/${taskId}/workflow/ppf/${getPPFStepPath(stepType)}`);
    },
    [router, taskId],
  );

  const handleDownloadStepData = useCallback(
    (stepId: string) => {
      if (!fullInterventionData) {
        toast.error(t("errors.interventionDataUnavailable"));
        return;
      }

      const stepData = workflowSteps[stepId as keyof typeof workflowSteps];
      if (!stepData) {
        toast.error("Etape introuvable");
        return;
      }

      const nowDate = new Date().toISOString().split("T")[0];
      const fileName = `intervention-${fullInterventionData.id}-step-${stepId}-${nowDate}.json`;
      const payload = buildStepExportPayload(
        taskId,
        fullInterventionData.id,
        stepData as unknown as InterventionStep,
      );
      downloadJsonFile(payload, fileName);
    },
    [fullInterventionData, t, taskId, workflowSteps],
  );

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
    const startStr =
      (task?.start_time as string | null | undefined) ||
      (fullInterventionData as { started_at?: string | null } | null)
        ?.started_at;
    const endStr =
      (task?.end_time as string | null | undefined) ||
      (fullInterventionData as { completed_at?: string | null } | null)
        ?.completed_at;

    if (startStr && endStr) {
      const diffMs = new Date(endStr).getTime() - new Date(startStr).getTime();
      if (diffMs > 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${diffHours}h ${diffMins}min`;
      }
    }

    const actualMins = (
      fullInterventionData as { actual_duration?: number | null } | null
    )?.actual_duration;
    if (actualMins && actualMins > 0) {
      const h = Math.floor(actualMins / 60);
      const m = actualMins % 60;
      return `${h}h ${m}min`;
    }

    return null;
  }, [task?.start_time, task?.end_time, fullInterventionData]);

  const allStepPhotoUrls = useMemo(
    () => workflowStepsArray.flatMap((s) => s.photo_urls ?? []),
    [workflowStepsArray],
  );

  const photoCount =
    (task?.photos_before?.length || 0) +
    (task?.photos_after?.length || 0) +
    (task?.photos?.during?.length || 0);
  const checklistCount =
    task?.checklist_items?.filter(
      (item: { is_completed?: boolean }) => item.is_completed,
    ).length || 0;
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
    refetchTask,
  };
}
