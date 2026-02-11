'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (command: string, targetId: string, config?: Record<string, unknown>) => void;
  }
}
import { Button } from '@/components/ui/button';
import { Bug, Home, RefreshCw } from 'lucide-react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const ErrorPage = ({ error, reset }: ErrorPageProps) => {
  const router = useRouter();
  const isDev = typeof window !== 'undefined';

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Error boundary caught:', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      timestamp: new Date().toISOString(),
    });

    // Track error in analytics if available
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: true,
      });
    }
  }, [error]);

  const handleReset = () => {
    // Attempt to recover by trying to re-render the segment
    reset();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[hsl(var(--rpma-surface))]">
      <div className="max-w-2xl w-full mx-4">
        {/* Error Card */}
        <div className="rpma-shell p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="relative mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 mb-6">
                <Bug className="w-10 h-10 text-red-500" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full animate-ping"></div>
            </div>

            <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
              Oups&thinsp;! Une erreur est survenue
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-6 leading-relaxed">
              Une erreur inattendue s&apos;est produite. Notre équipe a été notifiée et travaille à résoudre le problème.
            </p>

            {/* Error Details for Development */}
            {isDev && error.stack && (
              <div className="mt-6 p-4 bg-[hsl(var(--rpma-surface))] rounded-xl border border-[hsl(var(--rpma-border))] text-left">
                <details className="group">
                  <summary className="text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Détails techniques (développement)
                  </summary>
                  <div className="mt-3 space-y-3">
                    <pre className="text-xs text-red-500 whitespace-pre-wrap bg-white p-3 rounded-lg border border-red-500/20 overflow-auto max-h-40">
                      {error.stack}
                    </pre>
                    {error.digest && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium">ID d&apos;erreur:</span>
                        <code className="bg-white px-2 py-1 rounded border border-[hsl(var(--rpma-border))]">
                          {error.digest}
                        </code>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={handleReset} className="px-8 py-3">
              <RefreshCw className="w-5 h-5" />
              Réessayer
            </Button>

            <Button
              onClick={() => router.push('/dashboard')}
              variant="outline"
              className="px-8 py-3"
            >
              <Home className="w-5 h-5" />
              Retour au tableau de bord
            </Button>
          </div>

          {/* Support Information */}
          <div className="mt-8 pt-6 border-t border-[hsl(var(--rpma-border))]">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Si le problème persiste, contactez notre support technique
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>support@rpma-v2.com</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>+33 1 23 45 67 89</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Branding Footer */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 text-muted-foreground text-xs">
            <div className="w-6 h-6 bg-[hsl(var(--rpma-teal))]/10 rounded flex items-center justify-center">
              <span className="text-[hsl(var(--rpma-teal))] font-bold text-xs">R</span>
            </div>
            <span>RPMA V2 - Système de gestion PPF</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
