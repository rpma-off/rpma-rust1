'use client';

import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useHealthCheck } from './useHealthCheck';

interface GlobalHealthBannerProps {
  enabled?: boolean;
}

export function GlobalHealthBanner({ enabled = true }: GlobalHealthBannerProps) {
  const { hasFailed } = useHealthCheck({ enabled });

  if (!enabled || !hasFailed) {
    return null;
  }

  return (
    <div className="border-b border-destructive/20 bg-background/95 px-4 py-3">
      <Alert
        variant="destructive"
        className="mx-auto max-w-7xl"
        data-testid="global-health-banner"
      >
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Base de données indisponible</AlertTitle>
        <AlertDescription>
          La vérification système a échoué. Certaines fonctionnalités peuvent être
          temporairement indisponibles.
        </AlertDescription>
      </Alert>
    </div>
  );
}
