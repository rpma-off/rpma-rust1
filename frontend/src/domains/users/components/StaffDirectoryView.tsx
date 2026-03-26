'use client';

import { useMemo, useState } from 'react';
import { Users, Search } from 'lucide-react';
import { useTranslation } from '@/shared/hooks';
import {
  ErrorState,
  LoadingState,
  PageHeader,
  PageShell,
  Input,
} from '@/shared/ui/facade';
import { useUsersPage } from '@/domains/users';
import { UserList } from '@/domains/users';

export function StaffDirectoryView() {
  const { t } = useTranslation();
  const { users, loading, error, refetch } = useUsersPage();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && user.is_active) ||
        (statusFilter === 'inactive' && !user.is_active);
      const matchesSearch =
        searchQuery === '' ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesRole && matchesStatus && matchesSearch;
    });
  }, [users, roleFilter, statusFilter, searchQuery]);

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
        title={t('nav.employeesResources')}
        subtitle={t('staff.directory')}
        icon={<Users className="w-6 h-6 text-[hsl(var(--rpma-teal))]" />}
      />

      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('staff.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-[hsl(var(--rpma-border))] rounded-[6px] text-foreground text-sm"
          >
            <option value="all">{t('staff.allRoles')}</option>
            <option value="admin">{t('staff.roleAdmin')}</option>
            <option value="supervisor">{t('staff.roleSupervisor')}</option>
            <option value="technician">{t('staff.roleTechnician')}</option>
            <option value="viewer">{t('staff.roleViewer')}</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-[hsl(var(--rpma-border))] rounded-[6px] text-foreground text-sm"
          >
            <option value="all">{t('staff.allStatuses')}</option>
            <option value="active">{t('staff.statusActive')}</option>
            <option value="inactive">{t('staff.statusInactive')}</option>
          </select>
        </div>
      </div>

      <UserList
        users={filteredUsers}
        onEdit={() => {}}
        onRefresh={refetch}
      />
    </PageShell>
  );
}
