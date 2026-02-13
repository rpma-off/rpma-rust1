import { safeInvoke } from '../core';
import { IPC_COMMANDS } from '../commands';

/**
 * Application bootstrap and initialization operations
 */
export const bootstrapOperations = {
  /**
   * Sets up the first admin user
   * @param userId - User ID to promote to admin
   * @param sessionToken - Session token for authentication
   * @returns Promise resolving to admin setup result
   */
  firstAdmin: (userId: string, sessionToken: string): Promise<string> =>
    safeInvoke<string>(IPC_COMMANDS.BOOTSTRAP_FIRST_ADMIN, {
      request: { user_id: userId, session_token: sessionToken }
    }),

  /**
   * Checks if the application has admin users
   * @returns Promise resolving to boolean indicating if admins exist
   */
  hasAdmins: (): Promise<boolean> =>
    safeInvoke<boolean>(IPC_COMMANDS.HAS_ADMINS),
};
