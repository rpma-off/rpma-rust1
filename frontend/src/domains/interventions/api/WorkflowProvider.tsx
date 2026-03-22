'use client';

import { createContext, useContext, ReactNode, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  WorkflowExecution,
  WorkflowExecutionStep,
  WorkflowStepStatus,
  TaskWorkflowProgress,
  SignatureType,
  CreateWorkflowExecutionDTO,
  StartTimingDTO,
  SignatureDTO,
} from '@/types/workflow.types';
import { PPFInterventionData } from '@/types/ppf-intervention';
import type {
  JsonRecord,
  UnknownRecord,
  StringRecord
} from '@/types/utility.types';
import {
  normalizeError,
  safeString,
  isNonNullObject
} from '@/types/type-utils';
import { useAuth } from '@/shared/hooks/useAuth';
import { getWorkflowServiceInstance } from '../services/workflow-service-adapter';
import {
  mapPpfStepToWorkflowExecutionStep,
  mapPPFInterventionToWorkflowExecution,
} from './workflow-mapping';

// Interface for step data updates
interface StepData {
  notes?: string;
  photos?: string[];
  checklistCompletion?: StringRecord | Record<string, boolean>;
  customData?: JsonRecord;
}

// Type for step completion data
interface StepCompletionData {
  notes?: string;
  checklistCompletion?: Record<string, boolean>;
  [key: string]: unknown;
}

// Type for step status update data
interface StepStatusUpdateData extends UnknownRecord {
  notes?: string;
  completedAt?: string;
  updatedAt?: string;
}

interface WorkflowContextType {
  // Current workflow state
  workflow: WorkflowExecution | null;
  steps: WorkflowExecutionStep[];
  currentStep: WorkflowExecutionStep | null;
  progress: Record<string, TaskWorkflowProgress>;
  isLoading: boolean;
  error: { message: string; code?: string } | null;
  
  // Navigation state
  isFirstStep: boolean;
  isLastStep: boolean;
  
  // Actions
  loadWorkflow: (taskId: string) => Promise<void>;
  startWorkflow: (data: CreateWorkflowExecutionDTO) => Promise<void>;
  startStep: (stepId: string) => Promise<void>;
  completeStep: (stepId: string, data?: StepCompletionData) => Promise<void>;
  skipStep: (stepId: string, reason?: string) => Promise<void>;
  goToStep: (stepId: string) => Promise<void>;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
   updateStepData: (stepId: string, data: StepData) => Promise<void>;
  updateStepStatus: (stepId: string, status: WorkflowStepStatus, data?: StepStatusUpdateData) => void;
  
  // Timing actions (Chronomï¿½tre)
  startTiming: (stepId: string) => Promise<void>;
  pauseTiming: (stepId: string) => Promise<void>;
  resumeTiming: (stepId: string) => Promise<void>;
  
  // Signature actions
  addSignature: (signatureType: SignatureType, signatureData: string) => Promise<void>;
  
  // Photo actions
  uploadPhotos: (stepId: string, files: File[]) => Promise<string[]>;
  
  // Status helpers
  isStepComplete: (stepId: string) => boolean;
  isStepInProgress: (stepId: string) => boolean;
  isStepSkipped: (stepId: string) => boolean;
  getStepProgress: (stepId: string) => TaskWorkflowProgress | undefined;
  
  // Utility methods
  getProgressPercentage: () => number;
  getCurrentStepIndex: () => number;
  canProceedToNextStep: () => boolean;
  resetWorkflow: () => void;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export function WorkflowProvider({
  children,
  taskId,
  initialWorkflow,
}: {
  children: ReactNode;
  taskId: string;
  initialWorkflow?: PPFInterventionData | null;
}) {
  const { user } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────────
  const [workflow, setWorkflow] = useState<WorkflowExecution | null>(null);
  const [steps, setSteps] = useState<WorkflowExecutionStep[]>([]);
  const [progress, setProgress] = useState<Record<string, TaskWorkflowProgress>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);

