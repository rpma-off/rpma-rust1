// User service

import { ServiceResponse } from '@/types/unified.types';
import { ipcClient } from '@/lib/ipc';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
}

export class UserService {
  static async getUsers(params?: { search?: string; role?: string; page?: number; pageSize?: number; sortBy?: string; sortOrder?: string }): Promise<ServiceResponse<User[]>> {
    try {
      // Note: This method needs to be implemented in ipcClient.users
      // For now, return empty array as this appears to be a mock service
      return {
        success: true,
        data: [],
        status: 200
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        error: err.message,
        status: 500
      };
    }
  }

  static async getUser(id: string): Promise<ServiceResponse<User | null>> {
    try {
      const result = await ipcClient.users.get(id, 'mock-token');
      return {
        success: true,
        data: result as User | null,
        status: 200
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        error: err.message,
        status: 500
      };
    }
  }

  static async getUserById(id: string): Promise<ServiceResponse<User | null>> {
    return this.getUser(id);
  }

  static async createUser(userData: { email: string; password: string; first_name: string; last_name: string; role: string }): Promise<ServiceResponse<User>> {
    try {
      const result = await ipcClient.users.create({
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        password: userData.password,
        role: userData.role,
      } as any, 'mock-token');

      return {
        success: true,
        data: result as User,
        status: 201
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        error: err.message,
        status: 500
      };
    }
  }

  static async updateUser(id: string, updates: Partial<User>): Promise<User> {
    try {
      const result = await ipcClient.users.update(id, updates as any, 'mock-token');
      return result as User;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update user');
    }
  }

  static async deleteUser(id: string): Promise<void> {
    try {
      await ipcClient.users.delete(id, 'mock-token');
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete user');
    }
  }

  static async updateUserRole(id: string, role: string): Promise<ServiceResponse<User>> {
    try {
      const user = await this.updateUser(id, { role });
      return {
        success: true,
        data: user,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user role',
        status: 500
      };
    }
  }

  static async verifyAdminOrManagerAccess(): Promise<ServiceResponse<boolean>> {
    try {
      // Mock implementation - in real app, check current user's role
      return {
        success: true,
        data: true,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify access',
        status: 500
      };
    }
  }
}

export const userService = UserService;