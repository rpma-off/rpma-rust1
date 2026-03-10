import { safeInvoke, cachedInvoke, extractAndValidate } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import { validateUserSession } from '@/lib/validation/backend-type-guards';
import type { UserSession, SignupRequest } from '@/lib/ipc/types/auth.types';
import type { JsonValue } from '@/types/json';

// Re-export getUserProfile from users to avoid circular dependency
// safeInvoke auto-injects session_token for protected commands
const getUserProfile = (id: string): Promise<JsonValue> =>
  safeInvoke<JsonValue>(IPC_COMMANDS.USER_CRUD, {
    request: {
      action: { action: 'Get', id },
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
    cachedInvoke(`auth:session:${token}`, IPC_COMMANDS.AUTH_VALIDATE_SESSION, {}, validateUserSession, 30000),

  // 2FA commands are listed in NOT_IMPLEMENTED_COMMANDS and short-circuited by safeInvoke;
  // session_token injection is not needed at the IPC layer.
  enable2FA: (): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.ENABLE_2FA, {}),

  verify2FASetup: (verificationCode: string, backupCodes: string[]): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.VERIFY_2FA_SETUP, {
      verification_code: verificationCode,
      backup_codes: backupCodes,
    }),

  disable2FA: (password: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.DISABLE_2FA, { password }),

  regenerateBackupCodes: (): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.REGENERATE_BACKUP_CODES, {}),

  is2FAEnabled: (): Promise<boolean> =>
    safeInvoke<boolean>(IPC_COMMANDS.IS_2FA_ENABLED, {}),

  getUserProfile,
};
