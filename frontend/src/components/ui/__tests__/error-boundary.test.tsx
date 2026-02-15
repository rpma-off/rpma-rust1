import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary, ErrorAlert, ErrorBoundaryFallbackProps } from '../error-boundary';

// Mock framer-motion to avoid animation-related issues
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <p {...props}>{children}</p>,
  },
}));

// Mock window.location.href
const mockLocation = { href: '' };
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Test components
const ThrowErrorComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

const CustomFallbackComponent: React.FC<ErrorBoundaryFallbackProps> = ({ error, resetError }) => (
  <div data-testid="custom-fallback">
    <p data-testid="custom-error">{error.message}</p>
    <button onClick={resetError} data-testid="custom-reset">
      Custom Reset
    </button>
  </div>
);

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockLocation.href = '';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Error Catching', () => {
    it('catches and displays default error fallback when child component throws', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Erreur inattendue')).toBeInTheDocument();
      expect(screen.getByText("L'application a rencontré une erreur inattendue. Nos équipes ont été notifiées.")).toBeInTheDocument();
      expect(screen.getByText('Réessayer')).toBeInTheDocument();
      expect(screen.getByText('Retour au tableau de bord')).toBeInTheDocument();
    });

    it('displays custom fallback when provided', () => {
      render(
        <ErrorBoundary fallback={CustomFallbackComponent}>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('custom-error')).toHaveTextContent('Test error');
      expect(screen.getByTestId('custom-reset')).toBeInTheDocument();
    });

    it('renders children normally when no error is thrown', () => {
      render(
        <ErrorBoundary>
          <div data-testid="normal-child">Normal content</div>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('normal-child')).toBeInTheDocument();
      expect(screen.queryByText('Erreur inattendue')).not.toBeInTheDocument();
    });
  });

  describe('Error State Management', () => {
    it('resets error state when reset button is clicked', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Erreur inattendue')).toBeInTheDocument();

      // Click reset button
      fireEvent.click(screen.getByText('Réessayer'));

      // Rerender with non-throwing component
      rerender(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(screen.queryByText('Erreur inattendue')).not.toBeInTheDocument();
    });

    it('navigates to dashboard when home button is clicked', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('Retour au tableau de bord'));
      expect(mockLocation.href).toBe('/dashboard');
    });
  });

  describe('Error Classification', () => {
    it('displays network error UI for network-related errors', () => {
      const NetworkErrorComponent = () => {
        throw new Error('Failed to fetch');
      };

      render(
        <ErrorBoundary>
          <NetworkErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Problème de connexion')).toBeInTheDocument();
      expect(screen.getByText('Vérifiez votre connexion internet et réessayez.')).toBeInTheDocument();
    });

    it('displays auth error UI for authentication errors', () => {
      const AuthErrorComponent = () => {
        throw new Error('unauthorized access');
      };

      render(
        <ErrorBoundary>
          <AuthErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Accès non autorisé')).toBeInTheDocument();
      expect(screen.getByText("Votre session a expiré ou vous n'avez pas les permissions nécessaires.")).toBeInTheDocument();
    });

    it('displays validation error UI for validation errors', () => {
      const ValidationErrorComponent = () => {
        throw new Error('validation failed');
      };

      render(
        <ErrorBoundary>
          <ValidationErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Erreur de validation')).toBeInTheDocument();
      expect(screen.getByText('Les données saisies ne sont pas valides. Vérifiez vos informations.')).toBeInTheDocument();
    });

    it('displays default error UI for unknown errors', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Erreur inattendue')).toBeInTheDocument();
      expect(screen.getByText("L'application a rencontré une erreur inattendue. Nos équipes ont été notifiées.")).toBeInTheDocument();
    });
  });

  describe('Error Handling Callbacks', () => {
    it('calls onError callback when error occurs', () => {
      const onError = jest.fn();
      const error = new Error('Test error');
      const ErrorComponent = () => {
        throw error;
      };

      render(
        <ErrorBoundary onError={onError}>
          <ErrorComponent />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(error, expect.any(Object));
    });

    it('logs error to console in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(console.error).toHaveBeenCalledWith('ErrorBoundary caught an error:', expect.any(Error));
      expect(console.error).toHaveBeenCalledWith('Error info:', expect.any(Object));

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Development Mode Features', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('shows technical details in development mode', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Détails techniques (développement)')).toBeInTheDocument();
    });

    it('displays error message in technical details', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('shows stack trace when available', () => {
      const ErrorWithStack = () => {
        const error = new Error('Test error');
        error.stack = 'Error: Test error\n    at component';
        throw error;
      };

      render(
        <ErrorBoundary>
          <ErrorWithStack />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Stack Trace/)).toBeInTheDocument();
    });

    it('can expand and collapse technical details', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      const details = screen.getByText('Détails techniques (développement)');
      
      // Initially collapsed
      expect(screen.queryByText('Test error')).not.toBeVisible();
      
      // Click to expand
      fireEvent.click(details);
      
      // Should show error message
      expect(screen.getByText('Test error')).toBeVisible();
    });
  });

  describe('Production Mode', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('hides technical details in production mode', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Détails techniques (développement)')).not.toBeInTheDocument();
    });
  });

  describe('Error Component Nesting', () => {
    it('handles errors in nested components', () => {
      const NestedErrorComponent = () => {
        return (
          <div>
            <div>Level 1</div>
            <div>
              <div>Level 2</div>
              <ThrowErrorComponent />
            </div>
          </div>
        );
      };

      render(
        <ErrorBoundary>
          <NestedErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Erreur inattendue')).toBeInTheDocument();
    });

    it('parent boundary catches error when child boundary is not present', () => {
      render(
        <ErrorBoundary>
          <div>
            <ThrowErrorComponent />
          </div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Erreur inattendue')).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('recovers from error when component becomes stable', async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Erreur inattendue')).toBeInTheDocument();

      // Reset and render with stable component
      fireEvent.click(screen.getByText('Réessayer'));
      
      rerender(
        <ErrorBoundary>
          <div data-testid="recovered">Recovered component</div>
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('recovered')).toBeInTheDocument();
      });
    });

    it('handles consecutive errors', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Erreur inattendue')).toBeInTheDocument();

      // Reset
      fireEvent.click(screen.getByText('Réessayer'));

      // Trigger another error
      rerender(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Erreur inattendue')).toBeInTheDocument();
    });
  });
});

