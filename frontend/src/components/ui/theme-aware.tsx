import React from 'react';
import { cn } from '@/lib/utils';

// Theme-aware container component that adapts to light/dark themes
interface ThemeAwareContainerProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'card' | 'modal' | 'dropdown' | 'panel' | 'default';
  theme?: 'auto' | 'light' | 'dark';
}

export const ThemeAwareContainer: React.FC<ThemeAwareContainerProps> = ({
  children,
  className,
  variant = 'default',
  theme = 'auto'
}) => {
  // Base styles for different variants
  const variantStyles = {
    card: {
      light: 'bg-white border border-gray-200 rounded-lg shadow-sm',
      dark: 'bg-muted/50 border border-border/20 rounded-xl shadow-lg backdrop-blur-sm'
    },
    modal: {
      light: 'bg-white rounded-lg shadow-xl border border-gray-200',
      dark: 'bg-background rounded-2xl shadow-2xl border border-border/20'
    },
    dropdown: {
      light: 'bg-white border border-gray-200 rounded-md shadow-lg',
      dark: 'bg-muted/95 backdrop-blur-md border border-border/60 rounded-xl shadow-2xl'
    },
    panel: {
      light: 'bg-white border border-gray-200 rounded-lg shadow-sm',
      dark: 'bg-muted/50 border border-border/20 rounded-xl'
    },
    default: {
      light: 'bg-white',
      dark: 'bg-background'
    }
  };

  // Determine which theme to use
  const currentTheme = theme === 'auto' ? 'dark' : theme; // Default to dark for this app
  const baseStyles = variantStyles[variant][currentTheme];

  return (
    <div className={cn(baseStyles, className)}>
      {children}
    </div>
  );
};

// Theme-aware text component
interface ThemeAwareTextProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'muted' | 'error' | 'success';
  theme?: 'auto' | 'light' | 'dark';
}

export const ThemeAwareText: React.FC<ThemeAwareTextProps> = ({
  children,
  className,
  variant = 'primary',
  theme = 'auto'
}) => {
  const currentTheme = theme === 'auto' ? 'dark' : theme;

  const variantStyles = {
    primary: {
      light: 'text-gray-900',
      dark: 'text-foreground'
    },
    secondary: {
      light: 'text-gray-700',
      dark: 'text-muted-foreground'
    },
    muted: {
      light: 'text-gray-500',
      dark: 'text-muted-foreground'
    },
    error: {
      light: 'text-red-600',
      dark: 'text-red-400'
    },
    success: {
      light: 'text-green-600',
      dark: 'text-[hsl(var(--rpma-teal))]'
    }
  };

  const baseStyles = variantStyles[variant][currentTheme];

  return (
    <span className={cn(baseStyles, className)}>
      {children}
    </span>
  );
};

// Theme-aware button that automatically adapts
interface ThemeAwareButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'touch' | 'touch-lg';
  theme?: 'auto' | 'light' | 'dark';
}

export const ThemeAwareButton: React.FC<ThemeAwareButtonProps> = ({
  children,
  className,
  variant = 'default',
  size = 'md',
  theme = 'auto',
  ...props
}) => {
  const currentTheme = theme === 'auto' ? 'dark' : theme;

  // Map variants based on theme
  const getVariantClass = () => {
    if (currentTheme === 'light') {
      switch (variant) {
        case 'default': return 'light-default';
        case 'outline': return 'light-outline';
        case 'ghost': return 'light-ghost';
        case 'destructive': return 'bg-red-600 text-white hover:bg-red-700';
        default: return 'light-default';
      }
    } else {
      // Dark theme variants
      return variant;
    }
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all duration-200',
        'disabled:pointer-events-none disabled:opacity-50',
        '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'active:scale-95 hover:scale-105 transform-gpu touch-manipulation',
        // Size classes
        size === 'sm' && 'h-8 px-3 text-xs',
        size === 'md' && 'h-9 px-4',
        size === 'lg' && 'h-10 px-6',
        size === 'touch' && 'min-h-[44px] px-4 py-3',
        size === 'touch-lg' && 'min-h-[48px] px-6 py-4 text-base',
        // Theme-specific focus styles
        currentTheme === 'dark'
          ? 'focus-visible:ring-[hsl(var(--rpma-teal))]/30 focus-visible:ring-offset-background'
          : 'focus-visible:ring-blue-500 focus-visible:ring-offset-white',
        // Variant styles
        getVariantClass(),
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
