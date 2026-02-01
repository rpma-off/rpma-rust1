import { useState, useCallback } from 'react';
import { z } from 'zod';
import { taskSchema, TaskFormData } from '@/lib/validation/task';

export const useTaskForm = (initialData: Partial<TaskFormData> = {}) => {
  const [formData, setFormData] = useState<Partial<TaskFormData>>(initialData);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate a single field
  const validateField = useCallback(async (name: string, value: unknown) => {
    try {
      // Create a schema for just this field
      const fieldSchema = z.object({
        [name]: taskSchema.shape[name as keyof typeof taskSchema.shape]
      });
      
      // Validate the field
      await fieldSchema.parseAsync({ [name]: value });
      
      // Clear any existing error for this field
      setErrors((prev: Record<string, string>) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
      
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Get the first error message for this field
        const fieldError = error.issues.find((issue: z.ZodIssue) => 
          issue.path.includes(name)
        )?.message || 'Invalid value';
        
        // Update errors state
        setErrors((prev: Record<string, string>) => ({
          ...prev,
          [name]: fieldError
        }));
      }
      return false;
    }
  }, []);

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    // Handle different input types
    let processedValue: unknown = value;
    if (type === 'number') {
      processedValue = value === '' ? '' : Number(value);
    } else if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked;
    }
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
    
    // If the field has been touched before, validate it
    if (touched[name]) {
      validateField(name, processedValue);
    }
  }, [touched, validateField]);

  // Handle input blur
  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Mark field as touched
    if (!touched[name]) {
      setTouched(prev => ({
        ...prev,
        [name]: true
      }));
    }
    
    // Validate the field
    validateField(name, value);
  }, [touched, validateField]);

  // Validate the entire form
  const validateForm = useCallback(async (): Promise<boolean> => {
    try {
      // Mark all fields as touched
      const allFieldsTouched = Object.keys(formData).reduce<Record<string, boolean>>((acc, key) => {
        acc[key] = true;
        return acc;
      }, {});
      
      setTouched(allFieldsTouched);
      
      // Validate the entire form
      await taskSchema.parseAsync(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = error.issues.reduce<Record<string, string>>((acc: Record<string, string>, issue: z.ZodIssue) => {
          const path = issue.path[0];
          if (path && typeof path === 'string') {
            acc[path] = issue.message;
          }
          return acc;
        }, {});
        
        setErrors(newErrors);
      }
      return false;
    }
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback(async (onSubmit: (data: TaskFormData) => Promise<void>) => {
    setIsSubmitting(true);
    
    try {
      const isValid = await validateForm();
      
      if (isValid) {
        await onSubmit(formData as TaskFormData);
      }
      
      return isValid;
    } catch (error) {
      console.error('Form submission error:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm]);

  // Set form field value programmatically
  const setFieldValue = useCallback((name: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Validate the field if it's been touched
    if (touched[name]) {
      validateField(name, value);
    }
  }, [touched, validateField]);

  // Set multiple fields at once
  const setFields = useCallback((fields: Partial<TaskFormData>) => {
    setFormData(prev => ({
      ...prev,
      ...fields
    }));
    
    // Validate any touched fields that were updated
    Object.entries(fields).forEach(([name, value]) => {
      if (touched[name]) {
        validateField(name, value);
      }
    });
  }, [touched, validateField]);

  // Reset the form
  const resetForm = useCallback((newValues: Partial<TaskFormData> = {}) => {
    setFormData({
      ...initialData,
      ...newValues
    });
    setTouched({});
    setErrors({});
  }, [initialData]);

  return {
    formData,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFields,
    resetForm,
    validateField,
    validateForm,
    setFormData,
    setTouched,
    setErrors,
    setIsSubmitting
  };
};

export default useTaskForm;
