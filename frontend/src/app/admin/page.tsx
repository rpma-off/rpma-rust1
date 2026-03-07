'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import {
  Shield,
  Users,
  BarChart3,
  Server,
  Lock,
  UserCheck,
  Activity,
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
} from '@/shared/ui/facade';
import { useAuth } from '@/domains/auth';
import { useRouter } from 'next/navigation';
import { useAdminDashboard, useAdminUserManagement, AdminOverviewTab, AdminUsersTab, AdminSystemTab, AddUserModal } from '@/domains/admin';
import { useTranslation } from '@/shared/hooks/useTranslation';

const WorkflowExecutionDashboard = dynamic(
  () => import('@/domains/interventions').then((mod) => ({ default: mod.WorkflowExecutionDashboard })),
  { loading: () => <LoadingState />, ssr: false }
);

const QualityAssuranceDashboard = dynamic(
  () => import('@/domains/admin').then((mod) => ({ default: mod.QualityAssuranceDashboard })),
  { loading: () => <LoadingState />, ssr: false }
);

const PhotoDocumentationDashboard = dynamic(
  () => import('@/domains/admin').then((mod) => ({ default: mod.PhotoDocumentationDashboard })),
  { loading: () => <LoadingState />, ssr: false }
);

const SecurityDashboard = dynamic(
  () => import('@/domains/admin').then((mod) => ({ default: mod.SecurityDashboard })),
  { loading: () => <LoadingState />, ssr: false }
);

export default function AdminPage() {
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
      {/* Header */}
      <PageHeader
        title={t('admin.title')}
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

        {/* Main Content */}
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
            <TabsTrigger value="security" data-variant="underline">
              <Lock className="h-4 w-4 mr-2" />
              {t('settings.security')}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <AdminOverviewTab
              stats={stats}
              recentActivities={recentActivities}
              dashboardStats={dashboardStats}
              WorkflowExecutionDashboard={WorkflowExecutionDashboard}
              QualityAssuranceDashboard={QualityAssuranceDashboard}
              PhotoDocumentationDashboard={PhotoDocumentationDashboard}
            />
          </TabsContent>

          {/* Users Tab */}
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

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <AdminSystemTab stats={stats} />
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <SecurityDashboard />
          </TabsContent>
        </Tabs>

      {/* Add User Modal */}
      {showAddUserModal && (
        <AddUserModal
          onClose={() => setShowAddUserModal(false)}
          onAddUser={handleAddUser}
        />
      )}
    </PageShell>
  );
}
