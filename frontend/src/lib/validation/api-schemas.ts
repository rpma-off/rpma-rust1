// API validation schemas

import { z } from 'zod';

export const CreateTaskSchema = z.object({
  // Required fields (matching Rust CreateTaskRequest)
  vehicle_plate: z.string().min(1, 'Vehicle plate is required'),
  vehicle_model: z.string().min(1, 'Vehicle model is required'),
  ppf_zones: z.array(z.string().min(1)).min(1, 'At least one PPF zone is required'),
  scheduled_date: z.string().min(1, 'Scheduled date is required'),

  // Optional fields
  external_id: z.string().optional(),
  status: z.enum(['draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold', 'pending', 'invalid', 'archived', 'failed', 'overdue', 'assigned', 'paused']).optional(),
  technician_id: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  checklist_completed: z.boolean().optional(),
  notes: z.string().optional(),

  // Additional fields for frontend compatibility
  title: z.string().optional(),
  vehicle_make: z.string().optional(),
  vehicle_year: z.string().optional(),
  vin: z.string().optional(),
  date_rdv: z.string().optional(),
  heure_rdv: z.string().optional(),
  lot_film: z.string().optional(),
  note: z.string().optional(),
  customer_name: z.string().optional(),
  customer_email: z.string().optional(),
  customer_phone: z.string().optional(),
  customer_address: z.string().optional(),
  custom_ppf_zones: z.array(z.string()).optional(),
  template_id: z.string().optional(),
  workflow_id: z.string().optional(),
  task_number: z.string().optional(),
  creator_id: z.string().optional(),
  created_by: z.string().optional(),

  // Legacy fields for compatibility
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  client_id: z.string().optional(),
  estimated_duration: z.number().optional(),
  tags: z.string().optional(),
});

export const UpdateTaskSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  assigned_to: z.string().optional(),
});

export const TaskQuerySchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  assigned_to: z.string().optional(),
  client_id: z.string().optional(),
  search: z.string().optional(),
  technician_id: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export const CreateClientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  company: z.string().optional(),
});

export const UpdateClientSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  company: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type TaskQueryInput = z.infer<typeof TaskQuerySchema>;
export type CreateClientInput = z.infer<typeof CreateClientSchema>;
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;

export const TasksListResponseSchema = z.object({
  data: z.array(z.any()),
  pagination: z.any(),
  statistics: z.any().optional(),
});

export const TaskApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any(),
  error: z.any().optional(),
});

export const validateApiResponse = <T>(schema: z.ZodSchema<T>, data: unknown): T => schema.parse(data);

export const ApiError = z.object({
  message: z.string(),
  code: z.string().optional(),
});

export const validateAndSanitizeInput = <T>(schema: z.ZodSchema<T>, data: unknown): T => schema.parse(data);

export const sanitizeString = (str: string) => str.trim();
