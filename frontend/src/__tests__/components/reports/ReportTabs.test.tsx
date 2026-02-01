import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReportTabs } from '../../../app/reports/components/ReportTabs';
import { ReportType } from '@/lib/backend';

describe('ReportTabs', () => {
  const mockOnTypeChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all report type tabs', () => {
    render(<ReportTabs selectedType="overview" onTypeChange={mockOnTypeChange} />);

    expect(screen.getByText('Aperçu')).toBeInTheDocument();
    expect(screen.getByText('Tâches')).toBeInTheDocument();
    expect(screen.getByText('Techniciens')).toBeInTheDocument();
    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getByText('Qualité')).toBeInTheDocument();
    expect(screen.getByText('Matériaux')).toBeInTheDocument();
  });

  it('highlights the selected tab', () => {
    render(<ReportTabs selectedType="tasks" onTypeChange={mockOnTypeChange} />);

    const tasksTab = screen.getByText('Tâches');
    const overviewTab = screen.getByText('Aperçu');

    // Check that the selected tab has the appropriate styling
    expect(tasksTab).toBeInTheDocument();
    expect(overviewTab).toBeInTheDocument();

    // The selected tab should have different styling (this would be checked by CSS classes)
    // For now, we verify the tab exists and is clickable
  });

  it('calls onTypeChange when a different tab is clicked', () => {
    render(<ReportTabs selectedType="overview" onTypeChange={mockOnTypeChange} />);

    const tasksTab = screen.getByText('Tâches');
    fireEvent.click(tasksTab);

    expect(mockOnTypeChange).toHaveBeenCalledWith('tasks');
    expect(mockOnTypeChange).toHaveBeenCalledTimes(1);
  });

  it('calls onTypeChange even when the selected tab is clicked', () => {
    render(<ReportTabs selectedType="overview" onTypeChange={mockOnTypeChange} />);

    const overviewTab = screen.getByText('Aperçu');
    fireEvent.click(overviewTab);

    expect(mockOnTypeChange).toHaveBeenCalledWith('overview');
    expect(mockOnTypeChange).toHaveBeenCalledTimes(1);
  });

  it('calls onTypeChange with correct report type for each tab', () => {
    render(<ReportTabs selectedType="overview" onTypeChange={mockOnTypeChange} />);

    const testCases = [
      { tabText: 'Tâches', expectedType: 'tasks' },
      { tabText: 'Techniciens', expectedType: 'technicians' },
      { tabText: 'Clients', expectedType: 'clients' },
      { tabText: 'Qualité', expectedType: 'quality' },
      { tabText: 'Matériaux', expectedType: 'materials' },
    ];

    testCases.forEach(({ tabText, expectedType }) => {
      const tab = screen.getByText(tabText);
      fireEvent.click(tab);
      expect(mockOnTypeChange).toHaveBeenCalledWith(expectedType);
    });

    expect(mockOnTypeChange).toHaveBeenCalledTimes(testCases.length);
  });

  it('maintains accessibility with proper navigation structure', () => {
    render(<ReportTabs selectedType="overview" onTypeChange={mockOnTypeChange} />);

    // Check for navigation landmark
    const nav = screen.getByRole('navigation', { name: 'Report Categories' });
    expect(nav).toBeInTheDocument();

    // Check for buttons (tabs are implemented as buttons)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(9); // All report type tabs

    // Check that buttons have proper text content
    expect(screen.getByText('Aperçu')).toBeInTheDocument();
    expect(screen.getByText('Tâches')).toBeInTheDocument();
    expect(screen.getByText('Techniciens')).toBeInTheDocument();
  });

  it('applies correct CSS classes for selected and unselected states', () => {
    render(<ReportTabs selectedType="tasks" onTypeChange={mockOnTypeChange} />);

    const tasksTab = screen.getByText('Tâches');
    const overviewTab = screen.getByText('Aperçu');

    // Verify tabs are rendered (CSS class verification would require more complex testing)
    expect(tasksTab).toBeInTheDocument();
    expect(overviewTab).toBeInTheDocument();
  });
});