  // ── Service ────────────────────────────────────────────────────────────────
  // Use lazy import to avoid circular dependency between interventions and tasks domains
  const workflowServiceRef = useRef<ReturnType<typeof getWorkflowServiceInstance> | null>(null);

  if (!workflowServiceRef.current) {
    workflowServiceRef.current = getWorkflowServiceInstance();
  }
  const workflowService = workflowServiceRef.current;
  // Prevent duplicate loads in StrictMode/dev due to double-invoked effects
  const loadInProgressRef = useRef<string | null>(null);
  const lastLoadedTaskRef = useRef<string | null>(null);

  const loadWorkflow = useCallback(async (taskId: string) => {
    if (!user) return;
    
    try {
      console.info('[WorkflowContext] Loading workflow for task:', taskId);
      // Guard: if the same task is currently loading, skip duplicate call
      if (loadInProgressRef.current === taskId) {
        return;
      }
      loadInProgressRef.current = taskId;
      setIsLoading(true);
      setError(null);
      
      const workflowData = await workflowService.getWorkflowByTaskId(taskId);
      
      if (workflowData) {
        console.info('[WorkflowContext] Workflow loaded:', workflowData);
        setWorkflow(workflowData);
        
        // Load steps for this workflow
        const stepsData = await workflowService.getWorkflowSteps(workflowData.id);
        setSteps(stepsData || []);
      } else {
        console.info('[WorkflowContext] No workflow found for task:', taskId);
        setWorkflow(null);
        setSteps([]);
      }
    } catch (error: unknown) {
      console.error('[WorkflowContext] Error loading workflow:', error);
      setError(normalizeError(error));
    } finally {
      setIsLoading(false);
      lastLoadedTaskRef.current = taskId;
      loadInProgressRef.current = null;
    }
  }, [user, workflowService]);

