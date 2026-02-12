/**
 * Authentication Type Definitions for Tauri Desktop App
 *
 * Types that match the Rust backend auth models
 */

// Import and re-export types for compatibility
import type { UserRole, UserSession } from '@/lib/backend';
import type { UserAccount } from '@/lib/types';

export type { UserRole, UserSession, UserAccount };

// Legacy type aliases for backward compatibility
export type LegacyUserRole = 'admin' | 'technician' | 'supervisor' | 'viewer';
export type LegacyUserSession = UserSession;
export type LegacyUserAccount = UserAccount;

/**
 * Authentication state for frontend context
 */
export interface AuthState {
  user: UserSession | null;
  profile: UserAccount | null;
  loading: boolean;
  isAuthenticating: boolean;
}

/**
 * Login credentials for Tauri auth command
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Signup credentials for Tauri auth command
 */
export interface SignupCredentials {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role?: string; // Rust backend expects Option<String>
}

/**
 * Common response format for auth operations
 */
export interface AuthResponse<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Auth context interface
 */
export interface AuthContextType {
  user: UserSession | null;
  profile: UserAccount | null;
  session: UserSession | null; // For compatibility with migrated pages
  loading: boolean;
  isAuthenticating: boolean;
  signIn: (email: string, password: string) => Promise<AuthResponse<UserSession>>;
  signUp: (email: string, password: string, profile: Partial<UserAccount>) => Promise<AuthResponse<UserSession>>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

/**
 * Type guard to check if user has specific role
 */
export function hasRole(user: UserSession | null, role: UserRole): boolean {
  return user?.role === role;
}

/**
 * Type guard to check if user has admin or supervisor privileges
 */
export function hasAdminPrivileges(user: UserSession | null): boolean {
  return user?.role === 'admin' || user?.role === 'supervisor';
}

/**
 * Type guard to check if user can manage tasks
 */
export function canManageTasks(user: UserSession | null): boolean {
  return user?.role === 'admin' || user?.role === 'supervisor' || user?.role === 'technician';
}

/**
 * Get display name for user role
 */
export function getRoleDisplay(role: UserRole): string {
  const roleLabels: Partial<Record<UserRole, string>> = {
    admin: 'Administrator',
    technician: 'Technician',
    supervisor: 'Supervisor'
  };
  return roleLabels[role] || role;
}

/**
 * Check if session is expired
 */
export function isSessionExpired(session: UserSession): boolean {
  return new Date(session.expires_at) < new Date();
}

/**
 * Authenticated request interface for API routes
 */
export interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    role: string;
  } | null;
  error?: string;
  isValid?: boolean;
  statusCode?: number;
  sanitizedBody?: Record<string, unknown>;
  isAuthenticated?: boolean;
  userId?: string;
}