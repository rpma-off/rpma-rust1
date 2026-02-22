import { z } from 'zod';

// Import TaskFormData from the components
export type { TaskFormData } from '@/domains/tasks/components/TaskForm/types';

// Zod schemas for Tauri command inputs - matching Rust structs

export const createTaskRequestSchema = z.object({
  // Required fields
  vehicle_plate: z.string().min(1, 'Vehicle plate is required'),
  vehicle_model: z.string().min(1, 'Vehicle model is required'),
  ppf_zones: z.array(z.string()).min(1, 'At least one PPF zone is required'),
  scheduled_date: z.string().min(1, 'Scheduled date is required'),

  // Optional fields
  external_id: z.string().optional(),
   status: z.enum(['draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold', 'pending', 'invalid', 'archived', 'failed', 'overdue', 'assigned', 'paused']).optional(),
  technician_id: z.string().uuid().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  checklist_completed: z.boolean().optional(),
  notes: z.string().optional(),

  // Additional fields for frontend compatibility
  title: z.string().optional(),
  vehicle_make: z.string().optional(),
  vehicle_year: z.number().int().min(1900).max(2100).optional(),
  scheduled_time: z.string().optional(),
  vin: z.string().optional(),
  date_rdv: z.string().optional(),
  heure_rdv: z.string().optional(),
  lot_film: z.string().optional(),
  note: z.string().optional(),
  customer_name: z.string().optional(),
  customer_email: z.string().email().optional().or(z.literal('')),
  customer_phone: z.string().optional(),
  customer_address: z.string().optional(),
  custom_ppf_zones: z.array(z.string()).optional(),
  template_id: z.string().uuid().optional(),
  workflow_id: z.string().uuid().optional(),
  task_number: z.string().optional(),
  creator_id: z.string().uuid().optional(),
  created_by: z.string().optional(),

  // Legacy fields for compatibility
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  client_id: z.string().uuid().optional(),
  estimated_duration: z.number().int().min(0).optional(),
  tags: z.string().optional(), // JSON string
});

export const updateTaskRequestSchema = z.object({
  id: z.string().uuid('Invalid task ID'),
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
   status: z.enum(['draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold', 'pending', 'invalid', 'archived', 'failed', 'overdue', 'assigned', 'paused']).optional(),
  vehicle_plate: z.string().min(1).optional(),
  vehicle_model: z.string().optional(),
  vehicle_year: z.number().int().min(1900).max(2100).optional(),
  vehicle_make: z.string().optional(),
  vin: z.string().optional(),
  ppf_zones: z.array(z.string()).optional(),
  custom_ppf_zones: z.array(z.string()).optional(),
  client_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
  customer_email: z.string().email().optional().or(z.literal('')),
  customer_phone: z.string().optional(),
  customer_address: z.string().optional(),
  external_id: z.string().optional(),
  lot_film: z.string().optional(),
  checklist_completed: z.boolean().optional(),
  scheduled_date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  date_rdv: z.string().optional(),
  heure_rdv: z.string().optional(),
  template_id: z.string().uuid().optional(),
  workflow_id: z.string().uuid().optional(),
  estimated_duration: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  tags: z.string().optional(), // JSON string
});

export const taskQuerySchema = z.object({
   page: z.number().int().min(1).default(1),
   limit: z.number().int().min(1).max(100).default(20),
   status: z.enum(['draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold', 'pending', 'invalid', 'archived', 'failed', 'overdue', 'assigned', 'paused']).optional(),
   technician_id: z.string().uuid().optional(),
   client_id: z.string().uuid().optional(),
   start_date: z.string().optional(),
   end_date: z.string().optional(),
   search: z.string().optional(),
   sort_by: z.enum(['created_at', 'scheduled_date', 'status', 'priority']).optional(),
   sort_order: z.enum(['asc', 'desc']).default('desc'),
 });

// Create a comprehensive task schema for form validation
export const taskSchema = z.object({
  id: z.string().optional(),
  task_number: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  external_id: z.string().optional(),
   status: z.enum(['draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold', 'pending', 'invalid', 'archived', 'failed', 'overdue', 'assigned', 'paused']).optional(),
  created_by: z.string().optional(),
  creator_id: z.string().optional(),
  technician_id: z.string().optional(),
  vehicle_make: z.string().optional(),
  vehicle_model: z.string().optional(),
  vehicle_year: z.string().optional(),
  vehicle_plate: z.string().min(1, 'Vehicle plate is required'),
  vehicle_vin: z.string().optional(),
  customer_name: z.string().optional(),
  customer_email: z.string().email().optional().or(z.literal('')),
  customer_phone: z.string().optional(),
  customer_address: z.string().optional(),
  client_id: z.string().optional(),
  ppf_zones: z.array(z.string()).optional(),
  custom_ppf_zones: z.array(z.string()).optional(),
  scheduled_date: z.string().optional(),
  scheduled_time: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  scheduled_at: z.union([z.string(), z.number()]).optional().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  notes: z.string().optional(),
  lot_film: z.string().optional(),
  workflow_status: z.enum(['not_started', 'in_progress', 'paused', 'completed', 'cancelled']).optional(),
  is_available: z.boolean().optional(),
  checklist_completed: z.boolean().optional(),
  checklist_id: z.string().optional(),
  created_at: z.union([z.string(), z.number()]).optional().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  updated_at: z.union([z.string(), z.number()]).optional().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  started_at: z.union([z.string(), z.number()]).optional().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  completed_at: z.union([z.string(), z.number()]).optional().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  assigned_at: z.union([z.string(), z.number()]).optional().transform(val => 
    typeof val === 'number' ? new Date(val).toISOString() : val
  ),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  workflow_id: z.string().optional(),
});