'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserList } from '@/shared/ui/users/UserList';
import { UserForm } from '@/shared/ui/users/UserForm';
import { UserAccount } from '@/shared/types';
import { convertTimestamps } from '@/shared/utils';
import { useAuth } from '@/domains/auth';
import { logger, LogContext } from '@/shared/utils';
import { ipcClient } from '@/shared/utils';
import { PageHeader, HeaderActionButton } from '@/shared/ui/ui/page-header';
import { PageShell } from '@/shared/ui/layout/PageShell';
import { LoadingState } from '@/shared/ui/layout/LoadingState';
import { ErrorState } from '@/shared/ui/layout/ErrorState';
import { Users, UserPlus } from 'lucide-react';
import { useTranslation } from '@/shared/hooks/useTranslation';

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

