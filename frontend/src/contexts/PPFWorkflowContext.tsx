'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ipcClient } from '@/lib/ipc';
import { useAuth } from '@/contexts/AuthContext';
import { interventionKeys } from '@/lib/query-keys';
import type { Intervention, InterventionStep, Task } from '@/lib/backend';
import type { StepType } from '@/lib/StepType';
import { buildPPFStepsFromData, getCurrentPPFStepId } from '@/lib/ppf-workflow';


interface PPFStep {
  id: StepType;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  order: number;
}

type PPFStepId = StepType;

type PPFStepsData = {
  steps: InterventionStep[];
  progress_percentage: number;
};

type PPFInterventionData = {
  intervention: Intervention;
};

type InspectionDefectData = {
  id: string;
  zone: string;
  type: 'scratch' | 'dent' | 'chip' | 'paint_issue' | 'crack';
  severity?: 'low' | 'medium' | 'high';
  notes?: string | null;
};

type InspectionCollectedData = {
  defects?: InspectionDefectData[];
  meta?: {
    photos_count?: number;
  };
};

type PreparationCollectedData = {
  checklist?: Record<string, boolean>;
  environment?: {
    temp_celsius?: number | null;
    humidity_percent?: number | null;
  };
};

type InstallationCollectedData = {
  zones?: Array<{
    name: string;
    status?: 'pending' | 'in_progress' | 'completed';
    duration_min?: number;
    material_lot?: string;
  }>;
};

type FinalizationCollectedData = {
  qc_checklist?: Record<string, boolean>;
  customer_signature?: {
    svg_data?: string | null;
    signatory?: string | null;
    customer_comments?: string | null;
  };
  customer_satisfaction?: number | null;
  quality_score?: number | null;
  final_observations?: string[] | null;
};

type PPFCollectedDataByStep = {
  inspection: InspectionCollectedData;
  preparation: PreparationCollectedData;
  installation: InstallationCollectedData;
  finalization: FinalizationCollectedData;
};

type PPFStepCollectedData = PPFCollectedDataByStep[PPFStepId];

type AdvanceStepVariables = {
  stepId: PPFStepId;
  collectedData?: PPFStepCollectedData;
  photos?: string[];
};

type CompleteStepVariables = AdvanceStepVariables;

interface PPFWorkflowContextType {
  taskId: string;
  steps: PPFStep[];
  currentStep: PPFStep | null;
  isLoading: boolean;
  error: Error | null;
  interventionData: PPFInterventionData | null;
  stepsData: PPFStepsData | null;
  task: Task | null;
  canAdvanceToStep: (stepId: PPFStepId) => boolean;
  advanceToStep: <TStep extends PPFStepId>(
    stepId: TStep,
    collectedData?: PPFCollectedDataByStep[TStep],
    photos?: string[]
  ) => Promise<void>;
  completeStep: <TStep extends PPFStepId>(
    stepId: TStep,
    collectedData?: PPFCollectedDataByStep[TStep],
    photos?: string[]
  ) => Promise<void>;
  finalizeIntervention: (collectedData?: FinalizationCollectedData, photos?: string[]) => Promise<void>;
}

const PPFWorkflowContext = createContext<PPFWorkflowContextType | undefined>(undefined);

interface PPFWorkflowProviderProps {
  taskId: string;
  children: ReactNode;
}

