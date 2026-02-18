import { useState, useEffect, useCallback } from 'react';
import { WorkflowService } from '@/domains/workflow/server';
import { taskPhotoService } from '@/domains/tasks/server';
import { ApiError } from '@/lib/api-error';
import {
  WorkflowExecution,
  WorkflowExecutionStep,
  WorkflowTiming,
  CreateWorkflowExecutionDTO,
  CompleteStepDTO,
  StartTimingDTO
} from '@/types/workflow.types';
import { PPFPhotoAngle, PPFPhotoCategory } from '@/types/enums';
import { toast } from 'sonner';
import { normalizeError, getErrorMessage } from '@/types/type-utils';
import type { JsonRecord } from '@/types/utility.types';
import { useAuth } from '@/domains/auth';

export interface UseWorkflowOptions {
  taskId?: string;
  autoFetch?: boolean;
  enablePolling?: boolean;
  pollingInterval?: number;
}

export interface WorkflowStepData {
  notes?: string;
  photos?: string[];
  checklistCompletion?: Record<string, boolean>;
  customData?: Record<string, unknown>;
}

/**
 * Hook for managing PPF workflow operations
 * Provides comprehensive workflow state management with error handling
 */
export const useWorkflow = (options: UseWorkflowOptions = {}) => {
  const {
    taskId,
    autoFetch = true,
    enablePolling = false,
    pollingInterval = 5000
  } = options;

  const { user } = useAuth();

  // State
  const [workflow, setWorkflow] = useState<WorkflowExecution | null>(null);
  const [currentStep, setCurrentStep] = useState<WorkflowExecutionStep | null>(null);
  const [stepTiming, setStepTiming] = useState<WorkflowTiming | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [savingStep, setSavingStep] = useState<boolean>(false);

  // Service instances
  const workflowService = WorkflowService.getInstance();

  // Fetch workflow by task ID
  const fetchWorkflow = useCallback(async () => {
    if (!taskId) return;

    try {
      setLoading(true);
      setError(null);

      const result = await workflowService.getWorkflowByTaskId(taskId);

      if (!result) {
        setWorkflow(null);
        setCurrentStep(null);
        return;
      }

      setWorkflow(result);

        // Get current step if workflow is in progress
        if (result.currentStepId && result.status === 'in_progress') {
          try {
            const step = await workflowService.getWorkflowStep(result.currentStepId, user?.token || '');
            if (step.success && step.data) {
              setCurrentStep(step.data);
            } else {
              setCurrentStep(null);
            }
          } catch (_err) {
            setCurrentStep(null);
          }
        } else {
          setCurrentStep(null);
          setStepTiming(null);
        }

    } catch (err: unknown) {
      const normalizedError = normalizeError(err);
      console.error('Failed to fetch workflow:', normalizedError);

       let errorMessage = 'Failed to fetch workflow';
       if (err instanceof Error) {
         errorMessage = err.message;
       } else {
         errorMessage = getErrorMessage(err);
       }

       if (!(err instanceof ApiError && (err as ApiError).status === 404)) { // Don't show error toast for "not found"
         toast.error(errorMessage);
       }

      setError(err instanceof Error ? err : new Error(errorMessage));
      setWorkflow(null);
      setCurrentStep(null);
    } finally {
      setLoading(false);
    }
  }, [taskId, workflowService, user?.token]);

  // Start a new workflow
  const startWorkflow = useCallback(async (data: CreateWorkflowExecutionDTO) => {
    try {
      setLoading(true);
      setError(null);

       const workflow = await workflowService.startWorkflowExecution(data);
       setWorkflow(workflow);

        // Get the first step
        if (workflow.currentStepId) {
          try {
            const step = await workflowService.getWorkflowStep(workflow.currentStepId, user?.token || '');
            if (step.success && step.data) {
              setCurrentStep(step.data);
            } else {
              setCurrentStep(null);
            }
          } catch (_err) {
            setCurrentStep(null);
          }
        }

       toast.success('Flux de travail dÃ©marrÃ© avec succÃ¨s');
       return workflow;
    } catch (err: unknown) {
      const normalizedError = normalizeError(err);
      console.error('Failed to start workflow:', normalizedError);

       let errorMessage = 'Failed to start workflow';
       if (err instanceof Error) {
         errorMessage = err.message;
       } else {
         errorMessage = getErrorMessage(err);
       }

       toast.error(errorMessage);
      setError(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [workflowService, user?.token]);

  // Complete current step
  const completeStep = useCallback(async (data: CompleteStepDTO) => {
    if (!currentStep) {
      throw new Error('No current step to complete');
    }

    try {
      setLoading(true);
      setError(null);

      const result = await workflowService.completeStep(data.stepId, data);

      // Refresh workflow to get updated state
      await fetchWorkflow();

      toast.success('Ã‰tape terminÃ©e avec succÃ¨s');
      return result;
    } catch (err: unknown) {
      const normalizedError = normalizeError(err);
      console.error('Failed to complete step:', normalizedError);

       let errorMessage = 'Failed to complete step';
       if (err instanceof Error) {
         errorMessage = err.message;
       } else {
         errorMessage = getErrorMessage(err);
       }

       toast.error(errorMessage);
      setError(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentStep, workflowService, fetchWorkflow]);

  // Start step timing
  const startStepTiming = useCallback(async (data: StartTimingDTO) => {
    try {
      setError(null);

      await workflowService.startStepTiming(data);

      const timing = {
        startTime: Date.now(),
        stepId: data.stepId,
        isRunning: true
      };

      setStepTiming(timing as unknown as WorkflowTiming);

      toast.success('Minuterie dÃ©marrÃ©e');
      return timing;
    } catch (err) {
      console.error('Failed to start step timing:', err);

       let errorMessage = 'Failed to start timer';
       if (err instanceof Error) {
         errorMessage = err.message;
       }

       toast.error(errorMessage);
      setError(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    }
  }, [workflowService]);

  // Pause step timing
  const pauseStepTiming = useCallback(async () => {
    if (!currentStep || !workflow) return;

    try {
      setError(null);

       const result = await workflowService.pauseStepTiming(
         currentStep.id,
         workflow.id,
         user?.id || workflow.createdBy || ''
       );

       toast.success('Minuterie en pause');
      return result;
    } catch (err) {
      console.error('Failed to pause step timing:', err);

       let errorMessage = 'Failed to pause timer';
       if (err instanceof Error) {
         errorMessage = err.message;
       }

       toast.error(errorMessage);
      setError(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    }
  }, [currentStep, user?.id, workflow, workflowService]);

  // Resume step timing
  const resumeStepTiming = useCallback(async () => {
    if (!currentStep || !workflow) return;

    try {
      setError(null);

       const result = await workflowService.resumeStepTiming(
         currentStep.id,
         workflow.id,
         user?.id || workflow.createdBy || ''
       );

       toast.success('Minuterie reprise');
      return result;
    } catch (err) {
      console.error('Failed to resume step timing:', err);

       let errorMessage = 'Failed to resume timer';
       if (err instanceof Error) {
         errorMessage = err.message;
       }

       toast.error(errorMessage);
      setError(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    }
  }, [currentStep, user?.id, workflow, workflowService]);

  // Upload step photos
  const uploadStepPhotos = useCallback(async (
    photos: Array<{
      file: File;
      angle: PPFPhotoAngle;
      category: PPFPhotoCategory;
      notes?: string;
    }>
  ) => {
    if (!workflow || !currentStep || !taskId) {
      throw new Error('No active workflow or step');
    }

    try {
      setUploading(true);
      setError(null);

      const uploadPromises = photos.map(photo =>
        taskPhotoService.uploadPhoto(photo.file, taskId, 'during', {
          description: photo.notes,
          stepId: currentStep.id
        })
      );

      const results = await Promise.all(uploadPromises);
      const urls = results.filter(r => r.success).map(r => r.photo!.url);

      if (results.some(r => !r.success)) {
        throw new Error('Some photos failed to upload');
      }

        // Refresh current step to get updated photos
        try {
          const step = await workflowService.getWorkflowStep(currentStep.id, user?.token || '');
          if (step.success && step.data) {
            setCurrentStep(step.data);
          } else {
            setCurrentStep(null);
          }
        } catch (_err) {
          setCurrentStep(null);
        }

      toast.success(`${urls.length} photo(s) tÃ©lÃ©versÃ©e(s) avec succÃ¨s`);
      return urls;
    } catch (err) {
      console.error('Failed to upload photos:', err);

       let errorMessage = 'Failed to upload photos';
        if (err instanceof Error) {
          errorMessage = err.message;
        }

        toast.error(errorMessage);
      setError(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    } finally {
      setUploading(false);
    }
  }, [workflow, currentStep, taskId, workflowService, user?.token]);

  // Auto-save step data
  const saveStepData = useCallback(async (stepData: WorkflowStepData) => {
    if (!workflow || !currentStep) return;

    try {
      setSavingStep(true);
      setError(null);

       await workflowService.updateStepData(
         currentStep.id,
         workflow.id,
         stepData as {
           notes?: string;
           photos?: string[];
           checklistCompletion?: Record<string, boolean>;
           customData?: JsonRecord;
         },
         user?.id || workflow.createdBy || ''
        );

        return;
    } catch (err) {
      console.error('Failed to save step data:', err);

       let errorMessage = 'Failed to save step data';
       if (err instanceof Error) {
         errorMessage = err.message;
       }

       // Don't show toast for auto-save failures, just log
       console.warn('Auto-save failed:', errorMessage);
      setError(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    } finally {
      setSavingStep(false);
    }
  }, [workflow, currentStep, workflowService, user?.id]);

  // Pause workflow
  const pauseWorkflow = useCallback(async (_reason?: string, _notes?: string) => {
    if (!workflow) return;

    try {
      setLoading(true);
      setError(null);

        const updatedWorkflow = await workflowService.pauseWorkflow(workflow.id, user?.token || '');

        if (updatedWorkflow.success && updatedWorkflow.data) {
          setWorkflow(updatedWorkflow.data);
        }
      toast.success('Flux de travail en pause');
      return updatedWorkflow;
    } catch (err) {
      console.error('Failed to pause workflow:', err);

       let errorMessage = 'Failed to pause workflow';
       if (err instanceof Error) {
         errorMessage = err.message;
       }

       toast.error(errorMessage);
      setError(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.token, workflow, workflowService]);

  // Resume workflow
  const resumeWorkflow = useCallback(async (_notes?: string) => {
    if (!workflow) return;

    try {
      setLoading(true);
      setError(null);

          const updatedWorkflow = await workflowService.resumeWorkflow(workflow.id, user?.token || '');

        if (updatedWorkflow.success && updatedWorkflow.data) {
          setWorkflow(updatedWorkflow.data);
        }

        // Refresh current step
        if (updatedWorkflow.success && updatedWorkflow.data && updatedWorkflow.data.currentStepId) {
          try {
            const step = await workflowService.getWorkflowStep(updatedWorkflow.data.currentStepId, user?.token || '');
            if (step.success && step.data) {
              setCurrentStep(step.data);
            } else {
              setCurrentStep(null);
            }
          } catch (_err) {
            setCurrentStep(null);
          }
        }

      toast.success('Flux de travail repris');
      return updatedWorkflow;
    } catch (err) {
      console.error('Failed to resume workflow:', err);

       let errorMessage = 'Failed to resume workflow';
       if (err instanceof Error) {
         errorMessage = err.message;
       }

       toast.error(errorMessage);
      setError(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.token, workflow, workflowService]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch && taskId) {
      fetchWorkflow();
    }
  }, [autoFetch, taskId, fetchWorkflow]);

  // Polling for real-time updates
  useEffect(() => {
    if (!enablePolling || !taskId || !workflow) return;

    const interval = setInterval(() => {
      fetchWorkflow();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [enablePolling, taskId, workflow, pollingInterval, fetchWorkflow]);

  // Computed values
  const isWorkflowActive = workflow && workflow.status === 'in_progress';
  const isTimerRunning = stepTiming && !stepTiming.isPaused && !stepTiming.endTime;
  const canCompleteStep = currentStep && currentStep.status === 'in_progress';
  const progress = workflow && workflow.steps ?
    (workflow.steps.filter(s => s.status === 'completed').length / workflow.steps.length) * 100 : 0;

  return {
    // State
    workflow,
    currentStep,
    stepTiming,
    loading,
    error,
    uploading,
    savingStep,

    // Actions
    fetchWorkflow,
    startWorkflow,
    completeStep,
    startStepTiming,
    pauseStepTiming,
    resumeStepTiming,
    uploadStepPhotos,
    saveStepData,
    pauseWorkflow,
    resumeWorkflow,

    // Computed
    isWorkflowActive,
    isTimerRunning,
    canCompleteStep,
    progress,

    // Helper functions
    refreshWorkflow: () => fetchWorkflow(),
    clearError: () => setError(null)
  };
};

export default useWorkflow;


