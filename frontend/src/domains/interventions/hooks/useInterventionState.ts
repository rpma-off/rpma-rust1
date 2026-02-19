import { useState, useEffect, useCallback } from 'react';
import type {
  PPFInterventionData,
  PPFInterventionStep,
} from '@/types/ppf-intervention';

interface UseInterventionStateProps {
  initialIntervention?: PPFInterventionData | null;
  onInterventionChange?: (intervention: PPFInterventionData) => void;
  onStepChange?: (step: PPFInterventionStep) => void;
}

export function useInterventionState({
  initialIntervention = null,
  onInterventionChange,
  onStepChange,
}: UseInterventionStateProps = {}) {
  // Core state management
  const [intervention, setIntervention] = useState<PPFInterventionData | null>(initialIntervention);
  const [currentStep, setCurrentStep] = useState<PPFInterventionStep | null>(null);
  const [allSteps, setAllSteps] = useState<PPFInterventionStep[]>([]);

  // Form state
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Trigger callbacks when state changes
  useEffect(() => {
    if (intervention) {
      onInterventionChange?.(intervention);
    }
  }, [intervention, onInterventionChange]);

  useEffect(() => {
    if (currentStep) {
      onStepChange?.(currentStep);
    }
  }, [currentStep, onStepChange]);

  // State update helpers
  const updateIntervention = useCallback((updates: Partial<PPFInterventionData>) => {
    setIntervention(prev => prev ? { ...prev, ...updates } : null);
    setIsDirty(true);
  }, []);

  const updateCurrentStep = useCallback((step: PPFInterventionStep | null) => {
    setCurrentStep(step);
  }, []);

  const updateAllSteps = useCallback((steps: PPFInterventionStep[]) => {
    setAllSteps(steps);
  }, []);

  const markAsSaved = useCallback(() => {
    setIsDirty(false);
    setLastSaved(new Date());
  }, []);

  const reset = useCallback(() => {
    setIntervention(null);
    setCurrentStep(null);
    setAllSteps([]);
    setIsDirty(false);
    setLastSaved(null);
  }, []);

  return {
    // State
    intervention,
    currentStep,
    allSteps,
    isDirty,
    lastSaved,

    // Actions
    updateIntervention,
    updateCurrentStep,
    updateAllSteps,
    markAsSaved,
    reset,
  };
}