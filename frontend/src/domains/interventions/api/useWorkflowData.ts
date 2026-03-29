'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/shared/hooks/useAuth";
import type { PPFInterventionData } from "@/types/ppf-intervention";
import { isNonNullObject, normalizeError, safeString } from "@/types/type-utils";
import type {
  SignatureDTO,
  StartTimingDTO,
  TaskWorkflowProgress,
  WorkflowExecution,
  WorkflowExecutionStep,
} from "@/types/workflow.types";
import { getWorkflowServiceInstance } from "../services/workflow-service-adapter";
import {
  mapPPFInterventionToWorkflowExecution,
  mapPpfStepToWorkflowExecutionStep,
} from "./workflow-mapping";
import type {
  StepStatusUpdateData,
  WorkflowContextType,
} from "./workflow-provider.types";

interface UseWorkflowDataArgs {
  taskId: string;
  initialWorkflow?: PPFInterventionData | null;
}

function buildProgressMap(
  steps: WorkflowExecutionStep[],
  taskId: string,
): Record<string, TaskWorkflowProgress> {
  return steps.reduce<Record<string, TaskWorkflowProgress>>((acc, step) => {
    acc[step.id] = {
      id: step.id,
      taskId,
      workflowId: taskId,
      currentStep: 1,
      totalSteps: steps.length,
      completionPercentage: step.status === "completed" ? 100 : 0,
      estimatedTimeRemaining: 0,
      status: step.status,
      started_at: step.startedAt || undefined,
      completed_at: step.completedAt || null,
    };
    return acc;
  }, {});
}

