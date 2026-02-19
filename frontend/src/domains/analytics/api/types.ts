import type { DashboardFilters, DashboardData, TechnicianSummary } from '../server';
import type { AnalyticsSummary } from '../hooks/useAnalyticsSummary';

export type { DashboardFilters, DashboardData, TechnicianSummary, AnalyticsSummary };

export interface UseAnalyticsResult {
  summary: AnalyticsSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
