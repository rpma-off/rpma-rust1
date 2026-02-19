import { useCallback } from 'react';
import type { PPFInterventionData, PPFInterventionStep } from '@/types/ppf-intervention';

interface UseInterventionUtilsProps {
  intervention: PPFInterventionData | null;
  currentStep: PPFInterventionStep | null;
  allSteps: PPFInterventionStep[];
}

export function useInterventionUtils({
  intervention,
  currentStep,
  allSteps,
}: UseInterventionUtilsProps) {
  // Progress calculation
  const getProgress = useCallback(() => {
    const completed = allSteps.filter(step => step.status === 'completed').length;
    const total = allSteps.length;
    return {
      current: completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [allSteps]);

  // Time tracking
  const getTimeElapsed = useCallback(() => {
    const now = new Date();
    const stepElapsed = currentStep?.started_at ?
      Math.floor((now.getTime() - new Date(currentStep.started_at).getTime()) / (1000 * 60)) : 0;
    const totalElapsed = intervention?.actual_start ?
      Math.floor((now.getTime() - new Date(intervention.actual_start).getTime()) / (1000 * 60)) : 0;
    return { step: stepElapsed, total: totalElapsed };
  }, [currentStep, intervention]);

  // Status helpers
  const isInterventionActive = useCallback(() => {
    return intervention?.status === 'in_progress';
  }, [intervention]);

  const isInterventionCompleted = useCallback(() => {
    return intervention?.status === 'completed';
  }, [intervention]);

  const isCurrentStepCompleted = useCallback(() => {
    return currentStep?.status === 'completed';
  }, [currentStep]);

  const getCompletionStatus = useCallback(() => {
    const progress = getProgress();
    if (progress.percentage === 100) return 'completed';
    if (progress.percentage > 0) return 'in_progress';
    return 'not_started';
  }, [getProgress]);

  return {
    // Progress
    getProgress,

    // Time tracking
    getTimeElapsed,

    // Status helpers
    isInterventionActive,
    isInterventionCompleted,
    isCurrentStepCompleted,
    getCompletionStatus,
  };
}