import { useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/domains/auth';
import { interventionKeys } from '@/lib/query-keys';
import type { InterventionStep, JsonValue, StepType } from '@/lib/backend';
import { usePPFWorkflow } from '../api/PPFWorkflowProvider';
import { ppfWorkflowIpc } from '../ipc/ppfWorkflow.ipc';
import { getFirstAllowedPPFStepId } from '../utils/ppf-workflow';

export type PpfDefect = {
  id: string;
  zone: string;
  type: string;
  severity?: string;
  notes?: string | null;
};

type DraftOptions = {
  photos?: string[];
  invalidate?: boolean;
  showToast?: boolean;
};

export function usePpfWorkflow(taskIdOverride?: string) {
  const workflow = usePPFWorkflow();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const lastDraftRef = useRef<Partial<Record<StepType, string>>>({});

  const taskId = taskIdOverride ?? workflow.taskId;
  const intervention = workflow.interventionData?.intervention ?? null;
  const stepsData = workflow.stepsData;
  const steps = workflow.steps;
  const currentStep = workflow.currentStep;
  const task = workflow.task;

  const stepRecords = useMemo(() => {
    const map = new Map<StepType, InterventionStep>();
    stepsData?.steps?.forEach((step) => {
      map.set(step.step_type, step);
    });
    return map;
  }, [stepsData?.steps]);

  const allowedStepId = useMemo(() => getFirstAllowedPPFStepId(steps), [steps]);

  const canAccessStep = useCallback(
    (stepId: StepType) => {
      const step = steps.find((item) => item.id === stepId);
      if (!step) return false;
      if (step.status === 'completed') return true;
      if (currentStep?.id === stepId) return true;
      return workflow.canAdvanceToStep(stepId);
    },
    [steps, currentStep?.id, workflow]
  );

  const saveDraft = useCallback(
    async (stepType: StepType, collectedData: JsonValue, options?: DraftOptions) => {
      if (!session?.token) {
        toast.error('Session expirée');
        return;
      }
      const step = stepRecords.get(stepType);
      if (!step) {
        toast.error('Étape introuvable');
        return;
      }

      const payloadSignature = JSON.stringify({
        collectedData,
        photos: options?.photos ?? null,
      });

      if (lastDraftRef.current[stepType] === payloadSignature) {
        return;
      }

      lastDraftRef.current[stepType] = payloadSignature;

      await ppfWorkflowIpc.saveStepDraft(
        {
          step_id: step.id,
          collected_data: collectedData,
          notes: null,
          photos: options?.photos ?? null,
        },
        session.token
      );

      if (options?.invalidate) {
        queryClient.invalidateQueries({ queryKey: interventionKeys.ppfInterventionSteps(step.intervention_id) });
        queryClient.invalidateQueries({ queryKey: interventionKeys.ppfIntervention(taskId) });
      }

      if (options?.showToast) {
        toast.success('Brouillon sauvegardé');
      }
    },
    [queryClient, session?.token, stepRecords, taskId]
  );

  const validateStep = useCallback(
    async (stepType: StepType, collectedData: JsonValue, photos?: string[]) => {
      if (stepType === 'finalization') {
        await workflow.finalizeIntervention(
          collectedData as Parameters<typeof workflow.finalizeIntervention>[0],
          photos
        );
        return;
      }

      await workflow.advanceToStep(stepType, collectedData as JsonValue, photos);

      if (intervention?.id) {
        await queryClient.refetchQueries({ queryKey: interventionKeys.ppfInterventionSteps(intervention.id) });
        await queryClient.refetchQueries({ queryKey: interventionKeys.ppfIntervention(taskId) });
      }
    },
    [workflow, intervention?.id, queryClient, taskId]
  );

  const toggleChecklistItem = useCallback(
    async (
      stepType: StepType,
      itemId: string,
      payload: { checklist?: Record<string, boolean> } & Record<string, unknown>,
      options?: DraftOptions
    ) => {
      const checklist = { ...(payload.checklist ?? {}) };
      checklist[itemId] = !checklist[itemId];
      const nextPayload = { ...payload, checklist };
      await saveDraft(stepType, nextPayload as JsonValue, options);
      return nextPayload;
    },
    [saveDraft]
  );

  const addDefect = useCallback(
    async (
      stepType: StepType,
      defect: PpfDefect,
      payload: { defects?: PpfDefect[] } & Record<string, unknown>,
      options?: DraftOptions
    ) => {
      const defects = [...(payload.defects ?? []), defect];
      const nextPayload = { ...payload, defects };
      await saveDraft(stepType, nextPayload as JsonValue, options);
      return nextPayload;
    },
    [saveDraft]
  );

  const updateDefect = useCallback(
    async (
      stepType: StepType,
      defect: PpfDefect,
      payload: { defects?: PpfDefect[] } & Record<string, unknown>,
      options?: DraftOptions
    ) => {
      const defects = (payload.defects ?? []).map((item) => (item.id === defect.id ? defect : item));
      const nextPayload = { ...payload, defects };
      await saveDraft(stepType, nextPayload as JsonValue, options);
      return nextPayload;
    },
    [saveDraft]
  );

  const removeDefect = useCallback(
    async (
      stepType: StepType,
      defectId: string,
      payload: { defects?: PpfDefect[] } & Record<string, unknown>,
      options?: DraftOptions
    ) => {
      const defects = (payload.defects ?? []).filter((item) => item.id !== defectId);
      const nextPayload = { ...payload, defects };
      await saveDraft(stepType, nextPayload as JsonValue, options);
      return nextPayload;
    },
    [saveDraft]
  );

  const attachPhoto = useCallback(
    async (
      stepType: StepType,
      photoUrl: string,
      payload: Record<string, unknown>,
      photos: string[],
      options?: DraftOptions
    ) => {
      const nextPhotos = [...photos, photoUrl];
      await saveDraft(stepType, payload as JsonValue, { ...options, photos: nextPhotos });
      return nextPhotos;
    },
    [saveDraft]
  );

  const setQualityScore = useCallback(
    async (
      stepType: StepType,
      score: number,
      payload: Record<string, unknown>,
      options?: DraftOptions
    ) => {
      const nextPayload = { ...payload, quality_score: score };
      await saveDraft(stepType, nextPayload as JsonValue, options);
      return nextPayload;
    },
    [saveDraft]
  );

  return {
    taskId,
    task,
    intervention,
    steps,
    stepsData,
    currentStep,
    allowedStepId,
    canAccessStep,
    isLoading: workflow.isLoading,
    error: workflow.error,
    getStepRecord: (stepType: StepType) => stepRecords.get(stepType) ?? null,
    saveDraft,
    validateStep,
    toggleChecklistItem,
    addDefect,
    updateDefect,
    removeDefect,
    attachPhoto,
    setQualityScore,
  };
}
