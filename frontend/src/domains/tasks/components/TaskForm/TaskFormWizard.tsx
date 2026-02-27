"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/domains/auth';
import { X } from 'lucide-react';
import { useTaskForm } from './useTaskForm';
import { FormStep, TaskFormProps, ENHANCED_STEPS as STEPS_CONFIG } from './types';
import { TaskFormHeader } from './TaskFormHeader';
import { TaskFormProgress } from './TaskFormProgress';
import { TaskActionBar } from './TaskActionBar';
import { useTaskFormSubmission } from './TaskFormSubmission';
import { useTaskFormSteps } from './TaskFormSteps';

const TaskFormWizard: React.FC<TaskFormProps> = React.memo(({
  onSuccess,
  initialData,
  isEditing = false,
  className = '',
  showHeader = true
}) => {
  const { user, session, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const sessionToken = user?.token;
  const [currentStep, setCurrentStep] = useState<FormStep>('vehicle');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Set<FormStep>>(new Set());

  const clientIdFromUrl = searchParams?.get('clientId');

  const mergedInitialData = useMemo(() => {
    const data = { ...initialData };
    if (clientIdFromUrl && !data.client_id) {
      data.client_id = clientIdFromUrl;
    }
    return data;
  }, [initialData, clientIdFromUrl]);

  const {
    formData,
    updateFormData,
    loading,
    setLoading,
    error,
    setError,
    taskNumber,
    validateStep,
    canProceedToNextStep,
    isDirty,
    lastSaved,
    autoSave,
    clearDraft,
  } = useTaskForm(user?.user_id, mergedInitialData);

  const stepsConfig = useMemo(() => STEPS_CONFIG, []);

  useEffect(() => {
    if (autoSaveEnabled && isDirty && !loading) {
      const timer = setTimeout(() => {
        autoSave();
      }, 2000);
      return () => clearTimeout(timer);
    }
    return () => {};
  }, [autoSaveEnabled, isDirty, loading, autoSave]);

  useEffect(() => {
    const newlyCompleted = new Set<FormStep>();
    stepsConfig.forEach(step => {
      if (canProceedToNextStep(step.id)) {
        newlyCompleted.add(step.id);
      }
    });
    setCompletedSteps(newlyCompleted);
  }, [formData, stepsConfig, canProceedToNextStep]);

  const handleFormChange = useCallback((changes: Partial<typeof formData>) => {
    updateFormData(changes);
    const newErrors = { ...formErrors };
    Object.keys(changes).forEach(key => {
      if (newErrors[key]) {
        delete newErrors[key];
      }
    });
    setFormErrors(newErrors);
  }, [updateFormData, formErrors, setFormErrors]);

  const { handleSubmit } = useTaskFormSubmission({
    formData,
    validateStep,
    setLoading,
    setError,
    setCurrentStep,
    onSuccess: (task) => {
      clearDraft?.();
      onSuccess?.(task);
    }
  });

  const handleStepComplete = useCallback((step: FormStep) => {
    setCompletedSteps(prev => new Set([...prev, step]));
  }, []);

  const {
    renderStepContent,
    handleNextStep,
    handlePreviousStep,
    handleStepClick
  } = useTaskFormSteps({
    currentStep,
    stepsConfig,
    formData,
    handleFormChange,
    formErrors,
    loading,
    sessionToken,
    canProceedToNextStep,
    setCurrentStep,
    setFormErrors,
    onStepComplete: handleStepComplete
  });

  if (authLoading) {
    return (
      <div className={`bg-slate-50 rounded-lg shadow-lg p-8 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-900 text-lg font-medium">Vérification de l'authentification...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user?.user_id || !session) {
    return (
      <div className={`bg-slate-50 rounded-lg shadow-lg p-8 ${className}`}>
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Authentification requise</h3>
          <p className="text-slate-600 mb-6">
            Vous devez être connecté pour créer une tâche. Veuillez vous connecter et réessayer.
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors duration-200"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  const currentStepIndex = stepsConfig.findIndex(s => s.id === currentStep);

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-xl ${className}`}>
      {showHeader && (
        <TaskFormHeader
          isEditing={isEditing}
          taskNumber={taskNumber}
          showHeader={showHeader}
          currentStepLabel={`Étape ${currentStepIndex + 1}/${stepsConfig.length}`}
          stepsCount={stepsConfig.length}
          currentStepIndex={currentStepIndex}
        />
      )}

      <form onSubmit={handleSubmit} className="flex flex-col min-h-[600px]">
        <TaskFormProgress
          currentStep={currentStep}
          canProceedToNextStep={canProceedToNextStep}
          onStepClick={handleStepClick}
          completedSteps={completedSteps}
        />

        <div className="flex-1 px-4 md:px-6">
          {renderStepContent()}
        </div>

        <TaskActionBar
          currentStep={currentStep}
          canProceedToNextStep={canProceedToNextStep}
          onNextStep={handleNextStep}
          onPreviousStep={handlePreviousStep}
          autoSaveEnabled={autoSaveEnabled}
          onAutoSaveToggle={setAutoSaveEnabled}
          isDirty={isDirty}
          onAutoSave={autoSave}
          loading={loading}
          onSubmit={handleSubmit}
        />

        {error && (
          <div className="mx-4 mb-4 md:mx-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <X className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-500 mb-1">Erreur de validation</h4>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
});

TaskFormWizard.displayName = 'TaskFormWizard';

export default TaskFormWizard;
