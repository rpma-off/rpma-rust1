import { safeInvoke } from './utils';
import { cachedInvoke, invalidatePattern } from './cache';
import type { ApiError } from '@/lib/backend';
import type { UserAccount } from '@/lib/backend';
import { withPermissionCheck } from '@/lib/rbac';
import type { JsonObject, JsonValue } from '@/types/json';
import type {
  UserSession,
  UserSettings,
  Task,
  Client,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskQuery,
  ClientQuery,
  Photo,
  TaskListResponse,
  ClientListResponse,
  TaskStatistics,
  CreateUserRequest,
  UpdateUserRequest,
  UserListResponse,
  // Reports types
  ReportType,
  DateRange,
  ReportFilters,
  TaskCompletionReport,
  TechnicianPerformanceReport,
  ClientAnalyticsReport,
  ExportFormat,
  ExportResult,
} from '@/lib/backend';
import type { SignupRequest, CreateClientRequest, UpdateClientRequest } from '@/lib/validation/ipc-schemas';
import { sanitizeInput } from '@/lib/utils/sanitize';

import {
  validateUserSession,
  validateTask,
  validateClient,
} from '@/lib/validation/backend-type-guards';

interface BackendResponse<T = JsonValue> {
  type?: string;
  success?: boolean;
  message?: string;
  error_code?: string;
  data?: T;
  error?: string | ApiError;
  correlation_id?: string;
}

/**
 * Helper function to extract and validate data from IPC response wrapper
 */
function extractAndValidate<T>(
  result: JsonValue,
  validator?: (data: JsonValue) => T,
  handleNotFound: boolean = false
): T | null {
  // Handle NotFound case
  if (handleNotFound && result && typeof result === 'object' && 'type' in result) {
    const response = result as unknown as BackendResponse;
    if (response.type === 'NotFound') {
      return null;
    }
  }

  // Extract data from response wrapper
  if (result && typeof result === 'object' && 'data' in result) {
    const response = result as unknown as BackendResponse;
    const data = response.data as JsonValue;
    return validator ? validator(data) : data as T;
  }

  // Fallback for direct data
  return validator ? validator(result) : result as T;
}

const getUserSettingsCacheKey = (sessionToken: string): string => `user-settings:${sessionToken}`;
const invalidateUserSettingsCache = (sessionToken: string): void => {
  invalidatePattern(getUserSettingsCacheKey(sessionToken));
};

/**
 * Creates a permission-aware IPC client
 */
