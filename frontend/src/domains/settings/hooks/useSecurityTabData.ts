import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SessionTimeoutConfig, UserSession } from "@/lib/backend";
import { useIpcClient } from "@/lib/ipc/client";
import { securityKeys } from "@/lib/query-keys";
import { LogDomain } from "@/lib/logging/types";
import { useLogger } from "@/shared/hooks/useLogger";

export interface ActiveSession {
  id: string;
  device?: string;
  ip_address?: string;
  created_at?: string;
  last_activity?: string;
  is_current?: boolean;
}

export function useSecurityTabData(user: UserSession) {
  const logger = useLogger({
    context: LogDomain.SECURITY,
    component: "SecurityTab",
  });
  const ipcClient = useIpcClient();
  const queryClient = useQueryClient();

  // ── Server state: active sessions (ADR-014) ─────────────────────────────
  const sessionsQuery = useQuery<ActiveSession[]>({
    queryKey: securityKeys.sessions(),
    queryFn: async () => {
      const result = await ipcClient.settings.getActiveSessions();

      if (Array.isArray(result)) {
        return result as unknown as ActiveSession[];
      }
      if (result && typeof result === "object" && "data" in result) {
        const data = (result as { data: unknown }).data;
        return Array.isArray(data) ? (data as ActiveSession[]) : [];
      }
      return [];
    },
  });

  // Log session load errors
  useEffect(() => {
    if (sessionsQuery.error) {
      logger.logError("Impossible de charger les sessions actives", sessionsQuery.error);
    }
  }, [sessionsQuery.error, logger]);

  // ── Server state: session timeout config (ADR-014) ──────────────────────
  const timeoutQuery = useQuery<number>({
    queryKey: securityKeys.timeoutConfig(),
    queryFn: async () => {
      const result = await ipcClient.settings.getSessionTimeoutConfig();
      if (result && typeof result === "object") {
        const config = result as SessionTimeoutConfig;
        return config.default_timeout_minutes ?? 480;
      }
      return 480;
    },
  });

  // ── Local form state for timeout (user may edit before saving) ──────────
  const [timeoutMinutes, setTimeoutMinutes] = useState<number>(480);

  // Sync local state when server data arrives / changes
  useEffect(() => {
    if (timeoutQuery.data !== undefined) {
      setTimeoutMinutes(timeoutQuery.data);
    }
  }, [timeoutQuery.data]);

  // ── Mutation: revoke a single session ───────────────────────────────────
  const revokeMutation = useMutation<string, Error, string>({
    mutationFn: async (sessionId: string) => {
      await ipcClient.settings.revokeSession(sessionId);
      return sessionId;
    },
    onSuccess: (sessionId) => {
      // Optimistic-style cache update: remove the revoked session
      queryClient.setQueryData<ActiveSession[]>(
        securityKeys.sessions(),
        (prev) => prev?.filter((s) => s.id !== sessionId) ?? [],
      );
      logger.logInfo("Session revoked", { sessionId });
    },
    onError: (error) => {
      logger.logError("Failed to revoke session", error);
    },
  });

  // ── Mutation: revoke all sessions except current ────────────────────────
  const revokeAllMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      await ipcClient.settings.revokeAllSessionsExceptCurrent();
    },
    onSuccess: () => {
      queryClient.setQueryData<ActiveSession[]>(
        securityKeys.sessions(),
        (prev) => prev?.filter((s) => s.is_current) ?? [],
      );
      logger.logInfo("All other sessions revoked");
    },
    onError: (error) => {
      logger.logError("Failed to revoke all sessions", error);
    },
  });

  // ── Mutation: save session timeout ──────────────────────────────────────
  const saveTimeoutMutation = useMutation<void, Error, number>({
    mutationFn: async (minutes: number) => {
      await ipcClient.settings.updateSessionTimeout(minutes);
    },
    onSuccess: (_data, minutes) => {
      queryClient.setQueryData<number>(securityKeys.timeoutConfig(), minutes);
      logger.logInfo("Session timeout updated", { timeoutMinutes: minutes });
    },
    onError: (error) => {
      logger.logError("Failed to update session timeout", error);
    },
  });

  // ── Mutation: change password ───────────────────────────────────────────
  // NOTE: changePassword deliberately re-throws so the component can show
  // its own inline error via try/catch in handleChangePassword.
  const changePasswordMutation = useMutation<
    void,
    Error,
    { current_password: string; new_password: string; confirm_password: string }
  >({
    mutationFn: async (request) => {
      await ipcClient.settings.changeUserPassword(request);
    },
    onSuccess: () => {
      logger.logInfo("Password changed successfully", {
        userId: user.user_id,
      });
    },
  });

  // ── Derive composite error from query + mutation states ─────────────────
  const sessionsError = sessionsQuery.error
    ? "Impossible de charger les sessions actives"
    : revokeMutation.error
      ? "Impossible de révoquer la session"
      : revokeAllMutation.error
        ? "Impossible de révoquer les sessions"
        : null;

  // ── Stable callback wrappers (preserve existing consumer API) ───────────

  const revokeSession = useCallback(
    async (sessionId: string) => {
      try {
        await revokeMutation.mutateAsync(sessionId);
      } catch {
        // Error already surfaced via onError + sessionsError derivation
      }
    },
    [revokeMutation],
  );

  const revokeAllSessions = useCallback(async () => {
    try {
      await revokeAllMutation.mutateAsync();
    } catch {
      // Error already surfaced via onError + sessionsError derivation
    }
  }, [revokeAllMutation]);

  const saveTimeout = useCallback(async () => {
    try {
      await saveTimeoutMutation.mutateAsync(timeoutMinutes);
    } catch {
      // Error already surfaced via onError
    }
  }, [saveTimeoutMutation, timeoutMinutes]);

  const changePassword = useCallback(
    async (request: {
      current_password: string;
      new_password: string;
      confirm_password: string;
    }) => {
      // Let the error propagate — SecurityTab catches it in handleChangePassword
      await changePasswordMutation.mutateAsync(request);
    },
    [changePasswordMutation],
  );

  // ── Return (same shape as the original hook) ────────────────────────────
  return {
    sessions: sessionsQuery.data ?? [],
    timeoutMinutes,
    setTimeoutMinutes,
    isLoadingSessions: sessionsQuery.isLoading,
    isRevokingAll: revokeAllMutation.isPending,
    isRevokingId: revokeMutation.isPending
      ? (revokeMutation.variables ?? null)
      : null,
    isSavingTimeout: saveTimeoutMutation.isPending,
    sessionsError,
    revokeSession,
    revokeAllSessions,
    saveTimeout,
    changePassword,
    logger,
  };
}
