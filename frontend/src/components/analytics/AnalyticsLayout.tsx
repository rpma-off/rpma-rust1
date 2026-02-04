import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { AnalyticsTabs } from '@/components/analytics/AnalyticsTabs';

interface AnalyticsLayoutProps {
  children: ReactNode;
}

export function AnalyticsLayout({ children }: AnalyticsLayoutProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Monitor performance, track KPIs, and gain insights into your operations
          </p>
        </div>
      </div>

      <Card className="rpma-shell">
        <AnalyticsTabs />
      </Card>

      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}
