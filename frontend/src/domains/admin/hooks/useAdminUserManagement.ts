'use client';

import { useState, useCallback, useMemo } from 'react';
import { ipcClient, convertTimestamps } from '@/shared/utils';
import type { CreateUserRequest, UserAccount } from '@/shared/types';
import { useAuth } from '@/shared/hooks/useAuth';

export interface UseAdminUserManagementReturn {
  users: UserAccount[];
  filteredUsers: UserAccount[];
  isLoading: boolean;
  searchQuery: string;
  roleFilter: string;
  showAddModal: boolean;
  setSearchQuery: (query: string) => void;
  setRoleFilter: (role: string) => void;
  setShowAddModal: (show: boolean) => void;
  loadUsers: () => Promise<void>;
  addUser: (userData: CreateUserRequest) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  updateUserStatus: (userId: string, isActive: boolean) => Promise<void>;
}

/**
 * Manages admin user CRUD operations, filtering, and search.
 * Centralizes all user management IPC calls and state.
 */
export function useAdminUserManagement(): UseAdminUserManagementReturn {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!user?.token) return;

    try {
      setIsLoading(true);
      const result = await ipcClient.users.list(50, 0);
      if (result && result.data) {
        const normalizedUsers = (result.data || []).map(u => convertTimestamps(u));
        setUsers(normalizedUsers as UserAccount[]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.token]);

  const addUser = useCallback(async (userData: CreateUserRequest) => {
    if (!user?.token) return;

    try {
      await ipcClient.users.create(userData);
      setShowAddModal(false);
      loadUsers();
    } catch (error) {
      console.error('Failed to add user:', error);
    }
  }, [user?.token, loadUsers]);

  const deleteUser = useCallback(async (userId: string) => {
    if (!user?.token) return;

    try {
      await ipcClient.users.delete(userId);
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  }, [user?.token, loadUsers]);

  const updateUserStatus = useCallback(async (userId: string, isActive: boolean) => {
    if (!user?.token) return;

    try {
      if (isActive) {
        await ipcClient.users.unbanUser(userId);
      } else {
        await ipcClient.users.banUser(userId);
      }
      loadUsers();
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  }, [user?.token, loadUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter(u =>
      (roleFilter === 'all' || u.role === roleFilter) &&
      (searchQuery === '' ||
       `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
       u.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [users, roleFilter, searchQuery]);

  return {
    users,
    filteredUsers,
    isLoading,
    searchQuery,
    roleFilter,
    showAddModal,
    setSearchQuery,
    setRoleFilter,
    setShowAddModal,
    loadUsers,
    addUser,
    deleteUser,
    updateUserStatus,
  };
}
