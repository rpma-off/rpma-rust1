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

// Dashboard components
export { CalendarHeader } from '../components/dashboard/CalendarHeader';
export { QuickAddDialog } from '../components/dashboard/QuickAddDialog';
export { FilterDrawer } from '../components/dashboard/FilterDrawer';

export { analyticsService, dashboardApiService, userService } from '../server';

export type {
  DashboardFilters,
  DashboardData,
  TechnicianSummary,
  AnalyticsSummary,
  UseAnalyticsResult,
} from './types';

// Dashboard types
export type { DashboardTask, DashboardStats, DashboardProps, ViewMode, Priority, FilterOption, Technician, RawTaskData, DashboardHeaderProps, DashboardSectionProps, DashboardWidgetProps, TaskCardListProps, DashboardTaskFiltersProps, StatsGridProps, PerformanceMetricsProps } from '../components/dashboard/types';
export { transformTask, mapStatus } from '../components/dashboard/types';
