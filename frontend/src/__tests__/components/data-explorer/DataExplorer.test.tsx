import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DataExplorer } from '@/domains/reports/components/data-explorer/DataExplorer';
import { useSearchRecords } from '@/shared/hooks/useSearchRecords';

// Mock the hook
jest.mock('@/shared/hooks/useSearchRecords');
const mockUseSearchRecords = useSearchRecords as jest.MockedFunction<typeof useSearchRecords>;

describe('DataExplorer', () => {
  const mockSearch = jest.fn();
  const mockClearResults = jest.fn();

  const defaultProps = {
    dateRange: {
      start: new Date('2024-01-01'),
      end: new Date('2024-12-31'),
    },
    filters: {},
  };

  beforeEach(() => {
    mockUseSearchRecords.mockReturnValue({
      search: mockSearch,
      results: [],
      loading: false,
      error: null,
      hasMore: false,
      totalCount: 0,
      clearResults: mockClearResults,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the DataExplorer component', () => {
    render(<DataExplorer {...defaultProps} />);

    expect(screen.getByText('Exploration des Données')).toBeInTheDocument();
    expect(screen.getByText('Recherchez et explorez les tâches, clients et interventions')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Rechercher dans les tâches...')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    mockUseSearchRecords.mockReturnValue({
      search: mockSearch,
      results: [],
      loading: true,
      error: null,
      hasMore: false,
      totalCount: 0,
      clearResults: mockClearResults,
    });

    render(<DataExplorer {...defaultProps} />);

    expect(screen.getByText('Recherche en cours...')).toBeInTheDocument();
  });

  it('displays error state', () => {
    mockUseSearchRecords.mockReturnValue({
      search: mockSearch,
      results: [],
      loading: false,
      error: 'Search failed',
      hasMore: false,
      totalCount: 0,
      clearResults: mockClearResults,
    });

    render(<DataExplorer {...defaultProps} />);

    expect(screen.getByText('Erreur de recherche')).toBeInTheDocument();
    expect(screen.getByText('Search failed')).toBeInTheDocument();
  });

  it('displays empty state when no results', () => {
    render(<DataExplorer {...defaultProps} />);

    expect(screen.getByText('Aucun résultat trouvé')).toBeInTheDocument();
  });

  it('calls search when entity type changes', async () => {
    render(<DataExplorer {...defaultProps} />);

    const clientButton = screen.getByText('Clients');
    fireEvent.click(clientButton);

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith(
        '',
        'client',
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  it('calls search when search query changes', async () => {
    render(<DataExplorer {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Rechercher dans les tâches...');
    fireEvent.change(searchInput, { target: { value: 'test search' } });

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith(
        'test search',
        'task',
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  it('displays results correctly', () => {
    const mockResults = [
      {
        id: '1',
        entity_type: 'task' as const,
        title: 'Test Task',
        subtitle: 'Client: Test Client • Technicien: Test Tech',
        status: 'completed',
        date: '2024-01-15',
        metadata: {},
      },
    ];

    mockUseSearchRecords.mockReturnValue({
      search: mockSearch,
      results: mockResults,
      loading: false,
      error: null,
      hasMore: false,
      totalCount: 1,
      clearResults: mockClearResults,
    });

    render(<DataExplorer {...defaultProps} />);

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('Client: Test Client • Technicien: Test Tech')).toBeInTheDocument();
    expect(screen.getByText('Terminé')).toBeInTheDocument();
  });
});
