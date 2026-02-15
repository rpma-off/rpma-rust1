// Auth service for frontend

import { ipcClient } from '@/lib/ipc';
import type { AuthResponse } from '@/types';
import type { UserSession } from '@/lib/backend';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'admin' | 'technician' | 'supervisor' | 'viewer';
}

/**
 * Service class for handling authentication operations in the RPMA application.
 * Manages user login, signup, logout, and session validation.
 */
export class AuthService {
  /**
   * Authenticates a user with email and password
   * @param credentials - User login credentials
   * @returns Promise resolving to authentication response with user session
   */
  static async login(credentials: LoginCredentials): Promise<AuthResponse<UserSession>> {
    try {
      const data = await ipcClient.auth.login(credentials.email, credentials.password);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  /**
   * Creates a new user account
   * @param credentials - User signup credentials
   * @returns Promise resolving to authentication response with user session
   */
  static async signup(credentials: SignupCredentials): Promise<AuthResponse<UserSession>> {
    try {
      const data = await ipcClient.auth.createAccount({
        email: credentials.email,
        first_name: credentials.firstName,
        last_name: credentials.lastName,
        password: credentials.password,
        role: credentials.role
      });
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Signup failed',
      };
    }
  }

  /**
   * Logs out the current user
   * @param token - User's session token
   * @returns Promise resolving to authentication response
   */
  static async logout(token: string): Promise<AuthResponse<void>> {
    try {
      await ipcClient.auth.logout(token);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      };
    }
  }

  /**
   * Validates a user session token
   * @param token - Session token to validate
   * @returns Promise resolving to authentication response with user session
   */
  static async validateSession(token: string): Promise<AuthResponse<UserSession>> {
    try {
      const data = await ipcClient.auth.validateSession(token);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Session validation failed',
      };
    }
  }

  /**
   * Updates a user's email address
   * @param userId - The user ID to update
   * @param newEmail - The new email address
   * @param sessionToken - Optional session token for authentication
   * @returns Promise resolving to authentication response with updated user session
   */
  static async updateUserEmail(userId: string, newEmail: string, sessionToken?: string): Promise<AuthResponse<UserSession>> {
    try {
      if (sessionToken) {
        // Use IPC when session token is available
        const data = await ipcClient.users.updateEmail(userId, newEmail, sessionToken) as UserSession;
        return { success: true, data };
      } else {
        // Fallback for API routes - should be migrated to IPC
        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update email',
      };
    }
  }

  /**
   * Updates a user's password
   * @param userId - The user ID to update
   * @param newPassword - The new password
   * @param sessionToken - Optional session token for authentication
   * @returns Promise resolving to authentication response
   */
  static async updateUserPassword(userId: string, newPassword: string, sessionToken?: string): Promise<AuthResponse<void>> {
    try {
      if (sessionToken) {
        await ipcClient.users.changePassword(userId, newPassword, sessionToken);
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update password',
      };
    }
  }

  /**
   * Bans a user account
   * @param userId - The user ID to ban
   * @param sessionToken - Optional session token for authentication
   * @returns Promise resolving to authentication response
   */
  static async banUser(userId: string, sessionToken?: string): Promise<AuthResponse<void>> {
    try {
      if (sessionToken) {
        await ipcClient.users.banUser(userId, sessionToken);
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to ban user',
      };
    }
  }

  /**
   * Deletes a user account
   * @param userId - The user ID to delete
   * @param sessionToken - Optional session token for authentication
   * @returns Promise resolving to authentication response
   */
  static async deleteUser(userId: string, sessionToken?: string): Promise<AuthResponse<void>> {
    try {
      if (sessionToken) {
        await ipcClient.users.delete(userId, sessionToken);
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete user',
      };
    }
  }
}

export const authService = AuthService;
