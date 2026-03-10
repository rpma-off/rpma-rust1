import { useState, useCallback } from 'react';
import { useAuth } from '@/domains/auth';
import { quotesIpc } from '@/domains/quotes/ipc/quotes.ipc';
import type { JsonObject } from '@/types/json';
import type {
  Quote,
  CreateQuoteItemRequest,
  UpdateQuoteItemRequest,
} from '@/types/quote.types';

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
        );
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

  const updateItem = useCallback(
    async (quoteId: string, itemId: string, data: UpdateQuoteItemRequest): Promise<Quote | null> => {
      if (!user?.token) return null;
      try {
        setLoading(true);
        const result = await quotesIpc.updateItem(
          quoteId,
          itemId,
          data as unknown as JsonObject,
        );
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

  const deleteItem = useCallback(
    async (quoteId: string, itemId: string): Promise<Quote | null> => {
      if (!user?.token) return null;
      try {
        setLoading(true);
        const result = await quotesIpc.deleteItem(quoteId, itemId);
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

  return { addItem, updateItem, deleteItem, loading };
}
