'use client';

import { Suspense, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Activity, Zap } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState } from '@/shared/ui/layout/LoadingState';
import { useAuth } from '@/domains/auth';

const MonitoringTab = dynamic(
  () => import('@/domains/admin').then(mod => ({ default: mod.MonitoringTab })),
  { loading: () => <LoadingState /> }
);

const PerformanceTab = dynamic(
  () => import('@/domains/admin').then(mod => ({ default: mod.PerformanceTab })),
  { loading: () => <LoadingState /> }
);

export default function ObservabilityPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role !== 'admin') {
      router.replace('/settings/profile');
    }
  }, [user, loading, router]);

  if (loading || user?.role !== 'admin') return null;

  return (
    <Tabs defaultValue="monitoring" className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="monitoring" className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Monitoring
        </TabsTrigger>
        <TabsTrigger value="performance" className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Performance
        </TabsTrigger>
      </TabsList>

      <TabsContent value="monitoring">
        <Suspense fallback={<LoadingState message="Chargement du monitoring..." />}>
          <MonitoringTab />
        </Suspense>
      </TabsContent>

      <TabsContent value="performance">
        <Suspense fallback={<LoadingState message="Chargement des performances..." />}>
          <PerformanceTab />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}
