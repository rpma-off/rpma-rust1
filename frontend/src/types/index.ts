// Common TypeScript interfaces for RPMA v2

// Re-export specialized types
export * from './auth.types';
export * from './task.types';

// Import and re-export extended types from lib/types.ts
import type { UserAccount, Task, Client, ClientWithTasks } from '@/lib/types';
export type { UserAccount, Task, Client, ClientWithTasks };

// Import core backend types for re-export
import {
  Intervention,
  SyncOperation,
  SyncStatus,
  Photo,
  PhotoType,
  PhotoCategory
} from '@/lib/backend';

// Re-export core backend types for backward compatibility
export type {
  Intervention,
  SyncOperation,
  SyncStatus,
  Photo,
  PhotoType,
  PhotoCategory
};



// Tauri invoke function type
export interface TauriInvoke {
  <T>(command: string, args?: Record<string, unknown>): Promise<T>;
}

// Legacy response types (keeping for backward compatibility)

// Menu event interface
export interface MenuEvent {
  event: string;
  payload?: Record<string, unknown>;
}

// Form data interface
export interface FormData {
  [key: string]: unknown;
}

// Table column interface
export interface TableColumn<T = Record<string, unknown>> {
  key: string;
  title: string;
  width?: number | string;
  render?: (value: unknown, item: T) => React.ReactNode;
}

// API response interface
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Auth interfaces are now defined in auth.types.ts

// User CRUD response types
export interface UserListResponse {
  data: UserAccount[];
}

export type UserResponse =
  | { type: 'Created'; data: UserAccount }
  | { type: 'Found'; data: UserAccount }
  | { type: 'Updated'; data: UserAccount }
  | { type: 'Deleted' }
  | { type: 'NotFound' }
  | { type: 'List'; data: UserListResponse };

// Task statistics interface
export interface TaskStatistics {
  total_tasks: number;
  draft_tasks: number;
  scheduled_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  cancelled_tasks: number;
}

// Task CRUD response types
export interface TaskListResponse {
  data: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  statistics?: TaskStatistics;
}

export type TaskResponse =
  | { type: 'Created'; data: Task }
  | { type: 'Found'; data: Task }
  | { type: 'Updated'; data: Task }
  | { type: 'Deleted' }
  | { type: 'NotFound' }
  | { type: 'List'; data: TaskListResponse }
  | { type: 'Statistics'; data: TaskStatistics };

// Client CRUD response types
export interface ClientListResponse {
  data: Client[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export type ClientResponse =
  | { type: 'Created'; data: Client }
  | { type: 'Found'; data: Client }
  | { type: 'Updated'; data: Client }
  | { type: 'Deleted' }
  | { type: 'NotFound' }
  | { type: 'List'; data: ClientListResponse }
  | { type: 'SearchResults'; data: Client[] };