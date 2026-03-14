'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { useAuth } from '@/shared/hooks/useAuth';
import { useAdminDashboard } from './useAdminDashboard';
import { useAdminUserManagement } from './useAdminUserManagement';

export function useAdminPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  const adminDashboard = useAdminDashboard();
  const adminUserManagement = useAdminUserManagement();
  const { loadUsers } = adminUserManagement;

  const isAuthorized =
    !!profile && (profile.role === 'admin' || profile.role === 'supervisor');

  useEffect(() => {
    if (profile && profile.role !== 'admin' && profile.role !== 'supervisor') {
      router.push('/unauthorized');
    }
  }, [profile, router]);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab, loadUsers]);

  const handleDeleteUser = (userId: string) => {
    adminUserManagement.deleteUser(userId, t('users.confirmDelete'));
  };

  return {
    t,
    profile,
    activeTab,
    setActiveTab,
    isAuthorized,
    adminDashboard,
    adminUserManagement,
    handleDeleteUser,
  };
}