export function useWorkflowData({
  taskId,
  initialWorkflow,
}: UseWorkflowDataArgs): WorkflowContextType {
  const { user } = useAuth();
  const [workflow, setWorkflow] = useState<WorkflowExecution | null>(null);
  const [steps, setSteps] = useState<WorkflowExecutionStep[]>([]);
  const [progress, setProgress] = useState<Record<string, TaskWorkflowProgress>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(
    null,
  );

  const workflowServiceRef =
    useRef<ReturnType<typeof getWorkflowServiceInstance> | null>(null);
  const loadInProgressRef = useRef<string | null>(null);
  const lastLoadedTaskRef = useRef<string | null>(null);

  if (!workflowServiceRef.current) {
    workflowServiceRef.current = getWorkflowServiceInstance();
  }
  const workflowService = workflowServiceRef.current;

  const loadWorkflow = useCallback(
    async (nextTaskId: string) => {
      if (!user) return;

      try {
        if (loadInProgressRef.current === nextTaskId) {
          return;
        }

        loadInProgressRef.current = nextTaskId;
        setIsLoading(true);
        setError(null);

        const workflowData =
          await workflowService.getWorkflowByTaskId(nextTaskId);

        if (!workflowData) {
          setWorkflow(null);
          setSteps([]);
          return;
        }

        setWorkflow(workflowData);
        const stepsData = await workflowService.getWorkflowSteps(workflowData.id);
        setSteps(stepsData || []);
      } catch (nextError: unknown) {
        setError(normalizeError(nextError));
      } finally {
        setIsLoading(false);
        lastLoadedTaskRef.current = nextTaskId;
        loadInProgressRef.current = null;
      }
    },
    [user, workflowService],
  );

  useEffect(() => {
    if (initialWorkflow) {
      setWorkflow(mapPPFInterventionToWorkflowExecution(initialWorkflow));
      setSteps(initialWorkflow.steps?.map(mapPpfStepToWorkflowExecutionStep) || []);
      return;
    }

    if (taskId && user && lastLoadedTaskRef.current !== taskId) {
      void loadWorkflow(taskId);
    }
  }, [initialWorkflow, loadWorkflow, taskId, user]);

  const progressMap = useMemo(() => buildProgressMap(steps, taskId), [steps, taskId]);

  const currentStep = useMemo(
    () =>
      workflow?.currentStepId
        ? (steps.find((step) => step.id === workflow.currentStepId) ?? null)
        : null,
    [steps, workflow],
  );

  const effectiveProgress = useMemo(
    () => ({ ...progressMap, ...progress }),
    [progress, progressMap],
  );

  const startTiming = useCallback<WorkflowContextType["startTiming"]>(
    async (stepId) => {
      if (!workflow || !user) return;

      try {
        const timingData: StartTimingDTO = {
          stepId,
          workflowExecutionId: workflow.id,
          startedBy: user.id,
        };
        await workflowService.startStepTiming(timingData);
      } catch (nextError: unknown) {
        console.error("Error starting timing:", normalizeError(nextError));
      }
    },
    [user, workflow, workflowService],
  );

  const startWorkflow = useCallback<WorkflowContextType["startWorkflow"]>(
    async (data) => {
      if (!user) return;

      try {
        setError(null);
        const newWorkflow = await workflowService.startWorkflowExecution(data);
        if (newWorkflow) {
          setWorkflow(newWorkflow);
          await loadWorkflow(data.taskId);
        }
      } catch (nextError: unknown) {
        setError(normalizeError(nextError));
      }
    },
    [loadWorkflow, user, workflowService],
  );

  const startStep = useCallback<WorkflowContextType["startStep"]>(
    async (stepId) => {
      if (!workflow || !user) return;

      try {
        setIsLoading(true);
        setError(null);
        await workflowService.startStep(stepId, workflow.id, user.id);
        await loadWorkflow(taskId);
        await startTiming(stepId);
      } catch (nextError: unknown) {
        const normalizedError = normalizeError(nextError);
        setError(normalizedError);
        throw normalizedError;
      } finally {
        setIsLoading(false);
      }
    },
    [loadWorkflow, startTiming, taskId, user, workflow, workflowService],
  );

  const completeStep = useCallback<WorkflowContextType["completeStep"]>(
    async (stepId, data) => {
      if (!workflow || !user) return;

      try {
        setError(null);
        await workflowService.completeStep(stepId, {
          workflowExecutionId: workflow.id,
          completedBy: user.id,
          notes: data?.notes ? safeString(data.notes) : undefined,
          checklistCompletion: isNonNullObject(data?.checklistCompletion)
            ? (data.checklistCompletion as Record<string, boolean>)
            : undefined,
        });
        await loadWorkflow(workflow.taskId);
      } catch (nextError: unknown) {
        setError(normalizeError(nextError));
      }
    },
    [loadWorkflow, user, workflow, workflowService],
  );

  const skipStep = useCallback<WorkflowContextType["skipStep"]>(
    async (stepId, reason) => {
      if (!workflow || !user) return;

      try {
        setIsLoading(true);
        setError(null);
        await workflowService.skipStep(stepId, workflow.id, user.id, reason);
        await loadWorkflow(taskId);
      } catch (nextError: unknown) {
        const normalizedError = normalizeError(nextError);
        setError(normalizedError);
        throw normalizedError;
      } finally {
        setIsLoading(false);
      }
    },
    [loadWorkflow, taskId, user, workflow, workflowService],
  );

  const goToStep = useCallback<WorkflowContextType["goToStep"]>(
    async (stepId) => {
      if (!workflow || !user) return;

      const step = steps.find((entry) => entry.id === stepId);
      if (!step) {
        throw new Error("Step not found");
      }

      try {
        await workflowService.updateWorkflowExecution(workflow.id, {
          currentStepId: stepId,
        });
        await loadWorkflow(taskId);
      } catch (nextError: unknown) {
        const normalizedError = normalizeError(nextError);
        setError(normalizedError);
        throw normalizedError;
      }
    },
    [loadWorkflow, steps, taskId, user, workflow, workflowService],
  );

  const updateStepData = useCallback<WorkflowContextType["updateStepData"]>(
    async (stepId, data) => {
      if (!workflow || !user) return;

      try {
        await workflowService.updateStepData(
          stepId,
          workflow.id,
          {
            notes: data.notes,
            photos: data.photos,
            checklistCompletion: data.checklistCompletion as
              | Record<string, boolean>
              | undefined,
            customData: data.customData,
          },
          user.id,
        );
        await loadWorkflow(taskId);
      } catch (nextError: unknown) {
        const normalizedError = normalizeError(nextError);
        setError(normalizedError);
        throw normalizedError;
      }
    },
    [loadWorkflow, taskId, user, workflow, workflowService],
  );

  const pauseTiming = useCallback<WorkflowContextType["pauseTiming"]>(
    async (stepId) => {
      if (!workflow || !user) return;
      try {
        await workflowService.pauseStepTiming(stepId, workflow.id, user.id);
      } catch (nextError: unknown) {
        console.error("Error pausing timing:", normalizeError(nextError));
      }
    },
    [user, workflow, workflowService],
  );

  const resumeTiming = useCallback<WorkflowContextType["resumeTiming"]>(
    async (stepId) => {
      if (!workflow || !user) return;
      try {
        await workflowService.resumeStepTiming(stepId, workflow.id, user.id);
      } catch (nextError: unknown) {
        console.error("Error resuming timing:", normalizeError(nextError));
      }
    },
    [user, workflow, workflowService],
  );

  const addSignature = useCallback<WorkflowContextType["addSignature"]>(
    async (signatureType, signatureData) => {
      if (!workflow || !user) return;

      const signaturePayload: SignatureDTO = {
        workflowExecutionId: workflow.id,
        stepId: workflow.currentStepId || "",
        userId: user.id,
        signatureType,
        signature: signatureData,
        ipAddress: undefined,
        userAgent: navigator.userAgent,
      };

      if (!signaturePayload.stepId) {
        console.error("Cannot add signature: stepId is missing.");
        return;
      }

      try {
        await workflowService.addSignature(signaturePayload);
      } catch (nextError: unknown) {
        const normalizedError = normalizeError(nextError);
        setError(normalizedError);
        throw normalizedError;
      }
    },
    [user, workflow, workflowService],
  );

  const uploadPhotos = useCallback<WorkflowContextType["uploadPhotos"]>(
    async (stepId, files) => {
      if (!workflow || !user) {
        throw new Error("Workflow not initialized or user not authenticated");
      }

      try {
        setIsLoading(true);
        setError(null);
        const { urls } = await workflowService.uploadStepPhotos(
          workflow.id,
          stepId,
          files,
          user.id,
        );

        setSteps((currentSteps) =>
          currentSteps.map((step) =>
            step.id === stepId
              ? { ...step, photos: [...(step.photos || []), ...urls] }
              : step,
          ),
        );

        return urls;
      } catch (nextError: unknown) {
        const normalizedError = normalizeError(nextError);
        setError(normalizedError);
        throw normalizedError;
      } finally {
        setIsLoading(false);
      }
    },
    [user, workflow, workflowService],
  );

  const isStepComplete = useCallback(
    (stepId: string) => effectiveProgress[stepId]?.status === "completed",
    [effectiveProgress],
  );

  const isStepInProgress = useCallback(
    (stepId: string) => effectiveProgress[stepId]?.status === "in_progress",
    [effectiveProgress],
  );

  const isStepSkipped = useCallback(
    (stepId: string) => effectiveProgress[stepId]?.status === "skipped",
    [effectiveProgress],
  );

  const getStepProgress = useCallback(
    (stepId: string) => effectiveProgress[stepId],
    [effectiveProgress],
  );

  const getProgressPercentage = useCallback(() => {
    if (steps.length === 0) return 0;
    const completedSteps = steps.filter(
      (step) => step.status === "completed" || step.status === "skipped",
    );
    return Math.round((completedSteps.length / steps.length) * 100);
  }, [steps]);

  const getCurrentStepIndex = useCallback(() => {
    if (!currentStep) return -1;
    return steps.findIndex((step) => step.id === currentStep.id);
  }, [currentStep, steps]);

  const canProceedToNextStep = useCallback(() => {
    if (!currentStep || currentStep.status !== "completed") {
      return false;
    }
    return getCurrentStepIndex() < steps.length - 1;
  }, [currentStep, getCurrentStepIndex, steps.length]);

  const resetWorkflow = useCallback(() => {
    setWorkflow(null);
    setSteps([]);
    setProgress({});
    setError(null);
  }, []);

  const isFirstStep = useMemo(() => {
    if (!currentStep || !steps.length) return false;
    return steps[0]?.id === currentStep.id;
  }, [currentStep, steps]);

  const isLastStep = useMemo(() => {
    if (!currentStep || !steps.length) return false;
    return steps[steps.length - 1]?.id === currentStep.id;
  }, [currentStep, steps]);

  const goToNextStep = useCallback(() => {
    if (!currentStep || isLastStep) return;
    const currentIndex = getCurrentStepIndex();
    const nextStep = steps[currentIndex + 1];
    if (nextStep) {
      void goToStep(nextStep.id);
    }
  }, [currentStep, getCurrentStepIndex, goToStep, isLastStep, steps]);

  const goToPreviousStep = useCallback(() => {
    if (!currentStep || isFirstStep) return;
    const currentIndex = getCurrentStepIndex();
    const previousStep = steps[currentIndex - 1];
    if (previousStep) {
      void goToStep(previousStep.id);
    }
  }, [currentStep, getCurrentStepIndex, goToStep, isFirstStep, steps]);

  const updateStepStatus = useCallback(
    (stepId: string, status: WorkflowExecutionStep["status"], data: StepStatusUpdateData = {}) => {
      setProgress((currentProgress) => ({
        ...currentProgress,
        [stepId]: {
          ...currentProgress[stepId],
          status,
          updated_at: new Date().toISOString(),
          ...data,
        } as TaskWorkflowProgress,
      }));
    },
    [],
  );

  return {
    workflow,
    steps,
    currentStep,
    progress: effectiveProgress,
    isLoading,
    error,
    isFirstStep,
    isLastStep,
    loadWorkflow,
    startWorkflow,
    startStep,
    completeStep,
    skipStep,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    updateStepData,
    updateStepStatus,
    startTiming,
    pauseTiming,
    resumeTiming,
    addSignature,
    uploadPhotos,
    isStepComplete,
    isStepInProgress,
    isStepSkipped,
    getStepProgress,
    getProgressPercentage,
    getCurrentStepIndex,
    canProceedToNextStep,
    resetWorkflow,
  };
}
