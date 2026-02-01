import { safeInvoke, cachedInvoke } from '../core';
import { IPC_COMMANDS } from '../commands';
import { validateUserSession } from '@/lib/validation/backend-type-guards';
import type { UserSession, SignupRequest } from '../types/index';

/**
 * Authentication operations for user login, session management, and 2FA
 */
export const authOperations = {
  /**
   * Authenticates a user with email and password
   * @param email - User's email address
   * @param password - User's password
   * @returns Promise resolving to user session data
   */
  login: (email: string, password: string): Promise<UserSession> =>
    safeInvoke<UserSession>(IPC_COMMANDS.AUTH_LOGIN, {
      request: { email, password }
    }, validateUserSession),

  /**
   * Creates a new user account
   * @param request - Signup request data
   * @returns Promise resolving to user session data
   */
  createAccount: (request: SignupRequest): Promise<UserSession> =>
    safeInvoke<UserSession>(IPC_COMMANDS.AUTH_CREATE_ACCOUNT, { request }, validateUserSession),

  /**
   * Refreshes an authentication token
   * @param refreshToken - The refresh token
   * @returns Promise resolving to new user session data
   */
  refreshToken: (refreshToken: string): Promise<UserSession> =>
    safeInvoke<UserSession>(IPC_COMMANDS.AUTH_REFRESH_TOKEN, { refreshToken }, validateUserSession),

  /**
   * Logs out the current user
   * @param token - User's session token
   * @returns Promise resolving when logout is complete
   */
  logout: (token: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.AUTH_LOGOUT, { token }),

  /**
   * Validates a user session token
   * @param token - Session token to validate
   * @returns Promise resolving to user session data if valid
   */
  validateSession: (token: string): Promise<UserSession> =>
    cachedInvoke(`auth:session:${token}`, IPC_COMMANDS.AUTH_VALIDATE_SESSION, { token }, validateUserSession, 30000),

  /**
   * Enables 2FA for the current user
   * @param sessionToken - User's session token
   * @returns Promise resolving to 2FA setup data
   */
  enable2FA: (sessionToken: string): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.ENABLE_2FA, { session_token: sessionToken }),

  /**
   * Verifies 2FA setup with verification code
   * @param verificationCode - TOTP verification code
   * @param sessionToken - User's session token
   * @returns Promise resolving when setup is verified
   */
  verify2FASetup: (verificationCode: string, sessionToken: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.VERIFY_2FA_SETUP, {
      verification_code: verificationCode,
      session_token: sessionToken
    }),

  /**
   * Disables 2FA for the current user
   * @param sessionToken - User's session token
   * @returns Promise resolving when 2FA is disabled
   */
  disable2FA: (sessionToken: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.DISABLE_2FA, { session_token: sessionToken }),

  /**
   * Regenerates backup codes for 2FA
   * @param sessionToken - User's session token
   * @returns Promise resolving to new backup codes
   */
  regenerateBackupCodes: (sessionToken: string): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.REGENERATE_BACKUP_CODES, { session_token: sessionToken }),

  /**
   * Checks if 2FA is enabled for a user
   * @param userId - User ID to check
   * @param sessionToken - User's session token
   * @returns Promise resolving to 2FA status
   */
  is2FAEnabled: (userId: string, sessionToken: string): Promise<boolean> =>
    safeInvoke<boolean>(IPC_COMMANDS.IS_2FA_ENABLED, {
      user_id: userId,
      session_token: sessionToken
    }),
};