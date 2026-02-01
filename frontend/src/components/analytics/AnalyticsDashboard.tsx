'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Activity, Users, Clock, Star } from 'lucide-react';
import { useAnalyticsSummary } from '@/hooks/useAnalyticsSummary';
import { KpiCard } from './KpiCard';
import { AnalyticsChart } from './AnalyticsChart';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function AnalyticsDashboard() {
  const { summary, loading, error, refetch } = useAnalyticsSummary();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const handleRefresh = () => {
    refetch();
    setLastRefresh(new Date());
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Card className="bg-border-800 border-border-700">
        <CardContent className="p-6">
          <div className="text-center text-border-300">
            Error loading analytics: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className="bg-border-800 border-border-700">
        <CardContent className="p-6">
          <div className="text-center text-border-300">
            No analytics data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Performance Overview</h2>
          <p className="text-border-400 text-sm">
            Last updated: {lastRefresh.toLocaleString()}
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          className="border-border-600 text-border-300 hover:bg-border-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Total Interventions"
          value={summary.total_interventions.toString()}
          icon={<Activity className="w-5 h-5" />}
          trend="neutral"
          description="All time"
        />

        <KpiCard
          title="Completed Today"
          value={summary.completed_today.toString()}
          icon={<TrendingUp className="w-5 h-5" />}
          trend="up"
          description="Tasks completed today"
        />

        <KpiCard
          title="Active Technicians"
          value={summary.active_technicians.toString()}
          icon={<Users className="w-5 h-5" />}
          trend="neutral"
          description="Working this month"
        />

        <KpiCard
          title="Avg Completion Time"
          value={`${summary.average_completion_time.toFixed(1)}h`}
          icon={<Clock className="w-5 h-5" />}
          trend="down"
          description="Hours per intervention"
        />

        <KpiCard
          title="Client Satisfaction"
          value={`${summary.client_satisfaction_score.toFixed(1)}/5`}
          icon={<Star className="w-5 h-5" />}
          trend="up"
          description="Average rating"
        />

        <KpiCard
          title="Quality Score"
          value={`${summary.quality_compliance_rate.toFixed(1)}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          trend="up"
          description="Compliance rate"
        />

        <KpiCard
          title="Monthly Revenue"
          value={`€${summary.revenue_this_month.toLocaleString('fr-FR')}`}
          icon={<TrendingUp className="w-5 h-5" />}
          trend="up"
          description="This month"
        />

        <KpiCard
          title="Inventory Turnover"
          value={summary.inventory_turnover.toFixed(1)}
          icon={<Activity className="w-5 h-5" />}
          trend="neutral"
          description="Annual rate"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-border-800 border-border-700">
          <CardHeader>
            <CardTitle className="text-foreground">Task Completion Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsChart
              type="line"
              data={[
                { label: 'Mon', value: 85 },
                { label: 'Tue', value: 92 },
                { label: 'Wed', value: 78 },
                { label: 'Thu', value: 96 },
                { label: 'Fri', value: 88 },
                { label: 'Sat', value: 76 },
                { label: 'Sun', value: 82 },
              ]}
              color="#3B82F6"
            />
          </CardContent>
        </Card>

        <Card className="bg-border-800 border-border-700">
          <CardHeader>
            <CardTitle className="text-foreground">Intervention Types</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsChart
              type="pie"
              data={[
                { label: 'PPF Installation', value: 45 },
                { label: 'Maintenance', value: 25 },
                { label: 'Repair', value: 20 },
                { label: 'Inspection', value: 10 },
              ]}
              colors={['#3B82F6', '#10B981', '#F59E0B', '#EF4444']}
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-border-800 border-border-700">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-border-900 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <div>
                  <p className="text-foreground font-medium">Task #1234 completed</p>
                  <p className="text-border-400 text-sm">PPF installation on BMW X3</p>
                </div>
              </div>
              <span className="text-border-400 text-sm">2 hours ago</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-border-900 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-foreground font-medium">New client registered</p>
                  <p className="text-border-400 text-sm">Premium customer package</p>
                </div>
              </div>
              <span className="text-border-400 text-sm">4 hours ago</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-border-900 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <div>
                  <p className="text-foreground font-medium">Low stock alert</p>
                  <p className="text-border-400 text-sm">PPF Film inventory below threshold</p>
                </div>
              </div>
              <span className="text-border-400 text-sm">6 hours ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}