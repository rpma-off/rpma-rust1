'use client';

import dynamic from 'next/dynamic';
import { Shield, Users, BarChart3, Server, UserCheck, Activity } from 'lucide-react';
import {
  ErrorState,
  PageHeader,
  PageShell,
  StatCard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui/facade';
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

export function AdminStaffView() {
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
            <StatCard value={stats.totalUsers} label={t('users.title')} icon={Users} color="accent" />
            <StatCard value={stats.activeUsers} label={t('users.active')} icon={UserCheck} color="green" />
            <StatCard value={stats.totalTasks} label={t('tasks.title')} icon={BarChart3} color="blue" />
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
