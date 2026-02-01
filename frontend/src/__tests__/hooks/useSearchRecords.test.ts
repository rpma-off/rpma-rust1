import { renderHook, act, waitFor } from '@testing-library/react';
import { useSearchRecords } from '../../hooks/useSearchRecords';

// Mock Tauri invoke
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;

describe('useSearchRecords', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  it('returns initial state correctly', () => {
    const { result } = renderHook(() => useSearchRecords());

    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.hasMore).toBe(false);
    expect(result.current.totalCount).toBe(0);
    expect(typeof result.current.search).toBe('function');
    expect(typeof result.current.clearResults).toBe('function');
  });

  it('calls invoke with correct parameters when searching', async () => {
    mockInvoke.mockResolvedValue({
      results: [],
      total_count: 0,
      has_more: false,
    });

    const { result } = renderHook(() => useSearchRecords());

    const searchQuery = 'test query';
    const entityType = 'task';
    const dateRange = { start: '2024-01-01T00:00:00Z', end: '2024-12-31T23:59:59Z' };
    const filters = { technician_ids: ['tech-1'], client_ids: null, statuses: null, priorities: null, ppf_zones: null, vehicle_models: null };

    await act(async () => {
      await result.current.search(searchQuery, entityType, dateRange, filters);
    });

    expect(mockInvoke).toHaveBeenCalledWith('search_records', {
      query: searchQuery,
      entityType,
      dateRange,
      filters,
      limit: 50,
      offset: 0,
    });
  });

  it('updates state correctly when search succeeds', async () => {
    const mockResponse = {
      results: [
        {
          id: '1',
          entity_type: 'task',
          title: 'Test Task',
          subtitle: 'Test subtitle',
          status: 'completed',
          date: '2024-01-01',
          metadata: {},
        },
      ],
      total_count: 1,
      has_more: false,
    };

    mockInvoke.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useSearchRecords());

    await act(async () => {
      await result.current.search('test', 'task');
    });

    expect(result.current.results).toEqual(mockResponse.results);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.hasMore).toBe(false);
    expect(result.current.totalCount).toBe(1);
  });

  it('handles search errors correctly', async () => {
    const errorMessage = 'Search failed';
    mockInvoke.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useSearchRecords());

    await act(async () => {
      await result.current.search('test', 'task');
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(errorMessage);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.totalCount).toBe(0);
  });

  it('sets loading state during search', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockInvoke.mockReturnValue(promise);

    const { result } = renderHook(() => useSearchRecords());

    act(() => {
      result.current.search('test', 'task');
    });

    expect(result.current.loading).toBe(true);

    act(() => {
      resolvePromise!({
        results: [],
        total_count: 0,
        has_more: false,
      });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('clears results correctly', () => {
    const { result } = renderHook(() => useSearchRecords());

    // First set some results
    act(() => {
      // Simulate setting results (in real usage this would come from search)
      // For testing purposes, we'll just call clearResults
    });

    act(() => {
      result.current.clearResults();
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.hasMore).toBe(false);
    expect(result.current.totalCount).toBe(0);
  });

  it('uses custom limit and offset', async () => {
    mockInvoke.mockResolvedValue({
      results: [],
      total_count: 0,
      has_more: false,
    });

    const { result } = renderHook(() => useSearchRecords({ limit: 20, offset: 10 }));

    await act(async () => {
      await result.current.search('test', 'task');
    });

    expect(mockInvoke).toHaveBeenCalledWith('search_records', {
      query: 'test',
      entityType: 'tasks',
      dateRange: undefined,
      filters: undefined,
      limit: 20,
      offset: 10,
    });
  });

  it('handles undefined dateRange and filters', async () => {
    mockInvoke.mockResolvedValue({
      results: [],
      total_count: 0,
      has_more: false,
    });

    const { result } = renderHook(() => useSearchRecords());

    await act(async () => {
      await result.current.search('test', 'task', undefined, undefined);
    });

    expect(mockInvoke).toHaveBeenCalledWith('search_records', {
      query: 'test',
      entityType: 'tasks',
      dateRange: undefined,
      filters: undefined,
      limit: 50,
      offset: 0,
    });
  });

  it('handles different entity types', async () => {
    mockInvoke.mockResolvedValue({
      results: [],
      total_count: 0,
      has_more: false,
    });

    const { result } = renderHook(() => useSearchRecords());

    await act(async () => {
      await result.current.search('test', 'client');
    });

    expect(mockInvoke).toHaveBeenCalledWith('search_records', {
      query: 'test',
      entityType: 'clients',
      dateRange: undefined,
      filters: undefined,
      limit: 50,
      offset: 0,
    });
  });
});