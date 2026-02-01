/**
 * Tauri IPC Service Layer
 * 
 * This service provides a unified interface for communicating with the Rust backend
 * through Tauri's IPC system. It replaces Supabase with local backend calls.
 */

import { createLogger, LogContext } from '@/lib/utils/logger';
import { z } from 'zod';
import {
    TaskCrudRequestSchema,
    ClientCrudRequestSchema,
    LoginRequestSchema,
    SignupRequestSchema,
    ApiResponseSchema,
    ServiceResponseSchema
} from '@/lib/validation/ipc-schemas';
import type { AuthResponse } from '@/types/auth.types';
import type { ApiError } from '@/lib/backend';
import {
    isUserAccount,
    validateTask,
    validateClient,
    validateUserAccount,
    safeValidateTask,
    safeValidateClient,
    safeValidateUserAccount
} from '@/lib/validation/backend-type-guards';

const logger = createLogger();

// Check if running in Tauri context
let isTauri = false;
let invoke: (<T>(command: string, args?: Record<string, unknown>) => Promise<T>) | null = null;
let initializationPromise: Promise<void> | null = null;

if (typeof window !== 'undefined') {
  try {
    // Dynamically import to avoid issues when not in Tauri
    initializationPromise = import('@tauri-apps/api/core').then(({ invoke: tauriInvoke }) => {
      invoke = tauriInvoke;
      isTauri = true;
      logger.info(LogContext.SYSTEM, 'Tauri IPC initialized successfully');
    }).catch((error) => {
      isTauri = false;
      logger.error(LogContext.SYSTEM, 'Failed to initialize Tauri IPC', { error: error.message });
      throw error;
    });
  } catch (error) {
    isTauri = false;
    logger.error(LogContext.SYSTEM, 'Exception during Tauri IPC initialization', { error: error instanceof Error ? error.message : String(error) });
    initializationPromise = Promise.reject(error);
  }
} else {
  logger.warn(LogContext.SYSTEM, 'Window object not available, Tauri IPC disabled');
  initializationPromise = Promise.resolve();
}

// Base response type matching Rust backend ApiResponse<T>
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Service response type for frontend consistency
export interface ServiceResponse<T> {
    success: boolean;
    data: T | null;
    error: ApiError | null;
    status?: number;
}

/**
 * Base IPC service class
 * @deprecated Use ipcClient from '@/lib/ipc' instead
 * This service will be removed in v2.0
 *
 * Migration guide: frontend/src/lib/ipc/README.md
 */
