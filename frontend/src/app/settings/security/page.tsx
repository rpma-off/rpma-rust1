'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/shared/ui/layout/LoadingState';
import { useAuth } from '@/domains/auth';

const SecurityTab = dynamic(
  () => import('@/domains/settings').then(mod => ({ default: mod.SecurityTab })),
  { loading: () => <LoadingState message="Chargement de la sécurité..." /> }
);

export default function SecurityPage() {
  const { user } = useAuth();

  if (!user) return <LoadingState message="Chargement..." />;

  return (
    <Suspense fallback={<LoadingState message="Chargement de la sécurité..." />}>
      <SecurityTab user={user} />
    </Suspense>
  );
}
