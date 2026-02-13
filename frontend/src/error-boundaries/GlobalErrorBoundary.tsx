'use client';

import React from 'react';
import { BaseErrorBoundary } from './BaseErrorBoundary';
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { JsonRecord, JsonValue as _JsonValue } from '@/types/utility.types';
import { safeGet, normalizeError, tryToJsonValue } from '@/types/type-utils';
import { logger } from '@/lib/logging';
import { LogDomain } from '@/lib/logging/types';

// Type definition for Performance API with memory info
interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

interface GlobalErrorBoundaryProps {
  children: React.ReactNode;
  className?: string;
}

interface GlobalErrorFallbackProps {
  error: Error;
  onRetry: () => void;
  onReportError: () => void;
}

// Default fallback component for global errors
const DefaultGlobalErrorFallback: React.FC<GlobalErrorFallbackProps> = ({
  error,
  onRetry
}) => {
  const getGlobalErrorMessage = (error: Error): { title: string; description: string; isRecoverable: boolean } => {
    const message = error.message.toLowerCase();

    if (message.includes('chunkloaderror') || message.includes('loading chunk')) {
      return {
        title: 'Mise à jour de l\'application requise',
        description: 'Une nouvelle version de l\'application est disponible. Veuillez recharger la page pour obtenir les dernières mises à jour.',
        isRecoverable: true
      };
    }

    if (message.includes('script error') || message.includes('unexpected token')) {
      return {
        title: 'Erreur de chargement de l\'application',
        description: 'Un problème est survenu lors du chargement de l\'application. Cela peut être dû à un problème de réseau ou à des fichiers corrompus.',
        isRecoverable: true
      };
    }

    if (message.includes('out of memory') || message.includes('maximum call stack')) {
      return {
        title: 'Erreur de performance de l\'application',
        description: 'L\'application a rencontré un problème de mémoire. Veuillez recharger la page pour continuer.',
        isRecoverable: true
      };
    }

    if (message.includes('network') || message.includes('fetch')) {
      return {
        title: 'Erreur de connexion',
        description: 'Impossible de se connecter aux serveurs RPMA. Veuillez vérifier votre connexion internet et réessayer.',
        isRecoverable: true
      };
    }

    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return {
        title: 'Erreur d\'authentification',
        description: 'Votre session a expiré ou vous n\'avez pas la permission d\'accéder à cette application. Veuillez vous reconnecter.',
        isRecoverable: false
      };
    }

    if (message.includes('cors')) {
      return {
        title: 'Erreur de configuration',
        description: 'Il y a un problème de configuration avec l\'application. Veuillez contacter le support.',
        isRecoverable: false
      };
    }

    return {
      title: 'Erreur de l\'application',
      description: 'Une erreur inattendue s\'est produite. L\'application peut ne pas fonctionner correctement jusqu\'à ce qu\'elle soit rechargée.',
      isRecoverable: true
    };
  };

  const { title, description, isRecoverable } = getGlobalErrorMessage(error);

  const handleReloadApplication = () => {
    // Force a full page reload to clear all application state
    window.location.reload();
  };

  const handleGoToLogin = () => {
    // Clear any stored authentication and redirect to login
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/auth/login';
    }
  };

  const handleContactSupport = () => {
    // Generate support email with error details
    const errorDetails = encodeURIComponent(`
Error: ${error.message}
Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
Stack: ${error.stack}
    `.trim());

    const mailtoLink = `mailto:support@rpma.com?subject=Application Error Report&body=${errorDetails}`;
    window.location.href = mailtoLink;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="p-3 rounded-full bg-red-100">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl text-red-600">
                {title}
              </CardTitle>
              <p className="text-gray-600 mt-2">
                {description}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
           {/* Error Context */}
           <div className="bg-red-50 border border-red-200 rounded-md p-4">
             <h4 className="text-sm font-medium text-red-800 mb-2">Informations sur l'erreur</h4>
             <div className="text-sm text-red-700 space-y-1">
               <p><strong>Message :</strong> {error.message}</p>
               <p><strong>Heure :</strong> {new Date().toLocaleString()}</p>
               <p><strong>Emplacement :</strong> {window.location.pathname}</p>
             </div>
           </div>

           {/* Recovery Actions */}
           <div className="space-y-4">
             <div className="grid gap-3">
               {isRecoverable ? (
                 <>
                   <Button
                     onClick={handleReloadApplication}
                     className="w-full flex items-center justify-center space-x-2"
                     size="lg"
                   >
                     <RefreshCw className="h-5 w-5" />
                     <span>Recharger l'application</span>
                   </Button>

                   <Button
                     variant="outline"
                     onClick={onRetry}
                     className="w-full flex items-center justify-center space-x-2"
                   >
                     <RefreshCw className="h-4 w-4" />
                     <span>Réessayer</span>
                   </Button>
                 </>
               ) : (
                 <>
                   <Button
                     onClick={handleGoToLogin}
                     className="w-full flex items-center justify-center space-x-2"
                     size="lg"
                   >
                     <Home className="h-5 w-5" />
                     <span>Aller à la connexion</span>
                   </Button>

                   <Button
                     variant="outline"
                     onClick={handleReloadApplication}
                     className="w-full flex items-center justify-center space-x-2"
                   >
                     <RefreshCw className="h-4 w-4" />
                     <span>Recharger l'application</span>
                   </Button>
                 </>
               )}

               <Button
                 variant="ghost"
                 onClick={handleContactSupport}
                 className="w-full flex items-center justify-center space-x-2"
               >
                 <Mail className="h-4 w-4" />
                 <span>Contacter le support</span>
               </Button>
             </div>
           </div>

           {/* User Guidance */}
           <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
             <h4 className="text-sm font-medium text-blue-800 mb-2">Ce que vous pouvez faire :</h4>
             <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
               <li>Essayez de recharger la page - cela résout la plupart des problèmes</li>
               <li>Vérifiez votre connexion internet</li>
               <li>Videz le cache et les cookies de votre navigateur</li>
               <li>Essayez d'utiliser un autre navigateur ou le mode incognito</li>
               <li>Contactez le support si le problème persiste</li>
             </ul>
           </div>

           {/* Application Info */}
           <div className="text-center text-xs text-gray-500 space-y-1">
             <p>RPMA v2 - Système de gestion des tâches PPF</p>
             <p>Si cette erreur persiste, veuillez la signaler à votre administrateur système</p>
           </div>
         </CardContent>
      </Card>
    </div>
  );
};

