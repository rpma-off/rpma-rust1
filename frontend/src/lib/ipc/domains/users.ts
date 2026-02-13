import { safeInvoke, extractAndValidate, ResponseHandlers } from '../core';
import { createCrudOperations } from '../utils/crud-helpers';
import { IPC_COMMANDS } from '../commands';
import type { CreateUserRequest, UpdateUserRequest, UserListResponse } from '../types/index';
import type { UserAccount } from '@/types/auth.types';
import type { JsonValue } from '@/types/json';

/**
 * User management operations
 */

// Create the base CRUD operations using the generic helper
const userCrud = createCrudOperations<
  UserAccount,
  CreateUserRequest,
  UpdateUserRequest,
  { limit: number; offset: number }, // List filters
  UserListResponse
>(
  IPC_COMMANDS.USER_CRUD,
  (data: JsonValue) => data as UserAccount,
  'user'
);

// Override the list method to handle the custom response processing
const customList = (limit: number, offset: number, sessionToken: string): Promise<UserListResponse> =>
  safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
    request: {
      action: { action: 'List', limit, offset },
      session_token: sessionToken
    }
  }).then(result => {
    const userList = extractAndValidate(result) as UserListResponse;
    if (!userList || typeof userList !== 'object') {
      return { data: [] };
    }
    if (!userList.data) {
      userList.data = [];
    }
    return userList;
  });

// Specialized user operations
const specializedOperations = {
  /**
   * Changes a user's role
   * @param userId - User ID
   * @param newRole - New role for the user
   * @param sessionToken - User's session token
   * @returns Promise resolving when role is changed
   */
  changeRole: (userId: string, newRole: string, sessionToken: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { ChangeRole: { id: userId, new_role: newRole } },
        session_token: sessionToken
      }
    }),

  /**
   * Updates a user's email
   * @param userId - User ID
   * @param newEmail - New email address
   * @param sessionToken - User's session token
   * @returns Promise resolving when email is updated
   */
  updateEmail: (userId: string, newEmail: string, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { action: 'Update', id: userId, data: { email: newEmail } },
        session_token: sessionToken
      }
    }),

  /**
   * Changes a user's password
   * @param userId - User ID
   * @param newPassword - New password
   * @param sessionToken - User's session token
   * @returns Promise resolving when password is changed
   */
  changePassword: (userId: string, newPassword: string, sessionToken: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { ChangePassword: { id: userId, new_password: newPassword } },
        session_token: sessionToken
      }
    }),

  /**
   * Bans a user
   * @param userId - User ID to ban
   * @param sessionToken - User's session token
   * @returns Promise resolving when user is banned
   */
  banUser: (userId: string, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { Ban: { id: userId } },
        session_token: sessionToken
      }
    }),

  /**
   * Unbans a user
   * @param userId - User ID to unban
   * @param sessionToken - User's session token
   * @returns Promise resolving when user is unbanned
   */
  unbanUser: (userId: string, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { Unban: { id: userId } },
        session_token: sessionToken
      }
    }),
};

/**
 * Combined user operations - CRUD + specialized operations
 */
export const userOperations = {
  ...userCrud,
  list: customList, // Override with custom implementation
  ...specializedOperations,
};
