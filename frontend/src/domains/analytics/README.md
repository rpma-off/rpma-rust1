# Analytics Domain

Frontend bounded context for analytics dashboards, KPIs, and reporting-oriented data hooks.

## Public Surface

### API (`api/`)
- `AnalyticsProvider` - Context provider for analytics data
- `useAnalytics` - Hook for accessing analytics data
- `useDashboardData` - Hook for dashboard data
- `useDashboardStats` - Hook for dashboard statistics
- `useAnalyticsSummary` - Hook for analytics summary

### IPC (`ipc/`)
- `analyticsIpc.getSummary(sessionToken)` - Get analytics summary from backend
- `analyticsIpc.getSummaryCached(sessionToken)` - Get cached analytics summary (5min TTL)
- `analyticsIpc.invalidateCache()` - Invalidate analytics cache

### Services (`services/`)
- `AnalyticsService` - Business logic for analytics data
  - `getSystemHealth()` - Get system health metrics
  - `getTaskMetrics()` - Get task statistics
  - `getTaskStatistics(timeRange)` - Get task statistics for a time range
  - `getTechnicianPerformance(technicianId)` - Get technician performance report
  - `getWorkflowAnalytics()` - Get workflow analytics
- `DashboardApiService` - Dashboard API service
- `performanceMonitor` - Performance monitoring utilities

### Components (`components/`)
- `AnalyticsDashboard` - Main analytics dashboard component
- `KpiCard` - KPI display card
- `StatsGrid` - Statistics grid layout
- `TrendAnalysis` - Trend analysis chart
- `Dashboard` - Unified dashboard component

## Architecture

```
┌─────────────────────────────────────────────┐
│         Components & Hooks                  │
│  (AnalyticsDashboard, useDashboardStats)    │
└────────────┬──────────────────────────────┘
             │
┌────────────▼──────────────────────────────┐
│         Services Layer                      │
│   (AnalyticsService, DashboardApiService)   │
└────────────┬──────────────────────────────┘
             │
┌────────────▼──────────────────────────────┐
│           IPC Layer                        │
│        (analyticsIpc)                     │
└────────────┬──────────────────────────────┘
             │
┌────────────▼──────────────────────────────┐
│        Backend Commands                   │
│   (analytics_get_summary,                  │
│    dashboard_get_stats)                    │
└─────────────────────────────────────────────┘
```

## Backend Commands

### Analytics Commands
- `analytics_get_summary` - Get analytics summary (requires session_token)
  - Returns: `AnalyticsSummary`
  - Includes: total_interventions, completed_today, active_technicians, average_completion_time, client_satisfaction_score, quality_compliance_rate, revenue_this_month, inventory_turnover, top_performing_technician, most_common_issue, last_updated

### Dashboard Commands
- `dashboard_get_stats` - Get dashboard statistics (optional time_range)
  - Returns: `{ tasks?, clients?, users?, sync? }`
  - time_range options: 'day' | 'week' | 'month' | 'year'

## Caching Strategy

- Analytics summary cached for 5 minutes (300000ms)
- Cache key pattern: `analytics:summary`
- Use `invalidateCache()` to clear cache after mutations

## Usage Example

```typescript
import { useAnalyticsSummary } from '@/domains/analytics';

function MyComponent() {
  const { data: summary, isLoading, error } = useAnalyticsSummary(sessionToken);

  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;

  return (
    <div>
      <h2>Analytics Summary</h2>
      <p>Total Interventions: {summary?.total_interventions}</p>
      <p>Completed Today: {summary?.completed_today}</p>
      <p>Active Technicians: {summary?.active_technicians}</p>
    </div>
  );
}
```

## Testing

Unit tests are located in `__tests__/`:
- `analytics.ipc.test.ts` - IPC layer tests
- `AnalyticsProvider.test.tsx` - Provider component tests
