import { useMutation, useQueryClient } from "@tanstack/react-query";
import { quoteKeys } from "@/lib/query-keys";
import type { JsonObject } from "@/types/json";
import type {
  Quote,
  CreateQuoteItemRequest,
  UpdateQuoteItemRequest,
} from "@/types/quote.types";
import { useAuth } from "@/shared/hooks/useAuth";
import { quotesIpc } from "@/domains/quotes/ipc/quotes.ipc";

export function useQuoteItems() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidateQuote = (quoteId: string) => {
    void queryClient.invalidateQueries({ queryKey: quoteKeys.byId(quoteId) });
    void queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
  };

  const addItemMutation = useMutation({
    mutationFn: async ({
      quoteId,
      item,
    }: {
      quoteId: string;
      item: CreateQuoteItemRequest;
    }): Promise<Quote | null> => {
      if (!user?.token) return null;
      const result = await quotesIpc.addItem(
        quoteId,
        item as unknown as JsonObject,
      );
      const quote = result as Quote | null;
      return quote?.id ? quote : null;
    },
    onSuccess: (_data, { quoteId }) => invalidateQuote(quoteId),
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({
      quoteId,
      itemId,
      data,
    }: {
      quoteId: string;
      itemId: string;
      data: UpdateQuoteItemRequest;
    }): Promise<Quote | null> => {
      if (!user?.token) return null;
      const result = await quotesIpc.updateItem(
        quoteId,
        itemId,
        data as unknown as JsonObject,
      );
      const quote = result as Quote | null;
      return quote?.id ? quote : null;
    },
    onSuccess: (_data, { quoteId }) => invalidateQuote(quoteId),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async ({
      quoteId,
      itemId,
    }: {
      quoteId: string;
      itemId: string;
    }): Promise<Quote | null> => {
      if (!user?.token) return null;
      const result = await quotesIpc.deleteItem(quoteId, itemId);
      const quote = result as Quote | null;
      return quote?.id ? quote : null;
    },
    onSuccess: (_data, { quoteId }) => invalidateQuote(quoteId),
  });

  return {
    addItem: (quoteId: string, item: CreateQuoteItemRequest) =>
      addItemMutation.mutateAsync({ quoteId, item }),

    updateItem: (
      quoteId: string,
      itemId: string,
      data: UpdateQuoteItemRequest,
    ) => updateItemMutation.mutateAsync({ quoteId, itemId, data }),

    deleteItem: (quoteId: string, itemId: string) =>
      deleteItemMutation.mutateAsync({ quoteId, itemId }),

    loading:
      addItemMutation.isPending ||
      updateItemMutation.isPending ||
      deleteItemMutation.isPending,
  };
}
