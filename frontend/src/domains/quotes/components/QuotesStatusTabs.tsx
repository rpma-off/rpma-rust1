'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusTab {
  key: string;
  label: string;
  count: number;
}

interface QuotesStatusTabsProps {
  activeTab: string;
  tabs: StatusTab[];
  onTabChange: (tab: string) => void;
}

export function QuotesStatusTabs({
  activeTab,
  tabs,
  onTabChange,
}: QuotesStatusTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <Button
            key={tab.key}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            onClick={() => onTabChange(tab.key)}
            className={cn(
              'gap-1.5',
              isActive && 'data-[state=active]:bg-blue-600 data-[state=active]:text-white'
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1 text-xs">
                {tab.count}
              </Badge>
            )}
          </Button>
        );
      })}
    </div>
  );
}
