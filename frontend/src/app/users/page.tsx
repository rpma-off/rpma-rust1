'use client';

import { UserList, UserForm } from '@/domains/users';
import { useUsersPage } from '@/domains/users';
import { PageHeader, HeaderActionButton } from '@/components/ui/page-header';
import { PageShell } from '@/shared/ui/layout/PageShell';
import { LoadingState } from '@/shared/ui/layout/LoadingState';
import { ErrorState } from '@/shared/ui/layout/ErrorState';
import { Users, UserPlus } from 'lucide-react';
import { useTranslation } from '@/shared/hooks/useTranslation';

export default function UsersPage() {
  const { t } = useTranslation();
  const {
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
  } = useUsersPage();

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

