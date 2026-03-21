import { useCallback, useEffect, useState } from 'react';
import type { UserSession } from '@/lib/backend';
import { useIpcClient } from '@/lib/ipc/client';
import { LogDomain } from '@/lib/logging/types';
import { useLogger } from '@/shared/hooks/useLogger';

export interface ActiveSession {
  id: string;
  device?: string;
  ip_address?: string;
  created_at?: string;
  last_activity?: string;
  is_current?: boolean;
}

interface SessionTimeoutConfig {
  timeout_minutes?: number;
}

export function useSecurityTabData(user: UserSession) {
  const logger = useLogger({ context: LogDomain.SECURITY, component: 'SecurityTab' });
  const ipcClient = useIpcClient();

  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [timeoutMinutes, setTimeoutMinutes] = useState<number>(480);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const [isRevokingId, setIsRevokingId] = useState<string | null>(null);
  const [isSavingTimeout, setIsSavingTimeout] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setIsLoadingSessions(true);
      try {
        const [sessionsResult, timeoutResult] = await Promise.all([
          ipcClient.settings.getActiveSessions(),
          ipcClient.settings.getSessionTimeoutConfig(),
        ]);

        if (cancelled) {
          return;
        }

        if (Array.isArray(sessionsResult)) {
          setSessions(sessionsResult as unknown as ActiveSession[]);
        } else if (sessionsResult && typeof sessionsResult === 'object' && 'data' in sessionsResult) {
          const data = (sessionsResult as { data: unknown }).data;
          setSessions(Array.isArray(data) ? (data as ActiveSession[]) : []);
        }

        if (
          timeoutResult &&
          typeof timeoutResult === 'object' &&
          'timeout_minutes' in (timeoutResult as object)
        ) {
          setTimeoutMinutes((timeoutResult as SessionTimeoutConfig).timeout_minutes ?? 480);
        }
      } catch (error) {
        logger.logError('Failed to fetch security settings', error);
        setSessionsError('Impossible de charger les sessions actives');
      } finally {
        if (!cancelled) {
          setIsLoadingSessions(false);
        }
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [ipcClient, logger]);

  const revokeSession = useCallback(
    async (sessionId: string) => {
      setIsRevokingId(sessionId);
      try {
        await ipcClient.settings.revokeSession(sessionId);
        setSessions((prev) => prev.filter((session) => session.id !== sessionId));
        logger.logInfo('Session revoked', { sessionId });
      } catch (error) {
        logger.logError('Failed to revoke session', error);
        setSessionsError('Impossible de révoquer la session');
      } finally {
        setIsRevokingId(null);
      }
    },
    [ipcClient, logger],
  );

  const revokeAllSessions = useCallback(async () => {
    setIsRevokingAll(true);
    try {
      await ipcClient.settings.revokeAllSessionsExceptCurrent();
      setSessions((prev) => prev.filter((session) => session.is_current));
      logger.logInfo('All other sessions revoked');
    } catch (error) {
      logger.logError('Failed to revoke all sessions', error);
      setSessionsError('Impossible de révoquer les sessions');
    } finally {
      setIsRevokingAll(false);
    }
  }, [ipcClient, logger]);

  const saveTimeout = useCallback(async () => {
    setIsSavingTimeout(true);
    try {
      await ipcClient.settings.updateSessionTimeout(timeoutMinutes);
      logger.logInfo('Session timeout updated', { timeoutMinutes });
    } catch (error) {
      logger.logError('Failed to update session timeout', error);
    } finally {
      setIsSavingTimeout(false);
    }
  }, [ipcClient, logger, timeoutMinutes]);

  const changePassword = useCallback(
    async (request: {
      current_password: string;
      new_password: string;
      confirm_password: string;
    }) => {
      await ipcClient.settings.changeUserPassword(request);
      logger.logInfo('Password changed successfully', { userId: user.user_id });
    },
    [ipcClient, logger, user.user_id],
  );

  return {
    sessions,
    timeoutMinutes,
    setTimeoutMinutes,
    isLoadingSessions,
    isRevokingAll,
    isRevokingId,
    isSavingTimeout,
    sessionsError,
    revokeSession,
    revokeAllSessions,
    saveTimeout,
    changePassword,
    logger,
  };
}
