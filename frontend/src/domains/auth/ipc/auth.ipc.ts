import { safeInvoke, extractAndValidate } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import { validateUserSession } from '@/lib/validation/backend-type-guards';
import type { UserSession, SignupRequest } from '@/lib/ipc/types/auth.types';
import type { JsonValue } from '@/types/json';

const getUserProfile = async (id: string): Promise<JsonValue> => {
  return safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
    request: {
      action: { action: 'Get', id },
    }
  }, (data: JsonValue) => extractAndValidate(data, undefined, { handleNotFound: true }));
};

export const authIpc = {
  login: (email: string, password: string): Promise<UserSession> =>
    safeInvoke<UserSession>(IPC_COMMANDS.AUTH_LOGIN, {
      request: { email, password }
    }, validateUserSession),

  createAccount: (request: SignupRequest): Promise<UserSession> =>
    safeInvoke<UserSession>(IPC_COMMANDS.AUTH_CREATE_ACCOUNT, { request }, validateUserSession),

  logout: (token?: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.AUTH_LOGOUT, token ? { token } : {}),

  validateSession: (token?: string): Promise<UserSession> =>
    safeInvoke<UserSession>(IPC_COMMANDS.AUTH_VALIDATE_SESSION, token ? { session_token: token } : {}, validateUserSession),

  getUserProfile,

  changePassword: (currentPassword: string, newPassword: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.CHANGE_PASSWORD, {
      request: { currentPassword, newPassword },
    }),
};
