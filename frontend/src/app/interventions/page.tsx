'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InterventionsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the main interventions page under dashboard
    router.replace('/dashboard/interventions');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirection vers les interventions...</p>
      </div>
    </div>
  );
}
