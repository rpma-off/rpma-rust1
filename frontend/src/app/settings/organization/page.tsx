'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/shared/ui/layout/LoadingState';
import { useAuth } from '@/domains/auth';

const OrganizationSettingsTab = dynamic(
  () => import('@/domains/settings/components/OrganizationSettingsTab').then(mod => ({ default: mod.OrganizationSettingsTab })),
  { loading: () => <LoadingState message="Chargement des paramètres de l'organisation..." /> }
);

export default function OrganizationSettingsPage() {
  const { user: _user } = useAuth();
  
  return (
    <Suspense fallback={<LoadingState message="Chargement des paramètres de l'organisation..." />}>
      <OrganizationSettingsTab />
    </Suspense>
  );
}
