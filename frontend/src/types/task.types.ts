/**
 * Task Type Definitions for Tauri Desktop App
 *
 * Types that match the Rust backend task models
 */

import type { Photo } from './photo.types';
import type { Task, TaskStatus, TaskPriority, TaskPhoto } from '@/lib/backend';

// Re-export for backward compatibility
export type { Task, TaskStatus, TaskPriority };



/**
 * Task with full details including related data
 */
export interface TaskWithDetails extends Task {
   // Related data
   client?: Client;
   technician?: import('./auth.types').UserAccount;
   checklist_items?: ChecklistItem[];
   checklist?: ChecklistItem[];
   workflow_execution?: WorkflowExecution;

    // Photo arrays
    photos_before?: Photo[] | null;
    photos_after?: Photo[] | null;
    photos?: { before: Photo[], after: Photo[], during: Photo[] };

   // Additional fields for compatibility
   note?: string | null; // Alias for notes

   // New fields not in base Task
   assigned_user_name?: string;
   client_name?: string;
   is_available?: boolean | null;
   estimated_duration_minutes?: number | null; // Alias for estimated_duration

   // Computed fields
   progress: number;
   checklist_completed: boolean;
   duration?: string | null;
   is_overdue: boolean;
   estimated_completion?: string | null;
}

/**
 * Task filter options for Tauri commands
 */
export interface TaskFilters {
  status?: string | 'all';
  priority?: string | 'all';
  search?: string;
  assignedTo?: string;
  vehicleId?: string;
  startDate?: string; // ISO date
  endDate?: string; // ISO date
  pageSize?: number;
  page?: number;
}

/**
 * Task creation request for Tauri command - matches Rust CreateTaskRequest exactly
 */
export interface CreateTaskRequest {
  // Required fields (matching Rust CreateTaskRequest)
  vehicle_plate: string;
  vehicle_model: string;
  ppf_zones: string[];
  scheduled_date: string;

  // Optional fields
  external_id?: string;
   status?: string;
   technician_id?: string;
   start_time?: string;
   end_time?: string;
   checklist_completed?: boolean;
   notes?: string;

   // Additional fields for frontend compatibility
   title?: string;
   vehicle_make?: string;
   vehicle_year?: string; // String to match backend
   vin?: string;
   date_rdv?: string;
   heure_rdv?: string;
   lot_film?: string;
   note?: string; // Alternative to notes
   customer_name?: string;
   customer_email?: string;
   customer_phone?: string;
   customer_address?: string;
   custom_ppf_zones?: string[]; // JSON array of custom zones
   template_id?: string;
   workflow_id?: string;
   task_number?: string;
   creator_id?: string;
   created_by?: string;

   // Legacy fields for compatibility
   description?: string;
   priority?: string;
   client_id?: string;
   estimated_duration?: number;
   tags?: string; // JSON string
}

/**
 * Task update request for Tauri command
 */
export interface UpdateTaskRequest {
  id?: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  technician_id?: string;
  assigned_at?: string;
  scheduled_date?: string;
  start_time?: string;
   end_time?: string;
   notes?: string;
   tags?: string;
   estimated_duration?: number;
  actual_duration?: number;
  // Additional fields for compatibility
  vin?: string;
  date_rdv?: string;
  heure_rdv?: string;
  lot_film?: string;
  ppf_zones?: string[];
}

/**
 * Task statistics interface
 */
export interface TaskStatistics {
   total_tasks: number;
   draft_tasks: number;
   scheduled_tasks: number;
   in_progress_tasks: number;
   completed_tasks: number;
   cancelled_tasks: number;
   on_hold_tasks: number;
   pending_tasks: number;
   invalid_tasks: number;
   archived_tasks: number;
   failed_tasks: number;
   overdue_tasks: number;
   assigned_tasks: number;
   paused_tasks: number;
}

/**
 * Task query interface for filtering
 */
