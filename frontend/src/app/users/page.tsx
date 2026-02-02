'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserList } from '@/components/users/UserList';
import { UserForm } from '@/components/users/UserForm';
import { UserAccount } from '@/types';
import { convertTimestamps } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { logger, LogContext } from '@/lib/logger';
import { ipcClient } from '@/lib/ipc/client';
import { PageHeader, HeaderActionButton } from '@/components/ui/page-header';
import { Users, UserPlus } from 'lucide-react';

export default function UsersPage() {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      logger.debug(LogContext.API, 'loadUsers: Starting to load users');
      setLoading(true);

      if (!user || !user.token) {
        logger.debug(LogContext.API, 'loadUsers: No authenticated user, setting error');
        setError('Not authenticated');
        return;
      }

      logger.debug(LogContext.API, 'loadUsers: Calling ipcClient.users.list');
      const userListResponse = await ipcClient.users.list(50, 0, user.token);
      logger.info(LogContext.API, 'loadUsers: Received user list', { users: userListResponse.data });

      setUsers(userListResponse.data.map(user => convertTimestamps(user)) as unknown as UserAccount[]);
    } catch (err) {
      logger.error(LogContext.API, 'loadUsers: Error occurred', { error: err });
      setError(err instanceof Error ? err.message : 'Unknown error');
     } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && user.token) {
      loadUsers();
    }
  }, [user, loadUsers]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Checking authentication...</div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user || !user.token) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Please log in to access this page.</div>
      </div>
    );
  }

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEditUser = (user: UserAccount) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingUser(null);
    loadUsers(); // Reload the list
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Gestion des Utilisateurs"
        subtitle="Gérer les comptes utilisateurs et les permissions"
        icon={<Users className="w-6 h-6 text-accent" />}
        actions={
          <HeaderActionButton
            label="Ajouter un utilisateur"
            icon={<UserPlus className="w-4 h-4" />}
            onClick={handleCreateUser}
          />
        }
      />

      <UserList
        users={users}
        onEdit={handleEditUser}
        onRefresh={loadUsers}
      />

      {showForm && (
        <UserForm
          user={editingUser}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}