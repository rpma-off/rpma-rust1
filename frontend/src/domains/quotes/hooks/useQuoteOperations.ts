import { useState, useCallback } from 'react';
import type {
  Quote,
  QuoteExportResponse,
  ConvertQuoteToTaskResponse,
} from '@/types/quote.types';
import { useAuth } from '@/shared/hooks/useAuth';
import { quotesIpc } from '@/domains/quotes/ipc/quotes.ipc';

// --- useDuplicateQuote ---

export function useDuplicateQuote() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const duplicateQuote = useCallback(
    async (id: string): Promise<Quote | null> => {
      if (!user?.token) return null;
      try {
        setLoading(true);
        const result = await quotesIpc.duplicate(id);
        const quote = result as Quote | null;
        return quote?.id ? quote : null;
      } catch {
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.token],
  );

  return { duplicateQuote, loading };
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
        const result = await quotesIpc.exportPdf(id);
        const response = result as QuoteExportResponse | null;
        return response?.file_path ? response : null;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const convertQuoteToTask = useCallback(
    async (
      quoteId: string,
      vehicleInfo: VehicleInfo
    ): Promise<ConvertQuoteToTaskResponse | null> => {
      if (!user?.token) {
        setError(new Error('Not authenticated'));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await quotesIpc.convertToTask(quoteId, vehicleInfo);
        const response = result as ConvertQuoteToTaskResponse | null;

        if (response?.task_id) {
          return response;
        }

        setError(new Error('Conversion failed'));
        return null;
      } catch (err: unknown) {
        const errorObj = err instanceof Error ? err : new Error('Unknown error');
        setError(errorObj);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.token]
  );

  return { convertQuoteToTask, loading, error };
}