describe('ErrorAlert', () => {
  it('renders error alert with string error', () => {
    render(<ErrorAlert error="String error message" />);
    
    expect(screen.getByText('Erreur')).toBeInTheDocument();
    expect(screen.getByText('String error message')).toBeInTheDocument();
  });

  it('renders error alert with Error object', () => {
    const error = new Error('Error object message');
    render(<ErrorAlert error={error} />);
    
    expect(screen.getByText('Erreur')).toBeInTheDocument();
    expect(screen.getByText('Error object message')).toBeInTheDocument();
  });

  it('displays retry button when onRetry is provided', () => {
    const onRetry = jest.fn();
    render(<ErrorAlert error="Test error" onRetry={onRetry} />);
    
    const retryButton = screen.getByText('Réessayer');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(<ErrorAlert error="Test error" className="custom-class" />);
    
    const alertElement = screen.getByText('Test error').closest('div');
    expect(alertElement).toHaveClass('custom-class');
  });

  it('handles null error gracefully', () => {
    render(<ErrorAlert error={null as unknown as Error} />);
    
    expect(screen.getByText('Erreur')).toBeInTheDocument();
  });

  it('handles undefined error gracefully', () => {
    render(<ErrorAlert error={undefined as unknown as Error} />);
    
    expect(screen.getByText('Erreur')).toBeInTheDocument();
  });
});