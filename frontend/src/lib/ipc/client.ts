import './mock/init';
import { safeInvoke } from './utils';
import { cachedInvoke, invalidatePattern } from './cache';
import { signalMutation } from '@/lib/data-freshness';
import type { ApiError } from '@/lib/backend';
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
  Intervention,
  InterventionStep,
  TaskListResponse,
  ClientListResponse,
  ClientWithTasks,
  TaskStatistics,
  ClientStatistics,
  StartInterventionRequest,
  AdvanceStepRequest,
  SaveStepProgressRequest,
  FinalizeInterventionRequest,
  SendNotificationRequest,
  CreateUserRequest,
  UpdateUserRequest,
  UserListResponse,
} from '@/lib/backend';
import type { SignupRequest, CreateClientRequest, UpdateClientRequest } from '@/lib/validation/ipc-schemas';

// Typed response interfaces for IPC workflow responses (replacing inline `any` casts)
interface InterventionWorkflowStartedResponse {
  type: string;
  intervention: Intervention;
  steps: InterventionStep[];
}

interface InterventionWorkflowRetrievedResponse {
  type: string;
  intervention: Intervention;
}

interface InterventionWorkflowActiveByTaskResponse {
  type: string;
  intervention: Intervention | null;
}

interface InterventionWorkflowActiveRetrievedResponse {
  type: string;
  intervention: Intervention | null;
}

interface InterventionStepAdvancedResponse {
  type: string;
  step: InterventionStep;
  next_step: InterventionStep | null;
  progress_percentage: number;
}

interface InterventionProgressRetrievedResponse {
  type: string;
  steps: InterventionStep[];
  progress: { completion_percentage?: number };
}

interface InterventionWorkflowFinalizedResponse {
  type: string;
  intervention: Intervention;
  metrics: JsonObject;
}

interface InterventionListRetrievedResponse {
  type: string;
  interventions: Intervention[];
  total: number;
}

interface NotificationConfig {
  provider?: string;
  api_key?: string;
  sender_email?: string;
  sender_phone?: string;
  enabled_channels?: string[];
  [key: string]: JsonValue | undefined;
}

interface MaterialQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: string;
  sort_by?: string;
  sort_order?: string;
}

interface MaterialCreateRequest {
  name: string;
  description?: string;
  category_id?: string;
  unit?: string;
  unit_price?: number;
  current_stock?: number;
  minimum_stock?: number;
  supplier_id?: string;
  [key: string]: JsonValue | undefined;
}

interface MaterialUpdateRequest {
  name?: string;
  description?: string;
  category_id?: string;
  unit?: string;
  unit_price?: number;
  minimum_stock?: number;
  supplier_id?: string;
  [key: string]: JsonValue | undefined;
}

interface StockUpdateRequest {
  material_id: string;
  quantity: number;
  operation: 'add' | 'subtract' | 'set';
  reason?: string;
  [key: string]: JsonValue | undefined;
}

interface StockAdjustmentRequest {
  material_id: string;
  quantity: number;
  reason: string;
  [key: string]: JsonValue | undefined;
}

interface ConsumptionRecordRequest {
  material_id: string;
  intervention_id: string;
  quantity: number;
  notes?: string;
  [key: string]: JsonValue | undefined;
}

interface InventoryTransactionRequest {
  material_id: string;
  transaction_type: string;
  quantity: number;
  reference?: string;
  notes?: string;
  [key: string]: JsonValue | undefined;
}

interface CategoryCreateRequest {
  name: string;
  description?: string;
  [key: string]: JsonValue | undefined;
}

interface SupplierCreateRequest {
  name: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  [key: string]: JsonValue | undefined;
}

interface ConsumptionHistoryQuery {
  page?: number;
  limit?: number;
}

interface TransactionHistoryQuery {
  page?: number;
  limit?: number;
}
import type { CreateEventInput, UpdateEventInput } from '@/types/calendar';
import {
  validateUserSession,
  validateTask,
  validateClient,
  // Add more validators as needed
  validateIntervention,
  validateInterventionStep,
  validateStartInterventionResponse,
  validateTaskListResponse,
} from '@/lib/validation/backend-type-guards';

