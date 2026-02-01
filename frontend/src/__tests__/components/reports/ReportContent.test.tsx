import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReportContent } from '../../../app/reports/components/ReportContent';
import { ReportType } from '@/lib/backend';

// Mock the reports service
jest.mock('@/lib/services/entities/reports.service', () => ({
  reportsService: {
    getOverviewReport: jest.fn(),
    getTaskCompletionReport: jest.fn(),
    getTechnicianPerformanceReport: jest.fn(),
    getClientAnalyticsReport: jest.fn(),
    getQualityComplianceReport: jest.fn(),
    getMaterialUsageReport: jest.fn(),
    getGeographicReport: jest.fn(),
    getOperationalIntelligenceReport: jest.fn(),
  },
}));

// Mock the reports service to avoid actual API calls
jest.mock('@/lib/services/entities/reports.service');

describe('ReportContent', () => {
  const mockDateRange = {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31'),
  };

  const mockFilters = { technician_ids: undefined, client_ids: undefined, statuses: undefined, priorities: undefined, ppf_zones: undefined, vehicle_models: undefined };

  const mockOverviewData = {
    summary: {
      total_tasks: 100n,
      completed_tasks: 85n,
      completion_rate: 85,
    },
    task_completion_trends: [],
    technician_performance: [],
    client_analytics: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading message when reportsGenerated is false', () => {
    render(
      <ReportContent
        reportType="overview"
        dateRange={mockDateRange}
        filters={mockFilters}
        overviewData={null}
        reportsGenerated={false}
      />
    );

    expect(screen.getByText('Rapports non générés')).toBeInTheDocument();
  });

  it('renders overview report when reportsGenerated is true and reportType is overview', () => {
    render(
      <ReportContent
        reportType="overview"
        dateRange={mockDateRange}
        filters={mockFilters}
        overviewData={mockOverviewData}
        reportsGenerated={true}
      />
    );

    // Should render without crashing and show the report content
    expect(screen.getByText('Rapport d\'Aperçu')).toBeInTheDocument();
  });

  it('renders different report types without crashing', () => {
    const reportTypes: Array<'tasks' | 'technicians' | 'clients' | 'quality' | 'materials' | 'geographic' | 'operational_intelligence'> = [
      'tasks', 'technicians', 'clients', 'quality', 'materials', 'geographic', 'operational_intelligence'
    ];

    reportTypes.forEach((reportType) => {
      const { rerender } = render(
        <ReportContent
          reportType={reportType}
          dateRange={mockDateRange}
          filters={mockFilters}
          overviewData={null}
          reportsGenerated={true}
        />
      );

      // Should render without crashing and show loading
      const loadingElements = screen.queryAllByText('Chargement du rapport');
      expect(loadingElements.length).toBeGreaterThan(0);
    });
  });

  it('shows unknown report type message for invalid reportType', () => {
    render(
      <ReportContent
        reportType="overview"
        dateRange={mockDateRange}
        filters={mockFilters}
        overviewData={null}
        reportsGenerated={true}
      />
    );

    expect(screen.getByText('Rapport non trouvé')).toBeInTheDocument();
  });
});