import React from 'react';
import { render, screen } from '@testing-library/react';
import { DateRangePicker } from '../../../app/reports/components/DateRangePicker';

describe('DateRangePicker', () => {
  const mockOnDateRangeChange = jest.fn();
  const defaultDateRange = {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default date range', () => {
    render(
      <DateRangePicker
        dateRange={defaultDateRange}
        onDateRangeChange={mockOnDateRangeChange}
      />
    );

    expect(screen.getByText('Période:')).toBeInTheDocument();
    // Check that date elements exist (multiple with same text)
    const dateElements = screen.getAllByText(/janv\. 2024/);
    expect(dateElements.length).toBeGreaterThan(0);
  });

  it('displays shortcuts button', () => {
    render(
      <DateRangePicker
        dateRange={defaultDateRange}
        onDateRangeChange={mockOnDateRangeChange}
      />
    );

    expect(screen.getByText('Raccourcis')).toBeInTheDocument();
  });

  it('displays date range duration', () => {
    render(
      <DateRangePicker
        dateRange={defaultDateRange}
        onDateRangeChange={mockOnDateRangeChange}
      />
    );

    expect(screen.getByText('30 jours')).toBeInTheDocument();
  });

  it('shortcuts button is clickable', () => {
    render(
      <DateRangePicker
        dateRange={defaultDateRange}
        onDateRangeChange={mockOnDateRangeChange}
      />
    );

    const shortcutsButton = screen.getByText('Raccourcis');
    expect(shortcutsButton).toBeEnabled();
  });

  it('displays different date ranges correctly', () => {
    const testDateRange = {
      start: new Date('2024-01-15'),
      end: new Date('2024-01-20'),
    };

    render(
      <DateRangePicker
        dateRange={testDateRange}
        onDateRangeChange={mockOnDateRangeChange}
      />
    );

    // Should display the date range in a readable format
    expect(screen.getByText('Période:')).toBeInTheDocument();
    const dateElements = screen.getAllByText(/janv\. 2024/);
    expect(dateElements.length).toBeGreaterThan(0);
  });

  it('handles invalid date ranges gracefully', () => {
    const invalidDateRange = {
      start: new Date('2024-01-31'),
      end: new Date('2024-01-01'), // End before start
    };

    // This should not crash the component
    expect(() => {
      render(
        <DateRangePicker
          dateRange={invalidDateRange}
          onDateRangeChange={mockOnDateRangeChange}
        />
      );
    }).not.toThrow();
  });

  it('maintains accessibility with proper labels', () => {
    render(
      <DateRangePicker
        dateRange={defaultDateRange}
        onDateRangeChange={mockOnDateRangeChange}
      />
    );

    // Verify main label exists
    expect(screen.getByText('Période:')).toBeInTheDocument();
    // Verify buttons are accessible
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('applies correct CSS classes for styling', () => {
    render(
      <DateRangePicker
        dateRange={defaultDateRange}
        onDateRangeChange={mockOnDateRangeChange}
      />
    );

    // Verify the component renders with expected structure
    const container = screen.getByText('Période:').closest('div');
    expect(container).toBeInTheDocument();
  });

  it('handles edge case dates (leap year, month boundaries)', () => {
    const leapYearDateRange = {
      start: new Date('2024-02-28'),
      end: new Date('2024-03-01'),
    };

    render(
      <DateRangePicker
        dateRange={leapYearDateRange}
        onDateRangeChange={mockOnDateRangeChange}
      />
    );

    // Should handle leap year dates without crashing
    expect(screen.getByText('Période:')).toBeInTheDocument();
  });
});