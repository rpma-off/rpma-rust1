'use client';

import { useAuth as useNewAuth } from '@/contexts/AuthContext';
import type { AuthContextType } from '@/types/auth.types';
import type { UserAccount } from '@/lib/types';
import type { UserSession } from '@/lib/backend';

/**
 * Wrapper de compatibilité pour faciliter la migration progressive
 * Expose la même interface que l'ancien useAuth mais utilise le nouveau système
 */
export function useAuth(): AuthContextType {
  const newAuth = useNewAuth();
  // const csrfHeaderName = getCSRFHeaderName();

  return {
    user: newAuth.user,
    profile: newAuth.profile,
    session: newAuth.user, // Return user as session for compatibility with TaskForm
    loading: newAuth.loading,
    isAuthenticating: newAuth.isAuthenticating,
    signIn: async (email, password) => {
      try {
        const result = await newAuth.signIn(email, password);
        return result;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Authentication failed'
        };
      }
    },
    signUp: async (email, password, profile) => {
      try {
        const result = await newAuth.signUp(email, password, profile);
        return result;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Sign up failed'
        };
      }
    },
    signOut: async () => {
      // The actual sign out logic is now handled in the AuthContext
      return newAuth.signOut();
    },
    refreshProfile: newAuth.refreshProfile,
  };
}