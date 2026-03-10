'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLogger } from '@/shared/hooks/useLogger';
import { LogDomain } from '@/lib/logging/types';
import { settingsIpc } from '../ipc/settings.ipc';
import type { UserSession } from '@/lib/backend';

// Password change form schema
const passwordChangeSchema = z.object({
  current_password: z.string().min(1, 'Mot de passe actuel requis'),
  new_password: z.string()
    .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial'),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirm_password"],
});

export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

export interface LoginSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  ip_address: string;
  last_active: string;
  current_session: boolean;
}

interface SessionResponse {
  id: string;
  device_info?: {
    device_name?: string;
    device_type?: string;
  };
  user_agent?: string;
  location?: string;
  ip_address?: string;
  last_activity: string;
}

export function useSecuritySettings(user?: UserSession) {
  const [isLoading, setIsLoading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginSessions, setLoginSessions] = useState<LoginSession[]>([]);
  const [sessionTimeout, setSessionTimeout] = useState(480);

  const { logInfo, logError, logUserAction } = useLogger({
    context: LogDomain.SECURITY,
    component: 'SecurityTab',
  });

  const passwordForm = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  // Load security settings and sessions
  useEffect(() => {
    const loadSecurityData = async () => {
      if (!user?.token) return;

      setIsLoading(true);
      try {
        const [sessionsResponse, timeoutConfig] = await Promise.all([
          settingsIpc.getActiveSessions(),
          settingsIpc.getSessionTimeoutConfig(),
        ]);

        if (sessionsResponse && Array.isArray(sessionsResponse)) {
          const formattedSessions = (sessionsResponse as unknown as SessionResponse[]).map((session) => ({
            id: session.id,
            device: session.device_info?.device_name || session.device_info?.device_type || 'Unknown Device',
            browser: session.user_agent || 'Unknown Browser',
            location: session.location || 'Unknown Location',
            ip_address: session.ip_address || 'Unknown IP',
            last_active: session.last_activity,
            current_session: false,
          }));
          setLoginSessions(formattedSessions);
        }

        setSessionTimeout((timeoutConfig as { timeout_minutes?: number })?.timeout_minutes || 480);

        logInfo('Security data loaded successfully', { userId: user.user_id });
      } catch (error) {
        logError('Failed to load security data', {
          error: error instanceof Error ? error.message : error,
          userId: user.user_id
        });
        setLoginSessions([
          {
            id: 'current',
            device: 'Current Device',
            browser: navigator.userAgent.split(' ').pop() || 'Unknown',
            location: 'Current Location',
            ip_address: 'Current IP',
            last_active: new Date().toISOString(),
            current_session: true,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSecurityData();
  }, [user?.token, user?.user_id, logInfo, logError]);

  const onPasswordChange = useCallback(async (data: PasswordChangeFormData) => {
    if (!user?.token) {
      setPasswordChangeError('No authentication token available');
      return;
    }

    setIsChangingPassword(true);
    setPasswordChangeError(null);
    setPasswordChangeSuccess(false);

    logUserAction('Password change initiated', { userId: user.user_id });

    try {
      await settingsIpc.changeUserPassword({
        current_password: data.current_password,
        new_password: data.new_password,
      });

      setPasswordChangeSuccess(true);
      passwordForm.reset();
      logInfo('Password changed successfully', { userId: user.user_id });

      setTimeout(() => setPasswordChangeSuccess(false), 5000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error changing password';
      setPasswordChangeError(errorMessage);
      logError('Password change failed', { error: errorMessage, userId: user.user_id });
    } finally {
      setIsChangingPassword(false);
    }
  }, [user?.token, user?.user_id, passwordForm, logUserAction, logInfo, logError]);

  const handleRevokeSession = useCallback(async (sessionId: string) => {
    if (!user?.token) return;

    logUserAction('Session revocation initiated', { sessionId });

    try {
      await settingsIpc.revokeSession(sessionId);

      setLoginSessions(prev => prev.filter(session => session.id !== sessionId));
      logInfo('Session revoked successfully', { sessionId });
    } catch (error) {
      logError('Session revocation failed', {
        sessionId,
        error: error instanceof Error ? error.message : error
      });
    }
  }, [user?.token, logUserAction, logInfo, logError]);

  const handleUpdateSessionTimeout = useCallback(async (minutes: number) => {
    if (!user?.token) return;

    logUserAction('Session timeout update initiated', { minutes });

    try {
      await settingsIpc.updateSessionTimeout(minutes);

      setSessionTimeout(minutes);
      logInfo('Session timeout updated', { minutes });
    } catch (error) {
      logError('Session timeout update failed', { minutes, error: error instanceof Error ? error.message : error });
    }
  }, [user?.token, logUserAction, logInfo, logError]);

  const toggleShowCurrentPassword = useCallback(() => setShowCurrentPassword(v => !v), []);
  const toggleShowNewPassword = useCallback(() => setShowNewPassword(v => !v), []);
  const toggleShowConfirmPassword = useCallback(() => setShowConfirmPassword(v => !v), []);

  return {
    isLoading,
    isChangingPassword,
    passwordChangeSuccess,
    passwordChangeError,
    showCurrentPassword,
    showNewPassword,
    showConfirmPassword,
    loginSessions,
    sessionTimeout,
    passwordForm,
    onPasswordChange,
    handleRevokeSession,
    handleUpdateSessionTimeout,
    toggleShowCurrentPassword,
    toggleShowNewPassword,
    toggleShowConfirmPassword,
  };
}
