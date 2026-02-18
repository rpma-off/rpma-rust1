import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ReportsPage from '../../../app/reports/page';
import { reportsService } from '@/domains/reports/server';

// Mock the reports service to verify it's being called
jest.mock('@/domains/reports/server', () => ({
  reportsService: {
    getOverviewReport: jest.fn(),
  },
}));

// Mock other dependencies
jest.mock('@/lib/secureStorage', () => ({
  AuthSecureStorage: {
    getSession: jest.fn().mockResolvedValue({ token: 'test-token' }),
  },
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <button {...props}>{children}</button>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardTitle: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: () => <input type="checkbox" />,
}));

jest.mock('../../../app/reports/components/DateRangePicker', () => ({
  DateRangePicker: () => <div data-testid="date-range-picker">Date Range Picker</div>,
}));

jest.mock('../../../app/reports/components/ReportTabs', () => ({
  ReportTabs: () => <div data-testid="report-tabs">Report Tabs</div>,
}));

jest.mock('../../../app/reports/components/ReportContent', () => ({
  ReportContent: () => <div data-testid="report-content">Report Content</div>,
}));

jest.mock('../../../app/reports/components/ExportControls', () => ({
  ExportControls: () => <div data-testid="export-controls">Export Controls</div>,
}));

describe('ReportsPage Database Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls getOverviewReport on component mount', async () => {
    const mockGetOverviewReport = reportsService.getOverviewReport as jest.MockedFunction<typeof reportsService.getOverviewReport>;

    mockGetOverviewReport.mockResolvedValue({
      success: true,
      data: {
        taskCompletion: {
          summary: { total_tasks: 10n, completed_tasks: 8n, completion_rate: 80, average_duration: null, on_time_completion_rate: 75 },
          daily_breakdown: [],
          status_distribution: [],
          technician_breakdown: [],
          metadata: {
            title: 'Task Completion Report',
            date_range: { start: '2024-01-01T00:00:00Z', end: '2024-01-31T23:59:59Z' },
            generated_at: '2024-01-01T00:00:00Z',
            filters: { technician_ids: null, client_ids: null, statuses: null, priorities: null, ppf_zones: null, vehicle_models: null },
            total_records: 10n,
          },
        },
        technicianPerformance: {
          technicians: [],
          benchmarks: { top_performer_score: 95, team_average: 85, industry_average: 80 },
          trends: [],
          metadata: {
            title: 'Technician Performance Report',
            date_range: { start: '2024-01-01T00:00:00Z', end: '2024-01-31T23:59:59Z' },
            generated_at: '2024-01-01T00:00:00Z',
            filters: { technician_ids: null, client_ids: null, statuses: null, priorities: null, ppf_zones: null, vehicle_models: null },
            total_records: 5n,
          },
        },
        clientAnalytics: {
          summary: { total_clients: 25n, new_clients_this_period: 3n, returning_clients: 22n, retention_rate: 85, average_revenue_per_client: 2000 },
          retention_analysis: { new_client_rate: 12, repeat_client_rate: 88, churn_rate: 5, lifetime_value: 5000 },
          revenue_analysis: { total_revenue: 50000, revenue_by_client_type: {}, average_revenue_per_task: 2000, revenue_growth_rate: 15.5 },
          top_clients: [],
          metadata: {
            title: 'Client Analytics Report',
            date_range: { start: '2024-01-01T00:00:00Z', end: '2024-01-31T23:59:59Z' },
            generated_at: '2024-01-01T00:00:00Z',
            filters: { technician_ids: null, client_ids: null, statuses: null, priorities: null, ppf_zones: null, vehicle_models: null },
            total_records: 25n,
          },
        },
        qualityCompliance: {
          summary: { overall_quality_score: 92, photo_compliance_rate: 95, step_completion_accuracy: 88, defect_rate: 5 },
          quality_trends: [],
          common_issues: [],
          compliance_metrics: { documentation_completeness: 90, photo_quality_score: 85, workflow_adherence: 92, safety_compliance: 98 },
          metadata: {
            title: 'Quality Compliance Report',
            date_range: { start: '2024-01-01T00:00:00Z', end: '2024-01-31T23:59:59Z' },
            generated_at: '2024-01-01T00:00:00Z',
            filters: { technician_ids: null, client_ids: null, statuses: null, priorities: null, ppf_zones: null, vehicle_models: null },
            total_records: 50n,
          },
        },
        materialUsage: {
          summary: { total_material_cost: 15000, cost_per_task: 125, waste_percentage: 8.5, inventory_turnover: 12 },
          consumption_breakdown: [],
          cost_analysis: { cost_by_material_type: {}, cost_trends: [], supplier_performance: [] },
          efficiency_metrics: { utilization_rate: 85, waste_reduction_rate: 15, cost_efficiency_score: 88, inventory_optimization: 92 },
          metadata: {
            title: 'Material Usage Report',
            date_range: { start: '2024-01-01T00:00:00Z', end: '2024-01-31T23:59:59Z' },
            generated_at: '2024-01-01T00:00:00Z',
            filters: { technician_ids: null, client_ids: null, statuses: null, priorities: null, ppf_zones: null, vehicle_models: null },
            total_records: 120n,
          },
        },
        geographic: {
          heat_map_data: [],
          service_areas: [],
          geographic_stats: { total_points: 150, unique_locations: 45, average_cluster_density: 3.2, coverage_area_km2: 2500 },
          metadata: {
            title: 'Geographic Report',
            date_range: { start: '2024-01-01T00:00:00Z', end: '2024-01-31T23:59:59Z' },
            generated_at: '2024-01-01T00:00:00Z',
            filters: { technician_ids: null, client_ids: null, statuses: null, priorities: null, ppf_zones: null, vehicle_models: null },
            total_records: 15n,
          },
        },
        seasonal: {
          seasonal_patterns: [],
          peak_periods: [],
          weather_correlation: { temperature_impact: 0.1, precipitation_impact: 0.05, wind_impact: 0.02, seasonal_adjustment_factor: 1.15 },
          performance_trends: [],
          completion_predictions: [],
          metadata: {
            title: 'Seasonal Report',
            date_range: { start: '2024-01-01T00:00:00Z', end: '2024-01-31T23:59:59Z' },
            generated_at: '2024-01-01T00:00:00Z',
            filters: { technician_ids: null, client_ids: null, statuses: null, priorities: null, ppf_zones: null, vehicle_models: null },
            total_records: 15n,
          },
        },
        operationalIntelligence: {
          process_efficiency: { overall_efficiency_score: 88, average_step_completion_time: 45, step_success_rate: 95, rework_percentage: 5, resource_utilization_rate: 85, bottleneck_impact_score: 3 },
          step_bottlenecks: [],
          intervention_bottlenecks: [],
          resource_utilization: [],
          recommendations: [],
          metadata: {
            title: 'Operational Intelligence Report',
            date_range: { start: '2024-01-01T00:00:00Z', end: '2024-01-31T23:59:59Z' },
            generated_at: '2024-01-01T00:00:00Z',
            filters: { technician_ids: null, client_ids: null, statuses: null, priorities: null, ppf_zones: null, vehicle_models: null },
            total_records: 100n,
          },
        },
      },
      status: 200,
    });

    render(<ReportsPage />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('date-range-picker')).toBeInTheDocument();
    });

    // Verify all components are rendered
    expect(screen.getByTestId('report-tabs')).toBeInTheDocument();
    expect(screen.getByTestId('report-content')).toBeInTheDocument();
    expect(screen.getByTestId('export-controls')).toBeInTheDocument();
  });
});
