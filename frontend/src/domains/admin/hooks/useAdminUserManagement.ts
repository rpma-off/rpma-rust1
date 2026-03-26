"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateUserRequest, UserAccount } from "@/lib/backend";
import { adminKeys } from "@/lib/query-keys";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useAuth } from "@/shared/hooks/useAuth";
import { convertTimestamps } from "@/shared/utils";
import { useUserActions } from "@/domains/users/api/useUserActions";
import { userIpc } from "@/domains/users/ipc/users.ipc";

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
  const {
    createUser,
    deleteUser: removeUser,
    banUser,
    unbanUser,
  } = useUserActions();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const usersQuery = useQuery({
    queryKey: adminKeys.usersFiltered(debouncedSearch, roleFilter),
    queryFn: async () => {
      const result = await userIpc.list(
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

  const invalidateUsers = useCallback(
    () => queryClient.invalidateQueries({ queryKey: adminKeys.users() }),
    [queryClient]
  );

  const addUserMutation = useMutation({
    mutationFn: async (userData: CreateUserRequest) => {
      const created = await createUser(userData);
      if (!created) {
        throw new Error("Failed to add user");
      }
      return created;
    },
    onSuccess: () => {
      setShowAddModal(false);
      void invalidateUsers();
    },
    onError: (error) => console.error("Failed to add user:", error),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const deleted = await removeUser(userId);
      if (!deleted) {
        throw new Error("Failed to delete user");
      }
      return deleted;
    },
    onSuccess: () => void invalidateUsers(),
    onError: (error) => console.error("Failed to delete user:", error),
  });

  const updateUserStatusMutation = useMutation({
    mutationFn: async ({
      userId,
      isActive,
    }: {
      userId: string;
      isActive: boolean;
    }) => {
      const updated = isActive
        ? await unbanUser(userId)
        : await banUser(userId);

      if (!updated) {
        throw new Error("Failed to update user status");
      }

      return updated;
    },
    onSuccess: () => void invalidateUsers(),
    onError: (error) => console.error("Failed to update user status:", error),
  });

  const loadUsers = useCallback(async () => {
    await invalidateUsers();
  }, [invalidateUsers]);

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
