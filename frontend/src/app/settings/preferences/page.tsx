'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/domains/auth';
import { LoadingState } from '@/shared/ui/layout/LoadingState';

const PreferencesTab = dynamic(
  () => import('@/domains/settings/components/PreferencesTab').then(mod => ({ default: mod.PreferencesTab })),
  { loading: () => <LoadingState message="Chargement des preferences..." /> }
);

export default function PreferencesPage() {
  const { user, profile } = useAuth();
  
  return (
    <Suspense fallback={<LoadingState message="Chargement des preferences..." />}>
      <PreferencesTab user={user ?? undefined} profile={profile ?? undefined} />
    </Suspense>
  );
}
