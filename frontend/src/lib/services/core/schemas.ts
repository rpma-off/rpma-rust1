// Core schemas for API validation

import { z } from 'zod';

export const TaskSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  assigned_to: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const TaskQuerySchema = z.object({
  status: z.string().optional(),
  technician_id: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).optional(),
  page_size: z.number().int().min(1).max(100).optional(),
});

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  assigned_to: z.string().optional(),
  client_id: z.string().optional(),
   // Required fields for backend compatibility
   vehicle_plate: z.string().min(1, 'Vehicle plate is required'),
   vehicle_model: z.string().min(1, 'Vehicle model is required'),
   ppf_zones: z.array(z.string()).min(1, 'At least one PPF zone is required'),
   scheduled_date: z.string().min(1, 'Scheduled date is required'),
});

export const UpdateTaskSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  assigned_to: z.string().optional(),
});

export const ClientSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  company: z.string().optional(),
});

export const UserSchema = z.object({
  id: z.string().optional(),
  email: z.string().email(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['admin', 'technician', 'supervisor', 'viewer']),
  isActive: z.boolean().default(true),
});

export type TaskInput = z.infer<typeof TaskSchema>;
export type CreateTaskData = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskData = z.infer<typeof UpdateTaskSchema>;
export type ClientInput = z.infer<typeof ClientSchema>;
export type UserInput = z.infer<typeof UserSchema>;

export interface BusinessRuleFiltersData {
  search?: string;
  category?: string;
  status?: 'active' | 'inactive' | 'all';
  priority?: 'low' | 'medium' | 'high' | 'all';
  page?: number;
  limit?: number;
  pageSize?: number;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: string;
}

export interface ConfigurationFiltersData {
  category?: string;
  search?: string;
  data_type?: string;
  is_required?: boolean;
  page?: number;
  limit?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: string;
  type?: string;
  isRequired?: boolean;
  isEncrypted?: boolean;
}