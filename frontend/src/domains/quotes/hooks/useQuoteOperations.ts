import { useState, useCallback } from 'react';
import { useAuth } from '@/domains/auth';
import { quotesIpc } from '@/domains/quotes/ipc/quotes.ipc';
import type {
  Quote,
  QuoteExportResponse,
} from '@/types/quote.types';

// --- useDuplicateQuote ---

export function useDuplicateQuote() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const duplicateQuote = useCallback(
    async (id: string): Promise<Quote | null> => {
      if (!user?.token) return null;
      try {
        setLoading(true);
        const result = await quotesIpc.duplicate(id, user.token);
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
        const result = await quotesIpc.exportPdf(id, user.token);
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

interface QuoteConvertResponse {
  task_id: string;
  task_number: string;
  quote_id: string;
}

interface VehicleInfo {
  plate: string;
  make: string;
  model: string;
  year: string;
  vin: string;
  scheduledDate?: string;
}

export function useConvertQuoteToTask() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const convertQuoteToTask = useCallback(
    async (
      quoteId: string,
      vehicleInfo: VehicleInfo
    ): Promise<QuoteConvertResponse | null> => {
      if (!user?.token) {
        setError(new Error('Not authenticated'));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await quotesIpc.convertToTask(quoteId, vehicleInfo, user.token);
        const response = result as QuoteConvertResponse | null;

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
