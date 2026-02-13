'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  BarChart3,
  Activity,
  Download,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

interface AnalyticsData {
  overview: {
    totalTasks: number;
    completedTasks: number;
    activeTasks: number;
    totalUsers: number;
    avgCompletionTime: number;
    completionRate: number;
    qualityScore: number;
  };
  trends: {
    daily: Array<{
      date: string;
      tasks: number;
      completed: number;
      avgTime: number;
    }>;
    weekly: Array<{
      week: string;
      tasks: number;
      completed: number;
      avgTime: number;
    }>;
    monthly: Array<{
      month: string;
      tasks: number;
      completed: number;
      avgTime: number;
    }>;
  };
  performance: {
    technicians: Array<{
      id: string;
      name: string;
      tasksCompleted: number;
      avgTime: number;
      qualityScore: number;
      efficiency: number;
    }>;
    templates: Array<{
      id: string;
      name: string;
      usageCount: number;
      avgCompletionTime: number;
      successRate: number;
    }>;
  };
  quality: {
    issues: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
    improvements: Array<{
      metric: string;
      before: number;
      after: number;
      improvement: number;
    }>;
  };
}

interface AnalyticsDashboardProps {
  className?: string;
}

export function AnalyticsDashboard({ className }: AnalyticsDashboardProps) {
  const { t } = useTranslation();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics?range=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const getTrendIcon = (value: number, previous: number) => {
    if (value > previous) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (value < previous) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  const getTrendColor = (value: number, previous: number) => {
    if (value > previous) return 'text-green-600';
    if (value < previous) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };



  if (loading) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">{t('analytics.loading')}</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('analytics.noData')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('analytics.noDataDesc')}
              </p>
              <Button onClick={loadAnalytics}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('common.retry')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('analytics.dashboard')}</h1>
          <p className="text-muted-foreground">{t('analytics.dashboardDesc')}</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">{t('analytics.last7days')}</SelectItem>
              <SelectItem value="30d">{t('analytics.last30days')}</SelectItem>
              <SelectItem value="90d">{t('analytics.last90days')}</SelectItem>
              <SelectItem value="1y">{t('analytics.lastYear')}</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadAnalytics} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.refresh')}
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {t('common.export')}
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 mb-6">
        {[
          { id: 'overview', label: t('analytics.overview'), icon: BarChart3 },
          { id: 'performance', label: t('analytics.performance'), icon: TrendingUp },
          { id: 'quality', label: t('analytics.quality'), icon: CheckCircle },
          { id: 'trends', label: t('analytics.trends'), icon: Activity }
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2"
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('analytics.totalTasks')}</p>
                    <p className="text-2xl font-bold">{analytics.overview.totalTasks}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('analytics.completionRate')}</p>
                    <p className="text-2xl font-bold text-green-600">
                      {analytics.overview.completionRate.toFixed(1)}%
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('analytics.avgCompletionTimeShort')}</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatDuration(analytics.overview.avgCompletionTime)}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('analytics.quality')}</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {analytics.overview.qualityScore.toFixed(1)}/10
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task Completion Trend */}
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.taskCompletionTrend')}</CardTitle>
                <CardDescription>{t('analytics.taskCompletionTrendDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.trends.daily}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="completed" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Task Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.taskStatusDistribution')}</CardTitle>
                <CardDescription>{t('analytics.taskStatusDistributionDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={[
                        { name: 'Terminées', value: analytics.overview.completedTasks, color: '#00C49F' },
                        { name: 'Actives', value: analytics.overview.activeTasks, color: '#0088FE' },
                        { name: 'En attente', value: analytics.overview.totalTasks - analytics.overview.completedTasks - analytics.overview.activeTasks, color: '#FFBB28' }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                    >
                      {[
                        { name: 'Terminées', value: analytics.overview.completedTasks, color: '#00C49F' },
                        { name: 'Actives', value: analytics.overview.activeTasks, color: '#0088FE' },
                        { name: 'En attente', value: analytics.overview.totalTasks - analytics.overview.completedTasks - analytics.overview.activeTasks, color: '#FFBB28' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Technician Performance */}
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.technicianPerformance')}</CardTitle>
              <CardDescription>{t('analytics.technicianPerformanceDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.performance.technicians.map((tech) => (
                  <div key={tech.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{tech.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {tech.tasksCompleted} {t('analytics.tasksCompleted')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">{t('analytics.avgTime')}</p>
                        <p className="font-medium">{formatDuration(tech.avgTime)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">{t('analytics.quality')}</p>
                        <p className="font-medium">{tech.qualityScore.toFixed(1)}/10</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">{t('analytics.efficiency')}</p>
                        <Badge variant={tech.efficiency > 80 ? 'default' : tech.efficiency > 60 ? 'secondary' : 'destructive'}>
                          {tech.efficiency.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Template Performance */}
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.templatePerformance')}</CardTitle>
              <CardDescription>{t('analytics.templatePerformanceDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.performance.templates.map((template) => (
                  <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{template.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('analytics.usedTimes', { count: template.usageCount })}
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">{t('analytics.avgTime')}</p>
                        <p className="font-medium">{formatDuration(template.avgCompletionTime)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">{t('analytics.successRate')}</p>
                        <Badge variant={template.successRate > 90 ? 'default' : template.successRate > 70 ? 'secondary' : 'destructive'}>
                          {template.successRate.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quality Tab */}
      {activeTab === 'quality' && (
        <div className="space-y-6">
          {/* Quality Issues */}
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.qualityIssues')}</CardTitle>
              <CardDescription>{t('analytics.qualityIssuesDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.quality.issues.map((issue) => (
                  <div key={issue.type} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{issue.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {issue.count} {t('analytics.occurrences')}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full" 
                          style={{ width: `${issue.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{issue.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quality Improvements */}
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.qualityImprovements')}</CardTitle>
              <CardDescription>{t('analytics.qualityImprovementsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.quality.improvements.map((improvement) => (
                  <div key={improvement.metric} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{improvement.metric}</p>
                      <p className="text-sm text-muted-foreground">
                        {improvement.before.toFixed(1)} → {improvement.after.toFixed(1)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(improvement.after, improvement.before)}
                      <span className={`font-medium ${getTrendColor(improvement.after, improvement.before)}`}>
                        {improvement.improvement > 0 ? '+' : ''}{improvement.improvement.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          {/* Weekly Trends */}
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.weeklyTrends')}</CardTitle>
              <CardDescription>{t('analytics.weeklyTrendsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics.trends.weekly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="tasks" fill="#8884d8" name="Total Tasks" />
                  <Bar dataKey="completed" fill="#00C49F" name="Completed Tasks" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Trends */}
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.monthlyTrendsTitle')}</CardTitle>
              <CardDescription>{t('analytics.monthlyTrendsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analytics.trends.monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="tasks" stroke="#8884d8" strokeWidth={2} name="Total Tasks" />
                  <Line type="monotone" dataKey="completed" stroke="#00C49F" strokeWidth={2} name="Completed Tasks" />
                  <Line type="monotone" dataKey="avgTime" stroke="#FF8042" strokeWidth={2} name="Avg Time (min)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
