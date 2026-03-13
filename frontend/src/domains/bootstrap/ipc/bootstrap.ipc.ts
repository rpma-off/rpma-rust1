import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';

export const bootstrapIpc = {
  // bootstrap_first_admin is in PUBLIC_COMMANDS
  firstAdmin: (userId: string): Promise<string> =>
    safeInvoke<string>(IPC_COMMANDS.BOOTSTRAP_FIRST_ADMIN, {
      request: { user_id: userId }
    }),

  hasAdmins: (): Promise<boolean> =>
    safeInvoke<boolean>(IPC_COMMANDS.HAS_ADMINS),
};
