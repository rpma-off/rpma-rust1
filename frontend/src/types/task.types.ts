/**
 * Task Type Definitions for Tauri Desktop App
 *
 * Types that match the Rust backend task models
 */

import type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskPhoto,
  AssignmentStatus,
  AvailabilityStatus,
  AssignmentCheckResponse,
  AvailabilityCheckResponse,
  Client,
  ChecklistItem,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskStatistics,
  TaskQuery,
  TaskListResponse,
} from "@/lib/backend";
import type { Photo } from "./photo.types";

// Re-export generated backend contracts for backward compatibility
export type {
  Task,
  TaskStatus,
  TaskPriority,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskStatistics,
  TaskQuery,
  TaskListResponse,
};

// Re-export shared entity types from the generated backend contract so there
// is a single source of truth.  Do NOT redefine these here.
export type { Client, ChecklistItem };

// Re-export auto-generated assignment/availability types with domain-friendly names
export type TaskAssignmentStatus = AssignmentStatus;
export type TaskAvailabilityStatus = AvailabilityStatus;
export type TaskAssignmentCheckResponse = AssignmentCheckResponse;
export type TaskAvailabilityCheckResponse = AvailabilityCheckResponse;

/**
 * Task status change history entry - matches Rust TaskHistory model.
 *
 * `changed_at` is typed as `number | string` rather than `bigint` because
 * Tauri serialises Rust i64 timestamps to JSON numbers.  The union with
 * `string` preserves compatibility with legacy ISO-string values already
 * stored in some records.
 */
export interface TaskHistoryEntry {
  id: string;
  task_id: string;
  old_status?: string | null;
  new_status: string;
  reason?: string | null;
  /** JSON number at runtime even though the Rust field is i64. */
  changed_at: number | string;
  changed_by?: string | null;
}

/**
 * Task with full details including related data
 */
export interface TaskWithDetails extends Task {
  // Related data
  client?: Client;
  technician?: import("./auth.types").UserAccount;
  checklist_items?: ChecklistItem[];
  checklist?: ChecklistItem[];
  workflow_execution?: WorkflowExecution;

  // Photo arrays extensions
  photos_before?: Photo[] | null;
  photos_after?: Photo[] | null;
  photos?: { before: Photo[]; after: Photo[]; during: Photo[] };

  // Additional fields for compatibility
  note?: string | null; // Alias for notes
  customer_comments?: string | null;
  special_instructions?: string | null;

  // Computed and extra fields not in base Task
  assigned_user_name?: string;
  client_name?: string;
  is_available?: boolean;
  estimated_duration_minutes?: number | null; // Alias for estimated_duration
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
  status?: string | "all";
  priority?: string | "all";
  search?: string;
  assignedTo?: string;
  vehicleId?: string;
  startDate?: string; // ISO date
  endDate?: string; // ISO date
  pageSize?: number;
  page?: number;
}

/**
 * Task action types for Tauri commands
 */
export type TaskAction =
  | { action: "Create"; data: CreateTaskRequest }
  | { action: "Get"; id: string }
  | { action: "Update"; id: string; data: UpdateTaskRequest }
  | { action: "Delete"; id: string }
  | { action: "List"; filters: TaskQuery }
  | { action: "GetStatistics" };

/**
 * Task CRUD response types
 */
export type TaskResponse =
  | { type: "Created"; data: TaskWithDetails }
  | { type: "Found"; data: TaskWithDetails }
  | { type: "Updated"; data: TaskWithDetails }
  | { type: "Deleted" }
  | { type: "NotFound" }
  | { type: "List"; data: TaskListResponse }
  | { type: "Statistics"; data: TaskStatistics };

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

// ChecklistItem is re-exported from '@/lib/backend' at the top of this file.
// Do not redefine it here — keep the generated type as the single source of truth.

/**
 * Workflow execution interface
 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  taskId: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
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

// Client is re-exported from '@/lib/backend' at the top of this file.
// Do not redefine it here — keep the generated type as the single source of truth.

/**
 * Check if task is overdue
 */
export function isTaskOverdue(task: Task): boolean {
  if (
    !task.scheduled_date ||
    task.status === "completed" ||
    task.status === "cancelled"
  ) {
    return false;
  }
  return new Date(task.scheduled_date) < new Date();
}

/**
 * Calculate task progress
 */
export function calculateTaskProgress(task: TaskWithDetails): number {
  if (task.status === "completed") return 100;
  if (task.status === "cancelled") return 0;

  const completedChecklistItems =
    task.checklist_items?.filter((item) => item.is_completed).length || 0;
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