export const GlobalErrorBoundary: React.FC<GlobalErrorBoundaryProps> = ({
  children,
  className
}) => {
  const handleGlobalError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log global error with extensive context using the new logging system
    logger.fatal(LogDomain.SYSTEM, 'Global application error', error, {
      component_stack: errorInfo.componentStack,
      url: window.location.href,
      user_agent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      memory: (() => {
        const perfWithMemory = performance as PerformanceWithMemory;
        if (perfWithMemory.memory) {
          return {
            used: perfWithMemory.memory.usedJSHeapSize,
            total: perfWithMemory.memory.totalJSHeapSize,
            limit: perfWithMemory.memory.jsHeapSizeLimit
          };
        }
        return null;
      })(),
      session_info: {
        session_storage_keys: Object.keys(sessionStorage),
        local_storage_keys: Object.keys(localStorage),
        cookies_count: document.cookie.split(';').length
      }
    });

    // Report to monitoring service with critical priority
    if (typeof window !== 'undefined') {
      try {
        const errorReport: JsonRecord = {
          type: 'global_error',
          level: 'critical',
          message: error.message,
          stack: error.stack || '',
          componentStack: errorInfo.componentStack ?? null,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          sessionInfo: {
            sessionStorage: Object.keys(sessionStorage),
            localStorage: Object.keys(localStorage),
            cookies: document.cookie.split(';').map(c => c.split('=')[0].trim())
          },
          performance: {
            memory: tryToJsonValue(safeGet(performance as unknown as Record<string, unknown>, 'memory')) ?? null,
            timing: tryToJsonValue(safeGet(performance as unknown as Record<string, unknown>, 'timing')) ?? null,
            navigation: tryToJsonValue(safeGet(performance as unknown as Record<string, unknown>, 'navigation')) ?? null
          }
        };

        // The logger already handles local storage, so we don't need to duplicate
        logger.debug(LogDomain.SYSTEM, 'Error report details', { error_report: errorReport });

        // TODO: Send to monitoring service with high priority
        // This should trigger alerts for the development team
      } catch (reportingError: unknown) {
        console.error('Failed to report global error:', normalizeError(reportingError));
      }
    }
  };

  const handleRetry = () => {
    // For global errors, a retry means reloading the entire application
    window.location.reload();
  };

  const handleReportError = () => {
    // Open error reporting interface or email
    const errorDetails: JsonRecord = {
      message: 'Global application error',
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    console.log('User initiated error report:', errorDetails);

    // TODO: Open error reporting modal or redirect to support
  };

  return (
    <BaseErrorBoundary
      onError={(error, errorInfo) => {
        handleGlobalError(error, errorInfo);
        // Re-throw to show our custom global fallback
        throw error;
      }}
      className={className}
    >
      <GlobalErrorWrapper
        onRetry={handleRetry}
        onReportError={handleReportError}
      >
        {children}
      </GlobalErrorWrapper>
    </BaseErrorBoundary>
  );
};

// Wrapper component to catch errors and show global fallback
class GlobalErrorWrapper extends React.Component<{
  children: React.ReactNode;
  onRetry: () => void;
  onReportError: () => void;
}, { hasError: boolean; error?: Error }> {
  constructor(props: { children: React.ReactNode; onRetry: () => void; onReportError: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Global wrapper caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <DefaultGlobalErrorFallback
          error={this.state.error}
          onRetry={this.props.onRetry}
          onReportError={this.props.onReportError}
        />
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;