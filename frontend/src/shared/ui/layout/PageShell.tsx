'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export function PageShell({ children, className }: PageShellProps) {
  return (
    <div className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6', className)}>
      {children}
    </div>
  );
}