export class IpcService {
   /**
    * Validate request data against Zod schema
    */
   protected static validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
     try {
       return schema.parse(data);
     } catch (error) {
       const errorMessage = error instanceof Error ? error.message : 'Validation failed';
       logger.error(LogContext.SYSTEM, `IPC request validation failed: ${errorMessage}`, { error, data });
       throw new Error(`Request validation failed: ${errorMessage}`);
     }
   }

   /**
    * Validate response data against Zod schema
    */
   protected static validateResponse<T>(schema: z.ZodSchema<T>, data: unknown): T {
     try {
       return schema.parse(data);
     } catch (error) {
       const errorMessage = error instanceof Error ? error.message : 'Response validation failed';
       logger.error(LogContext.SYSTEM, `IPC response validation failed: ${errorMessage}`, { error, data });
       throw new Error(`Response validation failed: ${errorMessage}`);
     }
   }

    /**
     * Invoke a Tauri command with error handling and optional type validation
     */
    static async invoke<T>(
      command: string,
      args?: Record<string, unknown>,
      typeValidator?: (data: unknown) => data is T
    ): Promise<ServiceResponse<T>> {
      const startTime = performance.now();
      const requestId = Math.random().toString(36).substring(7);

      logger.debug(LogContext.SYSTEM, `IPC invoke called`, {
        command,
        hasArgs: !!args,
        argsKeys: args ? Object.keys(args) : [],
        isTauriAvailable: isTauri,
        invokeAvailable: !!invoke,
        requestId
      });

     // Wait for initialization if it's still pending
     if (initializationPromise) {
       try {
         await initializationPromise;
       } catch (error) {
         logger.error(LogContext.SYSTEM, `IPC initialization failed`, { error });
            return {
              success: false,
              data: null,
              error: { message: `Response data does not match expected type for command: ${command}`, code: 'VALIDATION_ERROR', details: null }
            };
       }
     }

     if (!isTauri || !invoke) {
       logger.error(LogContext.SYSTEM, `IPC call failed: Tauri backend not available`, {
         command,
         isTauri,
         invoke: !!invoke
       });
        return {
          success: false,
          data: null,
          error: { message: 'Tauri backend not available. This appears to be a desktop application - please ensure you\'re running with "npm run dev" from the root directory, not "npm run frontend:dev".', code: 'INTERNAL_ERROR', details: null }
        };
     }

    try {
      logger.debug(LogContext.SYSTEM, `Making IPC call to ${command}`, { args });
      const response = await invoke<ApiResponse<T>>(command, args);
      logger.debug(LogContext.SYSTEM, `IPC call response received`, {
        command,
        success: response.success,
        hasData: response.data !== undefined,
        hasError: !!response.error
      });

      // Handle different response formats
      if (response.success !== undefined) {
        // Standard ApiResponse format
        if (response.success && response.data !== undefined) {
          // Validate response data type if validator provided
          if (typeValidator && !typeValidator(response.data)) {
            logger.error(LogContext.SYSTEM, `IPC response type validation failed: ${command}`, {
              command,
              responseData: response.data,
              expectedType: typeValidator.name || 'unknown'
            });
            return {
              success: false,
              data: null,
              error: { message: `Response data does not match expected type for command: ${command}`, code: 'VALIDATION_ERROR', details: null }
            };
          }

          const duration = performance.now() - startTime;
          logger.info(LogContext.SYSTEM, `IPC call successful: ${command}`, {
            duration: `${duration.toFixed(2)}ms`,
            requestId
          });
          return {
            success: true,
            data: response.data,
            error: null
          };
        } else {
          const duration = performance.now() - startTime;
          logger.error(LogContext.SYSTEM, `IPC call failed with backend error: ${command}`, {
            error: response.error,
            duration: `${duration.toFixed(2)}ms`,
            requestId
          });
          return {
            success: false,
            data: null,
            error: (typeof response.error === 'string' ? { message: response.error, code: 'UNKNOWN', details: null } : response.error) || { message: 'Unknown error occurred', code: 'UNKNOWN', details: null }
          };
        }
      } else if (response.data && typeof response.data === 'object' && response.data.hasOwnProperty('type')) {
        // Handle wrapped ApiResponse<ClientResponse>
        const clientResponse = response.data as any;
        const responseType = clientResponse.type;

        if (responseType === 'Created' || responseType === 'Found' || responseType === 'Updated' || responseType === 'List' || responseType === 'SearchResults' || responseType === 'Stats') {
          // Remove the type field and validate the data
          const { type, ...data } = clientResponse;

          // Validate response data type if validator provided
          if (typeValidator && !typeValidator(data)) {
            logger.error(LogContext.SYSTEM, `IPC response type validation failed: ${command} (${responseType})`, {
              command,
              responseType,
              responseData: data,
              expectedType: typeValidator.name || 'unknown'
            });
            return {
              success: false,
              data: null,
              error: { message: `Response data does not match expected type for command: ${command}`, code: 'VALIDATION_ERROR', details: null }
            };
          }

          logger.info(LogContext.SYSTEM, `IPC call successful: ${command} (${responseType})`);
          return {
            success: true,
            data,
            error: null
          };
        } else if (responseType === 'Deleted') {
          logger.info(LogContext.SYSTEM, `IPC call successful: ${command} (${responseType})`);
          return {
            success: true,
            data: null,
            error: null
          };
        } else if (responseType === 'NotFound') {
          logger.warn(LogContext.SYSTEM, `IPC call returned NotFound: ${command}`);
          return {
            success: false,
            data: null,
            error: { message: 'Not found', code: 'NOT_FOUND', details: null }
          };
        } else {
          logger.error(LogContext.SYSTEM, `IPC call failed with unexpected client response type: ${command}`, {
            responseType,
            clientResponse
          });
          return {
            success: false,
            data: null,
            error: { message: `Unexpected client response type: ${responseType}`, code: 'INTERNAL_ERROR', details: null }
          };
        }
      } else {
        // Handle tagged enum responses (like ClientResponse)
        const responseType = (response as any).type;
        if (responseType === 'Created' || responseType === 'Found' || responseType === 'Updated' || responseType === 'List' || responseType === 'SearchResults' || responseType === 'Stats') {
          // Remove the type field and validate the data
          const { type, ...data } = response as any;

          // Validate response data type if validator provided
          if (typeValidator && !typeValidator(data)) {
            logger.error(LogContext.SYSTEM, `IPC response type validation failed: ${command} (${responseType})`, {
              command,
              responseType,
              responseData: data,
              expectedType: typeValidator.name || 'unknown'
            });
            return {
              success: false,
              data: null,
              error: { message: `Response data does not match expected type for command: ${command}`, code: 'VALIDATION_ERROR', details: null }
            };
          }

          logger.info(LogContext.SYSTEM, `IPC call successful: ${command} (${responseType})`);
          return {
            success: true,
            data,
            error: null
          };
        } else if (responseType === 'Deleted') {
          logger.info(LogContext.SYSTEM, `IPC call successful: ${command} (${responseType})`);
          return {
            success: true,
            data: null,
            error: null
          };
        } else if (responseType === 'NotFound') {
          logger.warn(LogContext.SYSTEM, `IPC call returned NotFound: ${command}`);
          return {
            success: false,
            data: null,
            error: { message: 'Not found', code: 'NOT_FOUND', details: null }
          };
        } else {
          logger.error(LogContext.SYSTEM, `IPC call failed with unexpected response type: ${command}`, {
            responseType,
            response
          });
          return {
            success: false,
            data: null,
            error: { message: `Unexpected response type: ${responseType}`, code: 'INTERNAL_ERROR', details: null }
          };
        }
      }
    } catch (error) {
      logger.error(LogContext.SYSTEM, `IPC call exception: ${command}`, {
        error: error instanceof Error ? error.message : String(error),
        errorType: typeof error,
        stack: error instanceof Error ? error.stack : undefined
      });
      return {
        success: false,
        data: null,
        error: { message: error instanceof Error ? error.message : 'IPC call failed', code: 'INTERNAL_ERROR', details: null }
      };
    }
  }

  /**
   * Invoke a command that requires authentication
   */
  static async invokeWithAuth<T>(
    command: string,
    sessionToken: string,
    args?: Record<string, unknown>
  ): Promise<ServiceResponse<T>> {
    if (!sessionToken) {
      return {
        success: false,
        data: null,
        error: { message: 'Authentication required', code: 'AUTH_INVALID', details: null }
      };
    }

    return this.invoke<T>(command, { ...args, session_token: sessionToken });
  }

  /**
   * Create a success response
   */
  static success<T>(data: T): ServiceResponse<T> {
    return {
      success: true,
      data,
      error: null
    };
  }

  /**
   * Create an error response
   */
  static error<T>(message: string, code: string = 'INTERNAL_ERROR', status?: number): ServiceResponse<T> {
    return {
      success: false,
      data: null,
      error: { message, code, details: null },
      status
    };
  }
}

