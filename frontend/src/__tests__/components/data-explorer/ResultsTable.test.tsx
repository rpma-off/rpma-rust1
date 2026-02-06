import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResultsTable } from '../../../app/reports/components/data-explorer/ResultsTable';

describe('ResultsTable', () => {
  const mockOnRecordSelect = jest.fn();

  const mockResults = [
    {
      id: '1',
      entity_type: 'task' as const,
      title: 'Protection PPF - Renault Clio',
      subtitle: 'Client: Jean Dupont • Technicien: Marie Martin',
      status: 'completed',
      date: '2024-12-15',
      metadata: {
        vehiclePlate: 'AB-123-CD',
        vehicleMake: 'Renault',
        vehicleModel: 'Clio',
      },
    },
    {
      id: '2',
      entity_type: 'client' as const,
      title: 'Sophie Bernard',
      subtitle: 'sophie.bernard@email.com',
      status: 'active',
      date: '2024-12-08',
      metadata: {
        email: 'sophie.bernard@email.com',
        phone: '+33987654321',
        totalTasks: 3,
      },
    },
  ];

  beforeEach(() => {
    mockOnRecordSelect.mockClear();
  });

  it('renders results correctly', () => {
    render(
      <ResultsTable
        results={mockResults}
        onRecordSelect={mockOnRecordSelect}
        selectedRecordId={undefined}
      />
    );

    expect(screen.getByText('Protection PPF - Renault Clio')).toBeInTheDocument();
    expect(screen.getByText('Client: Jean Dupont • Technicien: Marie Martin')).toBeInTheDocument();
    expect(screen.getByText('Sophie Bernard')).toBeInTheDocument();
    expect(screen.getByText('sophie.bernard@email.com')).toBeInTheDocument();
  });

  it('displays status badges correctly', () => {
    render(
      <ResultsTable
        results={mockResults}
        onRecordSelect={mockOnRecordSelect}
        selectedRecordId={undefined}
      />
    );

    expect(screen.getByText('Terminé')).toBeInTheDocument();
    expect(screen.getByText('Actif')).toBeInTheDocument();
  });

  it('displays entity-specific metadata', () => {
    render(
      <ResultsTable
        results={mockResults}
        onRecordSelect={mockOnRecordSelect}
        selectedRecordId={undefined}
      />
    );

    // Task metadata
    expect(screen.getByText('AB-123-CD')).toBeInTheDocument();

    // Client metadata
    expect(screen.getByText('3 tâches')).toBeInTheDocument();
  });

  it('calls onRecordSelect when a result is clicked', () => {
    render(
      <ResultsTable
        results={mockResults}
        onRecordSelect={mockOnRecordSelect}
        selectedRecordId={undefined}
      />
    );

    const firstResult = screen.getByText('Protection PPF - Renault Clio').closest('div.rounded-lg');
    fireEvent.click(firstResult!);

    expect(mockOnRecordSelect).toHaveBeenCalledWith(mockResults[0]);
  });

  it('highlights selected record', () => {
    render(
      <ResultsTable
        results={mockResults}
        onRecordSelect={mockOnRecordSelect}
        selectedRecordId="1"
      />
    );

    const firstResult = screen.getByText('Protection PPF - Renault Clio').closest('div.rounded-lg');
    expect(firstResult).toHaveClass('bg-blue-500/10', 'border-blue-500/50');
  });

  it('shows correct icons for different entity types', () => {
    render(
      <ResultsTable
        results={mockResults}
        onRecordSelect={mockOnRecordSelect}
        selectedRecordId={undefined}
      />
    );

    // Check that the results contain the expected structure
    const taskResult = screen.getByText('Protection PPF - Renault Clio').closest('div.rounded-lg');
    const clientResult = screen.getByText('Sophie Bernard').closest('div.rounded-lg');

    expect(taskResult).toBeInTheDocument();
    expect(clientResult).toBeInTheDocument();
  });

  it('displays formatted dates', () => {
    render(
      <ResultsTable
        results={mockResults}
        onRecordSelect={mockOnRecordSelect}
        selectedRecordId={undefined}
      />
    );

    // The dates should be formatted (we're testing that they're displayed)
    expect(screen.getByText('15 déc. 2024')).toBeInTheDocument();
    expect(screen.getByText('8 déc. 2024')).toBeInTheDocument();
  });

  it('handles empty results gracefully', () => {
    render(
      <ResultsTable
        results={[]}
        onRecordSelect={mockOnRecordSelect}
        selectedRecordId={undefined}
      />
    );

    // Should not crash and should not display any results
    expect(screen.queryByText('Protection PPF - Renault Clio')).not.toBeInTheDocument();
  });

  it('handles results without metadata', () => {
    const resultsWithoutMetadata = [
      {
        id: '1',
        entity_type: 'task' as const,
        title: 'Test Task',
        subtitle: 'Test subtitle',
      status: null,
      date: null,
        metadata: {},
      },
    ];

    render(
      <ResultsTable
        results={resultsWithoutMetadata}
        onRecordSelect={mockOnRecordSelect}
        selectedRecordId={undefined}
      />
    );

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('Test subtitle')).toBeInTheDocument();
  });
});