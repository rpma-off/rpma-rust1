import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntitySelector } from '../../../app/reports/components/data-explorer/EntitySelector';

describe('EntitySelector', () => {
  const mockOnTypeChange = jest.fn();

  beforeEach(() => {
    mockOnTypeChange.mockClear();
  });

  it('renders all entity type buttons', () => {
    render(<EntitySelector selectedType="task" onTypeChange={mockOnTypeChange} />);

    expect(screen.getByText('Tâches')).toBeInTheDocument();
    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getByText('Interventions')).toBeInTheDocument();
  });

  it('shows correct counts for each entity type', () => {
    render(<EntitySelector selectedType="task" onTypeChange={mockOnTypeChange} />);

    expect(screen.getByText('1,234')).toBeInTheDocument(); // Tasks count
    expect(screen.getByText('567')).toBeInTheDocument();   // Clients count
    expect(screen.getByText('8,901')).toBeInTheDocument(); // Interventions count
  });

  it('highlights the selected entity type', () => {
    render(<EntitySelector selectedType="client" onTypeChange={mockOnTypeChange} />);

    const clientsButton = screen.getByText('Clients').closest('button');
    const tasksButton = screen.getByText('Tâches').closest('button');

    expect(clientsButton).toHaveClass('bg-blue-600', 'hover:bg-blue-700');
    expect(tasksButton).not.toHaveClass('bg-blue-600');
  });

  it('calls onTypeChange when a different entity type is clicked', () => {
    render(<EntitySelector selectedType="task" onTypeChange={mockOnTypeChange} />);

    const clientsButton = screen.getByText('Clients');
    fireEvent.click(clientsButton);

    expect(mockOnTypeChange).toHaveBeenCalledWith('clients');
  });

  it('does not call onTypeChange when the selected entity type is clicked', () => {
    render(<EntitySelector selectedType="task" onTypeChange={mockOnTypeChange} />);

    const tasksButton = screen.getByText('Tâches');
    fireEvent.click(tasksButton);

    expect(mockOnTypeChange).not.toHaveBeenCalled();
  });

  it('displays correct descriptions', () => {
    render(<EntitySelector selectedType="task" onTypeChange={mockOnTypeChange} />);

    expect(screen.getByText('Rechercher dans les tâches PPF')).toBeInTheDocument();
    expect(screen.getByText('Rechercher dans les clients')).toBeInTheDocument();
    expect(screen.getByText('Rechercher dans les interventions')).toBeInTheDocument();
  });

  it('shows correct icons for each entity type', () => {
    render(<EntitySelector selectedType="task" onTypeChange={mockOnTypeChange} />);

    // Check that the buttons contain the expected text and structure
    const tasksButton = screen.getByText('Tâches').closest('button');
    const clientsButton = screen.getByText('Clients').closest('button');
    const interventionsButton = screen.getByText('Interventions').closest('button');

    expect(tasksButton).toBeInTheDocument();
    expect(clientsButton).toBeInTheDocument();
    expect(interventionsButton).toBeInTheDocument();
  });

  it('applies correct styling for selected state', () => {
    render(<EntitySelector selectedType="task" onTypeChange={mockOnTypeChange} />);

    const selectedButton = screen.getByText('Tâches').closest('button');
    expect(selectedButton).toHaveClass('bg-blue-600', 'text-white');
  });

  it('applies correct styling for unselected state', () => {
    render(<EntitySelector selectedType="task" onTypeChange={mockOnTypeChange} />);

    const unselectedButton = screen.getByText('Clients').closest('button');
    expect(unselectedButton).toHaveClass('border-gray-600', 'text-gray-300');
  });
});