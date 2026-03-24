import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PAGINATION } from "@/lib/constants";
import { quoteKeys } from "@/lib/query-keys";
import { useAuth } from "@/shared/hooks/useAuth";
import type { JsonObject, JsonValue } from "@/types/json";
import type {
  Quote,
  QuoteListResponse,
  QuoteFilters,
  CreateQuoteRequest,
  UpdateQuoteRequest,
} from "@/types/quote.types";
import { quotesIpc } from "@/domains/quotes/ipc/quotes.ipc";

const compactJsonObject = (
  value: Record<string, JsonValue | undefined>,
): JsonObject => {
  const entries = Object.entries(value).filter(
    ([, fieldValue]) => fieldValue !== undefined,
  ) as Array<[string, JsonValue]>;
  return Object.fromEntries(entries);
};

// --- useQuotesList ---

export interface UseQuotesListOptions {
  filters?: QuoteFilters;
  autoFetch?: boolean;
  onError?: (err: Error) => void;
}

export function useQuotesList(options: UseQuotesListOptions = {}) {
  const { user } = useAuth();
  const { filters: initialFilters = {}, autoFetch = true, onError } = options;

  const [filters, setFilters] = useState<QuoteFilters>({
    page: 1,
    limit: PAGINATION.DEFAULT_PAGE_SIZE,
    sort_by: "created_at",
    sort_order: "desc",
    ...initialFilters,
  });

  const {
    data,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: [...quoteKeys.lists(), filters],
    queryFn: async () => {
      const result = await quotesIpc.list(compactJsonObject(filters));
      return result as unknown as QuoteListResponse;
    },
    enabled: autoFetch && !!user?.token,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  // Surface query errors to the optional onError callback
  if (error instanceof Error && onError) {
    onError(error);
  }

  const updateFilters = useCallback((newFilters: Partial<QuoteFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  const goToPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const quotes = data?.data ?? [];
  const total = Number(data?.total ?? 0);

  return {
    quotes,
    total,
    loading,
    error: error instanceof Error ? error : null,
    filters,
    refetch,
    updateFilters,
    goToPage,
    hasNextPage: filters.page
      ? filters.page * (filters.limit ?? 20) < total
      : false,
    hasPreviousPage: (filters.page ?? 1) > 1,
  };
}

// --- useQuote ---

export function useQuote(id: string | null) {
  const { user } = useAuth();

  const {
    data: quote = null,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: quoteKeys.byId(id ?? ""),
    queryFn: async () => {
      const result = await quotesIpc.get(id!);
      const q = result as unknown as Quote;
      return q?.id ? q : null;
    },
    enabled: !!id && !!user?.token,
    staleTime: 60_000,
  });

  return {
    quote,
    loading,
    error: error instanceof Error ? error : null,
    refetch,
  };
}

// --- useCreateQuote ---

export function useCreateQuote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: CreateQuoteRequest): Promise<Quote> => {
      if (!user?.token) throw new Error("Not authenticated");
      if (process.env.NODE_ENV === "development") {
        console.debug("[quote_create] payload keys:", Object.keys(data));
      }
      const result = await quotesIpc.create(data as unknown as JsonObject);
      const quote = result as unknown as Quote;
      if (!quote?.id) throw new Error("Invalid response from quote_create");
      return quote;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.stats() });
    },
  });

  return {
    createQuote: (data: CreateQuoteRequest) => mutation.mutateAsync(data),
    loading: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error : null,
  };
}

// --- useUpdateQuote ---

export function useUpdateQuote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateQuoteRequest;
    }): Promise<Quote | null> => {
      if (!user?.token) return null;
      const result = await quotesIpc.update(id, data as unknown as JsonObject);
      const quote = result as unknown as Quote;
      return quote?.id ? quote : null;
    },
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.byId(id) });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
    },
  });

  return {
    updateQuote: (id: string, data: UpdateQuoteRequest) =>
      mutation.mutateAsync({ id, data }),
    loading: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error : null,
  };
}

// --- useDeleteQuote ---

export function useDeleteQuote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: string): Promise<boolean> => {
      if (!user?.token) return false;
      await quotesIpc.delete(id);
      return true;
    },
    onSuccess: (_data, id) => {
      // Remove the deleted quote from cache immediately
      queryClient.removeQueries({ queryKey: quoteKeys.byId(id) });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.stats() });
    },
  });

  return {
    deleteQuote: (id: string) => mutation.mutateAsync(id),
    loading: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error : null,
  };
}
