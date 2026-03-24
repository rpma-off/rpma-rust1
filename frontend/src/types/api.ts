// Shared API types for frontend-backend communication
import { ApiError } from "@/lib/api-error";
import type {
  Task,
  TaskListResponse,
  TaskStatistics,
  Client,
  ClientListResponse,
} from "@/lib/backend";
export { ApiError };

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

type CustomError = {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
};

export interface ListResponse<T> {
  data: T[];
  pagination: Pagination;
  statistics?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  error_code?: string;
  data?: T extends unknown[] ? ListResponse<T[number]> : T;
  // The error field must accommodate the custom error object or a simple string
  error?: CustomError | ApiError;
  correlation_id?: string;
}

export interface ApiErrorResult {
  success: false;
  error: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
}

// Updated ApiResponse to be a union type for better type safety
export type ApiResponseUnion<T> =
  | { success: true; data: T; message?: string }
  | ApiErrorResult;

/**
 * Type guard to safely check for error with message and code properties
 */
export function isErrorWithMessage(
  error: unknown,
): error is { message: string; code?: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

/**
 * Safely extract error message from ApiResponse error field
 */
export function getErrorMessage(
  error?: string | CustomError | ApiError,
): string {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  return error.message || "Unknown error";
}

export type TaskResponse =
  | { type: "Created"; data: Task }
  | { type: "Found"; data: Task }
  | { type: "Updated"; data: Task }
  | { type: "Deleted" }
  | { type: "NotFound" }
  | { type: "List"; data: TaskListResponse }
  | { type: "Statistics"; data: TaskStatistics };

export type ClientResponse =
  | { type: "Created"; data: Client }
  | { type: "Found"; data: Client }
  | { type: "Updated"; data: Client }
  | { type: "Deleted" }
  | { type: "NotFound" }
  | { type: "List"; data: ClientListResponse }
  | { type: "SearchResults"; data: Client[] };

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
