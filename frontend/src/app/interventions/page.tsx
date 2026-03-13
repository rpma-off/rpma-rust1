// VIOLATION: This page uses `useEffect` + `router.replace` for a redirect.
// It should be a Server Component that calls `redirect('/dashboard/interventions')` from
// 'next/navigation' directly — no 'use client' required, no loading flash.
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { LoadingState } from '@/shared/ui/layout/LoadingState';

export default function InterventionsPage() {
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    // Redirect to the main interventions page under dashboard
    router.replace('/dashboard/interventions');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingState message={t('common.redirecting')} />
    </div>
  );
}

