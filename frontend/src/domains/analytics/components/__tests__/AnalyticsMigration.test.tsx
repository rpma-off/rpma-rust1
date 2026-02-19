import React from 'react';
import { render, screen } from '@testing-library/react';
import { AnalyticsReports } from '../AnalyticsReports';
import { TrendAnalysis } from '../TrendAnalysis';
import { KpiDashboard } from '../KpiDashboard';
import { AnalyticsSettings } from '../AnalyticsSettings';

jest.mock('../../hooks/useAnalyticsSummary', () => ({
  useAnalyticsSummary: () => ({
    summary: {
      total_interventions: 1247,
      completed_today: 8,
      active_technicians: 12,
      average_completion_time: 3.2,
      client_satisfaction_score: 4.6,
      quality_compliance_rate: 97.8,
      revenue_this_month: 45670.5,
      inventory_turnover: 8.5,
      top_performing_technician: 'Jean Dupont',
      most_common_issue: 'PPF Installation',
      last_updated: '2026-02-18T10:30:00.000Z',
    },
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock('../AnalyticsChart', () => ({
  AnalyticsChart: () => <div data-testid="analytics-chart" />,
}));

describe('analytics migration regressions', () => {
  it('renders AnalyticsReports with export actions and without placeholder copy', () => {
    render(<AnalyticsReports />);

    expect(screen.getByText('Analytics Reports')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /export/i }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  it('renders TrendAnalysis charts and no placeholder copy', () => {
    render(<TrendAnalysis />);

    expect(screen.getByText('Trend Analysis')).toBeInTheDocument();
    expect(screen.getAllByTestId('analytics-chart').length).toBeGreaterThan(0);
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  it('renders KpiDashboard metrics and no placeholder copy', () => {
    render(<KpiDashboard />);

    expect(screen.getByText('KPI Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/Daily Completion Throughput/i)).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  it('renders AnalyticsSettings controls and no placeholder copy', () => {
    render(<AnalyticsSettings />);

    expect(screen.getByText('Analytics Settings')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });
});
