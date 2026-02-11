//! Tests for Quality Dashboard component
//! 
//! Critical component for quality management with 0% coverage.

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { invoke } from '@tauri-apps/api';
import { QualityDashboard } from './QualityDashboard';

// Mock the Tauri API
jest.mock('@tauri-apps/api', () => ({
  invoke: jest.fn(),
}));

describe('QualityDashboard', () => {
  const mockQualityData = [
    {
      id: '1',
      task_id: 'task1',
      intervention_id: 'intervention1',
      technician_id: 'tech1',
      quality_score: 95,
      issues_found: 0,
      passed_checks: 20,
      total_checks: 20,
      inspected_at: '2024-01-01T10:00:00Z',
      notes: 'Excellent work',
    },
    {
      id: '2',
      task_id: 'task2',
      intervention_id: 'intervention2',
      technician_id: 'tech2',
      quality_score: 78,
      issues_found: 2,
      passed_checks: 16,
      total_checks: 20,
      inspected_at: '2024-01-02T14:00:00Z',
      notes: 'Minor issues found',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders quality dashboard header', async () => {
    (invoke as jest.Mock).mockResolvedValue({ data: mockQualityData });

    render(<QualityDashboard interventionId="intervention-1" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Quality Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/Quality Overview/i)).toBeInTheDocument();
    });
  });

  it('displays quality metrics', async () => {
    (invoke as jest.Mock).mockResolvedValue({ data: mockQualityData });

    render(<QualityDashboard interventionId="intervention-1" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Average Quality Score/i)).toBeInTheDocument();
      expect(screen.getByText(/86.5%/i)).toBeInTheDocument(); // (95 + 78) / 2
      expect(screen.getByText(/Total Inspections/i)).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('shows quality score distribution', async () => {
    (invoke as jest.Mock).mockResolvedValue({ data: mockQualityData });

    render(<QualityDashboard interventionId="intervention-1" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Quality Score Distribution/i)).toBeInTheDocument();
      expect(screen.getByText(/Excellent/i)).toBeInTheDocument();
      expect(screen.getByText(/Good/i)).toBeInTheDocument();
      expect(screen.getByText(/Needs Improvement/i)).toBeInTheDocument();
    });
  });

  it('filters quality data by date range', async () => {
    (invoke as jest.Mock).mockResolvedValue({ data: mockQualityData });

    render(<QualityDashboard interventionId="intervention-1" />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Start Date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/End Date/i)).toBeInTheDocument();
    });
    
    const startDateInput = screen.getByLabelText(/Start Date/i);
    const endDateInput = screen.getByLabelText(/End Date/i);
    
    await userEvent.type(startDateInput, '2024-01-01');
    await userEvent.type(endDateInput, '2024-01-31');
    
    const applyButton = screen.getByRole('button', { name: /Apply Filters/i });
    await userEvent.click(applyButton);
    
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('get_quality_metrics', {
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });
    });
  });

  it('filters by technician', async () => {
    (invoke as jest.Mock).mockResolvedValue({ data: mockQualityData });

    render(<QualityDashboard interventionId="intervention-1" />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Technician/i)).toBeInTheDocument();
    });
    
    const technicianSelect = screen.getByLabelText(/Technician/i);
    await userEvent.click(technicianSelect);
    
    await waitFor(() => {
      expect(screen.getByText(/tech1/i)).toBeInTheDocument();
      expect(screen.getByText(/tech2/i)).toBeInTheDocument();
    });
    
    await userEvent.click(screen.getByText(/tech1/i));
    
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('get_quality_metrics', {
        technician_id: 'tech1',
      });
    });
  });

  it('displays detailed quality report cards', async () => {
    (invoke as jest.Mock).mockResolvedValue({ data: mockQualityData });

    render(<QualityDashboard interventionId="intervention-1" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Excellent work/i)).toBeInTheDocument();
      expect(screen.getByText(/Minor issues found/i)).toBeInTheDocument();
      expect(screen.getByText(/95%/i)).toBeInTheDocument();
      expect(screen.getByText(/78%/i)).toBeInTheDocument();
    });
  });

  it('shows quality trend chart', async () => {
    (invoke as jest.Mock).mockResolvedValue({ data: mockQualityData });

    render(<QualityDashboard interventionId="intervention-1" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Quality Trend/i)).toBeInTheDocument();
      expect(screen.getByTestId('quality-chart')).toBeInTheDocument();
    });
  });

  it('allows exporting quality reports', async () => {
    (invoke as jest.Mock).mockResolvedValue({ data: mockQualityData });

    render(<QualityDashboard interventionId="intervention-1" />);
    
    const exportButton = screen.getByRole('button', { name: /Export Report/i });
    await userEvent.click(exportButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Export Quality Report/i)).toBeInTheDocument();
      expect(screen.getByText(/PDF/i)).toBeInTheDocument();
      expect(screen.getByText(/Excel/i)).toBeInTheDocument();
    });
    
    const pdfButton = screen.getByText(/PDF/i);
    await userEvent.click(pdfButton);
    
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('export_quality_report', {
        format: 'pdf',
        date_range: { start: null, end: null },
        filters: {},
      });
    });
  });

  it('handles no quality data gracefully', async () => {
    (invoke as jest.Mock).mockResolvedValue({ data: [] });

    render(<QualityDashboard interventionId="intervention-1" />);
    
    await waitFor(() => {
      expect(screen.getByText(/No quality data available/i)).toBeInTheDocument();
      expect(screen.getByText(/Run some inspections to see quality metrics/i)).toBeInTheDocument();
    });
  });

  it('shows quality alerts for low scores', async () => {
    const lowQualityData = [
      {
        id: '1',
        task_id: 'task1',
        intervention_id: 'intervention1',
        technician_id: 'tech1',
        quality_score: 45,
        issues_found: 5,
        passed_checks: 10,
        total_checks: 20,
        inspected_at: '2024-01-01T10:00:00Z',
        notes: 'Multiple issues',
      },
    ];
    
    (invoke as jest.Mock).mockResolvedValue({ data: lowQualityData });

    render(<QualityDashboard interventionId="intervention-1" />);
    
    await waitFor(() => {
      expect(screen.getByText(/⚠️ Quality Alert/i)).toBeInTheDocument();
      expect(screen.getByText(/Low quality score detected/i)).toBeInTheDocument();
      expect(screen.getByText(/45%/i)).toBeInTheDocument();
    });
  });

  it('allows drilling down to individual quality checks', async () => {
    (invoke as jest.Mock).mockResolvedValue({ data: mockQualityData });

    render(<QualityDashboard interventionId="intervention-1" />);
    
    await waitFor(() => {
      const viewDetailsButton = screen.getAllByRole('button', { name: /View Details/i });
      expect(viewDetailsButton.length).toBeGreaterThan(0);
    });
    
    const viewDetailsButton = screen.getAllByRole('button', { name: /View Details/i })[0];
    await userEvent.click(viewDetailsButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Quality Check Details/i)).toBeInTheDocument();
      expect(screen.getByText(/Passed Checks: 20/i)).toBeInTheDocument();
      expect(screen.getByText(/Failed Checks: 0/i)).toBeInTheDocument();
    });
  });

  it('calculates quality metrics correctly', async () => {
    (invoke as jest.Mock).mockResolvedValue({ data: mockQualityData });

    render(<QualityDashboard interventionId="intervention-1" />);
    
    await waitFor(() => {
      // Check if metrics are calculated correctly
      expect(screen.getByText(/Total Checks/i)).toBeInTheDocument();
      expect(screen.getByText('40')).toBeInTheDocument(); // 20 + 20
      expect(screen.getByText(/Passed Checks/i)).toBeInTheDocument();
      expect(screen.getByText('36')).toBeInTheDocument(); // 20 + 16
      expect(screen.getByText(/Failed Checks/i)).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument(); // 0 + 4
    });
  });
});
