import { ServiceResponse } from '@/types/unified.types';
import { ipcClient } from '@/lib/ipc';
import type { CreateUserRequest, UpdateUserRequest } from '@/lib/backend';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
}

export class UserService {
  private static normalizeRoleForSignup(role: string): 'admin' | 'technician' | 'supervisor' | 'viewer' | undefined {
    if (role === 'manager') {
      return 'supervisor';
    }
    if (role === 'admin' || role === 'technician' || role === 'supervisor' || role === 'viewer') {
      return role;
    }
    return undefined;
  }

  private static requireSessionToken(sessionToken?: string): string {
    if (!sessionToken) {
      throw new Error('Authentication required');
    }
    return sessionToken;
  }

  static async getUsers(params?: {
    search?: string;
    role?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: string;
  }, sessionToken?: string): Promise<ServiceResponse<User[]>> {
    try {
      const token = this.requireSessionToken(sessionToken);
      const limit = params?.pageSize ?? 50;
      const offset = params?.page ? (params.page - 1) * limit : 0;
      const result = await ipcClient.users.list(limit, offset, token);

      const users = result?.data?.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.first_name || '',
        lastName: u.last_name || '',
        role: u.role || '',
        isActive: u.is_active ?? true
      })) || [];

      return {
        success: true,
        data: users,
        status: 200,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        error: err.message,
        status: 500,
      };
    }
  }

  static async getUser(id: string, sessionToken?: string): Promise<ServiceResponse<User | null>> {
    try {
      const token = this.requireSessionToken(sessionToken);
      const result = await ipcClient.users.get(id, token);
      return {
        success: true,
        data: result as User | null,
        status: 200,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        error: err.message,
        status: 500,
      };
    }
  }

  static async getUserById(id: string, sessionToken?: string): Promise<ServiceResponse<User | null>> {
    return this.getUser(id, sessionToken);
  }

  static async createUser(userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: string;
  }, sessionToken?: string): Promise<ServiceResponse<User>> {
    try {
      const createRequest: CreateUserRequest = {
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        password: userData.password,
        role: userData.role,
      };

      if (sessionToken) {
        const result = await ipcClient.users.create(createRequest, sessionToken);
        return {
          success: true,
          data: result as unknown as User,
          status: 201,
        };
      }

      const session = await ipcClient.auth.createAccount({
        email: createRequest.email,
        first_name: createRequest.first_name,
        last_name: createRequest.last_name,
        password: createRequest.password,
        role: this.normalizeRoleForSignup(createRequest.role),
      });
      return {
        success: true,
        data: {
          id: session.user_id,
          email: session.email,
          firstName: userData.first_name,
          lastName: userData.last_name,
          role: session.role,
          isActive: true,
        },
        status: 201,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        error: err.message,
        status: 500,
      };
    }
  }

  static async updateUser(id: string, updates: Partial<User>, sessionToken?: string): Promise<User> {
    try {
      const token = this.requireSessionToken(sessionToken);
      const updateRequest: UpdateUserRequest = {
        email: updates.email ?? null,
        first_name: updates.firstName ?? null,
        last_name: updates.lastName ?? null,
        role: updates.role ?? null,
        is_active: updates.isActive ?? null,
      };
      const result = await ipcClient.users.update(id, updateRequest, token);
      return result as unknown as User;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update user');
    }
  }

  static async deleteUser(id: string, sessionToken?: string): Promise<void> {
    try {
      const token = this.requireSessionToken(sessionToken);
      await ipcClient.users.delete(id, token);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete user');
    }
  }

  static async updateUserRole(id: string, role: string, sessionToken?: string): Promise<ServiceResponse<User>> {
    try {
      const user = await this.updateUser(id, { role }, sessionToken);
      return {
        success: true,
        data: user,
        status: 200,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user role',
        status: 500,
      };
    }
  }

  static async verifyAdminOrManagerAccess(): Promise<ServiceResponse<boolean>> {
    try {
      return {
        success: true,
        data: true,
        status: 200,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify access',
        status: 500,
      };
    }
  }
}

export const userService = UserService;
