'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export interface DataTableWrapperProps {
  title?: string;
  description?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function DataTableWrapper({
  title,
  description,
  headerActions,
  children,
  className,
}: DataTableWrapperProps) {
  return (
    <Card className={cn(className)}>
      {(title || description || headerActions) && (
        <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-4">
          <div className="flex-1 space-y-1.5">
            {title && <CardTitle className="text-foreground">{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {headerActions && (
            <div className="flex items-center gap-2 flex-shrink-0">{headerActions}</div>
          )}
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="overflow-x-auto">{children}</div>
      </CardContent>
    </Card>
  );
}
