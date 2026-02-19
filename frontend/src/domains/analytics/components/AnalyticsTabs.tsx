'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Settings, PieChart } from 'lucide-react';
import { KpiDashboard } from './KpiDashboard';
import { AnalyticsReports } from './AnalyticsReports';
import { TrendAnalysis } from './TrendAnalysis';
import { AnalyticsSettings } from './AnalyticsSettings';

export function AnalyticsTabs() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList data-variant="underline" className="w-full justify-start">
        <TabsTrigger value="dashboard" data-variant="underline" className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Dashboard
        </TabsTrigger>
        <TabsTrigger value="reports" data-variant="underline" className="flex items-center gap-2">
          <PieChart className="w-4 h-4" />
          Reports
        </TabsTrigger>
        <TabsTrigger value="trends" data-variant="underline" className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Trends
        </TabsTrigger>
        <TabsTrigger value="settings" data-variant="underline" className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Settings
        </TabsTrigger>
      </TabsList>

      <TabsContent value="dashboard" className="mt-4">
        <KpiDashboard />
      </TabsContent>

      <TabsContent value="reports" className="mt-4">
        <AnalyticsReports />
      </TabsContent>

      <TabsContent value="trends" className="mt-4">
        <TrendAnalysis />
      </TabsContent>

      <TabsContent value="settings" className="mt-4">
        <AnalyticsSettings />
      </TabsContent>
    </Tabs>
  );
}
