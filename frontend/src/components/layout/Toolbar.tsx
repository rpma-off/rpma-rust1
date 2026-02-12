'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface ToolbarProps {
  children: React.ReactNode;
  className?: string;
}

export function Toolbar({ children, className }: ToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-white border border-[hsl(var(--rpma-border))] rounded-[10px] shadow-[var(--rpma-shadow-soft)]',
        className,
      )}
    >
      {children}
    </div>
  );
}
