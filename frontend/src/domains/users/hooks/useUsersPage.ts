'use client';

import { useState } from 'react';
import { useUserList } from '../hooks/useUserList';
import { useAuth } from '@/domains/auth';
import type { UserAccount } from '@/shared/types';

export function useUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const { users, loading, error, refetch } = useUserList();
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEditUser = (userToEdit: UserAccount) => {
    setEditingUser(userToEdit);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingUser(null);
    refetch();
  };

  return {
    user,
    authLoading,
    users,
    loading,
    error,
    refetch,
    showForm,
    editingUser,
    handleCreateUser,
    handleEditUser,
    handleFormClose,
    handleFormSuccess,
  };
}
