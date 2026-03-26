'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Shield, Users, BarChart3, Server, Activity } from 'lucide-react';
import {
  ErrorState,
  PageHeader,
  PageShell,
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
import { ActivityAuditTab } from './ActivityAuditTab';

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

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

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

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value !== 'activity') {
      setSelectedUserId(null);
    }
  };

  const handleViewUserActivity = (userId: string) => {
    setSelectedUserId(userId);
    setActiveTab('activity');
  };

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
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList data-variant="underline" className="w-full justify-start bg-[hsl(var(--rpma-teal))] text-white rounded-[10px] px-2">
          <TabsTrigger value="overview" data-variant="underline">
            <BarChart3 className="h-4 w-4 mr-2" />
            {t('analytics.overview')}
          </TabsTrigger>
          <TabsTrigger value="users" data-variant="underline">
            <Users className="h-4 w-4 mr-2" />
            {t('users.title')}
          </TabsTrigger>
          <TabsTrigger value="activity" data-variant="underline">
            <Activity className="h-4 w-4 mr-2" />
            Audit d&apos;activité
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
            onViewActivity={handleViewUserActivity}
          />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityAuditTab initialUserId={selectedUserId} />
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
