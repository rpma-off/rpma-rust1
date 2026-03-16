'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Shield,
  Users,
  BarChart3,
  Server,
  UserCheck,
  Activity,
  Search,
} from 'lucide-react';
import {
  ErrorState,
  LoadingState,
  PageHeader,
  PageShell,
  StatCard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Input,
} from '@/shared/ui/facade';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useAuth } from '@/domains/auth';
import { useUsersPage } from '@/domains/users';
import { UserList } from '@/domains/users';
import {
  useAdminPage,
  AdminOverviewTab,
  AdminUsersTab,
  AdminSystemTab,
} from '@/domains/admin';

const AddUserModal = dynamic(
  () => import('@/domains/admin').then((mod) => ({ default: mod.AddUserModal })),
  { ssr: false }
);

export default function StaffPage() {
  const { profile } = useAuth();
  
  const canViewAdminTabs = 
    profile?.role === 'admin' || profile?.role === 'supervisor';

  const {
    users,
    loading: usersLoading,
    error: usersError,
    refetch,
    showForm: _showForm,
    editingUser: _editingUser,
    handleCreateUser: _handleCreateUser,
    handleEditUser: _handleEditUser,
    handleFormClose: _handleFormClose,
    handleFormSuccess: _handleFormSuccess,
  } = useUsersPage();

  const {
    t,
    activeTab,
    setActiveTab,
    isAuthorized,
    adminDashboard,
    adminUserManagement,
    handleDeleteUser,
  } = useAdminPage();

  const { stats, recentActivities, dashboardStats } = adminDashboard;
  const {
    filteredUsers,
    isLoading: isLoadingUsers,
    searchQuery: userSearchQuery,
    roleFilter: userRoleFilter,
    showAddModal: showAddUserModal,
    setSearchQuery: setUserSearchQuery,
    setRoleFilter: setUserRoleFilter,
    setShowAddModal: setShowAddUserModal,
    addUser: handleAddUser,
    updateUserStatus: handleUpdateUserStatus,
  } = adminUserManagement;

  const [standardSearchQuery, setStandardSearchQuery] = useState('');
  const [standardRoleFilter, setStandardRoleFilter] = useState('all');
  const [standardStatusFilter, setStandardStatusFilter] = useState('all');

  const filteredStandardUsers = useMemo(() => {
    return users.filter(user => {
      const matchesRole = standardRoleFilter === 'all' || user.role === standardRoleFilter;
      const matchesStatus = 
        standardStatusFilter === 'all' ||
        (standardStatusFilter === 'active' && user.is_active) ||
        (standardStatusFilter === 'inactive' && !user.is_active);
      const matchesSearch = 
        standardSearchQuery === '' ||
        user.email.toLowerCase().includes(standardSearchQuery.toLowerCase()) ||
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(standardSearchQuery.toLowerCase());
      
      return matchesRole && matchesStatus && matchesSearch;
    });
  }, [users, standardRoleFilter, standardStatusFilter, standardSearchQuery]);

  const standardStats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
    technicians: users.filter(u => u.role === 'technician').length,
  }), [users]);

  if (usersLoading && !canViewAdminTabs) {
    return (
      <PageShell>
        <LoadingState message={t('common.loading')} />
      </PageShell>
    );
  }

  if (usersError && !canViewAdminTabs) {
    return (
      <PageShell>
        <ErrorState message={usersError} onRetry={refetch} />
      </PageShell>
    );
  }

  if (canViewAdminTabs) {
    if (!isAuthorized) {
      return (
        <PageShell>
          <ErrorState
            title={t('errors.unauthorized')}
            message={t('errors.permissionDenied')}
          />
        </PageShell>
      );
    }

    return (
      <PageShell>
        <PageHeader
          title={t('nav.employeesResources')}
          subtitle={t('admin.systemSettings')}
          icon={<Shield className="w-6 h-6 text-[hsl(var(--rpma-teal))]" />}
          stats={
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                value={stats.totalUsers}
                label={t('users.title')}
                icon={Users}
                color="accent"
              />
              <StatCard
                value={stats.activeUsers}
                label={t('users.active')}
                icon={UserCheck}
                color="green"
              />
              <StatCard
                value={stats.totalTasks}
                label={t('tasks.title')}
                icon={BarChart3}
                color="blue"
              />
              <StatCard
                value={stats.systemHealth === 'healthy' ? '✓' : '⚠'}
                label={t('admin.systemHealth')}
                icon={Activity}
                color={stats.systemHealth === 'healthy' ? 'green' : 'yellow'}
              />
            </div>
          }
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList data-variant="underline" className="w-full justify-start bg-[hsl(var(--rpma-teal))] text-white rounded-[10px] px-2">
            <TabsTrigger value="overview" data-variant="underline">
              <BarChart3 className="h-4 w-4 mr-2" />
              {t('analytics.overview')}
            </TabsTrigger>
            <TabsTrigger value="users" data-variant="underline">
              <Users className="h-4 w-4 mr-2" />
              {t('users.title')}
            </TabsTrigger>
            <TabsTrigger value="system" data-variant="underline">
              <Server className="h-4 w-4 mr-2" />
              {t('common.system')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AdminOverviewTab
              stats={stats}
              recentActivities={recentActivities}
              dashboardStats={dashboardStats}
            />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <AdminUsersTab
              filteredUsers={filteredUsers}
              isLoading={isLoadingUsers}
              searchQuery={userSearchQuery}
              roleFilter={userRoleFilter}
              setSearchQuery={setUserSearchQuery}
              setRoleFilter={setUserRoleFilter}
              onAddUser={() => setShowAddUserModal(true)}
              onUpdateUserStatus={handleUpdateUserStatus}
              onDeleteUser={handleDeleteUser}
            />
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <AdminSystemTab stats={stats} />
          </TabsContent>
        </Tabs>

        {showAddUserModal && (
          <AddUserModal
            onClose={() => setShowAddUserModal(false)}
            onAddUser={handleAddUser}
          />
        )}
      </PageShell>
    );
  }

  return (
    <ErrorBoundary>
    <PageShell>
      <PageHeader
        title={t('nav.employeesResources')}
        subtitle={t('staff.directory')}
        icon={<Users className="w-6 h-6 text-[hsl(var(--rpma-teal))]" />}
        stats={
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              value={standardStats.total}
              label={t('staff.total')}
              icon={Users}
              color="accent"
            />
            <StatCard
              value={standardStats.active}
              label={t('staff.active')}
              icon={UserCheck}
              color="green"
            />
            <StatCard
              value={standardStats.inactive}
              label={t('staff.inactive')}
              icon={Users}
              color="red"
            />
            <StatCard
              value={standardStats.technicians}
              label={t('staff.technicians')}
              icon={Users}
              color="blue"
            />
          </div>
        }
      />

      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('staff.searchPlaceholder')}
              value={standardSearchQuery}
              onChange={(e) => setStandardSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={standardRoleFilter}
            onChange={(e) => setStandardRoleFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-[hsl(var(--rpma-border))] rounded-[6px] text-foreground text-sm"
          >
            <option value="all">{t('staff.allRoles')}</option>
            <option value="admin">{t('staff.roleAdmin')}</option>
            <option value="supervisor">{t('staff.roleSupervisor')}</option>
            <option value="technician">{t('staff.roleTechnician')}</option>
            <option value="viewer">{t('staff.roleViewer')}</option>
          </select>
          <select
            value={standardStatusFilter}
            onChange={(e) => setStandardStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-[hsl(var(--rpma-border))] rounded-[6px] text-foreground text-sm"
          >
            <option value="all">{t('staff.allStatuses')}</option>
            <option value="active">{t('staff.statusActive')}</option>
            <option value="inactive">{t('staff.statusInactive')}</option>
          </select>
        </div>
      </div>

      <UserList
        users={filteredStandardUsers}
        onEdit={() => {}}
        onRefresh={refetch}
      />
    </PageShell>
    </ErrorBoundary>
  );
}