  // ── Effects ───────────────────────────────────────────────────────────────
  // Load workflow when component mounts or taskId changes, or use initialWorkflow
  useEffect(() => {
    if (initialWorkflow) {
      console.info('[WorkflowContext] Using initial workflow from props.');
      setWorkflow(mapPPFInterventionToWorkflowExecution(initialWorkflow));
      setSteps(initialWorkflow.steps?.map(mapPpfStepToWorkflowExecutionStep) || []);
    } else if (taskId && user) {
      // Avoid immediate duplicate loads for the same task
      if (lastLoadedTaskRef.current !== taskId) {
        loadWorkflow(taskId);
      }
    }
    // mapPPFInterventionToWorkflowExecution and mapPpfStepToWorkflowExecutionStep are
    // pure module-level functions — they are stable and do not belong in deps.
    // We intentionally exclude `steps` from deps to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, user, loadWorkflow, initialWorkflow]);

  // Create progress map for steps
  const progressMap = useMemo(() => {
    const progressMap: Record<string, TaskWorkflowProgress> = {};
    
    steps.forEach(step => {
      progressMap[step.id] = {
        id: step.id,
        taskId: taskId,
        workflowId: taskId,
        currentStep: 1,
        totalSteps: steps.length,
        completionPercentage: step.status === 'completed' ? 100 : 0,
        estimatedTimeRemaining: 0,
        status: step.status,
        started_at: step.startedAt || undefined,
        completed_at: step.completedAt || null
      };
    });
    
    return progressMap;
  }, [steps, taskId]);

  // Derived current step — pure computation from workflow + steps, no extra state needed
  const currentStep = useMemo(
    () => workflow?.currentStepId
      ? (steps.find(s => s.id === workflow.currentStepId) ?? null)
      : null,
    [workflow, steps]
  );

  // Merge base progress (derived from steps) with any optimistic overrides
  const effectiveProgress = useMemo(
    () => ({ ...progressMap, ...progress }),
    [progressMap, progress]
  );

  // ── Step handlers ─────────────────────────────────────────────────────────
  const startTiming = useCallback(async (stepId: string) => {
    if (!workflow || !user) return;
    
    try {
      const timingData: StartTimingDTO = {
        stepId,
        workflowExecutionId: workflow.id,
        startedBy: user.id
      };
      
      await workflowService.startStepTiming(timingData);
      
    } catch (error: unknown) {
      console.error('Error starting timing:', normalizeError(error));
      // Don't throw here as timing is not critical for workflow progression
    }
  }, [workflow, user, workflowService]);

  const startWorkflow = useCallback(async (data: CreateWorkflowExecutionDTO): Promise<void> => {
    if (!user) return;
    try {
      setError(null);
      const newWorkflow = await workflowService.startWorkflowExecution(data);
      
      if (newWorkflow) {
        setWorkflow(newWorkflow);
        await loadWorkflow(data.taskId);
      }
    } catch (error: unknown) {
      console.error('Error starting workflow:', normalizeError(error));
      setError(normalizeError(error));
    }
  }, [user, workflowService, loadWorkflow]);

  const startStep = useCallback(async (stepId: string) => {
    if (!workflow || !user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Call the service to update step status in the backend
      await workflowService.startStep(stepId, workflow.id, user.id);

      // Reload the workflow to get updated state from the backend
      await loadWorkflow(taskId);
      
      // Start timing for the step
      await startTiming(stepId);
      
    } catch (err) {
      const normalizedError = normalizeError(err);
      console.error('Error starting step:', normalizedError);
      setError(normalizedError);
      throw normalizedError;
    } finally {
      setIsLoading(false);
    }
  }, [workflow, user, workflowService, loadWorkflow, taskId, startTiming]);

  const completeStep = useCallback(async (stepId: string, data?: StepCompletionData): Promise<void> => {
    if (!workflow || !user) return;
    try {
      setError(null);
      await workflowService.completeStep(stepId, {
        workflowExecutionId: workflow.id,
        completedBy: user.id,
        notes: data?.notes ? safeString(data.notes) : undefined,
        checklistCompletion: isNonNullObject(data?.checklistCompletion) ? data.checklistCompletion as Record<string, boolean> : undefined
      });

      await loadWorkflow(workflow.taskId);
    } catch (err) {
      const normalizedError = normalizeError(err);
      console.error('Error completing step:', normalizedError);
      setError(normalizedError);
    }
  }, [workflow, user, workflowService, loadWorkflow]);

  const skipStep = useCallback(async (stepId: string, reason?: string) => {
    if (!workflow || !user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      await workflowService.skipStep(stepId, workflow.id, user.id, reason);
      
      // Reload the workflow to get updated state
      await loadWorkflow(taskId);
      
    } catch (err) {
      const normalizedError = normalizeError(err);
      console.error('Error skipping step:', normalizedError);
      setError(normalizeError(err));
      throw normalizeError(err);
    } finally {
      setIsLoading(false);
    }
  }, [workflow, user, workflowService, loadWorkflow, taskId]);

  const goToStep = useCallback(async (stepId: string) => {
    if (!workflow || !user) return;
    
    try {
      const step = steps.find(s => s.id === stepId);
      if (!step) {
        throw new Error('Step not found');
      }
      
      // Update workflow current step
      await workflowService.updateWorkflowExecution(workflow.id, {
        currentStepId: stepId
      });

      // Reload workflow to ensure consistency — currentStep is derived from workflow
      await loadWorkflow(taskId);
      
    } catch (err) {
      const normalizedError = normalizeError(err);
      console.error('Error navigating to step:', normalizedError);
      setError(normalizedError);
      throw normalizedError;
    }
  }, [workflow, user, steps, workflowService, loadWorkflow, taskId]);

   const updateStepData = useCallback(async (stepId: string, data: StepData) => {
    if (!workflow || !user) return;
    
    try {
       // Update in database
        await workflowService.updateStepData(
          stepId,
          workflow.id,
          {
            notes: data.notes,
            photos: data.photos,
            checklistCompletion: data.checklistCompletion as Record<string, boolean> | undefined,
            customData: data.customData,
          },
          user.id
        );

      // Reload the workflow to ensure consistency with backend
      await loadWorkflow(taskId);
      
    } catch (err) {
      const normalizedError = normalizeError(err);
      console.error('Error updating step data:', normalizedError);
      setError(normalizedError);
      throw normalizedError;
    }
  }, [workflow, user, workflowService, loadWorkflow, taskId]);

  const pauseTiming = useCallback(async (stepId: string) => {
    if (!workflow || !user) return;
    
    try {
      await workflowService.pauseStepTiming(stepId, workflow.id, user.id);
    } catch (err) {
      console.error('Error pausing timing:', normalizeError(err));
      // Don't throw here as timing is not critical for workflow progression
    }
  }, [workflow, user, workflowService]);

  const resumeTiming = useCallback(async (stepId: string) => {
    if (!workflow || !user) return;
    
    try {
      await workflowService.resumeStepTiming(stepId, workflow.id, user.id);
    } catch (err) {
      console.error('Error resuming timing:', normalizeError(err));
      // Don't throw here as timing is not critical for workflow progression
    }
  }, [workflow, user, workflowService]);

  const addSignature = useCallback(async (signatureType: SignatureType, signatureData: string) => {
    if (!workflow || !user) return;

    try {
      const signatureDataDTO: SignatureDTO = {
        workflowExecutionId: workflow.id,
        stepId: workflow.currentStepId || '',
        userId: user.id,
        signatureType,
        signature: signatureData,
        ipAddress: undefined, // Could be added later
        userAgent: navigator.userAgent
      };

      if (!signatureDataDTO.stepId) {
        console.error('Cannot add signature: stepId is missing.');
        return;
      }
      // TypeScript now knows stepId is a string
      await workflowService.addSignature({
        ...signatureDataDTO,
        stepId: signatureDataDTO.stepId
      });

    } catch (err) {
      const normalizedError = normalizeError(err);
      console.error('Error adding signature:', normalizedError);
      setError(normalizedError);
      throw normalizedError;
    }
  }, [workflow, user, workflowService]);

  // Photo actions
  const uploadPhotos = useCallback(async (stepId: string, files: File[]): Promise<string[]> => {
    if (!workflow || !user) {
      throw new Error('Workflow not initialized or user not authenticated');
    }

    try {
      setIsLoading(true);
      setError(null);

      // Upload photos using the workflow service
      const { urls } = await workflowService.uploadStepPhotos(
        workflow.id,
        stepId,
        files,
        user.id
      );

      // Update the step with the new photos
      const updatedSteps = steps.map(step => {
        if (step.id === stepId) {
          return {
            ...step,
            photos: [...(step.photos || []), ...urls]
          };
        }
        return step;
      });

      setSteps(updatedSteps);

      return urls;
    } catch (err) {
      const normalizedError = normalizeError(err);
      console.error('Error uploading photos:', normalizedError);
      setError(normalizedError);
      throw normalizedError;
    } finally {
      setIsLoading(false);
    }
  }, [workflow, user, workflowService, steps]);

  // ── Status helpers ────────────────────────────────────────────────────────
  // Status helper methods
  const isStepComplete = useCallback((stepId: string): boolean => {
    return effectiveProgress[stepId]?.status === 'completed';
  }, [effectiveProgress]);

  const isStepInProgress = useCallback((stepId: string): boolean => {
    return effectiveProgress[stepId]?.status === 'in_progress';
  }, [effectiveProgress]);

  const isStepSkipped = useCallback((stepId: string): boolean => {
    return effectiveProgress[stepId]?.status === 'skipped';
  }, [effectiveProgress]);

  const getStepProgress = useCallback((stepId: string): TaskWorkflowProgress | undefined => {
    return effectiveProgress[stepId];
  }, [effectiveProgress]);

  // Utility methods
  const getProgressPercentage = useCallback((): number => {
    if (steps.length === 0) return 0;
    
    const completedSteps = steps.filter(step => 
      step.status === 'completed' || step.status === 'skipped'
    );
    
    return Math.round((completedSteps.length / steps.length) * 100);
  }, [steps]);

  const getCurrentStepIndex = useCallback((): number => {
    if (!currentStep) return -1;
    return steps.findIndex(step => step.id === currentStep.id);
  }, [currentStep, steps]);

  const canProceedToNextStep = useCallback((): boolean => {
    if (!currentStep) return false;
    
    // Check if current step is completed
    if (currentStep.status !== 'completed') return false;
    
    // Check if there's a next step
    const currentIndex = getCurrentStepIndex();
    return currentIndex < steps.length - 1;
  }, [currentStep, getCurrentStepIndex, steps.length]);

  const resetWorkflow = useCallback(() => {
    setWorkflow(null);
    setSteps([]);
    setProgress({});
    setError(null);
  }, []);

  // Navigation methods
  const isFirstStep = useMemo(() => {
    if (!currentStep || !steps.length) return false;
    const firstStep = steps[0];
    return firstStep?.id === currentStep.id;
  }, [currentStep, steps]);

  const isLastStep = useMemo(() => {
    if (!currentStep || !steps.length) return false;
    const lastStep = steps[steps.length - 1];
    return lastStep?.id === currentStep.id;
  }, [currentStep, steps]);

  const goToNextStep = useCallback(() => {
    if (!currentStep || isLastStep) return;
    
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      if (nextStep) goToStep(nextStep.id);
    }
  }, [currentStep, isLastStep, getCurrentStepIndex, steps, goToStep]);

  const goToPreviousStep = useCallback(() => {
    if (!currentStep || isFirstStep) return;
    
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      const prevStep = steps[currentIndex - 1];
      if (prevStep) goToStep(prevStep.id);
    }
  }, [currentStep, isFirstStep, getCurrentStepIndex, steps, goToStep]);

