'use client';

import React, { Component, ErrorInfo } from 'react';
import { AlertCircle, RefreshCw, Home, Bug, Wifi, WifiOff, Shield, Zap, ChevronDown } from 'lucide-react';
import { Button } from './button';
import { motion } from 'framer-motion';

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
                         error.message.includes('fetch') ||
                         error.message.includes('network');

  const isAuthError = error.message.includes('auth') ||
                      error.message.includes('unauthorized') ||
                      error.message.includes('401') ||
                      error.message.includes('403');

  const isValidationError = error.message.includes('validation') ||
                           error.message.includes('invalid') ||
                           error.message.includes('required');

  const getErrorConfig = () => {
    if (isNetworkError) {
      return {
        icon: WifiOff,
        title: 'Problème de connexion',
        description: 'Vérifiez votre connexion internet et réessayez.',
        bgColor: 'from-blue-500/10 to-blue-600/10',
        borderColor: 'border-blue-500/20',
        iconBg: 'bg-blue-500/20',
        iconColor: 'text-blue-600'
      };
    }
    if (isAuthError) {
      return {
        icon: Shield,
        title: 'Accès non autorisé',
        description: 'Votre session a expiré ou vous n\'avez pas les permissions nécessaires.',
        bgColor: 'from-amber-500/10 to-amber-600/10',
        borderColor: 'border-amber-500/20',
        iconBg: 'bg-amber-500/20',
        iconColor: 'text-amber-600'
      };
    }
    if (isValidationError) {
      return {
        icon: AlertCircle,
        title: 'Erreur de validation',
        description: 'Les données saisies ne sont pas valides. Vérifiez vos informations.',
        bgColor: 'from-orange-500/10 to-orange-600/10',
        borderColor: 'border-orange-500/20',
        iconBg: 'bg-orange-500/20',
        iconColor: 'text-orange-600'
      };
    }
    return {
      icon: Zap,
      title: 'Erreur inattendue',
      description: 'L\'application a rencontré une erreur inattendue. Nos équipes ont été notifiées.',
      bgColor: 'from-red-500/10 to-red-600/10',
      borderColor: 'border-red-500/20',
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-600'
    };
  };

  const config = getErrorConfig();
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <div className="max-w-lg w-full">
        <div className={`bg-gradient-to-br ${config.bgColor} border ${config.borderColor} rounded-2xl shadow-2xl backdrop-blur-sm p-8 text-center`}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4, type: "spring", stiffness: 200 }}
            className="flex justify-center mb-6"
          >
            <div className={`rounded-full ${config.iconBg} p-4 shadow-lg`}>
              <Icon className={`w-10 h-10 ${config.iconColor}`} />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="text-2xl font-bold text-foreground mb-3"
          >
            {config.title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="text-muted-foreground mb-8 leading-relaxed"
          >
            {config.description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="space-y-4"
          >
            <Button
              onClick={resetError}
              className="w-full flex items-center justify-center gap-2 bg-[hsl(var(--rpma-teal))] hover:bg-[hsl(var(--rpma-teal))]/90 text-white font-semibold shadow-lg hover:shadow-accent/25 transition-all duration-200 hover:scale-105"
              size="lg"
            >
              <RefreshCw className="w-5 h-5" />
              Réessayer
            </Button>

            <Button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full flex items-center justify-center gap-2 border-[hsl(var(--rpma-border))] text-muted-foreground hover:bg-border/20 hover:text-foreground transition-all duration-200 hover:scale-105"
              variant="outline"
              size="lg"
            >
              <Home className="w-5 h-5" />
              Retour au tableau de bord
            </Button>
          </motion.div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-8 p-4 bg-[hsl(var(--rpma-surface))] border border-[hsl(var(--rpma-border))] rounded-xl backdrop-blur-sm">
              <summary className="cursor-pointer text-sm font-semibold text-muted-foreground flex items-center gap-2 hover:text-foreground transition-colors">
                <Bug className="w-4 h-4" />
                Détails techniques (développement)
                <div className="ml-auto">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </summary>
              <div className="mt-4 space-y-3">
                <div>
                  <div className="font-semibold text-foreground mb-2">Erreur:</div>
                  <pre className="whitespace-pre-wrap break-words text-xs bg-background/50 p-3 rounded-lg border border-[hsl(var(--rpma-border))] text-muted-foreground">{error.message}</pre>
                </div>
                {error.stack && (
                  <div>
                    <div className="font-semibold text-foreground mb-2">Stack Trace:</div>
                    <pre className="whitespace-pre-wrap break-words text-xs bg-background/50 p-3 rounded-lg border border-[hsl(var(--rpma-border))] text-muted-foreground max-h-40 overflow-y-auto">{error.stack}</pre>
                  </div>
                )}
                {errorInfo && (
                  <div>
                    <div className="font-semibold text-foreground mb-2">Component Stack:</div>
                    <pre className="whitespace-pre-wrap break-words text-xs bg-background/50 p-3 rounded-lg border border-[hsl(var(--rpma-border))] text-muted-foreground max-h-40 overflow-y-auto">{errorInfo.componentStack}</pre>
                  </div>
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
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className={`bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/20 rounded-xl p-4 backdrop-blur-sm ${className}`}
    >
      <div className="flex items-start gap-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="flex-shrink-0"
        >
          <div className="p-2 bg-red-500/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
        </motion.div>
        <div className="flex-1">
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm font-semibold text-red-400 mb-1"
          >
            Erreur
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-red-300 leading-relaxed"
          >
            {errorMessage}
          </motion.div>
          {onRetry && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-4"
            >
              <Button
                onClick={onRetry}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 transition-all duration-200 hover:scale-105"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