interface BackendResponse<T = JsonValue> {
  type: string;
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
const invalidateUserSettingsCache = (): void => {
  invalidatePattern('user-settings');
};

export const ipcClient = {
  // Auth operations
  auth: {
    /**
     * Authenticates a user with email and password
     * @param email - User's email address
     * @param password - User's password
     * @returns Promise resolving to user session data
     */
    login: (email: string, password: string) =>
      safeInvoke<UserSession>('auth_login', { request: { email, password } }, validateUserSession),

    /**
     * Creates a new user account
     * @param request - Signup request data
     * @returns Promise resolving to user session data
     */
    createAccount: (request: SignupRequest) =>
      safeInvoke<UserSession>('auth_create_account', { request }, validateUserSession),

    /**
     * Refreshes an authentication token
     * @param refreshToken - The refresh token
     * @returns Promise resolving to new user session data
     */
    refreshToken: (refreshToken: string) =>
      safeInvoke<UserSession>('auth_refresh_token', { refreshToken }, validateUserSession),

    /**
     * Logs out the current user
     * @returns Promise resolving when logout is complete
     */
    logout: () =>
      safeInvoke<void>('auth_logout', {}),

    /**
     * Returns the current backend session (in-memory) if authenticated.
     */
    validateSession: () =>
      safeInvoke<UserSession>('auth_validate_session', {}, validateUserSession),

    /**
     * Enables 2FA for the current user
     * @param sessionToken - User's session token
     * @returns Promise resolving to 2FA setup data
     */
    enable2FA: () =>
      safeInvoke<JsonValue>('enable_2fa', {}),

    /**
     * Verifies 2FA setup with verification code
     * @param verificationCode - TOTP verification code
     * @param sessionToken - User's session token
     * @returns Promise resolving when setup is verified
     */
    verify2FASetup: (verificationCode: string, backupCodes: string[]) =>
      safeInvoke<void>('verify_2fa_setup', {
        verification_code: verificationCode,
        backup_codes: backupCodes
      }),

    /**
     * Disables 2FA for the current user
     * @param sessionToken - User's session token
     * @returns Promise resolving when 2FA is disabled
     */
    disable2FA: (password: string) =>
      safeInvoke<void>('disable_2fa', { password }),

    /**
     * Regenerates backup codes for 2FA
     * @param sessionToken - User's session token
     * @returns Promise resolving to new backup codes
     */
    regenerateBackupCodes: () =>
      safeInvoke<JsonValue>('regenerate_backup_codes', {}),

    /**
     * Checks if 2FA is enabled for a user
     * @param userId - User ID to check
     * @param sessionToken - User's session token
     * @returns Promise resolving to 2FA status
     */
    is2FAEnabled: () =>
      safeInvoke<boolean>('is_2fa_enabled', {}),
  },

  // Task operations
  tasks: {
    /**
     * Creates a new task
     * @param data - Task creation data
     * @returns Promise resolving to the created task
     */
    create: async (data: CreateTaskRequest): Promise<Task> => {
      const result = await safeInvoke<JsonValue>('task_crud', {
        request: {
          action: { action: 'Create', data },
        }
      });
      invalidatePattern('task:');
      signalMutation('tasks');
      return extractAndValidate(result, validateTask) as Task;
    },

    /**
     * Retrieves a task by ID
     * @param id - Task ID
     * @returns Promise resolving to the task or null if not found
     */
    get: (id: string): Promise<Task | null> =>
      cachedInvoke(`task:${id}`, 'task_crud', {
        request: {
          action: { action: 'Get', id },
        }
      }, (data: JsonValue) => extractAndValidate(data, validateTask, true) as Task | null),

    /**
     * Updates an existing task
     * @param id - Task ID
     * @param data - Task update data
     * @returns Promise resolving to the updated task
     */
    update: async (id: string, data: UpdateTaskRequest): Promise<Task> => {
      const result = await safeInvoke<JsonValue>('task_crud', {
        request: {
          action: { action: 'Update', id, data },
        }
      });
      invalidatePattern('task:');
      signalMutation('tasks');
      return extractAndValidate(result, validateTask) as Task;
    },

    /**
     * Lists tasks with optional filters
     * @param filters - Query filters for the task list
     * @returns Promise resolving to paginated task list response
     */
    list: (filters: Partial<TaskQuery>): Promise<TaskListResponse> =>
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
              search: filters.search ?? null,
              from_date: filters.from_date ?? null,
              to_date: filters.to_date ?? null,
              sort_by: filters.sort_by ?? 'created_at',
              sort_order: filters.sort_order ?? 'desc'
            }
          }
        }
      }).then(result => {
        // task_crud returns TaskListResponse which itself has a `data` field,
        // so avoid extractAndValidate (it would strip pagination).
        const data = result as unknown as TaskListResponse;
        if (!validateTaskListResponse(data)) {
          throw new Error('Invalid response format for task list');
        }
        return data;
      }),

    /**
     * Deletes a task by ID
     * @param id - Task ID to delete
     * @returns Promise resolving when deletion is complete
     */
    delete: async (id: string): Promise<void> => {
      await safeInvoke<void>('task_crud', {
        request: {
          action: { action: 'Delete', id },
        }
      });
      invalidatePattern('task:');
      signalMutation('tasks');
    },

    /**
     * Retrieves task statistics
     * @returns Promise resolving to task statistics
     */
    statistics: (): Promise<TaskStatistics> =>
      safeInvoke<JsonValue>('task_crud', {
        request: {
          action: { action: 'GetStatistics' }
        }
}).then(result => extractAndValidate(result) as TaskStatistics),

    /**
     * Checks if a user can be assigned to a task
     * @param taskId - Task ID to check
     * @param userId - User ID to check assignment for
     * @returns Promise resolving to assignment validation result
     */
    checkTaskAssignment: (taskId: string, userId: string) =>
      safeInvoke<JsonValue>('check_task_assignment', {
        request: { task_id: taskId, user_id: userId }
      }),

    /**
     * Checks if a task is available for assignment
     * @param taskId - Task ID to check
     * @returns Promise resolving to availability check result
     */
    checkTaskAvailability: (taskId: string) =>
      safeInvoke<JsonValue>('check_task_availability', {
        request: { task_id: taskId }
      }),

    /**
     * Validates task assignment changes
     * @param taskId - Task ID
     * @param oldUserId - Previous user ID (if any)
     * @param newUserId - New user ID
     * @returns Promise resolving to validation result
     */
    validateTaskAssignmentChange: (taskId: string, oldUserId: string | null, newUserId: string) =>
      safeInvoke<JsonValue>('validate_task_assignment_change', {
        request: { task_id: taskId, old_user_id: oldUserId, new_user_id: newUserId }
      }),

    /**
     * Edits a task with specific updates
     * @param taskId - Task ID to edit
     * @param updates - Task update data
     * @returns Promise resolving to the updated task
     */
    editTask: async (taskId: string, updates: JsonObject): Promise<Task> => {
      const result = await safeInvoke<JsonValue>('edit_task', {
        request: {
          task_id: taskId,
          data: updates,
        }
      });
      invalidatePattern('task:');
      signalMutation('tasks');
      return extractAndValidate(result, validateTask) as Task;
    },

    /**
     * Adds a note to a task
     * @param taskId - Task ID
     * @param note - Note content
     * @returns Promise resolving when note is added
     */
    addTaskNote: async (taskId: string, note: string): Promise<void> => {
      await safeInvoke<void>('add_task_note', {
        request: {
          task_id: taskId,
          note,
        }
      });
      invalidatePattern('task:');
      signalMutation('tasks');
    },

    /**
     * Sends a message related to a task
     * @param taskId - Task ID
     * @param message - Message content
     * @param messageType - Type of message
     * @returns Promise resolving when message is sent
     */
    sendTaskMessage: async (taskId: string, message: string, messageType: string): Promise<void> => {
      await safeInvoke<void>('send_task_message', {
        request: {
          task_id: taskId,
          message,
          message_type: messageType
        }
      });
    },

    /**
     * Delays a task to a new date
     * @param taskId - Task ID
     * @param newDate - New due date
     * @param reason - Reason for delay
     * @returns Promise resolving when task is delayed
     */
    delayTask: async (taskId: string, newDate: string, reason: string): Promise<void> => {
      await safeInvoke<void>('delay_task', {
        request: {
          task_id: taskId,
          new_scheduled_date: newDate,
          reason
        }
      });
      invalidatePattern('task:');
      signalMutation('tasks');
    },

    /**
     * Reports an issue with a task
     * @param taskId - Task ID
     * @param issueType - Type of issue
     * @param severity - Issue severity
     * @param description - Issue description
     * @returns Promise resolving when issue is reported
     */
    reportTaskIssue: async (taskId: string, issueType: string, severity: string, description: string): Promise<void> => {
      await safeInvoke<void>('report_task_issue', {
        request: {
          task_id: taskId,
          issue_type: issueType,
          severity,
          description
        }
      });
    },

    /**
     * Exports tasks to CSV format
     * @param options - Export options
     * @returns Promise resolving to CSV data string
     */
    exportTasksCsv: (options: { include_notes?: boolean; date_range?: { start_date?: string; end_date?: string } }): Promise<string> =>
      safeInvoke<string>('export_tasks_csv', {
        request: {
          include_client_data: options.include_notes ?? false,
          filter: options.date_range
            ? {
                date_from: options.date_range.start_date,
                date_to: options.date_range.end_date
              }
            : undefined,
        }
      }),

    /**
     * Imports tasks from CSV data
     * @param options - Import options with CSV lines
     * @returns Promise resolving to import result
     */
    importTasksBulk: (options: { csv_lines: string[]; skip_duplicates?: boolean; update_existing?: boolean }): Promise<{ total_processed: number; successful: number; failed: number; errors: string[]; duplicates_skipped: number }> =>
      safeInvoke<{ total_processed: number; successful: number; failed: number; errors: string[]; duplicates_skipped: number }>('import_tasks_bulk', {
        request: {
          csv_data: options.csv_lines.join('\n'),
          update_existing: options.update_existing ?? false
        }
      }),
  },

  // Client operations
  clients: {
    create: async (data: CreateClientRequest): Promise<Client> => {
      const result = await safeInvoke<JsonValue>('client_crud', {
        request: {
          action: { action: 'Create', data },
        }
      });
      invalidatePattern('client:');
      signalMutation('clients');
      return extractAndValidate(result, validateClient) as Client;
    },

    get: (id: string): Promise<Client | null> =>
      cachedInvoke(`client:${id}`, 'client_crud', {
        request: {
          action: { action: 'Get', id },
        }
      }, (data: JsonValue) => extractAndValidate(data, validateClient, true) as Client | null),

    getWithTasks: (id: string): Promise<Client | null> =>
      cachedInvoke(`client-with-tasks:${id}`, 'client_crud', {
        request: {
          action: { action: 'GetWithTasks', id },
        }
      }, (data: JsonValue) => extractAndValidate(data, validateClient, true) as Client | null),

    search: (query: string, limit: number): Promise<Client[]> =>
      safeInvoke<JsonValue>('client_crud', {
        request: {
          action: { action: 'Search', query, limit },
        }
      }).then(result => extractAndValidate(result) as Client[]),

    list: async (filters: Partial<ClientQuery>): Promise<ClientListResponse> => {
      const result = await safeInvoke<JsonValue>('client_crud', {
        request: {
          action: {
            action: 'List',
            filters: {
              page: filters.page ?? 1,
              limit: filters.limit ?? 20,
              search: filters.search ?? null,
              customer_type: filters.customer_type ?? null,
              sort_by: filters.sort_by ?? 'created_at',
              sort_order: filters.sort_order ?? 'desc'
            }
          }
        }
      });
      return extractAndValidate(result) as ClientListResponse;
    },

    listWithTasks: async (filters: Partial<ClientQuery>, limitTasks: number): Promise<ClientWithTasks[]> => {
      const result = await safeInvoke<JsonValue>('client_crud', {
        request: {
          action: {
            action: 'ListWithTasks',
            filters: {
              page: filters.page ?? 1,
              limit: filters.limit ?? 20,
              search: filters.search ?? null,
              customer_type: filters.customer_type ?? null,
              sort_by: filters.sort_by ?? 'created_at',
              sort_order: filters.sort_order ?? 'desc'
            },
            limit_tasks: limitTasks
          }
        }
      });
      return extractAndValidate(result) as ClientWithTasks[];
    },

    stats: (): Promise<ClientStatistics> =>
      safeInvoke<JsonValue>('client_crud', {
        request: {
          action: { action: 'Stats' }
        }
      }).then(result => extractAndValidate(result) as ClientStatistics),

    update: async (id: string, data: UpdateClientRequest): Promise<Client> => {
      const result = await safeInvoke<JsonValue>('client_crud', {
        request: {
          action: { action: 'Update', id, data },
        }
      });
      invalidatePattern('client:');
      signalMutation('clients');
      return extractAndValidate(result, validateClient) as Client;
    },

    delete: async (id: string): Promise<void> => {
      await safeInvoke<void>('client_crud', {
        request: {
          action: { action: 'Delete', id },
        }
      });
      invalidatePattern('client:');
      signalMutation('clients');
    },

      // Add more client operations
  },

    // Photo operations
    photos: {
       list: async (interventionId: string, sessionToken: string): Promise<Photo[]> => {
         const response = await safeInvoke<{photos: Photo[], total: number}>('document_get_photos', {
           session_token: sessionToken,
           request: { intervention_id: interventionId }
         });
         return response.photos ?? [];
       },

       upload: async (
         interventionId: string,
         file: { name: string; mimeType: string; bytes: Uint8Array },
         photoType: string,
         sessionToken: string
       ): Promise<Photo> => {
         const response = await safeInvoke<{photo: Photo, file_path: string}>('document_store_photo', {
           sessionToken: sessionToken,
           session_token: sessionToken,
           request: {
             intervention_id: interventionId,
             file_name: file.name,
             mime_type: file.mimeType,
             photo_type: photoType,
             is_required: false
           },
           imageData: Array.from(file.bytes),
           image_data: Array.from(file.bytes)
         });
         return response.photo;
       },

       delete: (photoId: string, sessionToken: string) =>
         safeInvoke<void>('document_delete_photo', {
           session_token: sessionToken,
           photo_id: photoId
         }),
    },

    // Intervention operations
  interventions: {
        start: async (data: StartInterventionRequest, sessionToken: string) => {
          const result = await safeInvoke<JsonValue>('intervention_workflow', {
            action: { action: 'Start', data },
            session_token: sessionToken,
            sessionToken: sessionToken,
            task_id: data.task_id
          });
          // Extract Started response from InterventionWorkflowResponse
          if (result && typeof result === 'object' && 'type' in result) {
            const workflowResponse = result as unknown as InterventionWorkflowStartedResponse;
            if (workflowResponse.type === 'Started') {
              invalidatePattern('intervention:');
              signalMutation('interventions');
              return validateStartInterventionResponse(workflowResponse);
            }
          }
          throw new Error('Invalid response format for intervention start');
        },

    get: async (id: string, sessionToken: string) => {
      const result = await safeInvoke<JsonValue>('intervention_workflow', {
        action: { action: 'Get', id },
        session_token: sessionToken,
        sessionToken: sessionToken
      });
      // Extract intervention from Retrieved response
      if (result && typeof result === 'object' && 'type' in result) {
        const workflowResponse = result as unknown as InterventionWorkflowRetrievedResponse;
        if (workflowResponse.type === 'Retrieved') {
          return validateIntervention(workflowResponse.intervention);
        }
      }
      throw new Error('Invalid response format for intervention get');
    },

      getActiveByTask: async (taskId: string, sessionToken: string) => {
        try {
          console.debug('[IPC] getActiveByTask called for task:', taskId);

          const result = await safeInvoke<JsonValue>('intervention_workflow', {
            action: { action: 'GetActiveByTask', task_id: taskId },
            session_token: sessionToken,
            sessionToken: sessionToken,
            task_id: taskId
          });

          console.debug('[IPC] getActiveByTask raw result:', result);

          // Handle InterventionWorkflowResponse directly
          // Expected: { type: "ActiveRetrieved", intervention: Intervention | null }
          if (result && typeof result === 'object' && 'type' in result) {
            const workflowResponse = result as unknown as InterventionWorkflowActiveByTaskResponse;
            console.debug('[IPC] getActiveByTask workflow response:', workflowResponse);

            if (workflowResponse.type === 'ActiveByTask') {
              return workflowResponse;
            }
          }

          // Fallback: return as-is if structure doesn't match
          console.warn('[IPC] getActiveByTask unexpected structure, returning as-is:', result);
          return result;
        } catch (error) {
          console.error('[IPC] getActiveByTask error:', error);
          throw error;
        }
      },

      getLatestByTask: async (taskId: string, sessionToken: string) => {
        try {
          console.debug('[IPC] getLatestByTask called for task:', taskId);

          const result = await safeInvoke<JsonValue>('intervention_get_latest_by_task', {
            taskId: taskId,
            sessionToken: sessionToken
          });

          console.debug('[IPC] getLatestByTask raw result:', result);

          // Handle the response - backend returns ApiResponse with data containing InterventionWorkflowResponse
          if (result && typeof result === 'object' && 'data' in result) {
            const apiResponse = result as { data: JsonValue };
            if (apiResponse.data && typeof apiResponse.data === 'object' && 'type' in apiResponse.data) {
              const workflowResponse = apiResponse.data as unknown as InterventionWorkflowActiveRetrievedResponse;
              if (workflowResponse.type === 'ActiveRetrieved') {
                return workflowResponse;
              }
            }
          }

          // Fallback: return as-is if structure doesn't match
          console.warn('[IPC] getLatestByTask unexpected structure, returning as-is:', result);
          return result;
        } catch (error) {
          console.error('[IPC] getLatestByTask error:', error);
          throw error;
        }
      },

      advanceStep: async (stepData: AdvanceStepRequest, sessionToken: string) => {
        const result = await safeInvoke<JsonValue>('intervention_progress', {
          action: {
            action: 'AdvanceStep',
            intervention_id: stepData.intervention_id,
            step_id: stepData.step_id,
            collected_data: stepData.collected_data,
            notes: stepData.notes,
            photos: stepData.photos,
            quality_check_passed: stepData.quality_check_passed,
            issues: stepData.issues
          },
          session_token: sessionToken,
          sessionToken: sessionToken
        });
        // Return the full StepAdvanced response
        if (result && typeof result === 'object' && 'type' in result) {
          const progressResponse = result as unknown as InterventionStepAdvancedResponse;
          if (progressResponse.type === 'StepAdvanced') {
            invalidatePattern('intervention:');
            signalMutation('interventions');
            return progressResponse;
          }
        }
        throw new Error('Invalid response format for advance step');
      },

    getStep: async (stepId: string, sessionToken: string) => {
      const result = await safeInvoke<JsonValue>('intervention_get_step', {
        step_id: stepId,
        session_token: sessionToken,
        sessionToken: sessionToken
      });
      return extractAndValidate(result, validateInterventionStep) as InterventionStep;
    },

    getProgress: async (interventionId: string, sessionToken: string) => {
      const result = await safeInvoke<JsonValue>('intervention_progress', {
        action: { action: 'Get', intervention_id: interventionId },
        session_token: sessionToken,
        sessionToken: sessionToken
      });
      // Extract progress data from Retrieved response
      if (result && typeof result === 'object' && 'type' in result) {
        const progressResponse = result as unknown as InterventionProgressRetrievedResponse;
        if (progressResponse.type === 'Retrieved') {
          return {
            steps: progressResponse.steps,
            progress_percentage: progressResponse.progress?.completion_percentage ?? 0
          };
        }
      }
      throw new Error('Invalid response format for get progress');
    },

    saveStepProgress: async (stepData: SaveStepProgressRequest, sessionToken: string) => {
      const result = await safeInvoke<JsonValue>('intervention_progress', {
        action: {
          action: 'SaveStepProgress',
          ...stepData,
        },
        session_token: sessionToken,
        sessionToken: sessionToken
      });
      // Extract updated step from StepProgressSaved response
      if (result && typeof result === 'object' && 'type' in result) {
        const progressResponse = result as { type: string; step?: JsonValue };
        if (progressResponse.type === 'StepProgressSaved' && progressResponse.step) {
          invalidatePattern('intervention:');
          signalMutation('interventions');
          return validateInterventionStep(progressResponse.step);
        }
      }
      throw new Error('Invalid response format for save step progress');
    },

    updateWorkflow: async (id: string, data: JsonObject, sessionToken: string) => {
      const result = await safeInvoke<JsonValue>('intervention_workflow', {
        action: { action: 'Update', id, data },
        session_token: sessionToken,
        sessionToken: sessionToken
      });
      // Extract response from Updated response
      if (result && typeof result === 'object' && 'type' in result) {
        const workflowResponse = result as { type: string; id: string; message: string };
        if (workflowResponse.type === 'Updated') {
          invalidatePattern('intervention:');
          signalMutation('interventions');
          return workflowResponse;
        }
      }
      throw new Error('Invalid response format for update workflow');
    },

    finalize: async (data: FinalizeInterventionRequest, sessionToken: string) => {
      const result = await safeInvoke<JsonValue>('intervention_workflow', {
        action: { action: 'Finalize', data },
        session_token: sessionToken,
        sessionToken: sessionToken
      });
      // Return the full Finalized response
      if (result && typeof result === 'object' && 'type' in result) {
        const workflowResponse = result as unknown as InterventionWorkflowFinalizedResponse;
        if (workflowResponse.type === 'Finalized') {
          invalidatePattern('intervention:');
          signalMutation('interventions');
          return workflowResponse;
        }
      }
      throw new Error('Invalid response format for finalize intervention');
    },

    list: async (filters: { status?: string; technician_id?: string; limit?: number; offset?: number }, sessionToken: string) => {
      const result = await safeInvoke<JsonValue>('intervention_management', {
        request: {
          action: { List: { filters } },
          session_token: sessionToken
        }
      });
      // Extract interventions from ListRetrieved response
      if (result && typeof result === 'object' && 'type' in result) {
        const managementResponse = result as unknown as InterventionListRetrievedResponse;
        if (managementResponse.type === 'ListRetrieved') {
          return {
            interventions: managementResponse.interventions,
            total: managementResponse.total
          };
        }
      }
      throw new Error('Invalid response format for intervention list');
    },
  },

  // Notification operations
  notifications: {
    initialize: (config: NotificationConfig, sessionToken: string) =>
      safeInvoke<void>('initialize_notification_service', { config, session_token: sessionToken }),

    send: (request: SendNotificationRequest, sessionToken: string) =>
      safeInvoke<void>('send_notification', { request, session_token: sessionToken }),

    testConfig: (recipient: string, channel: 'Email' | 'Sms' | 'Push', sessionToken: string) =>
      safeInvoke<string>('test_notification_config', { recipient, channel, session_token: sessionToken }),

    getStatus: (sessionToken: string) =>
      safeInvoke<JsonValue>('get_notification_status', { session_token: sessionToken }),

    // Recent activities for admin dashboard
    getRecentActivities: (sessionToken: string) =>
      safeInvoke<JsonValue[]>('get_recent_activities', { session_token: sessionToken }),
  },

  // Settings operations
  settings: {
    getAppSettings: () =>
      safeInvoke<JsonValue>('get_app_settings', {}),

    updateNotificationSettings: async (request: JsonObject) => {
      const sessionToken = await requireSessionToken();
      return safeInvoke<JsonValue>('update_notification_settings', { request: { ...request, session_token: sessionToken } });
    },

    // User settings operations
    getUserSettings: () =>
      cachedInvoke<UserSettings>('user-settings', 'get_user_settings', {}, undefined, 30000),

    updateUserProfile: async (request: JsonObject) => {
      const result = await safeInvoke<JsonValue>('update_user_profile', { request });
      invalidateUserSettingsCache();
      return result;
    },

    updateUserPreferences: async (request: JsonObject) => {
      const result = await safeInvoke<JsonValue>('update_user_preferences', { request });
      invalidateUserSettingsCache();
      return result;
    },

    updateUserSecurity: async (request: JsonObject) => {
      const sessionToken = await requireSessionToken();
      const result = await safeInvoke<JsonValue>('update_user_security', { request: { ...request, session_token: sessionToken } });
      invalidateUserSettingsCache();
      return result;
    },

    updateUserPerformance: async (request: JsonObject) => {
      const result = await safeInvoke<JsonValue>('update_user_performance', { request });
      invalidateUserSettingsCache();
      return result;
    },

    updateUserAccessibility: async (request: JsonObject) => {
      const sessionToken = await requireSessionToken();
      const result = await safeInvoke<JsonValue>('update_user_accessibility', { request: { ...request, session_token: sessionToken } });
      invalidateUserSettingsCache();
      return result;
    },

    updateUserNotifications: async (request: JsonObject) => {
      const sessionToken = await requireSessionToken();
      const result = await safeInvoke<JsonValue>('update_user_notifications', { request: { ...request, session_token: sessionToken } });
      invalidateUserSettingsCache();
      return result;
    },

    changeUserPassword: async (request: JsonObject) => {
      const sessionToken = await requireSessionToken();
      const result = await safeInvoke<string>('change_user_password', { request: { ...request, session_token: sessionToken } });
      invalidateUserSettingsCache();
      return result;
    },

    // Security operations
    getActiveSessions: () =>
      safeInvoke<JsonValue>('get_active_sessions', {}),

    revokeSession: (sessionId: string) =>
      safeInvoke<void>('revoke_session', { sessionId }),

    revokeAllSessionsExceptCurrent: () =>
      safeInvoke<void>('revoke_all_sessions_except_current', {}),

    updateSessionTimeout: (timeoutMinutes: number) =>
      safeInvoke<void>('update_session_timeout', { timeoutMinutes }),

    getSessionTimeoutConfig: () =>
      safeInvoke<JsonValue>('get_session_timeout_config', {}),

    uploadUserAvatar: (fileData: string, fileName: string, mimeType: string) =>
      safeInvoke<string>('upload_user_avatar', {
        request: { avatar_data: fileData, mime_type: mimeType }
      }).then((result) => {
        invalidateUserSettingsCache();
        return result;
      }),

    exportUserData: () =>
      safeInvoke<JsonObject>('export_user_data', {}),

    deleteUserAccount: async (confirmation: string) => {
      const sessionToken = await requireSessionToken();
      const result = await safeInvoke<string>('delete_user_account', {
        request: { confirmation, session_token: sessionToken }
      });
      invalidateUserSettingsCache();
      return result;
    },

    getDataConsent: () =>
      safeInvoke<JsonObject>('get_data_consent', {}),

    updateDataConsent: (request: JsonObject, sessionToken: string) =>
      safeInvoke<JsonObject>('update_data_consent', {
        request: { ...request, session_token: sessionToken }
      }),
  },

  // Security session management operations
  security: {
    getActiveSessions: () =>
      safeInvoke<JsonValue>('get_active_sessions', {}),

    revokeSession: (sessionId: string) =>
      safeInvoke<void>('revoke_session', { sessionId }),

    revokeAllSessionsExceptCurrent: () =>
      safeInvoke<void>('revoke_all_sessions_except_current', {}),

    updateSessionTimeout: (timeoutMinutes: number) =>
      safeInvoke<void>('update_session_timeout', { timeoutMinutes }),

    getSessionTimeoutConfig: () =>
      safeInvoke<JsonValue>('get_session_timeout_config', {}),
  },

  // Dashboard operations
  dashboard: {
    getStats: (sessionToken: string, timeRange?: 'day' | 'week' | 'month' | 'year') =>
      safeInvoke<{ tasks?: { total?: number; completed?: number; pending?: number; active?: number }; clients?: { total?: number; active?: number }; users?: { total?: number; active?: number; admins?: number; technicians?: number }; sync?: { status?: string; pending_operations?: number; completed_operations?: number } }>('dashboard_get_stats', { session_token: sessionToken, timeRange }),
  },

  // User operations
    users: {
      create: (data: CreateUserRequest, sessionToken: string): Promise<JsonValue> =>
        safeInvoke<JsonValue>('user_crud', {
          request: {
            action: { action: 'Create', data },
            session_token: sessionToken
          }
        }),

      get: (id: string, sessionToken: string): Promise<JsonValue> =>
        safeInvoke<JsonValue>('user_crud', {
          request: {
            action: { action: 'Get', id },
            session_token: sessionToken
          }
        }, (data: JsonValue) => extractAndValidate(data, undefined, true)),

      list: (limit: number, offset: number, sessionToken: string): Promise<UserListResponse> =>
        safeInvoke<JsonValue>('user_crud', {
          request: {
            action: { action: 'List', limit, offset },
            session_token: sessionToken
          }
        }).then(result => extractAndValidate(result) as UserListResponse),

      update: (id: string, data: UpdateUserRequest, sessionToken: string): Promise<JsonValue> =>
        safeInvoke<JsonValue>('user_crud', {
          request: {
            action: { action: 'Update', id, data },
            session_token: sessionToken
          }
        }),

      delete: (id: string, sessionToken: string): Promise<void> =>
        safeInvoke<void>('user_crud', {
          request: {
            action: { action: 'Delete', id },
            session_token: sessionToken
          }
        }),

      changeRole: (userId: string, newRole: string, sessionToken: string): Promise<void> =>
        safeInvoke<void>('user_crud', {
          request: {
            action: { ChangeRole: { id: userId, new_role: newRole } },
            session_token: sessionToken
          }
        }),

      updateEmail: (userId: string, newEmail: string, sessionToken: string): Promise<JsonValue> =>
        safeInvoke<JsonValue>('user_crud', {
          request: {
            action: { action: 'Update', id: userId, data: { email: newEmail } },
            session_token: sessionToken
          }
        }),

      changePassword: (userId: string, newPassword: string, sessionToken: string): Promise<void> =>
        safeInvoke<void>('user_crud', {
          request: {
            action: { ChangePassword: { id: userId, new_password: newPassword } },
            session_token: sessionToken
          }
        }),

      banUser: (userId: string, sessionToken: string): Promise<JsonValue> =>
        safeInvoke<JsonValue>('user_crud', {
          request: {
            action: { Ban: { id: userId } },
            session_token: sessionToken
          }
        }),

      unbanUser: (userId: string, sessionToken: string): Promise<JsonValue> =>
        safeInvoke<JsonValue>('user_crud', {
          request: {
            action: { Unban: { id: userId } },
            session_token: sessionToken
          }
        }),
   },

  // Bootstrap operations
  bootstrap: {
    firstAdmin: (userId: string, sessionToken: string) =>
      safeInvoke<string>('bootstrap_first_admin', { request: { user_id: userId, session_token: sessionToken } }),
    hasAdmins: () =>
      safeInvoke<boolean>('has_admins'),
  },

  // Sync operations
  sync: {
    start: () =>
      safeInvoke<void>('sync_start_background_service'),

    stop: () =>
      safeInvoke<void>('sync_stop_background_service'),

     getStatus: () =>
       cachedInvoke('sync:status', 'sync_get_status', undefined, undefined, 5000),

    syncNow: () =>
      safeInvoke<void>('sync_now'),

     getOperationsForEntity: (entityId: string, entityType: string) =>
       safeInvoke<JsonValue>('sync_get_operations_for_entity', {
         entity_id: entityId,
         entity_type: entityType
       }),
  },

  // Performance operations
  performance: {
    getStats: (sessionToken: string) =>
      safeInvoke<JsonValue>('get_performance_stats', { session_token: sessionToken }),

    getMetrics: (limit: number, sessionToken: string) =>
      safeInvoke<JsonValue>('get_performance_metrics', { limit, session_token: sessionToken }),

    cleanupMetrics: () =>
      safeInvoke<JsonValue>('cleanup_performance_metrics', {}),

    // Cache management
    getCacheStatistics: () =>
      safeInvoke<JsonValue>('get_cache_statistics', {}),

    clearApplicationCache: (request: { cache_types?: string[] }) =>
      safeInvoke<JsonValue>('clear_application_cache', { request }),

    configureCacheSettings: (request: { max_memory_mb?: number; default_ttl_seconds?: number; enable_disk_cache?: boolean }) =>
      safeInvoke<JsonValue>('configure_cache_settings', { request }),
  },

  // Admin operations
  admin: {
    healthCheck: () =>
      safeInvoke<string>('health_check'),

    getHealthStatus: () =>
      safeInvoke<JsonValue>('health_check'),

    getApplicationMetrics: () =>
      safeInvoke<JsonValue>('get_performance_stats'),

    getDatabaseStatus: (sessionToken: string) =>
      safeInvoke<JsonValue>('diagnose_database', { session_token: sessionToken }),

    getDatabaseStats: (sessionToken: string) =>
      safeInvoke<JsonValue>('get_database_stats', { session_token: sessionToken }),

    getDatabasePoolHealth: (sessionToken: string) =>
      safeInvoke<JsonValue>('get_database_pool_health', { session_token: sessionToken }),

    getAppInfo: () =>
      safeInvoke<JsonValue>('get_app_info'),

    getDeviceInfo: () =>
      safeInvoke<JsonValue>('get_device_info'),
  },

  // Audit operations
  audit: {
    getMetrics: (sessionToken: string) =>
      safeInvoke<JsonValue>('get_security_metrics', { session_token: sessionToken }),

    getEvents: (limit: number, sessionToken: string) =>
      safeInvoke<JsonValue>('get_security_events', { limit, session_token: sessionToken }),

    getAlerts: (sessionToken: string) =>
      safeInvoke<JsonValue>('get_security_alerts', { session_token: sessionToken }),

    acknowledgeAlert: (alertId: string, sessionToken: string) =>
      safeInvoke<JsonValue>('acknowledge_security_alert', { alert_id: alertId, session_token: sessionToken }),

    resolveAlert: (alertId: string, actionsTaken: string[], sessionToken: string) =>
      safeInvoke<JsonValue>('resolve_security_alert', { alert_id: alertId, actions_taken: actionsTaken, session_token: sessionToken }),

    cleanupEvents: (sessionToken: string) =>
      safeInvoke<JsonValue>('cleanup_security_events', { session_token: sessionToken }),
  },

  // Calendar operations
  calendar: {
    getEvents: (startDate: string, endDate: string, technicianId: string | undefined, sessionToken: string) =>
      safeInvoke('get_events', {
        start_date: startDate,
        end_date: endDate,
        technician_id: technicianId,
        session_token: sessionToken
      }),

    getEventById: (id: string, sessionToken: string) =>
      safeInvoke('get_event_by_id', { request: { id, session_token: sessionToken } }),

    createEvent: (eventData: CreateEventInput, sessionToken: string) =>
      safeInvoke('create_event', { request: { event_data: eventData as unknown as JsonObject, session_token: sessionToken } }),

    updateEvent: (id: string, eventData: UpdateEventInput, sessionToken: string) =>
      safeInvoke('update_event', { request: { id, event_data: eventData as unknown as JsonObject, session_token: sessionToken } }),

    deleteEvent: (id: string, sessionToken: string) =>
      safeInvoke('delete_event', { request: { id, session_token: sessionToken } }),

    getEventsForTechnician: (technicianId: string, sessionToken: string) =>
      safeInvoke('get_events_for_technician', { request: { technician_id: technicianId, session_token: sessionToken } }),

     getEventsForTask: (taskId: string, sessionToken: string) =>
       safeInvoke('get_events_for_task', { request: { task_id: taskId, session_token: sessionToken } }),
   },

  // Intervention operations
  intervention: {
     /**
      * Gets the active intervention for a task
      * @param taskId - Task ID
      * @param sessionToken - User's session token
      * @returns Promise resolving to active intervention
      */
     getActiveByTask: (taskId: string, sessionToken: string) =>
       safeInvoke('intervention_get_active_by_task', {
         task_id: taskId,
         session_token: sessionToken
       }),

     /**
      * Saves step progress for an intervention
      * @param request - Step progress data
      * @param sessionToken - User's session token
      * @param correlationId - Correlation ID for tracking
      * @returns Promise resolving to updated step
      */
     saveStepProgress: (request: SaveStepProgressRequest, sessionToken: string, correlationId: string) =>
       safeInvoke('intervention_save_step_progress', {
         request,
         session_token: sessionToken,
         correlation_id: correlationId
       }),

     /**
      * Gets a specific step by ID
      * @param stepId - Step ID
      * @param sessionToken - User's session token
      * @returns Promise resolving to step data
      */
     getStep: (stepId: string, sessionToken: string) =>
       safeInvoke('intervention_get_step', {
         step_id: stepId,
         session_token: sessionToken
       }),

     /**
      * Gets intervention progress
      * @param interventionId - Intervention ID
      * @param sessionToken - User's session token
      * @returns Promise resolving to intervention progress
      */
    getProgress: (interventionId: string, sessionToken: string) =>
      safeInvoke('intervention_get_progress', {
        intervention_id: interventionId,
        session_token: sessionToken
      }),
  },

  // Inventory/Material operations
  material: {
    /**
     * Lists materials with pagination and filtering
     * @param sessionToken - User's session token
     * @param query - Query parameters for filtering and pagination
     * @returns Promise resolving to paginated material list
     */
    list: (query: MaterialQueryParams = {}) =>
      safeInvoke('material_list', {
        ...query
      }),

    /**
     * Creates a new material
     * @param data - Material creation data
     * @param sessionToken - User's session token
     * @returns Promise resolving to created material
     */
    create: (data: MaterialCreateRequest) =>
      safeInvoke('material_create', {
        request: { ...data }
      }),

    /**
     * Updates an existing material
     * @param id - Material ID
     * @param data - Material update data
     * @param sessionToken - User's session token
     * @returns Promise resolving to updated material
     */
    update: (id: string, data: MaterialUpdateRequest) => {
      invalidatePattern('materials:*');
      invalidatePattern('material:*');
      return safeInvoke('material_update', {
        id,
        request: { ...data }
      });
    },

    /**
     * Gets a material by ID
     * @param id - Material ID
     * @param sessionToken - User's session token
     * @returns Promise resolving to material details
     */
    get: (id: string) =>
      safeInvoke('material_get', { id }),

    /**
     * Deletes a material
     * @param id - Material ID
     * @param sessionToken - User's session token
     * @returns Promise resolving to deletion result
     */
    delete: (id: string) => {
      invalidatePattern('materials:*');
      invalidatePattern('material:*');
      return safeInvoke('material_delete', { id });
    },

    /**
     * Updates material stock levels
     * @param data - Stock update data
     * @param sessionToken - User's session token
     * @returns Promise resolving to updated material with current stock
     */
    updateStock: (data: StockUpdateRequest) => {
      invalidatePattern('materials:*');
      invalidatePattern('material:*');
      return safeInvoke('material_update_stock', {
        request: { ...data }
      });
    },

    /**
     * Adjusts material stock with correction reason
     * @param data - Stock adjustment data
     * @param sessionToken - User's session token
     * @returns Promise resolving to updated material with current stock
     */
    adjustStock: (data: StockAdjustmentRequest) =>
      safeInvoke('material_adjust_stock', {
        request: { ...data }
      }),

    /**
     * Records material consumption for an intervention
     * @param data - Consumption recording data
     * @param sessionToken - User's session token
     * @returns Promise resolving to consumption record
     */
    recordConsumption: (data: ConsumptionRecordRequest) => {
      invalidatePattern('materials:*');
      invalidatePattern('material:*');
      return safeInvoke('material_record_consumption', {
        request: { ...data }
      });
    },

    /**
     * Gets consumption history for a material
     * @param materialId - Material ID
     * @param sessionToken - User's session token
     * @param query - Query parameters for pagination and filtering
     * @returns Promise resolving to consumption history
     */
    getConsumptionHistory: (materialId: string, query?: ConsumptionHistoryQuery) =>
      safeInvoke('material_get_consumption_history', {
        material_id: materialId,
        page: query?.page || 1,
        limit: query?.limit || 50,
      }),

    /**
     * Creates an inventory transaction
     * @param data - Transaction creation data
     * @param sessionToken - User's session token
     * @returns Promise resolving to created transaction
     */
    createInventoryTransaction: (data: InventoryTransactionRequest) => {
      invalidatePattern('materials:*');
      invalidatePattern('material:*');
      return safeInvoke('material_create_inventory_transaction', {
        request: { ...data }
      });
    },

    /**
     * Gets transaction history for a material
     * @param materialId - Material ID
     * @param sessionToken - User's session token
     * @param query - Query parameters for pagination and filtering
     * @returns Promise resolving to transaction history
     */
    getTransactionHistory: (materialId: string, query?: TransactionHistoryQuery) =>
      safeInvoke('material_get_transaction_history', {
        material_id: materialId,
        page: query?.page || 1,
        limit: query?.limit || 50,
      }),

    /**
     * Creates a new material category
     * @param data - Category creation data
     * @param sessionToken - User's session token
     * @returns Promise resolving to created category
     */
    createCategory: (data: CategoryCreateRequest) =>
      safeInvoke('material_create_category', {
        request: { ...data }
      }),

    /**
     * Lists all material categories
     * @param sessionToken - User's session token
     * @returns Promise resolving to category list
     */
    listCategories: () =>
      safeInvoke('material_list_categories', {}),

    /**
     * Creates a new supplier
     * @param data - Supplier creation data
     * @param sessionToken - User's session token
     * @returns Promise resolving to created supplier
     */
    createSupplier: (data: SupplierCreateRequest) =>
      safeInvoke('material_create_supplier', {
        request: { ...data }
      }),

    /**
     * Lists all suppliers
     * @param sessionToken - User's session token
     * @returns Promise resolving to supplier list
     */
    listSuppliers: () =>
      safeInvoke('material_list_suppliers', {}),

    /**
     * Gets material statistics
     * @param sessionToken - User's session token
     * @returns Promise resolving to material statistics
     */
    getStats: () =>
      safeInvoke('material_get_stats', {}),

    /**
     * Gets materials with low stock levels
     * @param sessionToken - User's session token
     * @returns Promise resolving to low stock materials
     */
    getLowStockMaterials: () =>
      safeInvoke('material_get_low_stock_materials', {}),

    /**
     * Gets expired or near-expiry materials
     * @param sessionToken - User's session token
     * @returns Promise resolving to expired materials
     */
    getExpiredMaterials: () =>
      safeInvoke('material_get_expired_materials', {}),

    /**
     * Gets inventory movement summary for a material
     * @param materialId - Material ID
     * @param sessionToken - User's session token
     * @returns Promise resolving to inventory movement summary
     */
    getInventoryMovementSummary: (materialId: string) =>
      safeInvoke('material_get_inventory_movement_summary', {
        material_id: materialId,
      }),
  },

} as const;
// Type-safe hook
export function useIpcClient() {
  return ipcClient;
}

