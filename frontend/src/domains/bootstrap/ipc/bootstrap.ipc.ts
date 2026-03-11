import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import { requireSessionToken } from '@/shared/contracts/session';

export const bootstrapIpc = {
  // bootstrap_first_admin is in PUBLIC_COMMANDS (no auto-inject), so we fetch
  // the session token explicitly and embed it in the request payload.
  firstAdmin: async (userId: string): Promise<string> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<string>(IPC_COMMANDS.BOOTSTRAP_FIRST_ADMIN, {
      request: { user_id: userId, session_token: sessionToken }
    });
  },

  hasAdmins: (): Promise<boolean> =>
    safeInvoke<boolean>(IPC_COMMANDS.HAS_ADMINS),
};
