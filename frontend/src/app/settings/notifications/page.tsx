'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/domains/auth';
import { LoadingState } from '@/shared/ui/layout/LoadingState';

const NotificationsTab = dynamic(
  () => import('@/domains/settings/components/NotificationsTab').then(mod => ({ default: mod.NotificationsTab })),
  { loading: () => <LoadingState message="Chargement des notifications..." /> }
);

export default function NotificationsPage() {
  const { user, profile } = useAuth();
  
  return (
    <Suspense fallback={<LoadingState message="Chargement des notifications..." />}>
      <NotificationsTab user={user ?? undefined} profile={profile ?? undefined} />
    </Suspense>
  );
}
