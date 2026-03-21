import { safeInvoke, extractAndValidate } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { CreateUserRequest, UpdateUserRequest, UserListResponse } from '@/lib/ipc/types/index';
import type { JsonValue } from '@/types/json';

export const userIpc = {
  create: async (data: CreateUserRequest): Promise<JsonValue> => {
    return safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { action: 'Create', data },
      }
    });
  },

  get: async (id: string): Promise<JsonValue> => {
    return safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { action: 'Get', id },
      }
    }, (data: JsonValue) => extractAndValidate(data, undefined, { handleNotFound: true }));
  },

  list: async (
    limit: number,
    offset: number,
    search?: string,
    roleFilter?: string
  ): Promise<UserListResponse> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: {
          action: 'List',
          limit,
          offset,
          search: search ?? null,
          role_filter: roleFilter && roleFilter !== 'all' ? roleFilter : null,
        },
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
    return safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { action: 'Update', id, data },
      }
    });
  },

  delete: async (id: string): Promise<void> => {
    return safeInvoke<void>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { action: 'Delete', id },
      }
    });
  },

  changeRole: async (userId: string, newRole: string): Promise<void> => {
    return safeInvoke<void>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { action: 'ChangeRole', id: userId, new_role: newRole },
      }
    });
  },

  updateEmail: async (userId: string, newEmail: string): Promise<JsonValue> => {
    return safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { action: 'Update', id: userId, data: { email: newEmail } },
      }
    });
  },

  changePassword: async (userId: string, newPassword: string): Promise<void> => {
    return safeInvoke<void>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { action: 'ChangePassword', id: userId, new_password: newPassword },
      }
    });
  },

  banUser: async (userId: string): Promise<JsonValue> => {
    return safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { action: 'Ban', id: userId },
      }
    });
  },

  unbanUser: async (userId: string): Promise<JsonValue> => {
    return safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { action: 'Unban', id: userId },
      }
    });
  },

  adminResetPassword: async (userId: string): Promise<string | null> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
      request: {
        action: { action: 'AdminResetPassword', id: userId },
      }
    });
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      const res = result as Record<string, unknown>;
      if (res.type === 'PasswordReset' && typeof res.PasswordReset === 'string') {
        return res.PasswordReset;
      }
    }
    return null;
  },
};
