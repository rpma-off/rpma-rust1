import { useState, useCallback } from 'react';
import { useAuth } from '@/domains/auth';
import { quotesIpc } from '@/domains/quotes/ipc/quotes.ipc';
import type {
  Quote,
  QuoteAcceptResponse,
} from '@/types/quote.types';

export function useQuoteStatus() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const markSent = useCallback(
    async (id: string): Promise<Quote | null> => {
      if (!user?.token) return null;
      try {
        setLoading(true);
        const result = await quotesIpc.markSent(id, user.token);
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

  const markAccepted = useCallback(
    async (id: string): Promise<QuoteAcceptResponse | null> => {
      if (!user?.token) return null;
      try {
        setLoading(true);
        const result = await quotesIpc.markAccepted(id, user.token);
        const response = result as QuoteAcceptResponse | null;
        return response?.quote?.id ? response : null;
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

  const markExpired = useCallback(
    async (id: string): Promise<Quote | null> => {
      if (!user?.token) return null;
      try {
        setLoading(true);
        const result = await quotesIpc.markExpired(id, user.token);
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

  const markChangesRequested = useCallback(
    async (id: string): Promise<Quote | null> => {
      if (!user?.token) return null;
      try {
        setLoading(true);
        const result = await quotesIpc.markChangesRequested(id, user.token);
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

  const reopen = useCallback(
    async (id: string): Promise<Quote | null> => {
      if (!user?.token) return null;
      try {
        setLoading(true);
        const result = await quotesIpc.reopen(id, user.token);
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

  return { markSent, markAccepted, markRejected, markExpired, markChangesRequested, reopen, loading };
}
