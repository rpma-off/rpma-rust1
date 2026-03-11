import { safeInvoke, extractAndValidate } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import { requireSessionToken } from '@/shared/contracts/session';
import type { CreateUserRequest, UpdateUserRequest, UserListResponse } from '@/lib/ipc/types/index';
import type { JsonValue } from '@/types/json';

export const userIpc = {
  create: async (data: CreateUserRequest): Promise<JsonValue> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { action: 'Create', data },
        session_token: sessionToken
      }
    });
  },

  get: async (id: string): Promise<JsonValue> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { action: 'Get', id },
        session_token: sessionToken
      }
    }, (data: JsonValue) => extractAndValidate(data, undefined, { handleNotFound: true }));
  },

  list: async (limit: number, offset: number): Promise<UserListResponse> => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { action: 'List', limit, offset },
        session_token: sessionToken
      }
    });
    const userList = extractAndValidate(result) as UserListResponse;
    if (!userList || typeof userList !== 'object') {
      return { data: [] };
    }
    if (!userList.data) {
      userList.data = [];
    }
    return userList;
  },

  update: async (id: string, data: UpdateUserRequest): Promise<JsonValue> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { action: 'Update', id, data },
        session_token: sessionToken
      }
    });
  },

  delete: async (id: string): Promise<void> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<void>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { action: 'Delete', id },
        session_token: sessionToken
      }
    });
  },

  changeRole: async (userId: string, newRole: string): Promise<void> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<void>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { ChangeRole: { id: userId, new_role: newRole } },
        session_token: sessionToken
      }
    });
  },

  updateEmail: async (userId: string, newEmail: string): Promise<JsonValue> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { action: 'Update', id: userId, data: { email: newEmail } },
        session_token: sessionToken
      }
    });
  },

  changePassword: async (userId: string, newPassword: string): Promise<void> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<void>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { ChangePassword: { id: userId, new_password: newPassword } },
        session_token: sessionToken
      }
    });
  },

  banUser: async (userId: string): Promise<JsonValue> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { Ban: { id: userId } },
        session_token: sessionToken
      }
    });
  },

  unbanUser: async (userId: string): Promise<JsonValue> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { Unban: { id: userId } },
        session_token: sessionToken
      }
    });
  },
};