/**
 * Authentication IPC commands
 */
/** @deprecated Use ipcClient.auth instead */
export class AuthIpcService extends IpcService {
  static async login(email: string, password: string) {
    // Validate request before sending
    const validatedRequest = this.validateRequest(LoginRequestSchema, {
      email,
      password
    });

    return this.invoke('auth_login', { request: validatedRequest } as Record<string, unknown>);
  }

  static async signup(email: string, firstName: string, lastName: string, password: string, role?: string) {
    // Validate request before sending
    const validatedRequest = this.validateRequest(SignupRequestSchema, {
      email,
      first_name: firstName,
      last_name: lastName,
      password,
      role
    });

    return this.invoke('auth_create_account', { request: validatedRequest } as Record<string, unknown>);
  }

static async logout(token: string) {
    if (!token) {
      return this.error('Token is required for logout', 'AUTH_INVALID');
    }
    return this.invokeWithAuth('auth_logout', token);
  }

  static async validateSession(token: string) {
    if (!token) {
      return this.error('Token is required for session validation', 'AUTH_INVALID');
    }
    return this.invokeWithAuth('auth_validate_session', token);
  }

  static async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      return this.error('Refresh token is required', 'AUTH_INVALID');
    }
    return this.invoke('auth_refresh_token', { refresh_token: refreshToken });
  }
}

