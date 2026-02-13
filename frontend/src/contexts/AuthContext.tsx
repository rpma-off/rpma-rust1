'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthService } from '@/lib/tauri';
import { AuthSecureStorage, SecureStorage } from '@/lib/secureStorage';
import { clearCache } from '@/lib/ipc/cache';
import type { UserSession } from '@/lib/backend';
import type { UserAccount, AuthContextType, AuthState, AuthResponse } from '@/types/auth.types';
import { convertTimestamps } from '@/lib/types';
import { logger, LogContext } from '@/lib/logger';
import toast from 'react-hot-toast';

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    isAuthenticating: false,
  });

  // Load profile function
  const loadProfile = useCallback(async (user: UserSession) => {
    try {
      const response = await AuthService.getUserProfile(user.user_id, user.token);
      if (response.type === 'Found' && response.data) {
        setState(prev => ({
          ...prev,
          profile: response.data ? convertTimestamps(response.data) as UserAccount : null
        }));
        logger.debug(LogContext.AUTH, 'Profile loaded successfully', { userId: user.user_id });
      } else if (response.type === 'NotFound') {
        logger.warn(LogContext.AUTH, 'User profile not found, user may have been deleted', { userId: user.user_id });
        // Clear session if user doesn't exist
        await AuthSecureStorage.clearSession();
        setState({
          user: null,
          profile: null,
          loading: false,
          isAuthenticating: false,
        });
        toast.error('Votre compte a été supprimé. Veuillez vous reconnecter.');
      } else {
        logger.warn(LogContext.AUTH, 'Failed to load profile', { response });
        // Don't set profile to null on failure, keep existing or null
      }
    } catch (error) {
      logger.error(LogContext.AUTH, 'Error loading profile', {
        error: error instanceof Error ? error.message : String(error)
      });
      // If it's an auth error, clear the session
      if (error instanceof Error && (error.message.includes('Authentication') || error.message.includes('Session'))) {
        await AuthSecureStorage.clearSession();
        setState({
          user: null,
          profile: null,
          loading: false,
          isAuthenticating: false,
        });
        toast.error('Session expirée. Veuillez vous reconnecter.');
      }
    }
  }, []);

  // Load session from secure storage on mount
  useEffect(() => {
    const loadStoredSession = async () => {
      try {
        // Check if secure storage is available
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

        // Try to get session, handling potential decryption errors
        let session;
        try {
          session = await AuthSecureStorage.getSession();
        } catch (decryptError) {
          console.warn('Failed to decrypt stored session, clearing corrupted data:', decryptError);
          await AuthSecureStorage.clearSession();
          session = { token: null, user: null, refreshToken: null };
        }

        if (session.token && session.user) {
          // Validate session with backend
          const validationResponse = await AuthService.validateSession(session.token);

          if (validationResponse.success && validationResponse.data) {
            setState({
              user: validationResponse.data,
              profile: null, // Will be loaded separately
              loading: false,
              isAuthenticating: false,
            });
            // Load profile asynchronously
            loadProfile(validationResponse.data);
          } else {
            // Session invalid, try refresh if refresh token available
            if (session.refreshToken) {
              const refreshResponse = await AuthService.refreshToken(session.refreshToken);

              if (refreshResponse.success && refreshResponse.data) {
                // Store new session
                await AuthSecureStorage.storeSession(
                  refreshResponse.data.token,
                  refreshResponse.data as unknown as Record<string, unknown>,
                  refreshResponse.data.refresh_token || undefined
                );

                setState({
                  user: refreshResponse.data,
                  profile: null,
                  loading: false,
                  isAuthenticating: false,
                });
                // Load profile asynchronously
                loadProfile(refreshResponse.data);
              } else {
                // Refresh failed, clear session
                logger.error(LogContext.AUTH, 'Auto token refresh failed', {
                  error: refreshResponse.error
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
              // No refresh token, clear session
              logger.info(LogContext.AUTH, 'No refresh token available, clearing session');
              await AuthSecureStorage.clearSession();
              toast.error('Votre session a expiré. Veuillez vous reconnecter.');
              setState({
                user: null,
                profile: null,
                loading: false,
                isAuthenticating: false,
              });
            }
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

  // Auto-refresh token periodically
  useEffect(() => {
    if (!state.user) return;

    let isRefreshing = false;

    const refreshInterval = setInterval(async () => {
      // Prevent multiple concurrent refresh attempts
      if (isRefreshing) return;
      
      try {
        isRefreshing = true;
        const session = await AuthSecureStorage.getSession();

        if (session.refreshToken) {
          const refreshResponse = await AuthService.refreshToken(session.refreshToken);

          if (refreshResponse.success && refreshResponse.data) {
            // Store new session
            await AuthSecureStorage.storeSession(
              refreshResponse.data.token,
              refreshResponse.data as unknown as Record<string, unknown>,
              refreshResponse.data.refresh_token || undefined
            );

            setState(prev => ({
              ...prev,
              user: refreshResponse.data || null,
            }));
          } else {
            // Refresh failed, clear session
            logger.error(LogContext.AUTH, 'Auto token refresh failed', {
              error: refreshResponse.error
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
        }
      } catch (error) {
        console.error('Failed to refresh token:', error);
      } finally {
        isRefreshing = false;
      }
    }, 50 * 60 * 1000); // Refresh every 50 minutes (access tokens expire in 2 hours)

    return () => clearInterval(refreshInterval);
  }, [state.user]);

  // Sign in function
  const signIn = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isAuthenticating: true }));

    try {
      const response = await AuthService.login({ email, password });

      if (response.success && response.data) {
        // Store session in secure storage
        await AuthSecureStorage.storeSession(
          response.data.token,
          response.data as unknown as Record<string, unknown>,
          response.data.refresh_token || undefined
        );

        setState({
          user: response.data,
          profile: null, // Will be loaded separately
          loading: false,
          isAuthenticating: false,
        });

        // Load profile asynchronously
        loadProfile(response.data);

        return { success: true, data: response.data };
      } else {
        logger.error(LogContext.AUTH, 'Login failed', { email, error: response.error });
        toast.error(response.error || 'Erreur de connexion. Vérifiez vos identifiants.');
        setState(prev => ({ ...prev, isAuthenticating: false }));
        return { success: false, error: response.error };
      }
    } catch (error) {
      setState(prev => ({ ...prev, isAuthenticating: false }));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
    }
  }, [loadProfile]);

  // Sign up function
  const signUp = useCallback(async (
    email: string,
    password: string,
    profile: Partial<UserAccount>
  ) => {
    setState(prev => ({ ...prev, isAuthenticating: true }));

    try {
      const response = await AuthService.signup({
        email,
        password,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        role: profile.role || 'viewer',
      });

      if (response.success && response.data) {
        // Store session in secure storage
        await AuthSecureStorage.storeSession(
          response.data.token,
          response.data as unknown as Record<string, unknown>,
          response.data.refresh_token || undefined
        );

        setState({
          user: response.data,
          profile: null, // Will be loaded separately
          loading: false,
          isAuthenticating: false,
        });

        // Load profile asynchronously
        loadProfile(response.data);

        return { success: true, data: response.data } as AuthResponse<UserSession>;
      } else {
        logger.error(LogContext.AUTH, 'Signup failed', { email, error: response.error });
        toast.error(response.error || 'Erreur lors de la création du compte.');
        setState(prev => ({ ...prev, isAuthenticating: false }));
        return { success: false, error: response.error } as AuthResponse<UserSession>;
      }
    } catch (error) {
      setState(prev => ({ ...prev, isAuthenticating: false }));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Account creation failed'
      };
    }
  }, [loadProfile]);

  // Sign out function
  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, isAuthenticating: true }));

    try {
      const token = state.user?.token;
      if (token) {
        await AuthService.logout(token);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear secure storage and cached queries regardless of backend response
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

  // Refresh profile function
  const refreshProfile = useCallback(async () => {
    if (state.user) {
      await loadProfile(state.user);
    }
  }, [state.user, loadProfile]);

  const value: AuthContextType = {
    user: state.user,
    profile: state.profile,
    session: state.user, // For compatibility, session is the same as user
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

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Export context for testing
export { AuthContext };