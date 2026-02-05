import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKey?: string | number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

class PoseDetailErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('PoseDetail Error Boundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // You can integrate with services like Sentry, LogRocket, etc.
      this.logErrorToService(error, errorInfo);
    }
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    try {
      // Example: Send to your error logging service
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        component: 'PoseDetail',
      };

      // You can send this to your API endpoint
      // fetch('/api/error-log', { method: 'POST', body: JSON.stringify(errorData) });
      
      console.error('Error logged to service:', errorData);
    } catch (logError) {
      console.error('Failed to log error to service:', logError);
    }
  };

  private handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleGoBack = () => {
    window.history.back();
  };

  private renderErrorDetails = () => {
    const { error, errorInfo } = this.state;
    
    if (process.env.NODE_ENV !== 'development') {
      return null;
    }

    return (
      <details className="mt-4 p-4 bg-gray-50 rounded-lg border">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground mb-2">
          Error Details (Development Only)
        </summary>
        <div className="space-y-2 text-xs font-mono">
          <div>
            <strong>Error:</strong> {error?.toString()}
          </div>
          <div>
            <strong>Component Stack:</strong>
            <pre className="mt-1 p-2 bg-gray-100 rounded overflow-auto max-h-32">
              {errorInfo?.componentStack}
            </pre>
          </div>
          <div>
            <strong>Stack Trace:</strong>
            <pre className="mt-1 p-2 bg-gray-100 rounded overflow-auto max-h-32">
              {error?.stack}
            </pre>
          </div>
        </div>
      </details>
    );
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            {/* Error Icon */}
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            {/* Error Message */}
            <h1 className="text-xl font-semibold text-foreground mb-2">
              Oops! Something went wrong
            </h1>
            <p className="text-gray-600 mb-6">
              We encountered an unexpected error while loading the task details. 
              Don&apos;t worry, your data is safe.
            </p>

            {/* Error Code */}
            <div className="mb-6 p-3 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">
                Error Code: <span className="font-mono text-gray-800">
                  {this.state.error?.name || 'UNKNOWN_ERROR'}
                </span>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-2",
                  "bg-blue-600 text-white rounded-lg hover:bg-blue-700",
                  "transition-colors duration-200 font-medium"
                )}
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
 
              <button
                onClick={this.handleGoBack}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-2",
                  "bg-[hsl(var(--rpma-surface))] text-muted-foreground rounded-lg hover:bg-[hsl(var(--rpma-surface))]",
                  "transition-colors duration-200 font-medium"
                )}
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>

              <button
                onClick={this.handleGoHome}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-2",
                  "bg-gray-100 text-gray-600 rounded-lg hover:bg-[hsl(var(--rpma-surface))]",
                  "transition-colors duration-200 font-medium"
                )}
              >
                <Home className="w-4 h-4" />
                Go to Dashboard
              </button>
            </div>

            {/* Retry Counter */}
            {this.state.retryCount > 0 && (
              <div className="mt-4 text-sm text-border">
                Retry attempts: {this.state.retryCount}
              </div>
            )}

            {/* Development Error Details */}
            {this.renderErrorDetails()}

            {/* Support Information */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-border">
                If this problem persists, please contact support with the error code above.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PoseDetailErrorBoundary;
