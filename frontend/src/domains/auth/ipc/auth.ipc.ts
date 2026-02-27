import { safeInvoke, cachedInvoke, extractAndValidate } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import { validateUserSession } from '@/lib/validation/backend-type-guards';
import type { UserSession, SignupRequest } from '@/lib/ipc/types/auth.types';
import type { JsonValue } from '@/types/json';

// Re-export getUserProfile from users to avoid circular dependency
const getUserProfile = (id: string, sessionToken: string): Promise<JsonValue> =>
  safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
    request: {
      action: { action: 'Get', id },
      session_token: sessionToken
    }
  }, (data: JsonValue) => extractAndValidate(data, undefined, { handleNotFound: true }));

export const authIpc = {
  login: (email: string, password: string): Promise<UserSession> =>
    safeInvoke<UserSession>(IPC_COMMANDS.AUTH_LOGIN, {
      request: { email, password }
    }, validateUserSession),

  createAccount: (request: SignupRequest): Promise<UserSession> =>
    safeInvoke<UserSession>(IPC_COMMANDS.AUTH_CREATE_ACCOUNT, { request }, validateUserSession),

  refreshToken: (refreshToken: string): Promise<UserSession> =>
    safeInvoke<UserSession>(IPC_COMMANDS.AUTH_REFRESH_TOKEN, { refreshToken }, validateUserSession),

  logout: (token: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.AUTH_LOGOUT, { token }),

  validateSession: (token: string): Promise<UserSession> =>
    cachedInvoke(`auth:session:${token}`, IPC_COMMANDS.AUTH_VALIDATE_SESSION, { session_token: token }, validateUserSession, 30000),

  enable2FA: (sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.ENABLE_2FA, { session_token: sessionToken }),

  verify2FASetup: (verificationCode: string, backupCodes: string[], sessionToken: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.VERIFY_2FA_SETUP, {
      verification_code: verificationCode,
      backup_codes: backupCodes,
      session_token: sessionToken
    }),

  disable2FA: (password: string, sessionToken: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.DISABLE_2FA, { password, session_token: sessionToken }),

  regenerateBackupCodes: (sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.REGENERATE_BACKUP_CODES, { session_token: sessionToken }),

  is2FAEnabled: (sessionToken: string): Promise<boolean> =>
    safeInvoke<boolean>(IPC_COMMANDS.IS_2FA_ENABLED, {
      session_token: sessionToken
    }),

  getUserProfile,
};
