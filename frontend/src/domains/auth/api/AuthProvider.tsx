'use client';

import React, { createContext, useEffect, useState, useCallback } from 'react';
import { AuthSecureStorage, SecureStorage } from '@/lib/secureStorage';
import { clearCache } from '@/lib/ipc/cache';
import { convertTimestamps } from '@/lib/types';
import { logger, LogContext } from '@/lib/logger';
import { toast } from 'sonner';
import { authIpc } from '../ipc/auth.ipc';
import type { AuthContextType, AuthState, AuthResponse, UserAccount, UserSession } from './types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  if (error && typeof error === 'object') {
    if ('message' in error && typeof error.message === 'string' && error.message) return error.message;
    if ('error' in error && typeof error.error === 'string' && error.error) return error.error;
  }
  return fallback;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    isAuthenticating: false,
  });

  const loadProfile = useCallback(async (user: UserSession) => {
    try {
      const profile = await authIpc.getUserProfile(user.user_id, user.token);
      if (profile && typeof profile === 'object' && Object.keys(profile).length > 0) {
        setState(prev => ({
          ...prev,
          profile: convertTimestamps(profile as object) as UserAccount,
        }));
        logger.debug(LogContext.AUTH, 'Profile loaded successfully', { userId: user.user_id });
      } else {
        logger.warn(LogContext.AUTH, 'User profile not found, user may have been deleted', { userId: user.user_id });
        await AuthSecureStorage.clearSession();
        setState({
          user: null,
          profile: null,
          loading: false,
          isAuthenticating: false,
        });
        toast.error('Votre compte a ete supprime. Veuillez vous reconnecter.');
      }
    } catch (error) {
      logger.error(LogContext.AUTH, 'Error loading profile', {
        error: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof Error && (error.message.includes('Authentication') || error.message.includes('Session'))) {
        await AuthSecureStorage.clearSession();
        setState({
          user: null,
          profile: null,
          loading: false,
          isAuthenticating: false,
        });
        toast.error('Session expiree. Veuillez vous reconnecter.');
      }
    }
  }, []);

  useEffect(() => {
    const loadStoredSession = async () => {
      try {
        if (!SecureStorage.isAvailable()) {
          console.warn('Secure storage not available, skipping session load');
          setState({
            user: null,
            profile: null,
            loading: false,
            isAuthenticating: false,
          });
          return;
        }

        let session;
        try {
          session = await AuthSecureStorage.getSession();
        } catch (decryptError) {
          console.warn('Failed to decrypt stored session, clearing corrupted data:', decryptError);
          await AuthSecureStorage.clearSession();
          session = { token: null, user: null, refreshToken: null };
        }

        if (session.token && session.user) {
          let validatedSession: UserSession | null = null;

          try {
            validatedSession = await authIpc.validateSession(session.token);
          } catch {
            validatedSession = null;
          }

          if (validatedSession) {
            setState({
              user: validatedSession,
              profile: null,
              loading: false,
              isAuthenticating: false,
            });
            loadProfile(validatedSession);
          } else if (session.refreshToken) {
            try {
              const refreshedSession = await authIpc.refreshToken(session.refreshToken);
              await AuthSecureStorage.storeSession(
                refreshedSession.token,
                refreshedSession as unknown as Record<string, unknown>
              );

              setState({
                user: refreshedSession,
                profile: null,
                loading: false,
                isAuthenticating: false,
              });
              loadProfile(refreshedSession);
            } catch (error) {
              logger.error(LogContext.AUTH, 'Auto token refresh failed', {
                error: error instanceof Error ? error.message : String(error),
              });
              await AuthSecureStorage.clearSession();
              toast.error('Erreur lors du renouvellement de session. Veuillez vous reconnecter.');
              setState({
                user: null,
                profile: null,
                loading: false,
                isAuthenticating: false,
              });
            }
          } else {
            logger.info(LogContext.AUTH, 'No refresh token available, clearing session');
            await AuthSecureStorage.clearSession();
            toast.error('Votre session a expire. Veuillez vous reconnecter.');
            setState({
              user: null,
              profile: null,
              loading: false,
              isAuthenticating: false,
            });
          }
        } else {
          setState({
            user: null,
            profile: null,
            loading: false,
            isAuthenticating: false,
          });
        }
      } catch (error) {
        console.error('Failed to load stored session:', error);
        setState({
          user: null,
          profile: null,
          loading: false,
          isAuthenticating: false,
        });
      }
    };

    loadStoredSession();
  }, [loadProfile]);

  useEffect(() => {
    if (!state.user) return;

    let isRefreshing = false;

    const refreshInterval = setInterval(async () => {
      if (isRefreshing) return;

      try {
        isRefreshing = true;
        const session = await AuthSecureStorage.getSession();

        if (session.refreshToken) {
          const refreshedSession = await authIpc.refreshToken(session.refreshToken);

          await AuthSecureStorage.storeSession(
            refreshedSession.token,
            refreshedSession as unknown as Record<string, unknown>
          );

          setState(prev => ({
            ...prev,
            user: refreshedSession || null,
          }));
        }
      } catch (error) {
        console.error('Failed to refresh token:', error);
      } finally {
        isRefreshing = false;
      }
    }, 50 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [state.user]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResponse<UserSession>> => {
    setState(prev => ({ ...prev, isAuthenticating: true }));

    try {
      const userSession = await authIpc.login(email, password);

      await AuthSecureStorage.storeSession(
        userSession.token,
        userSession as unknown as Record<string, unknown>
      );

      setState({
        user: userSession,
        profile: null,
        loading: false,
        isAuthenticating: false,
      });

      loadProfile(userSession);

      return { success: true, data: userSession };
    } catch (error) {
      logger.error(LogContext.AUTH, 'Login failed', { email, error });
      toast.error(getErrorMessage(error, 'Erreur de connexion. Vérifiez vos identifiants.'));
      setState(prev => ({ ...prev, isAuthenticating: false }));
      return { success: false, error: error instanceof Error ? error.message : 'Login failed' };
    }
  }, [loadProfile]);

  const signUp = useCallback(async (
    email: string,
    password: string,
    profile: Partial<UserAccount>
  ): Promise<AuthResponse<UserSession>> => {
    setState(prev => ({ ...prev, isAuthenticating: true }));

    try {
      const userSession = await authIpc.createAccount({
        email,
        password,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        role: profile.role || 'viewer',
      });

      await AuthSecureStorage.storeSession(
        userSession.token,
        userSession as unknown as Record<string, unknown>
      );

      setState({
        user: userSession,
        profile: null,
        loading: false,
        isAuthenticating: false,
      });

      loadProfile(userSession);

      return { success: true, data: userSession } as AuthResponse<UserSession>;
    } catch (error) {
      logger.error(LogContext.AUTH, 'Signup failed', { email, error });
      toast.error(getErrorMessage(error, 'Erreur lors de la creation du compte.'));
      setState(prev => ({ ...prev, isAuthenticating: false }));
      return { success: false, error: error instanceof Error ? error.message : 'Account creation failed' } as AuthResponse<UserSession>;
    }
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, isAuthenticating: true }));

    try {
      const token = state.user?.token;
      if (token) {
        await authIpc.logout(token);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await AuthSecureStorage.clearSession();
      clearCache();
      setState({
        user: null,
        profile: null,
        loading: false,
        isAuthenticating: false,
      });
    }
  }, [state.user?.token]);

  const refreshProfile = useCallback(async () => {
    if (state.user) {
      await loadProfile(state.user);
    }
  }, [state.user, loadProfile]);

  const value: AuthContextType = {
    user: state.user,
    profile: state.profile,
    session: state.user,
    loading: state.loading,
    isAuthenticating: state.isAuthenticating,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
