import { safeInvoke } from "@/lib/ipc/core";
import { IPC_COMMANDS } from "@/lib/ipc/commands";
import type { SessionTimeoutConfig, UserSession } from "@/lib/backend";

export const securityIpc = {
  getActiveSessions: () =>
    safeInvoke<UserSession[]>(IPC_COMMANDS.GET_ACTIVE_SESSIONS, {}),

  revokeSession: (sessionId: string) =>
    safeInvoke<string>(IPC_COMMANDS.REVOKE_SESSION, { session_id: sessionId }),

  revokeAllSessionsExceptCurrent: () =>
    safeInvoke<number>(IPC_COMMANDS.REVOKE_ALL_SESSIONS_EXCEPT_CURRENT, {}),

  updateSessionTimeout: (timeoutMinutes: number) =>
    safeInvoke<string>(IPC_COMMANDS.UPDATE_SESSION_TIMEOUT, {
      timeout_minutes: timeoutMinutes,
    }),

  getSessionTimeoutConfig: () =>
    safeInvoke<SessionTimeoutConfig>(
      IPC_COMMANDS.GET_SESSION_TIMEOUT_CONFIG,
      {},
    ),
};
