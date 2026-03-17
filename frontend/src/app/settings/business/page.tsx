'use client';

import { Suspense, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { LoadingState } from '@/shared/ui/layout/LoadingState';
import { useAuth } from '@/domains/auth';

const BusinessRulesTab = dynamic(
  () => import('@/domains/admin').then(mod => ({ default: mod.BusinessRulesTab })),
  { loading: () => <LoadingState /> }
);

export default function BusinessPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role !== 'admin') {
      router.replace('/settings/profile');
    }
  }, [user, loading, router]);

  if (loading || user?.role !== 'admin') return null;

  return (
    <Suspense fallback={<LoadingState message="Chargement des règles métier..." />}>
      <BusinessRulesTab />
    </Suspense>
  );
}