export function PPFWorkflowProvider({ taskId, children }: PPFWorkflowProviderProps) {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  // Get intervention for this task
  const { data: interventionData, isLoading: interventionLoading, error: interventionError } = useQuery({
    queryKey: interventionKeys.ppfIntervention(taskId),
    queryFn: async (): Promise<PPFInterventionData | null> => {
      if (!session?.token) {
        console.warn('No session token available for intervention lookup');
        return null;
      }

      if (!taskId) {
        console.warn('No taskId provided for intervention lookup');
        return null;
      }

        try {
          // First try to get active intervention
          let result: unknown = await ipcClient.interventions.getActiveByTask(taskId, session.token);

         let intervention: Intervention | null = null;

         // Check if we got an active intervention
         if (result && typeof result === 'object') {
           if ('intervention' in result) {
             const directResult = result as { intervention?: Intervention | null };
             if (directResult.intervention) {
               intervention = directResult.intervention;
             }
           } else if ('interventions' in result) {
             const listResult = result as { interventions?: Intervention[] };
             if (listResult.interventions && listResult.interventions.length > 0) {
               intervention = listResult.interventions[0];
             }
           } else if ('type' in result) {
             const typedResult = result as { type: string; intervention?: Intervention; interventions?: Intervention[] };
             if (typedResult.type === 'ActiveRetrieved' && typedResult.intervention) {
               intervention = typedResult.intervention;
             } else if (typedResult.type === 'ActiveByTask' && typedResult.interventions && typedResult.interventions.length > 0) {
               intervention = typedResult.interventions[0];
             }
           }
         }

          // If no active intervention, try to get the latest (including completed)
          if (!intervention) {
            result = await ipcClient.interventions.getLatestByTask(taskId, session.token);

           if (result && typeof result === 'object' && 'intervention' in result) {
             const typedResult = result as { intervention?: Intervention };
              if (typedResult.intervention) {
                intervention = typedResult.intervention;
              }
           }
         }

         if (intervention) {
           return { intervention };
           } else {
             return null;
           }

          // If response doesn't match expected structure, log and return null
        console.warn('Unexpected intervention response structure:', result);
        return null;
      } catch (error) {
        // Log the error but return null instead of throwing
        // This allows the UI to gracefully handle "no intervention" state
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('Failed to fetch active intervention for task:', taskId, errorMessage);
        
        // Only log as error if it's not a "not found" case
        if (!errorMessage.includes('not found') && !errorMessage.includes('NotFound')) {
          console.error('Intervention fetch error:', error);
        }
        
        return null;
      }
    },
    enabled: !!session?.token && !!taskId,
    retry: (failureCount, error) => {
      // Only retry on timeout or network errors, not on auth/validation errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRetryable = errorMessage.includes('timeout') || errorMessage.includes('network');
      return isRetryable && failureCount < 2; 
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
    staleTime: 0, // Always refetch on invalidation
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Get steps for the intervention
  const { data: stepsData, isLoading: stepsLoading, error: stepsError } = useQuery({
    queryKey: interventionKeys.ppfInterventionSteps(interventionData?.intervention?.id || ''),
    queryFn: async (): Promise<PPFStepsData | null> => {
      if (!session?.token || !interventionData?.intervention?.id) return null;
      const result = await ipcClient.interventions.getProgress(interventionData.intervention.id, session.token);
      return result as PPFStepsData;
    },
    enabled: !!session?.token && !!interventionData?.intervention?.id
  });

  // Get task data for ppf_zones
  const { data: taskData, isLoading: taskLoading, error: taskError } = useQuery({
    queryKey: ['task', taskId],
    queryFn: async (): Promise<Task | null> => {
      if (!session?.token || !taskId) return null;
      const result = await ipcClient.tasks.get(taskId, session.token);
      return result as Task;
    },
    enabled: !!session?.token && !!taskId
  });

  const isLoading = interventionLoading || stepsLoading || taskLoading;
  const error = interventionError || stepsError || taskError;

  const steps = useMemo<PPFStep[]>(() => {
    return buildPPFStepsFromData(stepsData?.steps);
  }, [stepsData?.steps]);

  const currentStepId = useMemo(
    () => getCurrentPPFStepId(stepsData?.steps, interventionData?.intervention?.status),
    [stepsData?.steps, interventionData?.intervention?.status]
  );

  const currentStep = currentStepId
    ? steps.find(step => step.id === currentStepId) || steps[0] || null
    : null;

  const canAdvanceToStep = (stepId: PPFStepId): boolean => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return false;

    // Can access first step
    if (step.order === 1) return true;

    // Can access step if previous step is completed
    const previousStep = steps.find(s => s.order === step.order - 1);
    return previousStep?.status === 'completed';
  };

  const advanceToStepMutation = useMutation<
    { success: boolean; stepId: PPFStepId },
    Error,
    AdvanceStepVariables
  >({
    mutationFn: async ({ stepId, collectedData, photos }) => {
      if (!session?.token) throw new Error('No session token');
      if (!interventionData?.intervention) throw new Error('No active intervention');


      const currentStepsData = stepsData;

      // Find the CURRENT step (the one that should be completed)
      // stepId here is the CURRENT step to advance, not the target step
      const currentStep = currentStepsData?.steps?.find((s) => s.step_type === stepId);
       if (!currentStep) throw new Error(`Current step ${stepId} not found in intervention`);

       // Advance current step (this will complete it and move to next)
      // Use provided collectedData and photos, or fall back to existing data
      const _advanceResponse = await ipcClient.interventions.advanceStep({
        intervention_id: interventionData.intervention.id,
        step_id: currentStep.id,
        collected_data: collectedData || currentStep.collected_data || {},
        photos: photos || currentStep.photo_urls || null,
        notes: currentStep.notes || null,
        quality_check_passed: true,
        issues: null
       }, session.token);

       return { success: true, stepId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interventionKeys.all });
      queryClient.invalidateQueries({ queryKey: interventionKeys.ppfWorkflow(taskId) });
      queryClient.invalidateQueries({ queryKey: interventionKeys.ppfIntervention(taskId) });
      queryClient.invalidateQueries({ queryKey: interventionKeys.ppfInterventionSteps(interventionData?.intervention?.id || '') });
      toast.success('Avancé à l\'étape suivante');
    },
    onError: (error) => {
      console.error('Error advancing to next step:', error);
      toast.error('Erreur lors de l\'avancement');
    }
  });

  const completeStepMutation = useMutation<
    { success: boolean; stepId: PPFStepId; savedStep: InterventionStep },
    Error,
    CompleteStepVariables
  >({
    mutationFn: async ({ stepId, collectedData, photos }) => {
      if (!session?.token) throw new Error('No session token');
      if (!interventionData?.intervention) throw new Error('No active intervention');


      const currentStepsData = stepsData;

      // Find the step in the intervention
      const step = currentStepsData?.steps?.find((s) => s.step_type === stepId);
       if (!step) throw new Error(`Step ${stepId} not found in intervention`);

       // Save step progress using direct IPC call
       const savedStep = await ipcClient.interventions.saveStepProgress({
         step_id: step.id,
         collected_data: collectedData || {},
         notes: null,
         photos: photos || null
       }, session.token);
      
      return { success: true, stepId, savedStep };
    },
    onSuccess: () => {
      // Invalidate all intervention-related queries
      queryClient.invalidateQueries({ queryKey: interventionKeys.all });
      queryClient.invalidateQueries({ queryKey: interventionKeys.ppfWorkflow(taskId) });
      queryClient.invalidateQueries({ queryKey: interventionKeys.ppfIntervention(taskId) });
      queryClient.invalidateQueries({ queryKey: interventionKeys.activeForTask(taskId) });
      toast.success('Étape terminée');
    },
    onError: (error) => {
      console.error('🔍 [DEBUG] PPFWorkflowContext - completeStepMutation error:', error);
      console.error('🔍 [DEBUG] PPFWorkflowContext - Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });
      toast.error('Erreur lors de la finalisation de l\'étape');
    }
  });

  const finalizeInterventionMutation = useMutation({
    mutationFn: async ({ collectedData, photos }: { collectedData?: FinalizationCollectedData; photos?: string[] }) => {
      if (!session?.token) throw new Error('No session token');
      if (!interventionData?.intervention) throw new Error('No active intervention');

       // Prepare finalization data from collectedData
       const finalizationData = {
         intervention_id: String(interventionData.intervention.id),
         collected_data: collectedData || null,
         photos: photos || null,
         customer_satisfaction: typeof collectedData?.customer_satisfaction === 'number' ? collectedData.customer_satisfaction : null,
         quality_score: typeof collectedData?.quality_score === 'number' ? collectedData.quality_score : null,
         final_observations: Array.isArray(collectedData?.final_observations) ? collectedData.final_observations : null,
         customer_signature: collectedData?.customer_signature?.svg_data || null,
         customer_comments: collectedData?.customer_signature?.customer_comments || null,
        };

        // Finalize the intervention
       const _finalizeResponse = await ipcClient.interventions.finalize(finalizationData, session.token);

      return { success: true };
    },
    onSuccess: () => {
      // Invalidate all intervention-related queries
      queryClient.invalidateQueries({ queryKey: interventionKeys.all });
      queryClient.invalidateQueries({ queryKey: interventionKeys.ppfWorkflow(taskId) });
      queryClient.invalidateQueries({ queryKey: interventionKeys.ppfIntervention(taskId) });
      queryClient.invalidateQueries({ queryKey: interventionKeys.activeForTask(taskId) });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] }); // Also invalidate task query
      toast.success('Intervention finalisée avec succès');
    },
    onError: (error) => {
      console.error('Error finalizing intervention:', error);
      toast.error('Erreur lors de la finalisation de l\'intervention');
    }
  });

  const advanceToStep = async <TStep extends PPFStepId>(stepId: TStep, collectedData?: PPFCollectedDataByStep[TStep], photos?: string[]) => {
    if (!canAdvanceToStep(stepId)) {
      toast.error('Impossible d\'accéder à cette étape');
      return;
    }

    // Check if step is already completed
    const step = steps.find(s => s.id === stepId);
    if (step?.status === 'completed') {
      toast.error('Cette étape est déjà terminée');
      return;
    }

    await advanceToStepMutation.mutateAsync({ stepId, collectedData, photos });
  };

  const completeStep = async <TStep extends PPFStepId>(stepId: TStep, collectedData?: PPFCollectedDataByStep[TStep], photos?: string[]) => {
    await completeStepMutation.mutateAsync({ stepId, collectedData, photos });
  };

  const finalizeIntervention = async (collectedData?: FinalizationCollectedData, photos?: string[]) => {
    await finalizeInterventionMutation.mutateAsync({ collectedData, photos });
  };

  const value: PPFWorkflowContextType = {
    taskId,
    steps: steps,
    currentStep,
    isLoading,
    error,
    interventionData: interventionData || null,
    stepsData: stepsData || null,
    task: taskData || null,
    canAdvanceToStep,
    advanceToStep,
    completeStep,
    finalizeIntervention
  };

  return (
    <PPFWorkflowContext.Provider value={value}>
      {children}
    </PPFWorkflowContext.Provider>
  );
}

export function usePPFWorkflow() {
  const context = useContext(PPFWorkflowContext);
  if (context === undefined) {
    throw new Error('usePPFWorkflow must be used within a PPFWorkflowProvider');
  }
  return context;
}
