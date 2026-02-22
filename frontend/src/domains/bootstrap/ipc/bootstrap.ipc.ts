import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';

export const bootstrapIpc = {
  firstAdmin: (userId: string, sessionToken: string): Promise<string> =>
    safeInvoke<string>(IPC_COMMANDS.BOOTSTRAP_FIRST_ADMIN, {
      request: { user_id: userId, session_token: sessionToken }
    }),

  hasAdmins: (): Promise<boolean> =>
    safeInvoke<boolean>(IPC_COMMANDS.HAS_ADMINS),
};
