import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReportContent } from '../../../app/reports/components/ReportContent';

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

  const mockFilters = { technicians: undefined, clients: undefined, statuses: undefined, priorities: undefined, ppfZones: undefined };

  const mockOverviewData = {
    taskCompletion: {
      summary: {
        total_tasks: 100n,
        completed_tasks: 85n,
        completion_rate: 85,
      },
      daily_breakdown: [],
      status_distribution: [],
    },
    technicianPerformance: {
      technicians: [],
      benchmarks: {
        team_average: 90,
      },
    },
    clientAnalytics: {
      summary: {
        total_clients: 12,
        retention_rate: 92,
      },
    },
    qualityCompliance: {
      summary: {
        overall_quality_score: 88,
      },
    },
    materialUsage: {
      summary: {
        total_material_cost: 1200,
      },
    },
    geographic: {
      geographic_stats: {
        unique_locations: 5,
      },
    },
    operationalIntelligence: {
      process_efficiency: {
        overall_efficiency_score: 91,
      },
    },
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
      render(
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
        reportType="seasonal"
        dateRange={mockDateRange}
        filters={mockFilters}
        overviewData={null}
        reportsGenerated={true}
      />
    );

    expect(screen.getByText('Rapport non trouvé')).toBeInTheDocument();
  });
});
