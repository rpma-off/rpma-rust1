/**
 * Zod validation schemas for IPC communication
 * 
 * These schemas provide runtime type safety for frontend-backend communication
 * and ensure that data structures match the Rust backend serde schemas.
 */

import { z } from 'zod';

/**
 * Base task-related schemas
 */
export const TaskQuerySchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  status: z.string().optional(),
  technician_id: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  search: z.string().optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
});

export const CreateTaskRequestSchema = z.object({
  // Required fields matching Rust CreateTaskRequest exactly
  vehicle_plate: z.string().min(1, 'Vehicle plate is required'),
  vehicle_model: z.string().min(1, 'Vehicle model is required'),
  ppf_zones: z.array(z.string().min(1)).min(1, 'At least one PPF zone is required'),
  scheduled_date: z.string().min(1, 'Scheduled date is required'),
  
  // Optional fields matching Rust struct
  external_id: z.string().optional(),
  status: z.enum(['draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold', 'pending', 'invalid', 'archived', 'failed', 'overdue', 'assigned', 'paused']).optional(),
  technician_id: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  checklist_completed: z.boolean().optional(),
  notes: z.string().optional(),
  
  // Additional fields for frontend compatibility (matching Rust struct)
  title: z.string().optional(),
  vehicle_make: z.string().optional(),
  vehicle_year: z.string().optional(),
  vin: z.string().optional(),
  date_rdv: z.string().optional(),
  heure_rdv: z.string().optional(),
  lot_film: z.string().optional(),
  note: z.string().optional(),
  customer_name: z.string().optional(),
  customer_email: z.string().email().optional(),
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
  estimated_duration: z.number().int().optional(),
  tags: z.string().optional(),
});

export const UpdateTaskRequestSchema = CreateTaskRequestSchema.partial().extend({
  id: z.string().min(1, 'Task ID is required'),
});

/**
 * Task action schemas matching Rust backend TaskAction enum
 */
export const TaskActionCreateSchema = z.object({
  action: z.literal('Create'),
  data: CreateTaskRequestSchema,
});

export const TaskActionGetSchema = z.object({
  action: z.literal('Get'),
  id: z.string().min(1, 'Task ID is required'),
});

export const TaskActionUpdateSchema = z.object({
  action: z.literal('Update'),
  id: z.string().min(1, 'Task ID is required'),
  data: UpdateTaskRequestSchema,
});

export const TaskActionDeleteSchema = z.object({
  action: z.literal('Delete'),
  id: z.string().min(1, 'Task ID is required'),
});

export const TaskActionListSchema = z.object({
  action: z.literal('List'),
  filters: TaskQuerySchema,
});

export const TaskActionGetStatisticsSchema = z.object({
  action: z.literal('GetStatistics'),
});

export const TaskActionSchema = z.discriminatedUnion('action', [
  TaskActionCreateSchema,
  TaskActionGetSchema,
  TaskActionUpdateSchema,
  TaskActionDeleteSchema,
  TaskActionListSchema,
  TaskActionGetStatisticsSchema,
]);

/**
 * Task CRUD request schema
 */
export const TaskCrudRequestSchema = z.object({
  action: TaskActionSchema,
  session_token: z.string().min(1, 'Session token is required'),
});

/**
 * Authentication schemas
 */
export const LoginRequestSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const SignupRequestSchema = z.object({
  email: z.string().email('Valid email is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['admin', 'technician', 'supervisor', 'viewer']).optional(),
});

/**
 * Client-related schemas
 */
export const CreateClientRequestSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  customer_type: z.enum(['individual', 'business']).default('individual'),
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip: z.string().optional(),
  address_country: z.string().optional(),
  tax_id: z.string().optional(),
  company_name: z.string().optional(),
  contact_person: z.string().optional(),
  notes: z.string().optional(),
  tags: z.string().optional(),
});

export const UpdateClientRequestSchema = CreateClientRequestSchema.partial().extend({
  id: z.string().min(1, 'Client ID is required'),
});

export const ClientQuerySchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
});

/**
 * Client action schemas
 */
export const ClientActionCreateSchema = z.object({
  Create: z.object({
    data: CreateClientRequestSchema,
  }),
});

export const ClientActionGetSchema = z.object({
  Get: z.object({
    id: z.string().min(1, 'Client ID is required'),
  }),
});

export const ClientActionUpdateSchema = z.object({
  Update: z.object({
    id: z.string().min(1, 'Client ID is required'),
    data: UpdateClientRequestSchema,
  }),
});

export const ClientActionDeleteSchema = z.object({
  Delete: z.object({
    id: z.string().min(1, 'Client ID is required'),
  }),
});

export const ClientActionListSchema = z.object({
  List: z.object({
    filters: ClientQuerySchema,
  }),
});

export const ClientActionSearchSchema = z.object({
  Search: z.object({
    query: z.string().min(1, 'Search query is required'),
    limit: z.number().int().positive().optional(),
  }),
});

export const ClientActionStatsSchema = z.object({
  Stats: z.object({}),
});

export const ClientActionSchema = z.union([
  ClientActionCreateSchema,
  ClientActionGetSchema,
  ClientActionUpdateSchema,
  ClientActionDeleteSchema,
  ClientActionListSchema,
  ClientActionSearchSchema,
  ClientActionStatsSchema,
]);

/**
 * Client CRUD request schema
 */
export const ClientCrudRequestSchema = z.object({
  action: ClientActionSchema,
  session_token: z.string().min(1, 'Session token is required'),
});

/**
 * API Response schemas
 */
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) => z.object({
  success: z.boolean(),
  data: dataSchema.optional(),
  error: z.string().optional(),
});

export const ServiceResponseSchema = <T extends z.ZodType>(dataSchema: T) => z.object({
  success: z.boolean(),
  data: dataSchema.nullable(),
  error: z.string().nullable(),
  status: z.number().optional(),
});

/**
 * Type exports
 */
export type TaskQuery = z.infer<typeof TaskQuerySchema>;
export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;
export type UpdateTaskRequest = z.infer<typeof UpdateTaskRequestSchema>;
export type TaskAction = z.infer<typeof TaskActionSchema>;
export type TaskCrudRequest = z.infer<typeof TaskCrudRequestSchema>;

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type SignupRequest = z.infer<typeof SignupRequestSchema>;

export type CreateClientRequest = z.infer<typeof CreateClientRequestSchema>;
export type UpdateClientRequest = z.infer<typeof UpdateClientRequestSchema>;
export type ClientQuery = z.infer<typeof ClientQuerySchema>;
export type ClientAction = z.infer<typeof ClientActionSchema>;
export type ClientCrudRequest = z.infer<typeof ClientCrudRequestSchema>;

export type ApiResponse<T extends z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>> = 
  z.infer<ReturnType<typeof ApiResponseSchema<T>>>;

export type ServiceResponse<T extends z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>> = 
  z.infer<ReturnType<typeof ServiceResponseSchema<T>>>;