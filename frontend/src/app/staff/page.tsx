'use client';

import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useAuth } from '@/domains/auth';
import { StaffDirectoryView } from '@/domains/users/components/StaffDirectoryView';
import { AdminStaffView } from '@/domains/admin/components/AdminStaffView';

export default function StaffPage() {
  const { profile } = useAuth();
  const canViewAdminTabs = profile?.role === 'admin' || profile?.role === 'supervisor';

  if (canViewAdminTabs) {
    return <AdminStaffView />;
  }

  return (
    <ErrorBoundary>
      <StaffDirectoryView />
    </ErrorBoundary>
  );
}
