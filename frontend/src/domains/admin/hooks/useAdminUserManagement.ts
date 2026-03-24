"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ipcClient, convertTimestamps } from "@/shared/utils";
import { adminKeys } from "@/lib/query-keys";
import { useDebounce } from "@/shared/hooks/useDebounce";
import type { CreateUserRequest, UserAccount } from "@/shared/types";
import { useAuth } from "@/shared/hooks/useAuth";

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
 * Uses TanStack Query for server-state management and cache invalidation.
 */
export function useAdminUserManagement(): UseAdminUserManagementReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const usersQuery = useQuery({
    queryKey: adminKeys.usersFiltered(debouncedSearch, roleFilter),
    queryFn: async () => {
      const result = await ipcClient.users.list(
        50,
        0,
        debouncedSearch || undefined,
        roleFilter,
      );
      return (result?.data || []).map((u) =>
        convertTimestamps(u),
      ) as UserAccount[];
    },
    enabled: !!user?.token,
    staleTime: 30_000,
  });

  const invalidateUsers = () =>
    queryClient.invalidateQueries({ queryKey: adminKeys.users() });

  const addUserMutation = useMutation({
    mutationFn: (userData: CreateUserRequest) =>
      ipcClient.users.create(userData),
    onSuccess: () => {
      setShowAddModal(false);
      void invalidateUsers();
    },
    onError: (error) => console.error("Failed to add user:", error),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => ipcClient.users.delete(userId),
    onSuccess: () => void invalidateUsers(),
    onError: (error) => console.error("Failed to delete user:", error),
  });

  const updateUserStatusMutation = useMutation({
    mutationFn: ({
      userId,
      isActive,
    }: {
      userId: string;
      isActive: boolean;
    }) =>
      isActive
        ? ipcClient.users.unbanUser(userId)
        : ipcClient.users.banUser(userId),
    onSuccess: () => void invalidateUsers(),
    onError: (error) => console.error("Failed to update user status:", error),
  });

  const loadUsers = async () => {
    await invalidateUsers();
  };

  const users = usersQuery.data ?? [];

  return {
    users,
    filteredUsers: users,
    isLoading: usersQuery.isLoading || usersQuery.isFetching,
    searchQuery,
    roleFilter,
    showAddModal,
    setSearchQuery,
    setRoleFilter,
    setShowAddModal,
    loadUsers,
    addUser: async (userData) => {
      await addUserMutation.mutateAsync(userData);
    },
    deleteUser: async (userId) => {
      await deleteUserMutation.mutateAsync(userId);
    },
    updateUserStatus: async (userId, isActive) => {
      await updateUserStatusMutation.mutateAsync({ userId, isActive });
    },
  };
}
