'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/domains/auth';
import { LoadingState } from '@/shared/ui/layout/LoadingState';

const SecurityTab = dynamic(
  () => import('@/domains/settings/components/SecurityTab').then(mod => ({ default: mod.SecurityTab })),
  { loading: () => <LoadingState message="Chargement de la securite..." /> }
);

export default function SecurityPage() {
  const { user, profile } = useAuth();
  
  return (
    <Suspense fallback={<LoadingState message="Chargement de la securite..." />}>
      <SecurityTab user={user ?? undefined} profile={profile ?? undefined} />
    </Suspense>
  );
}
