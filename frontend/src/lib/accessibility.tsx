import React, { useEffect, useRef } from 'react';

// Accessibility utilities and hooks
export function useA11y() {
  return {
    // Skip link functionality
    skipToContent: (targetId: string) => {
      const element = document.getElementById(targetId);
      if (element) {
        element.focus();
        element.scrollIntoView({ behavior: 'smooth' });
      }
    },

    // Announce content changes to screen readers
    announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', priority);
      announcement.setAttribute('aria-atomic', 'true');
      announcement.style.position = 'absolute';
      announcement.style.left = '-10000px';
      announcement.style.width = '1px';
      announcement.style.height = '1px';
      announcement.style.overflow = 'hidden';

      document.body.appendChild(announcement);
      announcement.textContent = message;

      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    },

    // Focus trap for modals and dialogs
    useFocusTrap: (isActive: boolean) => {
      const containerRef = useRef<HTMLElement>(null);

      useEffect(() => {
        if (!isActive || !containerRef.current) return;

        const focusableElements = containerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Tab') {
            if (e.shiftKey) {
              if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
              }
            } else {
              if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
              }
            }
          }

          if (e.key === 'Escape') {
            // Could emit an event to close the modal
            console.log('Escape pressed in focus trap');
          }
        };

        document.addEventListener('keydown', handleKeyDown);
        firstElement?.focus();

        return () => {
          document.removeEventListener('keydown', handleKeyDown);
        };
      }, [isActive]);

      return containerRef;
    },

    // Keyboard navigation helpers
    keyboardNavigation: {
      handleArrowKeys: (
        event: React.KeyboardEvent,
        items: any[],
        currentIndex: number,
        onSelect: (index: number) => void
      ) => {
        let newIndex = currentIndex;

        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault();
            newIndex = Math.min(currentIndex + 1, items.length - 1);
            break;
          case 'ArrowUp':
            event.preventDefault();
            newIndex = Math.max(currentIndex - 1, 0);
            break;
          case 'Home':
            event.preventDefault();
            newIndex = 0;
            break;
          case 'End':
            event.preventDefault();
            newIndex = items.length - 1;
            break;
          case 'Enter':
          case ' ':
            event.preventDefault();
            onSelect(currentIndex);
            return;
        }

        if (newIndex !== currentIndex) {
          onSelect(newIndex);
        }
      },

      handleSearchKeys: (event: React.KeyboardEvent, onSearch: (query: string) => void) => {
        if (event.key === '/' && !event.metaKey && !event.ctrlKey) {
          event.preventDefault();
          // Focus search input
          const searchInput = document.querySelector('input[placeholder*="search" i], input[placeholder*="rechercher" i]') as HTMLInputElement;
          searchInput?.focus();
        }

        if (event.key === 'Escape') {
          // Clear search or close modal
          const activeElement = document.activeElement as HTMLElement;
          if (activeElement?.tagName === 'INPUT') {
            (activeElement as HTMLInputElement).value = '';
            onSearch('');
          }
        }
      }
    }
  };
}

// Accessible form components
interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const AccessibleInput: React.FC<AccessibleInputProps> = ({
  label,
  error,
  hint,
  required,
  id,
  className = '',
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <div className={`space-y-2 ${className}`}>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-foreground"
      >
        {label}
        {required && (
          <span className="text-red-400 ml-1" aria-label="requis">
            *
          </span>
        )}
      </label>

      <input
        id={inputId}
        className={`w-full px-3 py-2 bg-border/10 border rounded-lg text-foreground placeholder-border-light transition-all duration-200 ${
          error
            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
            : 'border-border/30 focus:border-accent focus:ring-accent/20'
        } focus:outline-none focus:ring-2`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        aria-required={required}
        {...props}
      />

      {hint && !error && (
        <p id={hintId} className="text-sm text-border-light">
          {hint}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          className="text-sm text-red-400"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
};

// Accessible dropdown/select
interface AccessibleSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const AccessibleSelect: React.FC<AccessibleSelectProps> = ({
  label,
  options,
  error,
  hint,
  required,
  id,
  className = '',
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${selectId}-error` : undefined;
  const hintId = hint ? `${selectId}-hint` : undefined;

  return (
    <div className={`space-y-2 ${className}`}>
      <label
        htmlFor={selectId}
        className="block text-sm font-medium text-foreground"
      >
        {label}
        {required && (
          <span className="text-red-400 ml-1" aria-label="requis">
            *
          </span>
        )}
      </label>

      <select
        id={selectId}
        className={`w-full px-3 py-2 bg-border/10 border rounded-lg text-foreground transition-all duration-200 ${
          error
            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
            : 'border-border/30 focus:border-accent focus:ring-accent/20'
        } focus:outline-none focus:ring-2`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        aria-required={required}
        {...props}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

      {hint && !error && (
        <p id={hintId} className="text-sm text-border-light">
          {hint}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          className="text-sm text-red-400"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
};

// Accessible button with loading state
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  children,
  loading = false,
  loadingText = 'Chargement...',
  variant = 'primary',
  disabled,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-accent text-black hover:bg-accent/90 focus:ring-accent border-accent',
    secondary: 'bg-border/20 text-foreground hover:bg-border/30 focus:ring-border border-border/30',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border-red-600'
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span aria-live="polite">{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

// Skip link component
export const SkipLink: React.FC<{ href: string; children: React.ReactNode }> = ({
  href,
  children
}) => (
  <a
    href={href}
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-accent text-black px-4 py-2 rounded-md font-medium z-50 transition-all duration-200 hover:bg-accent/90"
  >
    {children}
  </a>
);



// Screen reader only text
export const ScreenReaderOnly: React.FC<{ children: React.ReactNode }> = ({
  children
}) => (
  <span className="sr-only">{children}</span>
);

// Accessible disclosure/accordion
interface DisclosureProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export const Disclosure: React.FC<DisclosureProps> = ({
  title,
  children,
  defaultOpen = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const contentId = `disclosure-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={className}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="flex items-center justify-between w-full px-4 py-3 bg-border/10 hover:bg-border/20 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
      >
        <span className="font-medium text-foreground">{title}</span>
        <svg
          className={`w-5 h-5 text-border-light transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        id={contentId}
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
        aria-hidden={!isOpen}
      >
        <div className="px-4 py-3">
          {children}
        </div>
      </div>
    </div>
  );
};