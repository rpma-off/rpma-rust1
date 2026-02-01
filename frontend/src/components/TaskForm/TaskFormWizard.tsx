"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/compatibility';
import { X } from 'lucide-react';
import { useTaskForm } from './useTaskForm';
import { FormStep, TaskFormProps, ENHANCED_STEPS as STEPS_CONFIG } from './types';
import { TaskFormHeader } from './TaskFormHeader';
import { TaskFormProgress } from './TaskFormProgress';
import { TaskFormNavigation } from './TaskFormNavigation';
import { TaskFormSubmit } from './TaskFormSubmit';
import { TaskFormAutoSaveStatus } from './TaskFormAutoSaveStatus';
import { useTaskFormSubmission } from './TaskFormSubmission';
import { useTaskFormSteps } from './TaskFormSteps';

/**
 * Enhanced Task Creation Form Wizard
 *
 * Main orchestration component that coordinates:
 * - Form state management via useTaskForm
 * - Step navigation and rendering via useTaskFormSteps
 * - Form submission via useTaskFormSubmission
 * - Authentication and loading states
 */
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
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);

  // Get clientId from URL params if present
  const clientIdFromUrl = searchParams?.get('clientId');

  // Merge initial data with clientId from URL
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
    autoSave,
  } = useTaskForm(user?.user_id, mergedInitialData);

  // Memoized step configuration to prevent unnecessary re-renders
  const stepsConfig = useMemo(() => STEPS_CONFIG, []);

  // Auto-save functionality with useCallback
  useEffect(() => {
    if (autoSaveEnabled && isDirty && !loading) {
      const timer = setTimeout(() => {
        autoSave();
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timer);
    }
    return () => {};
  }, [autoSaveEnabled, isDirty, loading, autoSave]);

  // Form change handler
  const handleFormChange = useCallback((changes: Partial<typeof formData>) => {
    updateFormData(changes);
    // Clear errors for changed fields
    const newErrors = { ...formErrors };
    Object.keys(changes).forEach(key => {
      if (newErrors[key]) {
        delete newErrors[key];
      }
    });
    setFormErrors(newErrors);
  }, [updateFormData, formErrors, setFormErrors]);

  // Use the submission hook
  const { handleSubmit } = useTaskFormSubmission({
    formData,
    validateStep,
    setLoading,
    setError,
    setCurrentStep,
    onSuccess
  });

  // Use the steps hook
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
    setFormErrors
  });

  if (authLoading) {
    return (
      <div className={`bg-muted rounded-lg shadow-lg p-8 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-white text-lg font-medium">Verifying authentication...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user?.user_id || !session) {
    return (
      <div className={`bg-muted rounded-lg shadow-lg p-8 ${className}`}>
        <div className="text-center py-12">
          <div className="text-red-400 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Authentication Required</h3>
          <p className="text-border-light mb-6">
            You must be logged in to create a task. Please log in and try again.
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="bg-accent text-foreground px-6 py-3 rounded-lg font-medium hover:bg-accent-hover transition-colors duration-200"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-border/5 rounded-xl border border-border/20 shadow-xl ${className}`}>
      <TaskFormHeader
        isEditing={isEditing}
        taskNumber={taskNumber}
        showHeader={showHeader}
      />

      <form onSubmit={handleSubmit} className="p-4 md:p-6">
        <TaskFormProgress
          currentStep={currentStep}
          canProceedToNextStep={canProceedToNextStep}
          onStepClick={handleStepClick}
        />

        {/* Current Step Content */}
        <div className="min-h-[300px] sm:min-h-[400px]">
          {renderStepContent()}
        </div>

        <TaskFormNavigation
          currentStep={currentStep}
          canProceedToNextStep={canProceedToNextStep}
          onNextStep={handleNextStep}
          onPreviousStep={handlePreviousStep}
          autoSaveEnabled={autoSaveEnabled}
          onAutoSaveToggle={setAutoSaveEnabled}
          isDirty={isDirty}
          onAutoSave={autoSave}
          loading={loading}
        />

        <TaskFormSubmit
          currentStep={currentStep}
          loading={loading}
          canProceedToNextStep={canProceedToNextStep}
        />

        {/* Enhanced Error Display */}
        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <X className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-400 mb-1">Erreur de validation</h4>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        <TaskFormAutoSaveStatus
          autoSaveEnabled={autoSaveEnabled}
          isDirty={isDirty}
        />
      </form>
    </div>
  );
});

TaskFormWizard.displayName = 'TaskFormWizard';

export default TaskFormWizard;