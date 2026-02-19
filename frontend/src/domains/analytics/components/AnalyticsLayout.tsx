import { ReactNode } from 'react';
import { AnalyticsTabs } from './AnalyticsTabs';

interface AnalyticsLayoutProps {
  children: ReactNode;
}

export function AnalyticsLayout({ children }: AnalyticsLayoutProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-0 space-y-5">
      <div className="bg-[hsl(var(--rpma-teal))] text-white rounded-[10px] shadow-[var(--rpma-shadow-soft)]">
        <div className="px-5 pt-4 pb-0">
          <h1 className="text-xl font-semibold">Analytics</h1>
        </div>
        <div className="px-2">
          <AnalyticsTabs />
        </div>
      </div>

      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}
