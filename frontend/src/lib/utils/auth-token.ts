// Auth token utilities for API requests

import { useAuth } from '@/contexts/AuthContext';

/**
 * Get the current authentication token from the AuthContext
 * This should be called within a React component that has access to the AuthContext
 */
export function useAuthToken(): string | null {
  const { user } = useAuth();
  return user?.token || null;
}

/**
 * Get authentication headers for API requests
 * Returns an object with Authorization header if token is available
 */
export function useAuthHeaders(): Record<string, string> {
  const token = useAuthToken();

  if (!token) {
    return {};
  }

  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Check if the user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const token = useAuthToken();
  return !!token;
}