  const updateStepStatus = useCallback((stepId: string, status: WorkflowStepStatus, data: StepStatusUpdateData = {}) => {
    setProgress(prev => ({
      ...prev,
      [stepId]: {
        ...prev[stepId],
        status,
        updated_at: new Date().toISOString(),
        ...data
      } as TaskWorkflowProgress,
    }));
  }, []);



  // Context value
  const value = useMemo<WorkflowContextType>(() => ({
    // State
    workflow,
    steps,
    currentStep,
    progress: effectiveProgress,
    isLoading,
    error,
    
    // Navigation state
    isFirstStep,
    isLastStep,
    
    // Actions
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
    
    // Timing actions
    startTiming,
    pauseTiming,
    resumeTiming,
    
    // Signature actions
    addSignature,
    
    // Photo actions
    uploadPhotos,
    
    // Status helpers
    isStepComplete,
    isStepInProgress,
    isStepSkipped,
    getStepProgress,
    
    // Utility methods
    getProgressPercentage,
    getCurrentStepIndex,
    canProceedToNextStep,
    resetWorkflow
  }), [
    workflow, steps, currentStep, effectiveProgress, isLoading, error,
    isFirstStep, isLastStep,
    loadWorkflow, startWorkflow, startStep, completeStep, skipStep,
    goToStep, goToNextStep, goToPreviousStep, updateStepData, updateStepStatus,
    startTiming, pauseTiming, resumeTiming,
    addSignature,
    uploadPhotos,
    isStepComplete, isStepInProgress, isStepSkipped, getStepProgress,
    getProgressPercentage, getCurrentStepIndex, canProceedToNextStep, resetWorkflow
  ]);

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow(): WorkflowContextType {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}


