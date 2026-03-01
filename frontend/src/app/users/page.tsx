'use client';

import { useState } from 'react';
import { UserList, UserForm, useUserList } from '@/domains/users';
import type { UserAccount } from '@/shared/types';
import { useAuth } from '@/domains/auth';
import { PageHeader, HeaderActionButton } from '@/shared/ui/ui/page-header';
import { PageShell } from '@/shared/ui/layout/PageShell';
import { LoadingState } from '@/shared/ui/layout/LoadingState';
import { ErrorState } from '@/shared/ui/layout/ErrorState';
import { Users, UserPlus } from 'lucide-react';
import { useTranslation } from '@/shared/hooks/useTranslation';

export default function UsersPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { users, loading, error, refetch } = useUserList();
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

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
        <ErrorState message={error} onRetry={refetch} />
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
        onRefresh={refetch}
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

