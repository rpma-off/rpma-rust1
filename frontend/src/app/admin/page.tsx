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
