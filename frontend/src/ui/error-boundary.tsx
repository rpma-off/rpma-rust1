'use client';

import React, { Component, ErrorInfo } from 'react';
import { AlertCircle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from './button';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorBoundaryFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export interface ErrorBoundaryFallbackProps {
  error: Error;
  resetError: () => void;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Error info:', errorInfo);
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error!}
          resetError={this.resetError}
          errorInfo={this.state.errorInfo || undefined}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component
 */
function DefaultErrorFallback({ error, resetError, errorInfo }: ErrorBoundaryFallbackProps) {
  const isNetworkError = error.message.includes('Failed to fetch') ||
                         error.message.includes('NetworkError') ||
                         error.message.includes('fetch');

  const isAuthError = error.message.includes('auth') ||
                      error.message.includes('unauthorized') ||
                      error.message.includes('401');

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-red-100 p-3">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <h1 className="text-xl font-semibold text-foreground mb-2">
          {isNetworkError ? 'Problème de connexion' :
           isAuthError ? 'Session expirée' :
           'Une erreur est survenue'}
        </h1>

        <p className="text-muted-foreground mb-6">
          {isNetworkError
            ? 'Vérifiez votre connexion internet et réessayez.'
            : isAuthError
            ? 'Votre session a expiré. Veuillez vous reconnecter.'
            : 'L\'application a rencontré une erreur inattendue.'
          }
        </p>

        <div className="space-y-3">
          <Button
            onClick={resetError}
            className="w-full flex items-center justify-center gap-2"
            variant="default"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </Button>

          <Button
            onClick={() => window.location.href = '/dashboard'}
            className="w-full flex items-center justify-center gap-2"
            variant="outline"
          >
            <Home className="w-4 h-4" />
            Retour au tableau de bord
          </Button>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 p-3 bg-muted/30 rounded text-left">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Bug className="w-4 h-4" />
                Détails techniques
              </summary>
              <div className="mt-2 text-xs text-muted-foreground">
                <div className="font-medium mb-1">Error:</div>
                <pre className="whitespace-pre-wrap break-words">{error.message}</pre>
                {error.stack && (
                  <>
                    <div className="font-medium mt-2 mb-1">Stack Trace:</div>
                    <pre className="whitespace-pre-wrap break-words text-xs">{error.stack}</pre>
                  </>
                )}
                {errorInfo && (
                  <>
                    <div className="font-medium mt-2 mb-1">Component Stack:</div>
                    <pre className="whitespace-pre-wrap break-words text-xs">{errorInfo.componentStack}</pre>
                  </>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Simple error alert component for inline errors
 */
export function ErrorAlert({
  error,
  onRetry,
  className = ''
}: {
  error: string | Error;
  onRetry?: () => void;
  className?: string;
}) {
  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <div className="text-sm font-medium text-red-800">
            Erreur
          </div>
          <div className="text-sm text-red-700 mt-1">
            {errorMessage}
          </div>
          {onRetry && (
            <div className="mt-3">
              <Button
                onClick={onRetry}
                size="sm"
                variant="outline"
                className="text-red-800 border-red-300 hover:bg-red-50"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Réessayer
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}