/**
 * Logging IPC commands for debugging
 */
/** @deprecated Use ipcClient.logs instead */
export class LogIpcService extends IpcService {
  static async sendLogToFrontend(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: string) {
    return this.invoke('send_log_to_frontend', {
      level: level.charAt(0).toUpperCase() + level.slice(1), // Debug, Info, etc.
      message,
      context
    });
  }

  static async logTaskCreationDebug(taskData: any, step: string) {
    return this.invoke('log_task_creation_debug', {
      request: {
        task_data: taskData,
        step
      }
    });
  }

  static async logClientCreationDebug(clientData: any, step: string) {
    return this.invoke('log_client_creation_debug', {
      request: {
        client_data: clientData,
        step
      }
    });
  }
}

/**
 * Task IPC commands
 */
/** @deprecated Use ipcClient.tasks instead */
export class TaskIpcService extends IpcService {
  static async createTask(sessionToken: string, data: Record<string, unknown>) {
      const requestData = {
        action: {
          action: 'Create',
          data: data
        },
        session_token: sessionToken
      };

     // Validate request before sending
     const validatedRequest = this.validateRequest(TaskCrudRequestSchema, requestData);

      return this.invoke('task_crud', { request: validatedRequest } as Record<string, unknown>);
    }

  static async getTask(sessionToken: string, id: string) {
      const requestData = {
        action: {
          action: 'Get',
          id: id
        },
        session_token: sessionToken
      };

     // Validate request before sending
     const validatedRequest = this.validateRequest(TaskCrudRequestSchema, requestData);

      return this.invoke('task_crud', { request: validatedRequest } as Record<string, unknown>);
    }

  static async updateTask(sessionToken: string, id: string, data: Record<string, unknown>) {
      const requestData = {
        action: {
          action: 'Update',
          id: id,
          data: data
        },
        session_token: sessionToken
      };

     // Validate request before sending
     const validatedRequest = this.validateRequest(TaskCrudRequestSchema, requestData);

      return this.invoke('task_crud', { request: validatedRequest } as Record<string, unknown>);
    }

  static async deleteTask(sessionToken: string, id: string) {
      const requestData = {
        action: {
          action: 'Delete',
          id: id
        },
        session_token: sessionToken
      };

     // Validate request before sending
     const validatedRequest = this.validateRequest(TaskCrudRequestSchema, requestData);

     return this.invoke('task_crud', { request: validatedRequest } as Record<string, unknown>);
    }

  static async listTasks(sessionToken: string, filters: Record<string, unknown> = {}) {
      const requestData = {
        action: {
          action: 'List',
          filters: filters
        },
        session_token: sessionToken
      };

      // Validate request before sending
      const validatedRequest = this.validateRequest(TaskCrudRequestSchema, requestData);

      const result = await this.invoke('task_crud', { request: validatedRequest } as Record<string, unknown>);
      return result;
     }

  static async getTaskStatistics(sessionToken: string) {
      const requestData = {
        action: {
          action: 'GetStatistics'
        },
        session_token: sessionToken
      };

     // Validate request before sending
     const validatedRequest = this.validateRequest(TaskCrudRequestSchema, requestData);

     return this.invoke('task_crud', { request: validatedRequest } as Record<string, unknown>);
   }
}

/**
 * Client IPC commands
 */
/** @deprecated Use ipcClient.clients instead */
export class ClientIpcService extends IpcService {
 static async createClient(sessionToken: string, data: Record<string, unknown>) {
     const requestData = {
       action: {
         Create: {
           data: data
         }
       },
       session_token: sessionToken
     };

     // Validate request before sending
     const validatedRequest = this.validateRequest(ClientCrudRequestSchema, requestData);

      return this.invoke('client_crud', { request: validatedRequest } as Record<string, unknown>);
   }

