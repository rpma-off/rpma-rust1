"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth/compatibility';
import { toast } from 'sonner';
import { CheckCircle, X, Clock, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTaskForm } from './useTaskForm';
import { VehicleStep } from './steps/VehicleStep';
import { PPFStep } from './steps/PPFStep';
import { ScheduleStep } from './steps/ScheduleStep';
import { CustomerStep } from './steps/CustomerStep';
import { FormStep, TaskFormProps, ENHANCED_STEPS as STEPS_CONFIG } from './types';
import { Client, CreateTaskRequest, Task } from '@/lib/backend';
import { ipcClient } from '@/lib/ipc';
import { createLogger, LogContext } from '@/lib/utils/logger';

const logger = createLogger();

/**
 * Enhanced Task Creation Form
 * 
 * Features:
 * - 4-step wizard: Vehicle → Customer → PPF → Schedule
 * - Auto-save functionality
 * - Enhanced validation with real-time feedback
 * - Support for all database fields
 * - Better UX with animations and loading states
 * - Accessibility improvements
 * - Performance optimizations with memoization
 */
const TaskForm: React.FC<TaskFormProps> = React.memo(({ 
  onSuccess, 
  initialData,
  isEditing = false,
  className = '',
  showHeader = true 
}) => {
  const { user, session, loading: authLoading } = useAuth();
  const sessionToken = user?.token;
  const [currentStep, setCurrentStep] = useState<FormStep>('vehicle');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdTask, setCreatedTask] = useState<Task | null>(null);
  
  const {
    formData,
    updateFormData,
    loading,
    setLoading,
    error,
    setError,
    taskNumber,
    validateStep,
    isDirty,
    autoSave,
    canProceedToNextStep,
  } = useTaskForm(user?.id, initialData);

  // Memoized step configuration to prevent unnecessary re-renders
  const stepsConfig = useMemo(() => STEPS_CONFIG, []);



  // Memoized progress calculation
  const progress = useMemo(() => {
    const currentIndex = stepsConfig.findIndex(s => s.id === currentStep);
    return ((currentIndex + 1) / stepsConfig.length) * 100;
  }, [currentStep, stepsConfig]);



  // Auto-save functionality with useCallback
  useEffect(() => {
    if (autoSaveEnabled && isDirty && !loading) {
      const timer = setTimeout(() => {
        autoSave();
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoSaveEnabled, isDirty, loading, autoSave]);

  // Memoized submit handler
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    logger.info(LogContext.TASK, 'TaskForm handleSubmit called', {
      hasUser: !!user?.id,
      hasSession: !!session,
      hasSessionToken: !!sessionToken,
      currentStep
    });

    if (!user?.id || !session) {
      logger.error(LogContext.TASK, 'TaskForm submit failed: missing authentication', {
        hasUser: !!user?.id,
        hasSession: !!session
      });
      setError('Veuillez vous connecter pour créer une tâche');
      return;
    }

    if (!sessionToken) {
      logger.error(LogContext.TASK, 'TaskForm submit failed: missing session token');
      setError('Token de session manquant. Veuillez vous reconnecter.');
      return;
    }
    
    // Validate all steps before submission
    const allSteps: FormStep[] = ['vehicle', 'customer', 'ppf', 'schedule'];
    const allErrors: Record<string, string> = {};
    
    for (const step of allSteps) {
      const { errors } = validateStep(step);
      Object.assign(allErrors, errors);
    }
    
    if (Object.keys(allErrors).length > 0) {
      setFormErrors(allErrors);
      setError('Veuillez corriger les erreurs dans le formulaire');
      // Navigate to first step with errors
      const firstErrorStep = allSteps.find(step => {
        const { errors } = validateStep(step);
        return Object.keys(errors).length > 0;
      });
      if (firstErrorStep) {
        setCurrentStep(firstErrorStep);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
// Prepare the task data for submission
      const {
        notes,
        vehicle_vin,
        ...restFormData
      } = formData;

      // Clean phone number by removing spaces for database
      const cleanFormData = { ...restFormData };
      if (cleanFormData.customer_phone) {
        // Remove all spaces and ensure proper format for database constraint
        cleanFormData.customer_phone = cleanFormData.customer_phone.replace(/\s/g, '');
      } else {
        // Set empty phone to undefined to satisfy database constraint
        cleanFormData.customer_phone = undefined;
      }

      // Check if we need to create a client record
      let clientId = formData.client_id;

      logger.debug(LogContext.TASK, 'Client handling started', {
        existingClientId: clientId,
        hasCustomerName: !!formData.customer_name?.trim(),
        hasCustomerEmail: !!formData.customer_email?.trim()
      });

      // If no client_id but customer information is provided, try to find or create a client
      if (!clientId && formData.customer_name && formData.customer_name.trim()) {
        try {
          logger.info(LogContext.TASK, 'Attempting to find or create client', {
            customerName: formData.customer_name,
            customerEmail: formData.customer_email
          });

          // First, try to find an existing client by email if email is provided
          if (formData.customer_email?.trim()) {
            try {
              logger.debug(LogContext.TASK, 'Searching for existing client by email');
              const clientListResponse = await ipcClient.clients.list({}, sessionToken);
              const clients = clientListResponse.data;
              logger.debug(LogContext.TASK, 'Client list response received', {
                count: clients.length
              });

              const existingClient = clients.find(
                (client: Client) => client.email?.toLowerCase() === formData.customer_email?.toLowerCase()
              );
              if (existingClient) {
                clientId = existingClient.id;
                logger.info(LogContext.TASK, 'Found existing client', { clientId: existingClient.id, clientName: existingClient.name });
              } else {
                logger.debug(LogContext.TASK, 'No existing client found with email');
              }
            } catch (clientSearchError) {
              logger.error(LogContext.TASK, 'Error searching for existing client', {
                error: clientSearchError instanceof Error ? clientSearchError.message : String(clientSearchError)
              });
              // Continue with client creation
            }
          }

           // If no existing client found, create a new one
           if (!clientId) {
             try {
               logger.info(LogContext.TASK, 'Creating new client');
               const createdClient = await ipcClient.clients.create({
                 name: formData.customer_name.trim(),
                 email: formData.customer_email?.trim() || undefined,
                 phone: formData.customer_phone?.replace(/\s/g, '') || undefined, // Remove spaces for database
                 address_street: formData.customer_address?.trim() || undefined,
                 address_city: undefined,
                 address_state: undefined,
                 address_zip: undefined,
                 address_country: undefined,
                 customer_type: 'individual' // Default to individual
               }, sessionToken);

               logger.debug(LogContext.TASK, 'Client creation response received', {
                 hasData: !!createdClient,
                 clientId: createdClient?.id
               });

               if (createdClient && createdClient.id) {
                 clientId = createdClient.id;
                 logger.info(LogContext.TASK, 'Client created successfully', { clientId });
               } else {
                 logger.error(LogContext.TASK, 'Client creation failed - no client returned');
                 // Continue with task creation even if client creation fails
               }
             } catch (clientCreateError) {
              logger.error(LogContext.TASK, 'Exception during client creation', {
                error: clientCreateError instanceof Error ? clientCreateError.message : String(clientCreateError)
              });
              // Continue with task creation
            }
          }
        } catch (clientError) {
          logger.error(LogContext.TASK, 'Unexpected error during client handling', {
            error: clientError instanceof Error ? clientError.message : String(clientError)
          });
          // Continue with task creation even if client creation fails
        }
      }

      // Create task data matching CreateTaskRequest structure exactly
      const taskData: CreateTaskRequest = {
        // Required fields
        vehicle_plate: cleanFormData.vehicle_plate,
        vehicle_model: cleanFormData.vehicle_model,
        ppf_zones: [
          ...(formData.ppf_zones || []),
          ...(formData.custom_ppf_zones || [])
        ].filter(Boolean),
        scheduled_date: formData.scheduled_date,

        // Optional fields matching CreateTaskRequest
        external_id: cleanFormData.external_id || null,
        status: 'scheduled' as const,
        technician_id: cleanFormData.technician_id || null,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        checklist_completed: cleanFormData.checklist_completed || false,
        notes: notes || null,

        // Additional optional fields
        title: cleanFormData.title || cleanFormData.task_number || 'Nouvelle tâche',
        vehicle_make: cleanFormData.vehicle_make || null,
        vehicle_year: cleanFormData.vehicle_year || null,
        vin: vehicle_vin || null,
        date_rdv: formData.scheduled_date || null,
        heure_rdv: formData.scheduled_time || null,
        lot_film: cleanFormData.lot_film || null,
        customer_name: cleanFormData.customer_name || null,
        customer_email: cleanFormData.customer_email || null,
        customer_phone: cleanFormData.customer_phone || null,
        customer_address: cleanFormData.customer_address || null,
        custom_ppf_zones: formData.custom_ppf_zones || null,
        template_id: cleanFormData.template_id || null,
        workflow_id: cleanFormData.workflow_id || null,
        task_number: cleanFormData.task_number || null,
        creator_id: cleanFormData.creator_id || null,
        created_by: cleanFormData.created_by || null,

  // Legacy fields for compatibility
  description: cleanFormData.description || null,
  priority: cleanFormData.priority || null,
  client_id: clientId || null,
  estimated_duration: cleanFormData.estimated_duration || null,
  tags: cleanFormData.tags || null
      };
      
      // Submit to the Tauri backend
      logger.info(LogContext.TASK, 'Creating task via IPC', {
        hasClientId: !!clientId,
        taskDataKeys: Object.keys(taskData),
        vehiclePlate: taskData.vehicle_plate,
        ppfZone: taskData.ppf_zones.join(', ')
      });

       const createdTask = await ipcClient.tasks.create(taskData, sessionToken);

       logger.debug(LogContext.TASK, 'Task creation response received', {
         hasData: !!createdTask,
         taskId: createdTask?.id
       });

        if (!createdTask) {
          logger.error(LogContext.TASK, 'Task creation failed - no task returned');
          throw new Error('Erreur lors de la création de la tâche');
        }
       logger.info(LogContext.TASK, 'Task created successfully', {
         taskId: createdTask.id,
         taskNumber: createdTask.task_number
       });

       // Set success state and store created task data
       setSuccess(true);
       setCreatedTask(createdTask);

        // Auto-redirect after 3 seconds
        setTimeout(() => {
          if (onSuccess) {
            onSuccess({ id: createdTask.id });
          }
        }, 3000);
    } catch (error: unknown) {
      logger.error(LogContext.TASK, 'TaskForm submit failed with exception', {
        error: error instanceof Error ? error.message : String(error),
        errorType: typeof error,
        stack: error instanceof Error ? error.stack : undefined
      });

      let errorMessage = 'Une erreur est survenue lors de la création de la tâche';

      // Handle specific error cases
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();

        logger.debug(LogContext.TASK, 'Analyzing error message for user-friendly response', {
          originalError: error.message,
          lowerCaseError: errorMsg
        });

        // Handle authentication errors
        if (errorMsg.includes('authentication') || errorMsg.includes('unauthorized') || errorMsg.includes('401')) {
          errorMessage = 'Votre session a expiré. Veuillez vous reconnecter.';
          logger.warn(LogContext.TASK, 'Authentication error detected');
        }
        // Handle validation errors
        else if (errorMsg.includes('validation') || errorMsg.includes('invalid')) {
          errorMessage = 'Veuillez vérifier les informations saisies.';
          logger.warn(LogContext.TASK, 'Validation error detected');
        }
        // Handle network errors
        else if (errorMsg.includes('fetch') || errorMsg.includes('network')) {
          errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.';
          logger.warn(LogContext.TASK, 'Network error detected');
        }
        // Handle IPC errors
        else if (errorMsg.includes('ipc') || errorMsg.includes('tauri')) {
          errorMessage = 'Erreur de communication avec le serveur. Vérifiez que l\'application est démarrée correctement.';
          logger.error(LogContext.TASK, 'IPC/Tauri error detected - backend may not be running');
        }
        // Use the original error message if it's user-friendly
        else if (error.message && error.message.length > 0 && !error.message.includes('Erreur lors')) {
          errorMessage = error.message;
          logger.info(LogContext.TASK, 'Using original error message as user-friendly');
        }
      }

      logger.info(LogContext.TASK, 'Displaying error to user', { errorMessage });
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      logger.debug(LogContext.TASK, 'TaskForm submit completed', { loading: false });
      setLoading(false);
    }
  }, [formData, validateStep, user?.id, session, onSuccess, setLoading, setError]);

  // Memoized step navigation handlers
  const handleNextStep = useCallback(() => {
    const currentIndex = stepsConfig.findIndex(s => s.id === currentStep);
    if (currentIndex < stepsConfig.length - 1) {
      const nextStep = stepsConfig[currentIndex + 1];
      if (canProceedToNextStep(currentStep)) {
        setCurrentStep(nextStep.id);
        setFormErrors({});
      }
    }
  }, [currentStep, stepsConfig, canProceedToNextStep]);

  const handlePreviousStep = useCallback(() => {
    const currentIndex = stepsConfig.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      const prevStep = stepsConfig[currentIndex - 1];
      setCurrentStep(prevStep.id);
      setFormErrors({});
    }
  }, [currentStep, stepsConfig]);

  const handleStepClick = useCallback((stepId: FormStep) => {
    if (canProceedToNextStep(stepId)) {
      setCurrentStep(stepId);
      setFormErrors({});
    }
  }, [canProceedToNextStep]);

  // Memoized form change handler
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



  // Memoized step content rendering
  const renderStepContent = useCallback(() => {
    logger.debug(LogContext.TASK, 'TaskForm renderStepContent called', {
      currentStep,
      hasSessionToken: !!sessionToken,
      isLoading: loading,
      formErrorsCount: Object.keys(formErrors).length
    });

    const stepProps = {
      formData,
      onChange: handleFormChange,
      errors: formErrors,
      isLoading: loading,
      sessionToken
    };

    switch (currentStep) {
      case 'vehicle':
        return <VehicleStep {...stepProps} />;
      case 'customer':
        return <CustomerStep {...stepProps} />;
      case 'ppf':
        return <PPFStep {...stepProps} />;
      case 'schedule':
        return <ScheduleStep {...stepProps} />;
      default:
        return <VehicleStep {...stepProps} />;
    }
  }, [currentStep, formData, handleFormChange, formErrors, loading]);

  // Memoized step navigation buttons
  const renderStepNavigation = useCallback(() => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-6 border-t border-border space-y-4 sm:space-y-0">
      <button
        type="button"
        onClick={handlePreviousStep}
        disabled={currentStep === 'vehicle'}
        className={`
          w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
          ${currentStep === 'vehicle'
            ? 'bg-muted/50 text-border-light cursor-not-allowed'
            : 'bg-muted text-foreground hover:bg-border hover:scale-105 focus:ring-2 focus:ring-accent'
          }
        `}
      >
        Précédent
      </button>

      <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3">
      {/* Auto-save toggle */}
        <label className="flex items-center space-x-2 text-sm text-border-light">
          <input
            type="checkbox"
            checked={autoSaveEnabled}
            onChange={(e) => setAutoSaveEnabled(e.target.checked)}
            className="rounded border-border text-accent focus:ring-accent"
          />
          <span className="text-xs sm:text-sm">Auto-sauvegarde</span>
        </label>

        {/* Save button */}
        {isDirty && (
          <button
            type="button"
            onClick={autoSave}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-accent bg-accent/20 rounded-lg hover:bg-accent/30 hover:scale-105 focus:ring-2 focus:ring-accent transition-all duration-200"
          >
            <Save className="w-4 h-4 inline mr-1" />
            Sauvegarder
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={handleNextStep}
        disabled={!canProceedToNextStep(currentStep)}
        className={`
          w-full sm:w-auto px-6 py-2 text-sm font-medium rounded-lg transition-all duration-200
          ${canProceedToNextStep(currentStep)
            ? 'bg-accent text-foreground hover:bg-accent-hover hover:scale-105 focus:ring-2 focus:ring-accent'
            : 'bg-muted text-border-light cursor-not-allowed'
          }
        `}
      >
        {currentStep === 'schedule' ? 'Terminer' : 'Suivant'}
      </button>
    </div>
  ), [currentStep, canProceedToNextStep, handlePreviousStep, handleNextStep, autoSaveEnabled, setAutoSaveEnabled, isDirty, autoSave, loading]);

  // Memoized progress bar
  const renderProgressBar = useCallback(() => (
    <div className="mb-4 sm:mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-1 sm:space-y-0">
        <span className="text-xs sm:text-sm font-medium text-foreground">
          Étape {stepsConfig.findIndex(s => s.id === currentStep) + 1} sur {stepsConfig.length}
        </span>
        <span className="text-xs sm:text-sm text-border-light">{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-accent h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  ), [currentStep, stepsConfig, progress]);

  // Memoized step indicators
  const renderStepIndicators = useCallback(() => (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-6 sm:mb-8">
      {stepsConfig.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = stepsConfig.findIndex(s => s.id === currentStep) > index;
        const canNavigate = canProceedToNextStep(step.id);
            
            return (
                <button
            key={step.id}
            onClick={() => handleStepClick(step.id)}
            disabled={!canNavigate}
                  className={`
              flex items-center space-x-2 px-2 sm:px-4 py-2 rounded-lg transition-all duration-200 text-xs sm:text-sm
              ${isActive
                ? 'bg-accent/20 text-accent border-2 border-accent/50'
                : isCompleted
                  ? 'bg-accent/30 text-accent border-2 border-accent'
                  : canNavigate
                    ? 'bg-muted text-foreground border-2 border-border hover:bg-border hover:scale-105'
                    : 'bg-muted/30 text-border-light border-2 border-border/30 cursor-not-allowed'
              }
            `}
          >
            <div className={`
              w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0
              ${isActive
                      ? 'bg-accent text-foreground'
                : isCompleted
                        ? 'bg-accent text-foreground'
                  : 'bg-border text-foreground'
              }
            `}>
              {isCompleted ? <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" /> : index + 1}
                  </div>
            <span className="hidden xs:inline">{step.label}</span>
                </button>
            );
          })}
        </div>
  ), [stepsConfig, currentStep, canProceedToNextStep, handleStepClick]);

  if (authLoading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-border-light">Chargement de l&apos;authentification...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-border-light">Veuillez vous connecter pour créer une tâche</p>
        <p className="text-border text-sm mt-2">Si le problème persiste, vérifiez votre connexion internet</p>
      </div>
    );
  }

  // Show loading state while authentication is being checked
  if (authLoading) {
    return (
      <div className={`bg-muted rounded-lg shadow-lg p-8 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-white text-lg font-medium">Vérification de l&apos;authentification...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show authentication error if user is not authenticated
  if (!user?.id || !session) {
    return (
      <div className={`bg-muted rounded-lg shadow-lg p-8 ${className}`}>
        <div className="text-center py-12">
          <div className="text-red-400 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Authentification requise</h3>
          <p className="text-border-light mb-6">
            Vous devez être connecté pour créer une tâche. Veuillez vous connecter et réessayer.
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="bg-accent text-foreground px-6 py-3 rounded-lg font-medium hover:bg-accent-hover transition-colors duration-200"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  // Show loading state while authentication is being checked
  if (authLoading) {
    return (
      <div className={`bg-muted rounded-lg shadow-lg p-8 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-white text-lg font-medium">Vérification de l&apos;authentification...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show authentication error if user is not authenticated
  if (!user?.id || !session) {
    return (
      <div className={`bg-muted rounded-lg shadow-lg p-8 ${className}`}>
        <div className="text-center py-12">
          <div className="text-red-400 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Authentification requise</h3>
          <p className="text-border-light mb-6">
            Vous devez être connecté pour créer une tâche. Veuillez vous connecter et réessayer.
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="bg-accent text-foreground px-6 py-3 rounded-lg font-medium hover:bg-accent-hover transition-colors duration-200"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  // Success screen
  if (success && createdTask) {
    return (
      <div className={`bg-muted rounded-lg shadow-lg p-8 ${className}`}>
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Tâche créée avec succès !
            </h2>
            <p className="text-border-light mb-4">
              Votre tâche #{createdTask.task_number || createdTask.id} a été créée et enregistrée.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-border-light">Véhicule:</span>
                  <p className="text-foreground font-medium">
                    {createdTask.vehicle_make} {createdTask.vehicle_model}
                  </p>
                </div>
                <div>
                  <span className="text-border-light">Plaque:</span>
                  <p className="text-foreground font-medium">{createdTask.vehicle_plate}</p>
                </div>
                <div>
                  <span className="text-border-light">Client:</span>
                  <p className="text-foreground font-medium">
                    {createdTask.customer_name || 'Non spécifié'}
                  </p>
                </div>
                <div>
                  <span className="text-border-light">Planifiée pour:</span>
                  <p className="text-foreground font-medium">
                    {createdTask.scheduled_date ? new Date(createdTask.scheduled_date).toLocaleDateString('fr-FR') : 'Non spécifiée'}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-border-light text-sm mb-6">
              Redirection automatique vers les détails de la tâche dans quelques secondes...
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => {
                if (onSuccess) {
                  onSuccess({ id: createdTask.id });
                }
              }}
              className="bg-accent text-foreground hover:bg-accent-hover"
            >
              Voir les détails de la tâche
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // Reset form for creating another task
                setSuccess(false);
                setCreatedTask(null);
                setCurrentStep('vehicle');
                // Reset form data if needed
              }}
              className="border-border text-border-light hover:text-foreground hover:border-accent"
            >
              Créer une autre tâche
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-muted rounded-lg shadow-lg ${className}`}>
      {showHeader && (
        <div className="bg-gradient-to-r from-black to-zinc-900 text-white p-4 sm:p-6 rounded-t-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold">
                {isEditing ? 'Modifier la tâche' : 'Créer une nouvelle tâche'}
              </h2>
              <p className="text-border-light mt-1 text-sm sm:text-base">
                {isEditing ? 'Modifiez les informations de la tâche' : 'Remplissez le formulaire pour créer une nouvelle tâche'}
              </p>
            </div>
            <div className="text-center sm:text-right">
              <div className="text-2xl sm:text-3xl font-bold">{taskNumber}</div>
              <div className="text-border-light text-xs sm:text-sm">Numéro de tâche</div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4 sm:p-6">
        {/* Progress Bar */}
        {renderProgressBar()}

        {/* Step Indicators */}
        {renderStepIndicators()}

        {/* Current Step Content */}
        <div className="min-h-[300px] sm:min-h-[400px]">
          {renderStepContent()}
            </div>
            
        {/* Step Navigation */}
        {renderStepNavigation()}

        {/* Submit Button - Only show on last step */}
        {currentStep === 'schedule' && (
          <div className="pt-6 border-t border-border">
            <button 
              type="submit"
              disabled={loading || !canProceedToNextStep(currentStep)}
              className={`
                w-full px-4 sm:px-6 py-3 text-base sm:text-lg font-medium rounded-lg transition-all duration-200
                ${loading || !canProceedToNextStep(currentStep)
                  ? 'bg-muted text-border-light cursor-not-allowed'
                  : 'bg-accent text-foreground hover:bg-accent-hover hover:scale-105 focus:ring-2 focus:ring-accent'
                }
              `}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Création en cours...
                </div>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 inline mr-2" />
                  Créer la tâche
                </>
              )}
            </button>
          </div>
        )}
          
        {/* Error Display */}
          {error && (
          <div className="mt-4 bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center">
              <X className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" />
              <p className="text-red-300 text-sm sm:text-base">{error}</p>
            </div>
          </div>
        )}

        {/* Auto-save Status */}
        {autoSaveEnabled && (
          <div className="mt-4 text-center text-xs sm:text-sm text-border-light">
            {isDirty ? (
              <div className="flex items-center justify-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Modifications non sauvegardées</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-4 h-4 text-accent" />
                <span>Toutes les modifications sont sauvegardées</span>
            </div>
          )}
        </div>
        )}
      </form>
    </div>
  );
});

TaskForm.displayName = 'TaskForm';

export default TaskForm;