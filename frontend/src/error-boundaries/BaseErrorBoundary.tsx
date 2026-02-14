'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  showDetails: boolean;
}

interface BaseErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  showRetry?: boolean;
  showHome?: boolean;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  className?: string;
}

export class BaseErrorBoundary extends Component<BaseErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: number | null = null;

  constructor(props: BaseErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (handlerError) {
        console.error('Error in custom error handler:', handlerError);
      }
    }

    // Log error to console
    console.error('Error caught by boundary:', {
      error,
      errorInfo,
      componentStack: errorInfo.componentStack,
      props: this.props
    });

    // Report error to monitoring service
    this.reportError(error, errorInfo);
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      window.clearTimeout(this.retryTimeoutId);
    }
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      // In a real app, you would send this to your error monitoring service
      // For now, we'll just create a structured error report
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: 'unknown', // Would come from auth context
      };

      // TODO: Send to monitoring service (Sentry, LogRocket, etc.)
      console.warn('Error reported:', errorReport);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private handleRetry = () => {
    // Add a small delay to prevent immediate re-error
    this.retryTimeoutId = window.setTimeout(() => {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        showDetails: false
      });
    }, 100);
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  private toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
  };

  private getErrorMessage = (): string => {
    const { error } = this.state;
    if (!error) return 'Une erreur inattendue s\'est produite';

    if (error.message.includes('ChunkLoadError')) {
      return 'Échec du chargement des ressources de l\'application. Cela peut être dû à un problème de réseau.';
    }
    if (error.message.includes('Network Error')) {
      return 'Erreur de connexion réseau. Veuillez vérifier votre connexion internet.';
    }
    if (error.message.includes('fetch')) {
      return 'Échec du chargement des données. Veuillez vérifier votre connexion et réessayer.';
    }

    return error.message || 'Une erreur inattendue s\'est produite';
  };

  render() {
    if (this.state.hasError) {
      const {
        fallbackTitle = 'Une erreur s\'est produite',
        fallbackDescription = 'Une erreur inattendue s\'est produite. Veuillez essayer de rafraîchir la page.',
        showRetry = true,
        showHome = true,
        className = ''
      } = this.props;

      const { error, errorInfo, showDetails } = this.state;
      const errorMessage = this.getErrorMessage();

      return (
        <div className={`min-h-[400px] flex items-center justify-center p-4 ${className}`}>
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl text-red-600">
                    {fallbackTitle}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {fallbackDescription}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
               {/* Error Message */}
               <div className="bg-red-50 border border-red-200 rounded-md p-4">
                 <h4 className="text-sm font-medium text-red-800 mb-2">Détails de l&apos;erreur</h4>
                 <p className="text-sm text-red-700">{errorMessage}</p>
               </div>

               {/* Action Buttons */}
               <div className="flex flex-wrap gap-3">
                 {showRetry && (
                   <Button onClick={this.handleRetry} className="flex items-center space-x-2">
                     <RefreshCw className="h-4 w-4" />
                     <span>Réessayer</span>
                   </Button>
                 )}

                 {showHome && (
                   <Button variant="outline" onClick={this.handleGoHome} className="flex items-center space-x-2">
                     <Home className="h-4 w-4" />
                     <span>Aller au tableau de bord</span>
                   </Button>
                 )}

                 <Button
                   variant="ghost"
                   onClick={() => window.location.reload()}
                   className="flex items-center space-x-2"
                 >
                   <RefreshCw className="h-4 w-4" />
                   <span>Recharger la page</span>
                 </Button>
               </div>

               {/* Technical Details Toggle */}
               {process.env.NODE_ENV === 'development' && (error || errorInfo) && (
                 <div className="border-t pt-4">
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={this.toggleDetails}
                     className="flex items-center space-x-2 text-gray-600"
                   >
                     {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                     <span>{showDetails ? 'Masquer' : 'Afficher'} les détails techniques</span>
                   </Button>

                   {showDetails && (
                     <div className="mt-3 space-y-3">
                       {error && (
                         <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                           <h5 className="text-xs font-medium text-gray-700 mb-1">Pile d&apos;erreur</h5>
                           <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-32">
                             {error.stack}
                           </pre>
                         </div>
                       )}

                       {errorInfo && (
                         <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                           <h5 className="text-xs font-medium text-gray-700 mb-1">Pile du composant</h5>
                           <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-32">
                             {errorInfo.componentStack}
                           </pre>
                         </div>
                       )}
                     </div>
                   )}
                 </div>
               )}

               {/* User Guidance */}
               <div className="text-xs text-gray-500">
                 <p>Si ce problème persiste, veuillez :</p>
                 <ul className="list-disc list-inside mt-1 space-y-1">
                   <li>Vider le cache et les cookies de votre navigateur</li>
                   <li>Vérifier votre connexion internet</li>
                   <li>Contacter le support si le problème continue</li>
                 </ul>
               </div>
             </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default BaseErrorBoundary;