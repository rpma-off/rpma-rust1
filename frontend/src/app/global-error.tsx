'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Home, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error caught:', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    });
  }, [error]);

  return (
    <html>
      <body className="min-h-screen flex items-center justify-center p-4 bg-[hsl(var(--rpma-surface))]">
        <div className="rpma-shell p-8 max-w-2xl w-full mx-4 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Erreur Critique du Système
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Une erreur critique s&apos;est produite. Veuillez rafraîchir la page ou contacter le support.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => reset()}
              className="flex items-center gap-2"
              variant="outline"
            >
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
               Retour à l&apos;accueil
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
