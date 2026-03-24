import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { quoteKeys } from "@/lib/query-keys";
import type {
  Quote,
  QuoteExportResponse,
  ConvertQuoteToTaskResponse,
} from "@/types/quote.types";
import { useAuth } from "@/shared/hooks/useAuth";
import { quotesIpc } from "@/domains/quotes/ipc/quotes.ipc";

// --- useQuoteStats ---

export interface QuoteStatsNormalized {
  total: number;
  draft: number;
  sent: number;
  accepted: number;
  rejected: number;
  expired: number;
  converted: number;
  monthlyCounts: Array<{ month: string; count: number }>;
}

export function useQuoteStats() {
  const { user } = useAuth();

  const {
    data: stats = null,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: quoteKeys.stats(),
    queryFn: async (): Promise<QuoteStatsNormalized> => {
      const raw = await quotesIpc.getStats();
      return {
        total: Number(raw.total),
        draft: Number(raw.draft),
        sent: Number(raw.sent),
        accepted: Number(raw.accepted),
        rejected: Number(raw.rejected),
        expired: Number(raw.expired),
        converted: Number(raw.converted),
        monthlyCounts: raw.monthly_counts.map((m) => ({
          month: m.month,
          count: Number(m.count),
        })),
      };
    },
    enabled: !!user?.token,
    staleTime: 60_000,
  });

  return { stats, loading, refetch };
}

// --- useDuplicateQuote ---

export function useDuplicateQuote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: string): Promise<Quote | null> => {
      if (!user?.token) return null;
      const result = await quotesIpc.duplicate(id);
      const quote = result as Quote | null;
      return quote?.id ? quote : null;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.stats() });
    },
  });

  return {
    duplicateQuote: (id: string) => mutation.mutateAsync(id),
    loading: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error : null,
  };
}

// --- useQuoteExportPdf ---

export function useQuoteExportPdf() {
  const { user } = useAuth();

  const mutation = useMutation({
    mutationFn: async (id: string): Promise<QuoteExportResponse | null> => {
      if (!user?.token) return null;
      const result = await quotesIpc.exportPdf(id);
      const response = result as QuoteExportResponse | null;
      return response?.file_path ? response : null;
    },
  });

  return {
    exportPdf: (id: string) => mutation.mutateAsync(id),
    loading: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error : null,
  };
}

// --- useConvertQuoteToTask ---

interface VehicleInfo {
  plate: string;
  make: string;
  model: string;
  year: string;
  vin: string;
  scheduledDate?: string;
  ppfZones?: string[];
}

export function useConvertQuoteToTask() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      quoteId,
      vehicleInfo,
    }: {
      quoteId: string;
      vehicleInfo: VehicleInfo;
    }): Promise<ConvertQuoteToTaskResponse | null> => {
      if (!user?.token) throw new Error("Not authenticated");
      const result = await quotesIpc.convertToTask(quoteId, vehicleInfo);
      const response = result as ConvertQuoteToTaskResponse | null;
      if (!response?.task_id) throw new Error("Conversion failed");
      return response;
    },
    onSuccess: (_data, { quoteId }) => {
      // Invalidate the specific quote (status changes to "converted")
      void queryClient.invalidateQueries({ queryKey: quoteKeys.byId(quoteId) });
      // Invalidate the list so the converted badge is reflected immediately
      void queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.stats() });
      // Also invalidate task list since a new task was created
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  return {
    convertQuoteToTask: (quoteId: string, vehicleInfo: VehicleInfo) =>
      mutation.mutateAsync({ quoteId, vehicleInfo }),
    loading: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error : null,
  };
}