export interface TaskQuery {
  status?: string | 'all';
  priority?: string | 'all';
  search?: string;
  assignedTo?: string;
  vehicleId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/**
 * Task action types for Tauri commands
 */
export type TaskAction =
  | { action: 'Create', data: CreateTaskRequest }
  | { action: 'Get', id: string }
  | { action: 'Update', id: string, data: UpdateTaskRequest }
  | { action: 'Delete', id: string }
  | { action: 'List', filters: TaskQuery }
  | { action: 'GetStatistics' };

/**
 * Task list response from Tauri command
 */
export interface TaskListResponse {
  data: TaskWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  statistics?: TaskStatistics;
}

/**
 * Task CRUD response types
 */
export type TaskResponse =
  | { type: 'Created'; data: TaskWithDetails }
  | { type: 'Found'; data: TaskWithDetails }
  | { type: 'Updated'; data: TaskWithDetails }
  | { type: 'Deleted' }
  | { type: 'NotFound' }
  | { type: 'List'; data: TaskListResponse }
  | { type: 'Statistics'; data: TaskStatistics };

/**
 * Photo metadata for uploads - matches backend PhotoMetadata
 */
export interface PhotoMetadata {
  photo_type?: string;
  photo_category?: string;
  zone?: string;
  title?: string;
  description?: string;
  notes?: string;
  is_required: boolean;
}



/**
 * Checklist item interface
 */
export interface ChecklistItem {
  id: string;
  task_id: string;
  description: string;
  is_completed: boolean;
  completed_at?: string; // ISO datetime
  completed_by?: string;
  notes?: string;
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

/**
 * Workflow execution interface
 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  taskId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  currentStepId?: string;
  startedAt?: string;
  completedAt?: string;
  completed_steps: string[];
  skipped_steps: string[];
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Client interface (simplified for task context)
 */
export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  customer_type: 'individual' | 'business';
  company_name?: string;
  contact_person?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
   address_country?: string;
   notes?: string;
   tags?: string;
   total_tasks?: number;
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

// Type guards moved to use imported Task type

// Type guards removed - use proper type checking

/**
 * Get status display label
 */
export function getStatusLabel(status: string): string {
  const statusLabels: Record<string, string> = {
    draft: 'Draft',
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    on_hold: 'On Hold',
    completed: 'Completed',
    cancelled: 'Cancelled',
    pending: 'Pending',
    invalid: 'Invalid',
    archived: 'Archived',
    failed: 'Failed',
    overdue: 'Overdue',
    assigned: 'Assigned',
    paused: 'Paused'
  };
  return statusLabels[status] || status;
}

/**
 * Get priority display label
 */
export function getPriorityLabel(priority: string): string {
  const priorityLabels: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent'
  };
  return priorityLabels[priority] || priority;
}

/**
 * Check if task is overdue
 */
export function isTaskOverdue(task: Task): boolean {
  if (!task.scheduled_date || task.status === 'completed' || task.status === 'cancelled') {
    return false;
  }
  return new Date(task.scheduled_date) < new Date();
}

/**
 * Calculate task progress
 */
export function calculateTaskProgress(task: TaskWithDetails): number {
  if (task.status === 'completed') return 100;
  if (task.status === 'cancelled') return 0;

  const completedChecklistItems = task.checklist_items?.filter(item => item.is_completed).length || 0;
  const totalChecklistItems = task.checklist_items?.length || 1;

  return Math.round((completedChecklistItems / totalChecklistItems) * 100);
}

/**
 * Task display interface for UI components
 */
export interface TaskDisplay {
  id: string;
  task_number: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  technicianName?: string;
  clientName?: string;
  scheduledDate?: string;
  vehicleInfo?: string;
  vehicle_model?: string;
  vehicle_make?: string;
    vehicle_year?: string | null;
    vehicle_plate?: string;
     vin?: string;
     lot_film?: string;
     date_rdv?: string;
     heure_rdv?: string;
     ppf_zones?: string[];
   progress?: number;
  is_overdue?: boolean;
    created_at: string;
    updated_at: string;
    location?: string;
    current_workflow_step_id?: string | null;
    assigned_to?: string | null;
    creator_id?: string | null;
    checklist_id?: string | null;
     external_id?: string | null;
     template_id?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
 completed_steps?: string[];
     custom_ppf_zones?: string[];
     customer_address?: string | null;
     scheduled_at?: string;
     // Additional properties for compatibility
    checklist_items?: ChecklistItem[];
    checklist?: ChecklistItem[];
    checklist_completed?: boolean | number;
    note?: string;
   assigned_at?: string;
   technician_id?: string;
   is_available?: boolean;
   workflow_status?: string;
   start_time?: string;
   end_time?: string;
   scheduled_date?: string;
   photos_before?: TaskPhoto[] | null;
   photos_after?: TaskPhoto[] | null;
}

/**
 * SOP Template interface
 */
export interface SOPTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: SOPStep[];
  estimatedDuration: number;
  requiredSkills: string[];
  createdAt: string;
  updatedAt: string;
  is_active?: boolean;
  version?: string;
}

/**
 * SOP Step interface
 */
export interface SOPStep {
  id: string;
  templateId: string;
  stepNumber: number;
  title: string;
  description: string;
  instructions: string;
  estimatedDuration: number;
  requiredPhotos: number;
  qualityCheckpoints: string[];
  isMandatory: boolean;
}