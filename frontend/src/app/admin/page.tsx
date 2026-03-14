// VIOLATION: This page uses `useEffect` + `router.replace` for a redirect.
// It should be a Server Component that calls `redirect('/staff')` from
// 'next/navigation' directly — no 'use client' required, no loading flash.
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingState, PageShell } from '@/shared/ui/facade';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/staff');
  }, [router]);

  return (
    <PageShell>
      <LoadingState message="Redirection vers Employés/Ressources..." />
    </PageShell>
  );
}
