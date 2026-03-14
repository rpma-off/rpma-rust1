'use client';

import { useEffect } from 'react';
import { Bug, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function UsersError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Users error boundary caught:', {
      message: error.message,
      digest: error.digest,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
        <Bug className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Une erreur est survenue
      </h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        Impossible de charger les utilisateurs. Veuillez réessayer.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground mb-4">
          ID: <code>{error.digest}</code>
        </p>
      )}
      <Button onClick={reset} size="sm">
        <RefreshCw className="w-4 h-4" />
        Réessayer
      </Button>
    </div>
  );
}
