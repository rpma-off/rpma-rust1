// Shared API types for frontend-backend communication

export class ApiError extends Error {
   code?: string;
   details?: Record<string, unknown>;
   field?: string;
   constructor(message: string, code?: string, details?: Record<string, unknown>, field?: string) {
      super(message);
      this.code = code;
      this.details = details;
      this.field = field;
      Object.setPrototypeOf(this, ApiError.prototype);
   }
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ServiceData<T> {
   data: T;
   pagination?: Pagination;
   statistics?: Record<string, unknown>;
}

type CustomError = { message: string; code?: string; details?: Record<string, unknown> };

export interface ListResponse<T> {
  data: T[];
  pagination: Pagination;
  statistics?: Record<string, unknown>;
}

export interface ApiResponse<T> {
   success: boolean;
   data?: T extends any[] ? ListResponse<T[number]> : T;
   // The error field must accommodate the custom error object or a simple string
   error?: CustomError | ApiError;
}

export interface ApiErrorResult {
   success: false;
   error: string;
   code?: string;
   status?: number;
   details?: Record<string, unknown>;
}

// Updated ApiResponse to be a union type for better type safety
export type ApiResponseUnion<T> = ({ success: true; data: T; message?: string; }) | ApiErrorResult;

/**
 * Type guard to safely check for error with message and code properties
 */
export function isErrorWithMessage(error: unknown): error is { message: string; code?: string } {
   return (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as any).message === 'string'
   );
}

/**
 * Safely extract error message from ApiResponse error field
 */
export function getErrorMessage(error?: string | CustomError | ApiError): string {
   if (!error) return 'Unknown error';
   if (typeof error === 'string') return error;
   return error.message || 'Unknown error';
}

// Task types
export interface Task {
  id: string;
  task_number: string;
  title: string;
  description?: string;
  vehicle_plate?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_make?: string;
  vin?: string;
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  technician_id?: string;
  assigned_at?: string;
  assigned_by?: string;
  scheduled_date?: string;
  start_time?: string;
  end_time?: string;
  date_rdv?: string;
  heure_rdv?: string;
  template_id?: string;
  workflow_id?: string;
  workflow_status?: string;
  current_workflow_step_id?: string;
  started_at?: string;
  completed_at?: string;
  completed_steps?: string;
  client_id?: string;
  notes?: string;
  tags?: string;
  estimated_duration?: number;
  actual_duration?: number;
  created_at: string;
  updated_at: string;
   created_by?: string;
   updated_by?: string;
   synced: number;
   last_synced_at?: string;
}

export interface TaskListResponse {
  data: Task[];
  pagination: PaginationInfo;
  statistics?: TaskStatistics;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface TaskStatistics {
  total_tasks: number;
  draft_tasks: number;
  scheduled_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  cancelled_tasks: number;
  on_hold_tasks: number;
}

export type TaskResponse =
  | { type: 'Created'; data: Task }
  | { type: 'Found'; data: Task }
  | { type: 'Updated'; data: Task }
  | { type: 'Deleted' }
  | { type: 'NotFound' }
  | { type: 'List'; data: TaskListResponse }
  | { type: 'Statistics'; data: TaskStatistics };

// Client types
export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  customer_type: 'individual' | 'business';
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  address_country?: string;
  tax_id?: string;
  company_name?: string;
  contact_person?: string;
  notes?: string;
  tags?: string;
  total_tasks: number;
  active_tasks: number;
  completed_tasks: number;
  last_task_date?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  deleted_at?: string;
   deleted_by?: string;
   synced: number;
   last_synced_at?: string;
}

export interface ClientListResponse {
  data: Client[];
  pagination: PaginationInfo;
  statistics?: ClientStatistics;
}

export interface ClientStatistics {
  total_clients: number;
  active_clients: number;
  new_clients_this_month: number;
}

export type ClientResponse =
  | { type: 'Created'; data: Client }
  | { type: 'Found'; data: Client }
  | { type: 'Updated'; data: Client }
  | { type: 'Deleted' }
  | { type: 'NotFound' }
  | { type: 'List'; data: ClientListResponse }
  | { type: 'SearchResults'; data: Client[] };

// Recent tasks for dashboard
export interface RecentTask {
  id: string;
  title: string;
  client: string;
  status: string;
  priority: string;
  created_at: string;
}

// Auth types
export interface UserSession {
  user_id: string;
  username: string;
  email: string;
  role: UserRole;
  token: string;
  refresh_token?: string;
  expires_at: string; // ISO date string
  last_activity: string; // ISO date string
  created_at: string; // ISO date string
}

export type UserRole = 'admin' | 'technician' | 'supervisor' | 'viewer' | 'manager';

// Dashboard stats
export interface DashboardStats {
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalClients: number;
  syncStatus: 'online' | 'offline' | 'syncing';
  lastSync: string | null;
}