export const createSecureIpcClient = (currentUser: UserAccount | null) => {
  return {
    // Auth operations
    auth: {
      login: (email: string, password: string) =>
        safeInvoke<UserSession>('auth_login', { 
          request: { 
            email: sanitizeInput(email), 
            password: password // Don't sanitize password
          } 
        }, validateUserSession),

      createAccount: (request: SignupRequest) =>
        safeInvoke<UserSession>('auth_create_account', {
          request: {
            ...request,
            email: sanitizeInput(request.email),
          }
        }, validateUserSession),

      refreshToken: (refreshToken: string) =>
        safeInvoke<UserSession>('auth_refresh_token', { refreshToken }, validateUserSession),

      logout: (token: string) =>
        safeInvoke<void>('auth_logout', { token }),

      validateSession: (token: string) =>
        cachedInvoke(`auth:session:${token}`, 'auth_validate_session', { token }, validateUserSession, 30000),

      // 2FA operations require admin permissions
      enable2FA: (sessionToken: string) =>
        withPermissionCheck(currentUser, 'settings:write', () =>
          safeInvoke<JsonValue>('enable_2fa', { session_token: sessionToken })
        ),

      verify2FASetup: (verificationCode: string, backupCodes: string[], sessionToken: string) =>
        withPermissionCheck(currentUser, 'settings:write', () =>
          safeInvoke<void>('verify_2fa_setup', { 
            verification_code: sanitizeInput(verificationCode), 
            backup_codes: backupCodes,
            session_token: sessionToken 
          })
        ),

      disable2FA: (password: string, sessionToken: string) =>
        withPermissionCheck(currentUser, 'settings:write', () =>
          safeInvoke<void>('disable_2fa', { password, session_token: sessionToken })
        ),

      regenerateBackupCodes: (sessionToken: string) =>
        withPermissionCheck(currentUser, 'settings:write', () =>
          safeInvoke<JsonValue>('regenerate_backup_codes', { session_token: sessionToken })
        ),

      is2FAEnabled: (sessionToken: string) =>
        safeInvoke<boolean>('is_2fa_enabled', { session_token: sessionToken }),
    },

    // Task operations
    tasks: {
      create: async (data: CreateTaskRequest, sessionToken: string): Promise<Task> => {
        // Sanitize input data
        const sanitizedData = {
          ...data,
          title: data.title ? sanitizeInput(data.title) : undefined,
          notes: data.notes ? sanitizeInput(data.notes) : undefined,
          vehicle_plate: sanitizeInput(data.vehicle_plate),
          vehicle_model: sanitizeInput(data.vehicle_model),
          description: data.description ? sanitizeInput(data.description) : undefined,
        };

        const result = await withPermissionCheck(currentUser, 'task:write', () =>
          safeInvoke<JsonValue>('task_crud', {
            request: {
              action: { action: 'Create', data: sanitizedData },
              session_token: sessionToken
            }
          })
        );
        invalidatePattern('task:');
        return extractAndValidate(result, validateTask) as Task;
      },

      get: (id: string, sessionToken: string): Promise<Task | null> =>
        cachedInvoke(`task:${id}`, 'task_crud', {
          request: {
            action: { action: 'Get', id },
            session_token: sessionToken
          }
        }, (data: JsonValue) => extractAndValidate(data, validateTask, true) as Task | null),

      update: async (id: string, data: UpdateTaskRequest, sessionToken: string): Promise<Task> => {
        // Sanitize update data
        const sanitizedData = {
          ...data,
          title: data.title ? sanitizeInput(data.title) : undefined,
          notes: data.notes ? sanitizeInput(data.notes) : undefined,
          description: data.description ? sanitizeInput(data.description) : undefined,
        };

        const result = await withPermissionCheck(currentUser, 'task:update', () =>
          safeInvoke<JsonValue>('task_crud', {
            request: {
              action: { action: 'Update', id, data: sanitizedData },
              session_token: sessionToken
            }
          })
        );
        invalidatePattern('task:');
        return extractAndValidate(result, validateTask) as Task;
      },

      list: async (filters: Partial<TaskQuery>, sessionToken: string): Promise<TaskListResponse> => {
        const result = await withPermissionCheck(currentUser, 'task:read', () =>
          safeInvoke<JsonValue>('task_crud', {
            request: {
              action: {
                action: 'List',
                filters: {
                  page: filters.page ?? 1,
                  limit: filters.limit ?? 20,
                  status: filters.status ?? null,
                  technician_id: filters.technician_id ?? null,
                  client_id: filters.client_id ?? null,
                  priority: filters.priority ?? null,
                  search: filters.search ? sanitizeInput(filters.search) : null,
                  from_date: filters.from_date ?? null,
                  to_date: filters.to_date ?? null,
                  sort_by: filters.sort_by ?? 'created_at',
                  sort_order: filters.sort_order ?? 'desc'
                }
              },
              session_token: sessionToken
            }
          })
        );
        if (!result.success) {
          throw new Error(result.error);
        }
        return extractAndValidate(result.data) as TaskListResponse;
      },

      delete: async (id: string, sessionToken: string): Promise<void> => {
        await withPermissionCheck(currentUser, 'task:delete', () =>
          safeInvoke<void>('task_crud', {
            request: {
              action: { action: 'Delete', id },
              session_token: sessionToken
            }
          })
        );
        invalidatePattern('task:');
      },

      statistics: async (sessionToken: string): Promise<TaskStatistics> => {
        const result = await withPermissionCheck(currentUser, 'task:read', () =>
          safeInvoke<JsonValue>('task_crud', {
            request: {
              action: { action: 'GetStatistics' },
              session_token: sessionToken
            }
          })
        );
        if (!result.success) {
          throw new Error(result.error);
        }
        return extractAndValidate(result.data) as TaskStatistics;
      },

      // Additional task operations with permission checks...
      checkTaskAssignment: (taskId: string, userId: string, sessionToken: string) =>
        withPermissionCheck(currentUser, 'task:update', () =>
          safeInvoke<JsonValue>('check_task_assignment', {
            request: { task_id: taskId, user_id: userId, session_token: sessionToken }
          })
        ),

      addTaskNote: async (taskId: string, note: string, sessionToken: string): Promise<void> => {
        await withPermissionCheck(currentUser, 'task:write', () =>
          safeInvoke<void>('add_task_note', {
            request: {
              task_id: taskId,
              note: sanitizeInput(note),
              session_token: sessionToken
            }
          })
        );
        invalidatePattern('task:');
      },

      sendTaskMessage: async (taskId: string, message: string, messageType: string, sessionToken: string): Promise<void> => {
        await withPermissionCheck(currentUser, 'task:write', () =>
          safeInvoke<void>('send_task_message', {
            request: {
              task_id: taskId,
              message: sanitizeInput(message),
              message_type: sanitizeInput(messageType),
              session_token: sessionToken
            }
          })
        );
      },
    },

    // Client operations with permission checks
    clients: {
      create: async (data: CreateClientRequest, sessionToken: string): Promise<Client> => {
        const sanitizedData = {
          ...data,
          name: sanitizeInput(data.name),
          email: data.email ? sanitizeInput(data.email) : undefined,
          phone: data.phone ? sanitizeInput(data.phone) : undefined,
          address_street: data.address_street ? sanitizeInput(data.address_street) : undefined,
          address_city: data.address_city ? sanitizeInput(data.address_city) : undefined,
          address_state: data.address_state ? sanitizeInput(data.address_state) : undefined,
          address_zip: data.address_zip ? sanitizeInput(data.address_zip) : undefined,
          address_country: data.address_country ? sanitizeInput(data.address_country) : undefined,
        };

        const result = await withPermissionCheck(currentUser, 'client:write', () =>
          safeInvoke<JsonValue>('client_crud', {
            request: {
              action: { action: 'Create', data: sanitizedData },
              session_token: sessionToken
            }
          })
        );
        invalidatePattern('client:');
        return extractAndValidate(result, validateClient) as Client;
      },

      get: (id: string, sessionToken: string): Promise<Client | null> =>
        cachedInvoke(`client:${id}`, 'client_crud', {
          request: {
            action: { action: 'Get', id },
            session_token: sessionToken
          }
        }, (data: JsonValue) => extractAndValidate(data, validateClient, true) as Client | null),

      list: async (filters: Partial<ClientQuery>, sessionToken: string): Promise<ClientListResponse> => {
        const result = await withPermissionCheck(currentUser, 'client:read', () =>
          safeInvoke<JsonValue>('client_crud', {
            request: {
              action: {
                action: 'List',
                filters: {
                  page: filters.page ?? 1,
                  limit: filters.limit ?? 20,
                  search: filters.search ? sanitizeInput(filters.search) : null,
                  customer_type: filters.customer_type ?? null,
                  sort_by: filters.sort_by ?? 'created_at',
                  sort_order: filters.sort_order ?? 'desc'
                }
              },
              session_token: sessionToken
            }
          })
        );
        return extractAndValidate(result) as ClientListResponse;
      },

      update: async (id: string, data: UpdateClientRequest, sessionToken: string): Promise<Client> => {
        const sanitizedData = {
          ...data,
          name: data.name ? sanitizeInput(data.name) : undefined,
          email: data.email ? sanitizeInput(data.email) : undefined,
        };

        const result = await withPermissionCheck(currentUser, 'client:update', () =>
          safeInvoke<JsonValue>('client_crud', {
            request: {
              action: { action: 'Update', id, data: sanitizedData },
              session_token: sessionToken
            }
          })
        );
        invalidatePattern('client:');
        return extractAndValidate(result, validateClient) as Client;
      },

      delete: async (id: string, sessionToken: string): Promise<void> => {
        await withPermissionCheck(currentUser, 'client:delete', () =>
          safeInvoke<void>('client_crud', {
            request: {
              action: { action: 'Delete', id },
              session_token: sessionToken
            }
          })
        );
        invalidatePattern('client:');
      },
    },

    // User operations with stricter permission checks
    users: {
      create: async (data: CreateUserRequest, sessionToken: string): Promise<JsonValue> => {
        const result = await withPermissionCheck(currentUser, 'user:write', () =>
          safeInvoke<JsonValue>('user_crud', {
            request: {
              action: { action: 'Create', data },
              session_token: sessionToken
            }
          })
        );
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.data;
      },

      list: async (limit: number, offset: number, sessionToken: string): Promise<UserListResponse> => {
        const result = await withPermissionCheck(currentUser, 'user:read', () =>
          safeInvoke<JsonValue>('user_crud', {
            request: {
              action: { action: 'List', limit, offset },
              session_token: sessionToken
            }
          })
        );
        if (!result.success) {
          throw new Error(result.error);
        }
        return extractAndValidate(result.data) as UserListResponse;
      },

      update: async (id: string, data: UpdateUserRequest, sessionToken: string): Promise<JsonValue> => {
        const result = await withPermissionCheck(currentUser, 'user:update', () =>
          safeInvoke<JsonValue>('user_crud', {
            request: {
              action: { action: 'Update', id, data },
              session_token: sessionToken
            }
          })
        );
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.data;
      },

      delete: async (id: string, sessionToken: string): Promise<void> => {
        const result = await withPermissionCheck(currentUser, 'user:delete', () =>
          safeInvoke<void>('user_crud', {
            request: {
              action: { action: 'Delete', id },
              session_token: sessionToken
            }
          })
        );
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.data;
      },

      changeRole: async (userId: string, newRole: string, sessionToken: string): Promise<void> => {
        const result = await withPermissionCheck(currentUser, 'user:update', () =>
          safeInvoke<void>('user_crud', {
            request: {
              action: { ChangeRole: { id: userId, new_role: sanitizeInput(newRole) } },
              session_token: sessionToken
            }
          })
        );
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.data;
      },

      // User management operations require admin role
      banUser: (userId: string, sessionToken: string): Promise<JsonValue> =>
        withPermissionCheck(currentUser, 'user:delete', () =>
          safeInvoke<JsonValue>('user_crud', {
            request: {
              action: { Ban: { id: userId } },
              session_token: sessionToken
            }
          })
        ),
    },

    // Photos operations with permission checks
    photos: {
      upload: (interventionId: string, filePath: string, photoType: string, sessionToken: string) =>
        withPermissionCheck(currentUser, 'photo:upload', () =>
          safeInvoke<Photo>('photo_crud', {
            Store: {
              intervention_id: interventionId,
              file_name: filePath,
              mime_type: 'image/jpeg',
              photo_type: sanitizeInput(photoType),
              is_required: false
            },
            session_token: sessionToken
          })
        ),

      delete: (photoId: string, sessionToken: string) =>
        withPermissionCheck(currentUser, 'photo:delete', () =>
          safeInvoke<void>('photo_crud', {
            Delete: { id: photoId },
            session_token: sessionToken
          })
        ),
    },

    // Reports operations with permission checks
    reports: {
      getTaskCompletionReport: (dateRange: DateRange, filters?: ReportFilters) =>
        withPermissionCheck(currentUser, 'report:read', () =>
          safeInvoke<TaskCompletionReport>('get_task_completion_report', {
            dateRange: dateRange,
            filters: filters || {}
          })
        ),

      getTechnicianPerformanceReport: (dateRange: DateRange, filters?: ReportFilters) =>
        withPermissionCheck(currentUser, 'report:read', () =>
          safeInvoke<TechnicianPerformanceReport>('get_technician_performance_report', {
            dateRange: dateRange,
            filters: filters || {}
          })
        ),

      getClientAnalyticsReport: (dateRange: DateRange, filters?: ReportFilters) =>
        withPermissionCheck(currentUser, 'report:read', () =>
          safeInvoke<ClientAnalyticsReport>('get_client_analytics_report', {
            dateRange: dateRange,
            filters: filters || {}
          })
        ),

      exportReport: (reportType: ReportType, dateRange: DateRange, filters: ReportFilters, format: ExportFormat) =>
        withPermissionCheck(currentUser, 'report:write', () =>
          safeInvoke<ExportResult>('export_report_data', {
            report_type: reportType,
            format,
            dateRange: dateRange,
            filters: filters || {}
          })
        ),
    },

    // Settings operations with permission checks
    settings: {
      getUserSettings: (sessionToken: string) =>
        cachedInvoke<UserSettings>(getUserSettingsCacheKey(sessionToken), 'get_user_settings', { sessionToken }, undefined, 30000),

      updateUserProfile: (request: JsonObject, sessionToken: string) =>
        withPermissionCheck(currentUser, 'settings:write', () => {
          const sanitizedRequest = {
            ...request,
            full_name: request.full_name ? sanitizeInput(request.full_name as string) : undefined,
            email: request.email ? sanitizeInput(request.email as string) : undefined,
          };
          return safeInvoke<JsonValue>('update_user_profile', { request: { ...sanitizedRequest, session_token: sessionToken } })
            .then((result) => {
              invalidateUserSettingsCache(sessionToken);
              return result;
            });
        }),

      updateUserPreferences: (request: JsonObject, sessionToken: string) =>
        withPermissionCheck(currentUser, 'settings:write', () =>
          safeInvoke<JsonValue>('update_user_preferences', { request: { ...request, session_token: sessionToken } })
            .then((result) => {
              invalidateUserSettingsCache(sessionToken);
              return result;
            })
        ),

      // Security settings require special permissions
      updateUserSecurity: (request: JsonObject, sessionToken: string) =>
        withPermissionCheck(currentUser, 'settings:write', () =>
          safeInvoke<JsonValue>('update_user_security', { request: { ...request, session_token: sessionToken } })
            .then((result) => {
              invalidateUserSettingsCache(sessionToken);
              return result;
            })
        ),

      changeUserPassword: (request: JsonObject, sessionToken: string) =>
        withPermissionCheck(currentUser, 'settings:write', () =>
          safeInvoke<string>('change_user_password', { request: { ...request, session_token: sessionToken } })
            .then((result) => {
              invalidateUserSettingsCache(sessionToken);
              return result;
            })
        ),
    },
  };
};

// Export the secure client creator
export const ipcClient = createSecureIpcClient(null);
