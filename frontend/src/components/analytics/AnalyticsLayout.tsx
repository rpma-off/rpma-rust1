import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { AnalyticsTabs } from '@/components/analytics/AnalyticsTabs';

interface AnalyticsLayoutProps {
  children: ReactNode;
}

export function AnalyticsLayout({ children }: AnalyticsLayoutProps) {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-border-300 mt-1">
            Monitor performance, track KPIs, and gain insights into your operations
          </p>
        </div>
      </div>

      <Card className="bg-border-800 border-border-700">
        <AnalyticsTabs />
      </Card>

      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}