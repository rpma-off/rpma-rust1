"use client";

import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { TaskFormData, FormStep } from './types';
// Legacy service imports removed - now using API routes
import { createLogger, LogContext } from '@/lib/utils/logger';
import { useIsAuthenticated } from '@/lib/utils/auth-token';
import { useApi } from '@/lib/utils/use-api';

const logger = createLogger();

export const useTaskForm = (userId?: string, initialData?: Partial<TaskFormData>) => {
  const isAuthenticated = useIsAuthenticated();
  const { apiGet, apiPost } = useApi();
  const [formData, setFormData] = useState<TaskFormData>(() => ({
    // Core fields
    task_number: '',
    title: '',
    status: 'pending',
    created_by: userId || '',
    creator_id: userId || '',
    
    // Vehicle information
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_plate: '',
    vehicle_vin: '',
    
    // Customer information  
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    client_id: null,
    
    // PPF zones
    ppf_zones: [],
    custom_ppf_zones: [],
    customZones: {},
    
    // Scheduling
    scheduled_date: '',
    scheduled_time: '',
    start_time: '',
    end_time: '',
    
    // Additional fields
    notes: '',
    lot_film: '',
    external_id: '',
    technician_id: null,
    
    // Workflow
    workflow_status: 'not_started',
    is_available: true,
    
    // Timestamps
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    
    ...initialData
  }));
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskNumber, setTaskNumber] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Generate random 7-digit task number on mount
  const generateTaskTitle = useCallback(async () => {
    try {
      logger.info(LogContext.TASK, 'Requesting new task number generation');

      // Call the new task number generation API
      const response = await apiGet('/api/tasks/generate-number');

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.task_number) {
          const newTaskNumber = data.task_number;

          logger.info(LogContext.TASK, 'Generated unique task number', {
            taskNumber: newTaskNumber,
            attemptsUsed: data.attempts_used,
            fallback: data.fallback || false
          });

          setTaskNumber(newTaskNumber);
          setFormData(prev => ({
            ...prev,
            task_number: newTaskNumber,
            title: `Tâche ${newTaskNumber}`,
            updated_at: new Date().toISOString()
          }));
          setIsDirty(true);

          if (data.warning) {
            logger.warn(LogContext.TASK, 'Task number generation warning', { warning: data.warning });
          }

          return newTaskNumber;
        } else {
          throw new Error(data.error || 'Failed to generate task number');
        }
      } else {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      logger.error(LogContext.TASK, 'Error generating task number via API', { error: error instanceof Error ? error.message : String(error) });

      // Fallback to local timestamp-based generation
      const timestamp = Date.now();
      const fallback = (timestamp % 10000000).toString().padStart(7, '0');
      const fallbackNumber = fallback;

      logger.warn(LogContext.TASK, 'Using local fallback task number', { fallbackNumber });

      setTaskNumber(fallbackNumber);
      setFormData(prev => ({
        ...prev,
        task_number: fallbackNumber,
        title: `Tâche ${fallbackNumber}`,
        updated_at: new Date().toISOString()
      }));
      setIsDirty(true);
      return fallbackNumber;
    }
  }, []); // Removed updateFormData dependency to fix circular dependency

  // Generate task number on mount (only for new tasks)
  useEffect(() => {
    if (!initialData?.id && !taskNumber) {
      const initTaskNumber = async () => {
        await generateTaskTitle();
      };
      initTaskNumber();
    } else if (initialData?.task_number) {
      setTaskNumber(initialData.task_number);
    }
  }, [generateTaskTitle, initialData, taskNumber]);

  const updateFormData = useCallback((updates: Partial<TaskFormData>) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      setIsDirty(true);
      return newData;
    });
  }, []);

  const addCustomZone = useCallback((zoneText: string) => {
    if (!zoneText.trim()) return;
    
    // Check if zone already exists (case insensitive)
    const existingZones = [...(formData.ppf_zones || []), ...(formData.custom_ppf_zones || [])];
    const zoneExists = existingZones.some(zone => zone.toLowerCase() === zoneText.toLowerCase());
      
    if (zoneExists) {
      toast.error('Cette zone a déjà été ajoutée');
      return;
    }
    
    // Limit the number of custom zones
    if ((formData.custom_ppf_zones?.length || 0) >= 10) {
      toast.error('Vous ne pouvez pas ajouter plus de 10 zones personnalisées');
      return;
    }
    
    const newZone = zoneText.trim();
    const customId = `custom_${uuidv4()}`;
    
    updateFormData({
      custom_ppf_zones: [...(formData.custom_ppf_zones || []), newZone],
      ppf_zones: [...(formData.ppf_zones || []), customId],
      customZones: {
        ...formData.customZones,
        [customId]: newZone
      }
    });
    
    toast.success('Zone personnalisée ajoutée');
  }, [formData.ppf_zones, formData.custom_ppf_zones, formData.customZones, updateFormData]);

  const removeCustomZone = useCallback((zoneText: string) => {
    // Find the custom ID for this zone text
    const customId = Object.entries(formData.customZones || {})
      .find(([, text]) => text === zoneText)?.[0];
    
    if (!customId) return;
    
    const newCustomZones = { ...formData.customZones };
    delete newCustomZones[customId];
    
    updateFormData({
      custom_ppf_zones: (formData.custom_ppf_zones || []).filter(zone => zone !== zoneText),
      ppf_zones: (formData.ppf_zones || []).filter(zone => zone !== customId),
      customZones: newCustomZones
    });
    
    toast.success('Zone personnalisée supprimée');
  }, [formData.custom_ppf_zones, formData.ppf_zones, formData.customZones, updateFormData]);

  const validateStep = useCallback((step: FormStep) => {
    const errors: Record<string, string> = {};
    
    if (step === 'vehicle') {
      if (!formData.vehicle_make?.trim()) {
        errors.vehicle_make = 'La marque est requise';
      } else if (formData.vehicle_make.length < 2) {
        errors.vehicle_make = 'La marque doit contenir au moins 2 caractères';
      }
      
      if (!formData.vehicle_model?.trim()) {
        errors.vehicle_model = 'Le modèle est requis';
      } else if (formData.vehicle_model.length < 1) {
        errors.vehicle_model = 'Le modèle doit contenir au moins 1 caractère';
      }
      
      if (!formData.vehicle_year) {
        errors.vehicle_year = "L'année est requise";
      } else {
        const year = parseInt(formData.vehicle_year, 10);
        const currentYear = new Date().getFullYear();
        if (isNaN(year) || year < 1900 || year > currentYear + 1) {
          errors.vehicle_year = `L'année doit être entre 1900 et ${currentYear + 1}`;
        }
      }
      
      if (!formData.vehicle_plate?.trim()) {
        errors.vehicle_plate = 'La plaque est requise';
      } else if (formData.vehicle_plate.length < 4) {
        errors.vehicle_plate = 'La plaque doit contenir au moins 4 caractères';
      }
      
      // Optional VIN validation
      if (formData.vehicle_vin && formData.vehicle_vin.length !== 17) {
        errors.vehicle_vin = 'Le VIN doit contenir exactement 17 caractères';
      }
    } 
    
    if (step === 'customer') {
      // Customer information is optional but validate format if provided
      if (formData.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customer_email)) {
        errors.customer_email = 'Format d\'email invalide';
      }
      
      if (formData.customer_phone && !/^(\+33|0)[1-9](\d{8})$/.test(formData.customer_phone.replace(/[\s\-\(\)]/g, ''))) {
        errors.customer_phone = 'Format de téléphone invalide (ex: 06 12 34 56 78 ou +33 6 12 34 56 78)';
      }
    }
    
    if (step === 'ppf') {
      const totalZones = (formData.ppf_zones?.length || 0) + (formData.custom_ppf_zones?.length || 0);
      if (totalZones === 0) {
        errors.ppf_zones = 'Veuillez sélectionner au moins une zone PPF';
      }
    }
    
    // Template validation removed as template step no longer exists
    
    if (step === 'schedule') {
      if (!formData.scheduled_date) {
        errors.scheduled_date = 'La date est requise';
      } else {
        const selectedDate = new Date(formData.scheduled_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
          errors.scheduled_date = 'La date ne peut pas être dans le passé';
        } else if (selectedDate > new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000)) {
          errors.scheduled_date = 'La date ne peut pas dépasser 1 an';
        }
      }
      
      if (!formData.scheduled_time) {
        errors.scheduled_time = "L'heure est requise";
      } else {
        const [hours, minutes] = formData.scheduled_time.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          errors.scheduled_time = 'Format d\'heure invalide';
        }
        
        // If same day, check time is not in the past
        if (formData.scheduled_date === new Date().toISOString().split('T')[0]) {
          const selectedDateTime = new Date(formData.scheduled_date);
          selectedDateTime.setHours(hours, minutes, 0, 0);
          
          const now = new Date();
          if (selectedDateTime < now) {
            errors.scheduled_time = "L'heure ne peut pas être dans le passé";
          }
        }
      }
      
      // Validate start and end times if provided
      if (formData.start_time && formData.end_time) {
        const startTime = new Date(`1970-01-01T${formData.start_time}:00`);
        const endTime = new Date(`1970-01-01T${formData.end_time}:00`);
        
        if (endTime <= startTime) {
          errors.end_time = "L'heure de fin doit être après l'heure de début";
        }
      }
      
      // Validate notes length
      if (formData.notes && formData.notes.length > 1000) {
        errors.notes = 'Les notes ne doivent pas dépasser 1000 caractères';
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }, [formData]);

  const canProceedToNextStep = useCallback((step: FormStep) => {
    const { isValid } = validateStep(step);
    return isValid;
  }, [validateStep]);

  const autoSave = useCallback(async () => {
    if (!isDirty || loading) return;
    
    try {
      setLoading(true);
      // Implement auto-save logic here if needed
      // For now, just mark as saved
      setIsDirty(false);
      setLastSaved(new Date());
      logger.info(LogContext.TASK, 'Auto-save completed');
    } catch (error) {
      logger.error(LogContext.TASK, 'Auto-save failed', { error: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  }, [isDirty, loading]);

  const submitForm = useCallback(async () => {
    // Validate all steps before submission
    const steps: FormStep[] = ['vehicle', 'customer', 'ppf', 'schedule'];
    const allErrors: Record<string, string> = {};
    
    for (const step of steps) {
      const { errors } = validateStep(step);
      Object.assign(allErrors, errors);
    }
    
    
    if (Object.keys(allErrors).length > 0) {
      return { success: false, errors: allErrors };
    }
    
    // Check authentication before proceeding
    if (!isAuthenticated) {
      return { success: false, errors: { auth: 'Authentication required. Please log in again.' } };
    }

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

      // Create task data with only the fields that exist in the database schema
      const taskData = {
        // Core fields (id is auto-generated by database, so we don't include it)
        external_id: cleanFormData.external_id,
        title: cleanFormData.title || cleanFormData.task_number || 'Nouvelle tâche',
        task_number: cleanFormData.task_number,
        status: 'pending' as const,
        
        // Vehicle information
        vehicle_plate: cleanFormData.vehicle_plate,
        vehicle_model: cleanFormData.vehicle_model,
        vehicle_year: cleanFormData.vehicle_year,
        vehicle_make: cleanFormData.vehicle_make,
        vin: vehicle_vin,
        
        // Customer information
        customer_name: cleanFormData.customer_name,
        customer_email: cleanFormData.customer_email,
        customer_phone: cleanFormData.customer_phone,
        customer_address: cleanFormData.customer_address,
        client_id: cleanFormData.client_id || undefined,
        
        // PPF information
        ppf_zones: [
          ...(formData.ppf_zones || []),
          ...(formData.custom_ppf_zones || [])
        ].filter(Boolean),
        lot_film: cleanFormData.lot_film,
        
        // Scheduling
        scheduled_date: formData.scheduled_date,
        date_rdv: formData.scheduled_date,
        heure_rdv: formData.scheduled_time,
        scheduled_at: formData.scheduled_date ? `${formData.scheduled_date}T${formData.scheduled_time || '00:00'}:00Z` : null,
        
        // Workflow
        workflow_status: cleanFormData.workflow_status || 'not_started',
        workflow_id: cleanFormData.workflow_id,
        current_workflow_step_id: cleanFormData.current_workflow_step_id,
        
        // Assignment
        technician_id: cleanFormData.technician_id || undefined,
        assigned_at: cleanFormData.assigned_at,
        is_available: cleanFormData.is_available !== undefined ? cleanFormData.is_available : true,
        
        // Checklist
        checklist_completed: cleanFormData.checklist_completed || false,
        checklist_id: cleanFormData.checklist_id,
        
        // Notes
        note: notes,
        
        // User relationships
        creator_id: cleanFormData.creator_id,
        created_by: cleanFormData.created_by,
        
        // Timestamps (created_at is auto-generated by database)
        updated_at: new Date().toISOString()
      };
      
      // Submit to the API
      const createTaskResponse = await apiPost('/api/tasks', taskData);

      if (!createTaskResponse.ok) {
        const errorData = await createTaskResponse.json();
        throw new Error(errorData.error || 'Erreur lors de la création de la tâche');
      }

      // Show success message
      toast.success('Tâche créée avec succès !');

      setIsDirty(false);
      setLastSaved(new Date());
      
      return { success: true };
    } catch (error) {
      console.error('Error submitting form:', error);
      
      let errorMessage = 'Une erreur est survenue lors de la création de la tâche';
      
      // Handle specific error cases
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      
      return { 
        success: false, 
        errors: { submit: errorMessage } 
      };
    }
  }, [formData, validateStep]);

  return {
    formData,
    updateFormData,
    loading,
    setLoading,
    error,
    setError,
    taskNumber,
    addCustomZone,
    removeCustomZone,
    validateStep,
    canProceedToNextStep,
    isDirty,
    lastSaved,
    autoSave,
    submitForm,
  };
};