import { useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/domains/auth';
import { CreateTaskRequest } from '@/lib/backend';
import { ipcClient } from '@/lib/ipc';
import { handleError } from '@/lib/utils/error-handler';
import { LogDomain } from '@/lib/logging/types';
import { ClientCreationService } from '@/domains/clients/server';
import { generateTaskTitle } from '@/lib/utils/task-display';

import { FormStep, TaskFormData } from './types';

interface UseTaskFormSubmissionProps {
  formData: TaskFormData;
  validateStep: (step: FormStep) => { errors: Record<string, string> };
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentStep: (step: FormStep) => void;
  onSuccess?: (task: { id: string }) => void;
}

export const useTaskFormSubmission = ({
  formData,
  validateStep,
  setLoading,
  setError,
  setCurrentStep,
  onSuccess
}: UseTaskFormSubmissionProps) => {
  const { user, session } = useAuth();
  const sessionToken = user?.token;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.user_id || !session) {
      setError('Please log in to create a task');
      return;
    }

    if (!sessionToken) {
      setError('Session token missing. Please log in again.');
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
      setError('Please correct the errors in the form');
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

      // Generate proper title if not provided
      const generatedTitle = generateTaskTitle({
        vehicle_make: restFormData.vehicle_make,
        vehicle_model: restFormData.vehicle_model,
        vehicle_plate: restFormData.vehicle_plate,
        customer_name: restFormData.customer_name,
        task_number: restFormData.task_number
      });

       const taskTitle = restFormData.title && restFormData.title.trim() !== '' && restFormData.title !== 'New Task'
        ? restFormData.title
        : (generatedTitle || 'New Task');

      // Clean phone number by removing spaces for database
      const cleanFormData = { ...restFormData, title: taskTitle };
      if (cleanFormData.customer_phone) {
        // Remove all spaces and ensure proper format for database constraint
        cleanFormData.customer_phone = cleanFormData.customer_phone.replace(/\s/g, '');
      }

      // Check if we need to create a client record
      let clientId = formData.client_id;

      // If no client_id but customer information is provided, try to find or create a client
      if (!clientId && formData.customer_name && formData.customer_name.trim()) {
        const clientResult = await ClientCreationService.findOrCreateClient({
          name: formData.customer_name,
          email: formData.customer_email,
          phone: formData.customer_phone
        }, sessionToken);

        if (clientResult.error) {
          // Show warning but don't block task creation
          toast.warning(`Client creation failed: ${clientResult.error}. Task will be created without client association.`);
        } else {
          clientId = clientResult.clientId;
        }
      }

      // Prepare PPF zones data
      const allZones = [
        ...(formData.ppf_zones || []),
        ...(formData.custom_ppf_zones || [])
      ].filter(Boolean);

      // Create task data with only the fields that exist in the CreateTaskRequest
      const taskData: CreateTaskRequest = {
        // Required fields
        vehicle_plate: cleanFormData.vehicle_plate,
        vehicle_model: cleanFormData.vehicle_model,
        ppf_zones: allZones,
        scheduled_date: formData.scheduled_date,

        // Optional fields - properly map to backend expectations
        vehicle_make: cleanFormData.vehicle_make || null,
        vehicle_year: cleanFormData.vehicle_year || null,
        vin: vehicle_vin || null,
        customer_name: cleanFormData.customer_name || null,
        customer_email: cleanFormData.customer_email || null,
        customer_phone: cleanFormData.customer_phone || null,
        customer_address: cleanFormData.customer_address || null,
        client_id: clientId || null,
        custom_ppf_zones: allZones.length > 1 ? allZones.slice(1) : null, // Rest as custom zones
        lot_film: cleanFormData.lot_film || null,
        technician_id: cleanFormData.technician_id || null,
        start_time: formData.scheduled_time || null,
        end_time: null, // Not used in current form
        notes: notes || null, // Map notes field correctly
        task_number: cleanFormData.task_number || null,
        creator_id: cleanFormData.creator_id || user?.user_id || null,
        created_by: cleanFormData.created_by || user?.user_id || null,

        // Additional required fields with defaults
        external_id: null,
        status: null,
        checklist_completed: null,
        title: cleanFormData.title || null,
        date_rdv: null,
        heure_rdv: null,
        template_id: null,
        workflow_id: null,
        description: null,
        priority: null,
        estimated_duration: null,
        tags: null
      };

      // Submit to the Tauri backend
      const createdTask = await ipcClient.tasks.create(taskData, sessionToken);
      toast.success('Tâche créée avec succès !');

      if (onSuccess) {
        onSuccess(createdTask as { id: string });
      }
    } catch (error) {
      handleError(error, 'Task creation failed', {
        domain: LogDomain.TASK,
        userId: user?.user_id,
        component: 'TaskForm'
      });
    } finally {
      setLoading(false);
    }
  }, [formData, validateStep, user?.user_id, session, sessionToken, onSuccess, setLoading, setError, setCurrentStep]);

  return { handleSubmit };
};

