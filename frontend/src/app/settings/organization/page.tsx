'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/domains/auth';
import { LoadingState } from '@/shared/ui/layout/LoadingState';

const OrganizationSettingsTab = dynamic(
  () => import('@/domains/organizations').then(mod => ({ default: mod.OrganizationSettingsTab })),
  { loading: () => <LoadingState message="Chargement des paramètres de l'organisation..." /> }
);

export default function OrganizationSettingsPage() {
  const { user } = useAuth();
  
  return (
    <Suspense fallback={<LoadingState message="Chargement des paramètres de l'organisation..." />}>
      <OrganizationSettingsTab />
    </Suspense>
  );
}
