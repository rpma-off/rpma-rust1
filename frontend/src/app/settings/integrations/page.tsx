'use client';

import { Suspense, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { LoadingState } from '@/shared/ui/layout/LoadingState';
import { useAuth } from '@/domains/auth';

const IntegrationsTab = dynamic(
  () => import('@/domains/admin').then(mod => ({ default: mod.IntegrationsTab })),
  { loading: () => <LoadingState /> }
);

export default function IntegrationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role !== 'admin') {
      router.replace('/settings/profile');
    }
  }, [user, loading, router]);

  if (loading || user?.role !== 'admin') return null;

  return (
    <Suspense fallback={<LoadingState message="Chargement des intégrations..." />}>
      <IntegrationsTab />
    </Suspense>
  );
}
