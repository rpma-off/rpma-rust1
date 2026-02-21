'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { DashboardSectionProps } from './types';
import { cn } from '@/lib/utils';

export const DashboardSection: React.FC<DashboardSectionProps> = ({
  title,
  subtitle,
  children,
  className,
  collapsible = false,
  defaultCollapsed = false
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const handleToggle = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <div className={cn('bg-card rounded-lg shadow-sm border border-border', className)}>
      <div 
        className={cn(
          'px-4 py-3 border-b border-border',
          collapsible && 'cursor-pointer hover:bg-muted/50'
        )}
        onClick={handleToggle}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
          {collapsible && (
            <div className="flex items-center">
              {isCollapsed ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          )}
        </div>
      </div>
      
      {(!collapsible || !isCollapsed) && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
};