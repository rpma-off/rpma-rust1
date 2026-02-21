import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntitySelector } from '@/domains/reports/components/data-explorer/EntitySelector';
import { useEntityCounts } from '@/hooks/useEntityCounts';

jest.mock('@/hooks/useEntityCounts');
const mockUseEntityCounts = useEntityCounts as jest.MockedFunction<typeof useEntityCounts>;

describe('EntitySelector', () => {
  const mockOnTypeChange = jest.fn();

  beforeEach(() => {
    mockOnTypeChange.mockClear();
    mockUseEntityCounts.mockReturnValue({
      counts: { tasks: 1234, clients: 567, interventions: 8901 },
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
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

    expect(clientsButton).toHaveClass('bg-green-500/20', 'text-green-400', 'border-green-500/50');
    expect(tasksButton).not.toHaveClass('bg-blue-500/20');
  });

  it('calls onTypeChange when a different entity type is clicked', () => {
    render(<EntitySelector selectedType="task" onTypeChange={mockOnTypeChange} />);

    const clientsButton = screen.getByText('Clients');
    fireEvent.click(clientsButton);

    expect(mockOnTypeChange).toHaveBeenCalledWith('client');
  });

  it('calls onTypeChange when the selected entity type is clicked', () => {
    render(<EntitySelector selectedType="task" onTypeChange={mockOnTypeChange} />);

    const tasksButton = screen.getByText('Tâches');
    fireEvent.click(tasksButton);

    expect(mockOnTypeChange).toHaveBeenCalledWith('task');
  });

  it('shows correct icons for each entity type', () => {
    render(<EntitySelector selectedType="task" onTypeChange={mockOnTypeChange} />);

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
    expect(selectedButton).toHaveClass('bg-blue-500/20', 'text-blue-400', 'border-blue-500/50');
  });

  it('applies correct styling for unselected state', () => {
    render(<EntitySelector selectedType="task" onTypeChange={mockOnTypeChange} />);

    const unselectedButton = screen.getByText('Clients').closest('button');
    expect(unselectedButton).toHaveClass('border-border/50', 'text-muted-foreground');
  });
});