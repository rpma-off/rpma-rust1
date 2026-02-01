import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AuthSecureStorage } from '@/lib/secureStorage';
import type {
  EntityType,
  SearchResult,
  SearchResponse,
  DateRange,
  SearchFilters
} from '@/lib/backend';

interface UseSearchRecordsOptions {
  limit?: number;
  offset?: number;
}

interface UseSearchRecordsReturn {
  search: (query: string, entityType: EntityType, dateRange?: DateRange, filters?: SearchFilters) => Promise<void>;
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  clearResults: () => void;
}

export function useSearchRecords(options: UseSearchRecordsOptions = {}): UseSearchRecordsReturn {
  const { limit = 50, offset = 0 } = options;

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const search = useCallback(async (
    query: string,
    entityType: EntityType,
    dateRange?: DateRange,
    filters?: SearchFilters
  ) => {
    try {
      setLoading(true);
      setError(null);

      const session = await AuthSecureStorage.getSession();
      if (!session?.token) {
        throw new Error('Authentication required');
      }

      const response: SearchResponse = await invoke('search_records', {
        query,
        entityType,
        dateRange,
        filters,
        limit,
        offset,
        sessionToken: session.token,
      });

      setResults(response.results);
      setHasMore(response.has_more);
      setTotalCount(Number(response.total_count));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la recherche';
      setError(errorMessage);
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
    setHasMore(false);
    setTotalCount(0);
  }, []);

  return {
    search,
    results,
    loading,
    error,
    hasMore,
    totalCount,
    clearResults,
  };
}