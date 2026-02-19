/**
 * analytics Domain - Public API
 */

export { AnalyticsProvider, useAnalyticsContext } from './AnalyticsProvider';
export { useAnalytics } from './useAnalytics';
export { useDashboardData } from '../hooks/useDashboardData';
export { useDashboardData as useDashboardDataQuery } from '../hooks/useDashboardDataQuery';
export { useDashboardStats } from '../hooks/useDashboardStats';
export { useAnalyticsSummary } from '../hooks/useAnalyticsSummary';

export { AnalyticsLayout } from '../components/AnalyticsLayout';
export { AnalyticsDashboard } from '../components/AnalyticsDashboard';
export { AnalyticsChart } from '../components/AnalyticsChart';
export { AnalyticsReports } from '../components/AnalyticsReports';
export { AnalyticsSettings } from '../components/AnalyticsSettings';
export { AnalyticsTabs } from '../components/AnalyticsTabs';
export { KpiCard } from '../components/KpiCard';
export { KpiDashboard } from '../components/KpiDashboard';
export { TrendAnalysis } from '../components/TrendAnalysis';

export { analyticsService, dashboardApiService, userService } from '../server';

export type {
  DashboardFilters,
  DashboardData,
  TechnicianSummary,
  AnalyticsSummary,
  UseAnalyticsResult,
} from './types';
