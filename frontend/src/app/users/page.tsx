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
import { PageShell } from '@/components/layout/PageShell';
import { LoadingState } from '@/components/layout/LoadingState';
import { ErrorState } from '@/components/layout/ErrorState';
import { Users, UserPlus } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function UsersPage() {
  const { t } = useTranslation();
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
        setError(t('errors.unauthorized'));
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
  }, [user, t]);

  useEffect(() => {
    if (user && user.token) {
      loadUsers();
    }
  }, [user, loadUsers]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <PageShell>
        <LoadingState message={t('common.loading')} />
      </PageShell>
    );
  }

  // Redirect if not authenticated
  if (!user || !user.token) {
    return (
      <PageShell>
        <ErrorState message={t('errors.unauthorized')} />
      </PageShell>
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
      <PageShell>
        <LoadingState message={t('common.loading')} />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <ErrorState message={error} onRetry={loadUsers} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={t('users.title')}
        subtitle={t('admin.userManagement')}
        icon={<Users className="w-6 h-6 text-[hsl(var(--rpma-teal))]" />}
        actions={
          <HeaderActionButton
            label={t('users.createUser')}
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
    </PageShell>
  );
}
