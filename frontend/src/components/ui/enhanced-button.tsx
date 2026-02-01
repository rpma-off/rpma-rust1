"use client"

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const enhancedButtonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-accent text-foreground hover:bg-accent-hover active:scale-95 transition-all duration-150 shadow-lg hover:shadow-xl',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-95',
        outline: 'border border-border bg-transparent text-foreground hover:bg-muted hover:border-accent active:scale-95 transition-all duration-150',
        secondary: 'bg-muted text-foreground border border-border hover:bg-border hover:border-accent hover:scale-105 active:scale-95 transition-all duration-200',
        ghost: 'text-border-light hover:bg-muted hover:text-foreground hover:scale-105 active:scale-95 transition-all duration-150',
        link: 'text-accent underline-offset-4 hover:underline hover:text-accent-hover transition-colors duration-150',
        primary: 'bg-accent text-foreground hover:bg-accent-hover hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-2xl font-semibold',
        success: 'bg-green-600 text-white hover:bg-green-700 active:scale-95',
        warning: 'bg-yellow-600 text-white hover:bg-yellow-700 active:scale-95',
        gradient: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 active:scale-95',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        xl: 'h-12 rounded-lg px-10 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
      loading: {
        true: 'cursor-not-allowed',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      loading: false,
    },
  }
);

export interface EnhancedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof enhancedButtonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({
    className,
    variant,
    size,
    loading,
    leftIcon,
    rightIcon,
    fullWidth,
    children,
    disabled,
    ...props
  }, ref) => {
    const Comp = props.asChild ? Slot : 'button';

    return (
      <Comp
        className={cn(
          enhancedButtonVariants({ variant, size, loading }),
          fullWidth && 'w-full',
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {!loading && leftIcon && (
          <span className="mr-2 flex-shrink-0">{leftIcon}</span>
        )}
        <span className="flex-1 text-center">{children}</span>
        {!loading && rightIcon && (
          <span className="ml-2 flex-shrink-0">{rightIcon}</span>
        )}
      </Comp>
    );
  }
);

EnhancedButton.displayName = 'EnhancedButton';

// Specialized button variants
const LoadingButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ children, loading, ...props }, ref) => (
    <EnhancedButton ref={ref} loading={loading} {...props}>
      {loading ? 'Chargement...' : children}
    </EnhancedButton>
  )
);

LoadingButton.displayName = 'LoadingButton';

const IconButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ children, size = 'icon', ...props }, ref) => (
    <EnhancedButton ref={ref} size={size} {...props}>
      {children}
    </EnhancedButton>
  )
);

IconButton.displayName = 'IconButton';

const FloatingActionButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ className, size = 'icon', variant = 'default', ...props }, ref) => (
    <EnhancedButton
      ref={ref}
      size={size}
      variant={variant}
      className={cn(
        'fixed bottom-6 right-6 z-50 rounded-full shadow-lg hover:shadow-xl transition-shadow',
        className
      )}
      {...props}
    />
  )
);

FloatingActionButton.displayName = 'FloatingActionButton';

export { EnhancedButton, LoadingButton, IconButton, FloatingActionButton, enhancedButtonVariants };