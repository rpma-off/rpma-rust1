'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CalendarFilterSectionProps {
  title: string;
  icon: LucideIcon;
  open: boolean;
  onOpenChange: () => void;
  children: ReactNode;
}

export function CalendarFilterSection({
  title,
  icon: Icon,
  open,
  onOpenChange,
  children,
}: CalendarFilterSectionProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between rounded-md p-2 transition-colors hover:bg-gray-50">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-gray-500" />
            <Label className="cursor-pointer text-sm font-medium">{title}</Label>
          </div>
          <ChevronDown
            className={cn('h-4 w-4 text-gray-400 transition-transform', open && 'rotate-180')}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pb-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}
