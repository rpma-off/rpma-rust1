'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingState } from '@/shared/ui/layout/LoadingState';
import { useAuth } from '@/domains/auth';
import { AppSettingsTab } from '@/domains/settings/components/AppSettingsTab';

export default function SystemPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role !== 'admin') {
      router.replace('/settings/profile');
    }
  }, [user, loading, router]);

  if (loading || user?.role !== 'admin') return null;

  return (
    <Suspense fallback={<LoadingState message="Chargement des paramètres système..." />}>
      <AppSettingsTab />
    </Suspense>
  );
}
