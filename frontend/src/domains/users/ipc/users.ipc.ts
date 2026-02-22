import { safeInvoke, extractAndValidate } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { CreateUserRequest, UpdateUserRequest, UserListResponse } from '@/lib/ipc/types/index';
import type { JsonValue } from '@/types/json';

export const userIpc = {
  create: (data: CreateUserRequest, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { action: 'Create', data },
        session_token: sessionToken
      }
    }),

  get: (id: string, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { action: 'Get', id },
        session_token: sessionToken
      }
    }, (data: JsonValue) => extractAndValidate(data, undefined, { handleNotFound: true })),

  list: (limit: number, offset: number, sessionToken: string): Promise<UserListResponse> =>
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
    }),

  update: (id: string, data: UpdateUserRequest, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { action: 'Update', id, data },
        session_token: sessionToken
      }
    }),

  delete: (id: string, sessionToken: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { action: 'Delete', id },
        session_token: sessionToken
      }
    }),

  changeRole: (userId: string, newRole: string, sessionToken: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { ChangeRole: { id: userId, new_role: newRole } },
        session_token: sessionToken
      }
    }),

  updateEmail: (userId: string, newEmail: string, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { action: 'Update', id: userId, data: { email: newEmail } },
        session_token: sessionToken
      }
    }),

  changePassword: (userId: string, newPassword: string, sessionToken: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { ChangePassword: { id: userId, new_password: newPassword } },
        session_token: sessionToken
      }
    }),

  banUser: (userId: string, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { Ban: { id: userId } },
        session_token: sessionToken
      }
    }),

  unbanUser: (userId: string, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { Unban: { id: userId } },
        session_token: sessionToken
      }
    }),
};
