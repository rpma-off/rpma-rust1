// Common TypeScript interfaces for RPMA v2

// Re-export compatibility modules
export * from "./auth.types";
export * from "./task.types";

// Re-export generated backend contracts as the primary source of truth
export type {
  UserAccount,
  Task,
  Client,
  ClientWithTasks,
  Intervention,
  SyncOperation,
  SyncStatus,
  Photo,
  PhotoType,
  PhotoCategory,
  TaskStatistics,
  TaskListResponse,
  ClientListResponse,
  UserListResponse,
  UserResponse,
} from "@/lib/backend";

// Tauri invoke function type
export interface TauriInvoke {
  <T>(command: string, args?: Record<string, unknown>): Promise<T>;
}

// Legacy response and utility interfaces kept for compatibility

export interface MenuEvent {
  event: string;
  payload?: Record<string, unknown>;
}

export interface FormData {
  [key: string]: unknown;
}

export interface TableColumn<T = Record<string, unknown>> {
  key: string;
  title: string;
  width?: number | string;
  render?: (value: unknown, item: T) => React.ReactNode;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
