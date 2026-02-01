"use client"

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  className?: string;
}

/**
 * A fallback component for error boundaries
 */
const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
  className = '',
}) => {
  return (
    <div
      className={`p-4 rounded-lg bg-red-50 border border-red-200 ${className}`}
      role="alert"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Une erreur est survenue
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{error.message || 'Une erreur inattendue s\'est produite.'}</p>
          </div>
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={resetErrorBoundary}
              className="inline-flex items-center text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <RefreshCw className="-ml-0.5 mr-2 h-4 w-4" />
              Réessayer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;