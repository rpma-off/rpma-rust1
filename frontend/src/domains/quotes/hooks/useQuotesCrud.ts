import { useState, useEffect, useCallback } from 'react';
import { PAGINATION } from '@/lib/constants';
import { useMutationCounter } from '@/lib/data-freshness';
import { useAuth } from '@/shared/hooks/useAuth';
import type { JsonObject } from '@/types/json';
import type {
  Quote,
  QuoteListResponse,
  QuoteFilters,
  CreateQuoteRequest,
  UpdateQuoteRequest,
} from '@/types/quote.types';
import { normalizeError } from '@/types/utility.types';
import { quotesIpc } from '@/domains/quotes/ipc/quotes.ipc';

// --- useQuotesList ---

export interface UseQuotesListOptions {
  filters?: QuoteFilters;
  autoFetch?: boolean;
  onError?: (err: Error) => void;
}

export function useQuotesList(options: UseQuotesListOptions = {}) {
  const { user } = useAuth();
  const { filters: initialFilters = {}, autoFetch = true, onError } = options;
  const quotesMutations = useMutationCounter('quotes');

  const [filters, setFilters] = useState<QuoteFilters>({
    page: 1,
    limit: PAGINATION.DEFAULT_PAGE_SIZE,
    sort_by: 'created_at',
    sort_order: 'desc',
    ...initialFilters,
  });

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchQuotes = useCallback(async () => {
    if (!user?.token) return;
    try {
      setLoading(true);
      setError(null);
      const result = await quotesIpc.list(filters);
      const listResult = result as unknown as QuoteListResponse;
      if (listResult?.data) {
        setQuotes(listResult.data);
        setTotal(listResult.total);
      }
    } catch (err: unknown) {
      const normalized = normalizeError(err);
      setError(normalized);
      onError?.(normalized);
    } finally {
      setLoading(false);
    }
  }, [user?.token, filters, onError]);

  const updateFilters = useCallback((newFilters: Partial<QuoteFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  const goToPage = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchQuotes();
    }
  }, [fetchQuotes, autoFetch, quotesMutations]);

  return {
    quotes,
    total,
    loading,
    error,
    filters,
    refetch: fetchQuotes,
    updateFilters,
    goToPage,
    hasNextPage: filters.page ? filters.page * (filters.limit || 20) < total : false,
    hasPreviousPage: (filters.page || 1) > 1,
  };
}

// --- useQuote ---

export function useQuote(id: string | null) {
  const { user } = useAuth();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<Error | null>(null);

  const fetchQuote = useCallback(async () => {
    if (!id) {
      setQuote(null);
      setLoading(false);
      return;
    }
    if (!user?.token) {
      setLoading(true);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await quotesIpc.get(id);
      const quote = result as unknown as Quote;
      if (quote?.id) {
        setQuote(quote);
      }
    } catch (err: unknown) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }, [user?.token, id]);

  useEffect(() => {
    if (id) {
      fetchQuote();
    }
  }, [fetchQuote, id]);

  return { quote, loading, error, refetch: fetchQuote };
}

// --- useCreateQuote ---

export function useCreateQuote() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createQuote = useCallback(
    async (data: CreateQuoteRequest): Promise<Quote | null> => {
      if (!user?.token) return null;
      try {
        setLoading(true);
        setError(null);
        if (process.env.NODE_ENV === 'development') {
          console.debug('[quote_create] payload keys:', Object.keys(data));
        }
        const result = await quotesIpc.create(
          data as unknown as JsonObject,
        );
        const quote = result as unknown as Quote;
        if (quote?.id) {
          return quote;
        }
        return null;
      } catch (err: unknown) {
        const normalized = normalizeError(err);
        setError(normalized);
        throw normalized;
      } finally {
        setLoading(false);
      }
    },
    [user?.token],
  );

  return { createQuote, loading, error };
}

// --- useUpdateQuote ---

export function useUpdateQuote() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateQuote = useCallback(
    async (id: string, data: UpdateQuoteRequest): Promise<Quote | null> => {
      if (!user?.token) return null;
      try {
        setLoading(true);
        setError(null);
        const result = await quotesIpc.update(
          id,
          data as unknown as JsonObject,
        );
        const quote = result as unknown as Quote;
        if (quote?.id) {
          return quote;
        }
        return null;
      } catch (err: unknown) {
        setError(normalizeError(err));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.token],
  );

  return { updateQuote, loading, error };
}

// --- useDeleteQuote ---

export function useDeleteQuote() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteQuote = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user?.token) return false;
      try {
        setLoading(true);
        setError(null);
        await quotesIpc.delete(id);
        return true;
      } catch (err: unknown) {
        setError(normalizeError(err));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user?.token],
  );

  return { deleteQuote, loading, error };
}
