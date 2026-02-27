import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/domains/auth';
import { quotesIpc } from '@/domains/quotes/ipc/quotes.ipc';
import type { JsonObject } from '@/types/json';
import type {
  Quote,
  QuoteListResponse,
  QuoteFilters,
  CreateQuoteRequest,
  UpdateQuoteRequest,
  CreateQuoteItemRequest,
  UpdateQuoteItemRequest,
  QuoteAcceptResponse,
  QuoteExportResponse,
  ApiResponse,
} from '@/types/quote.types';
import { normalizeError } from '@/types/utility.types';

// --- useQuotesList ---

export interface UseQuotesListOptions {
  filters?: QuoteFilters;
  autoFetch?: boolean;
}

export function useQuotesList(options: UseQuotesListOptions = {}) {
  const { user } = useAuth();
  const { filters: initialFilters = {}, autoFetch = true } = options;

  const [filters, setFilters] = useState<QuoteFilters>({
    page: 1,
    limit: 20,
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
      const result = await quotesIpc.list(filters, user.token);
      const response = result as unknown as ApiResponse<QuoteListResponse>;
      if (response?.success && response.data) {
        setQuotes(response.data.data);
        setTotal(response.data.total);
      }
    } catch (err: unknown) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }, [user?.token, filters]);

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
  }, [fetchQuotes, autoFetch]);

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchQuote = useCallback(async () => {
    if (!user?.token || !id) return;
    try {
      setLoading(true);
      setError(null);
      const result = await quotesIpc.get(id, user.token);
      const response = result as unknown as ApiResponse<Quote>;
      if (response?.success && response.data) {
        setQuote(response.data);
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
          user.token,
        );
        const response = result as unknown as ApiResponse<Quote>;
        if (response?.success && response.data) {
          return response.data;
        }
        if (response?.error) {
          throw new Error(response.error.message);
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
          user.token,
        );
        const response = result as unknown as ApiResponse<Quote>;
        if (response?.success && response.data) {
          return response.data;
        }
        if (response?.error) {
          throw new Error(response.error.message);
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

  const deleteQuote = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user?.token) return false;
      try {
        setLoading(true);
        const result = await quotesIpc.delete(id, user.token);
        const response = result as unknown as ApiResponse<boolean>;
        return response?.success ?? false;
      } catch {
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user?.token],
  );

  return { deleteQuote, loading };
}

// --- useQuoteItems ---

export function useQuoteItems() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const addItem = useCallback(
    async (quoteId: string, item: CreateQuoteItemRequest): Promise<Quote | null> => {
      if (!user?.token) return null;
      try {
        setLoading(true);
        const result = await quotesIpc.addItem(
          quoteId,
          item as unknown as JsonObject,
          user.token,
        );
        const response = result as unknown as ApiResponse<Quote>;
        return response?.success ? (response.data ?? null) : null;
      } catch {
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.token],
  );

  const updateItem = useCallback(
    async (quoteId: string, itemId: string, data: UpdateQuoteItemRequest): Promise<Quote | null> => {
      if (!user?.token) return null;
      try {
        setLoading(true);
        const result = await quotesIpc.updateItem(
          quoteId,
          itemId,
          data as unknown as JsonObject,
          user.token,
        );
        const response = result as unknown as ApiResponse<Quote>;
        return response?.success ? (response.data ?? null) : null;
      } catch {
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.token],
  );

  const deleteItem = useCallback(
    async (quoteId: string, itemId: string): Promise<Quote | null> => {
      if (!user?.token) return null;
      try {
        setLoading(true);
        const result = await quotesIpc.deleteItem(quoteId, itemId, user.token);
        const response = result as unknown as ApiResponse<Quote>;
        return response?.success ? (response.data ?? null) : null;
      } catch {
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.token],
  );

  return { addItem, updateItem, deleteItem, loading };
}

// --- useQuoteStatus ---

export function useQuoteStatus() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const markSent = useCallback(
    async (id: string): Promise<Quote | null> => {
      if (!user?.token) return null;
      try {
        setLoading(true);
        const result = await quotesIpc.markSent(id, user.token);
        const response = result as unknown as ApiResponse<Quote>;
        return response?.success ? (response.data ?? null) : null;
      } catch {
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.token],
  );

  const markAccepted = useCallback(
    async (id: string): Promise<QuoteAcceptResponse | null> => {
      if (!user?.token) return null;
      try {
        setLoading(true);
        const result = await quotesIpc.markAccepted(id, user.token);
        const response = result as unknown as ApiResponse<QuoteAcceptResponse>;
        return response?.success ? (response.data ?? null) : null;
      } catch {
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.token],
  );

  const markRejected = useCallback(
    async (id: string): Promise<Quote | null> => {
      if (!user?.token) return null;
      try {
        setLoading(true);
        const result = await quotesIpc.markRejected(id, user.token);
        const response = result as unknown as ApiResponse<Quote>;
        return response?.success ? (response.data ?? null) : null;
      } catch {
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.token],
  );

  return { markSent, markAccepted, markRejected, loading };
}

// --- useQuoteExportPdf ---

export function useQuoteExportPdf() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const exportPdf = useCallback(
    async (id: string): Promise<QuoteExportResponse | null> => {
      if (!user?.token) return null;
      try {
        setLoading(true);
        const result = await quotesIpc.exportPdf(id, user.token);
        const response = result as unknown as ApiResponse<QuoteExportResponse>;
        return response?.success ? (response.data ?? null) : null;
      } catch {
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.token],
  );

  return { exportPdf, loading };
}