 static async getClient(sessionToken: string, id: string) {
     const requestData = {
       action: {
         Get: {
           id: id
         }
       },
       session_token: sessionToken
     };

     // Validate request before sending
     const validatedRequest = this.validateRequest(ClientCrudRequestSchema, requestData);

      return this.invoke('client_crud', { request: validatedRequest } as Record<string, unknown>);
   }

 static async updateClient(sessionToken: string, id: string, data: Record<string, unknown>) {
     const requestData = {
       action: {
         Update: {
           id: id,
           data: data
         }
       },
       session_token: sessionToken
     };

     // Validate request before sending
     const validatedRequest = this.validateRequest(ClientCrudRequestSchema, requestData);

      return this.invoke('client_crud', { request: validatedRequest } as Record<string, unknown>);
   }

 static async deleteClient(sessionToken: string, id: string) {
     const requestData = {
       action: {
         Delete: {
           id: id
         }
       },
       session_token: sessionToken
     };

     // Validate request before sending
     const validatedRequest = this.validateRequest(ClientCrudRequestSchema, requestData);

     return this.invoke('client_crud', { request: validatedRequest } as Record<string, unknown>);
   }

 static async listClients(sessionToken: string, filters: Record<string, unknown> = { limit: 20, sort_by: 'name', sort_order: 'asc' }) {
     const requestData = {
       action: {
         List: {
           filters: filters
         }
       },
       session_token: sessionToken
     };

     // Validate request before sending
     const validatedRequest = this.validateRequest(ClientCrudRequestSchema, requestData);

      return this.invoke('client_crud', { request: validatedRequest } as Record<string, unknown>);
   }

 static async searchClients(sessionToken: string, query: string, limit: number = 10) {
     const requestData = {
       action: {
         Search: {
           query: query,
           limit: limit
         }
       },
       session_token: sessionToken
     };

     // Validate request before sending
     const validatedRequest = this.validateRequest(ClientCrudRequestSchema, requestData);

     return this.invoke('client_crud', { request: validatedRequest } as Record<string, unknown>);
   }

 static async getClientStats(sessionToken: string) {
     const requestData = {
       action: {
         Stats: {}
       },
       session_token: sessionToken
     };

     // Validate request before sending
     const validatedRequest = this.validateRequest(ClientCrudRequestSchema, requestData);

     return this.invoke('client_crud', { request: validatedRequest } as Record<string, unknown>);
   }
}

/**
 * User management IPC commands
 */
/** @deprecated Use ipcClient.users instead */
export class UserIpcService extends IpcService {
  static async getUsers(sessionToken: string, page: number = 1, pageSize: number = 20, search?: string, role?: string) {
    return this.invokeWithAuth('get_users', sessionToken, {
      page,
      page_size: pageSize,
      search,
      role
    });
  }

  static async createUser(sessionToken: string, userData: Record<string, unknown>) {
    return this.invokeWithAuth('create_user', sessionToken, userData);
  }

  static async updateUser(sessionToken: string, userId: string, userData: Record<string, unknown>) {
    return this.invokeWithAuth('update_user', sessionToken, {
      user_id: userId,
      user_data: userData
    });
  }

  static async updateUserStatus(sessionToken: string, userId: string, isActive: boolean) {
    return this.invokeWithAuth('update_user_status', sessionToken, {
      user_id: userId,
      is_active: isActive
    });
  }

  static async deleteUser(sessionToken: string, userId: string) {
    return this.invokeWithAuth('delete_user', sessionToken, {
      user_id: userId
    });
  }
}

/**
 * System IPC commands
 */
/** @deprecated Use ipcClient.system instead */
export class SystemIpcService extends IpcService {
  static async healthCheck() {
    return this.invoke('health_check');
  }

  static async getDatabaseStatus() {
    return this.invoke('get_database_status');
  }

  static async getDatabaseStats() {
    return this.invoke('get_database_stats');
  }

  static async getAppInfo() {
    return this.invoke('get_app_info');
  }
}