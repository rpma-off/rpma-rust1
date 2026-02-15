// Frontend-specific type extensions and utilities
// This file provides type fixes and utilities for the auto-generated backend types

import type { Task as BaseTask, Client as BaseClient, UserRole } from './backend';

// Base UserAccount type (matches Rust model)
export type BaseUserAccount = {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  password_hash: string;
  salt: string | null;
  phone: string | null;
  is_active: boolean;
  last_login: string | null;
  login_count: number;
  preferences: string | null;
  synced: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

// Extended UserAccount with computed name property
export interface UserAccount extends Omit<BaseUserAccount, 'created_at' | 'updated_at' | 'last_login' | 'last_synced_at'> {
  created_at: string;
  updated_at: string;
  last_login: string | null;
  last_synced_at: string | null;
  // Computed property for full name
  name?: string;
}

// Extended Task with string timestamps
export interface Task extends Omit<BaseTask,
  'created_at' | 'updated_at' | 'assigned_at' | 'started_at' | 'completed_at' | 'last_synced_at'> {
  created_at: string;
  updated_at: string;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  last_synced_at: string | null;
  // Computed fields added at runtime
  progress?: number;
  is_overdue?: boolean;
}

// Extended Client with string timestamps
export interface Client extends Omit<BaseClient,
  'created_at' | 'updated_at' | 'deleted_at' | 'last_synced_at'> {
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  last_synced_at: string | null;
}

// Extended ClientWithTasks with string timestamps
export interface ClientWithTasks extends Client {
  tasks: Task[] | null;
  // Additional fields from BaseClientWithTasks
  total_tasks: number;
  active_tasks: number;
  completed_tasks: number;
  last_task_date: string | null;
}



// Utility function to get user full name
export function getUserFullName(user: BaseUserAccount | UserAccount): string {
  if ('name' in user && user.name) {
    return user.name;
  }
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  return `${firstName} ${lastName}`.trim() || user.username;
}

// Utility function to convert BigInt timestamps to strings
export function convertTimestamps<T extends object>(obj: T): T {
  const result = { ...(obj as Record<string, unknown>) };
  const timestampFields = ['created_at', 'updated_at', 'assigned_at', 'started_at', 'completed_at', 'last_synced_at', 'deleted_at', 'last_login'];

  for (const field of timestampFields) {
    if (field in result && typeof result[field] === 'bigint') {
      result[field] = new Date(Number(result[field])).toISOString();
    }
  }

  return result as T;
}

// Type guards
export function isUserAccount(obj: unknown): obj is UserAccount {
  return !!obj && typeof obj === 'object' && 'id' in obj && 'email' in obj && 'username' in obj;
}

export function isTask(obj: unknown): obj is Task {
  return !!obj && typeof obj === 'object' && 'id' in obj && 'title' in obj && 'status' in obj;
}

export function isClient(obj: unknown): obj is Client {
  return !!obj && typeof obj === 'object' && 'id' in obj && 'name' in obj;
}

// Runtime enum object for UserRole (type is imported from backend)
export const UserRoleValues = {
  Admin: "admin" as const,
  Technician: "technician" as const,
  Supervisor: "supervisor" as const,
  Viewer: "viewer" as const,
} as const;

export const TaskStatus = {
  Draft: "draft" as const,
  Scheduled: "scheduled" as const,
  InProgress: "in_progress" as const,
  Completed: "completed" as const,
  Cancelled: "cancelled" as const,
  OnHold: "on_hold" as const,
  Pending: "pending" as const,
  Invalid: "invalid" as const,
  Archived: "archived" as const,
  Failed: "failed" as const,
  Overdue: "overdue" as const,
  Assigned: "assigned" as const,
  Paused: "paused" as const,
} as const;

export const TaskPriority = {
  Low: "low" as const,
  Medium: "medium" as const,
  High: "high" as const,
  Urgent: "urgent" as const,
} as const;

export const PhotoType = {
  Before: "before" as const,
  During: "during" as const,
  After: "after" as const,
} as const;

export const PhotoCategory = {
  VehicleCondition: "vehicle_condition" as const,
  Workspace: "workspace" as const,
  StepProgress: "step_progress" as const,
  QcCheck: "qc_check" as const,
  FinalResult: "final_result" as const,
  Other: "other" as const,
} as const;

export const EntityType = {
  Task: "task" as const,
  Client: "client" as const,
  Intervention: "intervention" as const,
  Photo: "photo" as const,
} as const;

export const SyncStatus = {
  Pending: "pending" as const,
  Processing: "processing" as const,
  Completed: "completed" as const,
  Failed: "failed" as const,
  Abandoned: "abandoned" as const,
} as const;
