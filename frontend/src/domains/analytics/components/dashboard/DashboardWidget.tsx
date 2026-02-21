'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { DashboardWidgetProps } from './types';
import { cn } from '@/lib/utils';

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  title,
  icon: Icon,
  content,
  className,
  onClick,
  loading = false
}) => {
  const handleClick = () => {
    if (onClick && !loading) {
      onClick();
    }
  };

  return (
    <div
      className={cn(
        'bg-card rounded-lg shadow-sm border border-border p-4',
        onClick && !loading && 'cursor-pointer hover:shadow-md hover:border-border/60 transition-all',
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
          <h3 className="text-sm font-medium text-foreground">
            {title}
          </h3>
        </div>
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      
      <div className="text-sm text-muted-foreground">
        {content}
      </div>
    </div>
  );
};