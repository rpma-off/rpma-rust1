import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { quoteKeys } from "@/lib/query-keys";
import type { JsonObject } from "@/types/json";
import type {
  QuoteAttachment,
  CreateQuoteAttachmentRequest,
  UpdateQuoteAttachmentRequest,
} from "@/types/quote.types";
import { useAuth } from "@/shared/hooks/useAuth";
import { quotesIpc } from "@/domains/quotes/ipc/quotes.ipc";

// --- useQuoteAttachments ---

export function useQuoteAttachments(quoteId: string | null) {
  const { user } = useAuth();

  const {
    data: attachments = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: quoteKeys.attachments(quoteId ?? ""),
    queryFn: async () => {
      const result = await quotesIpc.getAttachments(quoteId!);
      return Array.isArray(result) ? (result as QuoteAttachment[]) : [];
    },
    enabled: !!user?.token && !!quoteId,
    staleTime: 60_000,
  });

  return {
    attachments,
    loading,
    error: error instanceof Error ? error : null,
    refetch,
  };
}

// --- useQuoteAttachmentActions ---
//
// quoteId is passed per-call (not at hook instantiation) so that a single hook
// instance can be reused across multiple quotes on the same page, and so that
// existing consumers do not need to be updated.

export function useQuoteAttachmentActions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = (quoteId: string) => {
    void queryClient.invalidateQueries({
      queryKey: quoteKeys.attachments(quoteId),
    });
  };

  const createMutation = useMutation({
    mutationFn: async ({
      quoteId,
      data,
    }: {
      quoteId: string;
      data: CreateQuoteAttachmentRequest;
    }): Promise<QuoteAttachment | null> => {
      if (!user?.token) return null;
      const result = await quotesIpc.createAttachment(
        quoteId,
        data as unknown as JsonObject,
      );
      const attachment = result as QuoteAttachment | null;
      return attachment?.id ? attachment : null;
    },
    onSuccess: (_data, { quoteId }) => invalidate(quoteId),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      quoteId,
      attachmentId,
      data,
    }: {
      quoteId: string;
      attachmentId: string;
      data: UpdateQuoteAttachmentRequest;
    }): Promise<QuoteAttachment | null> => {
      if (!user?.token) return null;
      const result = await quotesIpc.updateAttachment(
        quoteId,
        attachmentId,
        data as unknown as JsonObject,
      );
      const attachment = result as QuoteAttachment | null;
      return attachment?.id ? attachment : null;
    },
    onSuccess: (_data, { quoteId }) => invalidate(quoteId),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({
      quoteId,
      attachmentId,
    }: {
      quoteId: string;
      attachmentId: string;
    }): Promise<boolean> => {
      if (!user?.token) return false;
      const result = await quotesIpc.deleteAttachment(quoteId, attachmentId);
      return typeof result === "boolean" ? result : false;
    },
    onSuccess: (_data, { quoteId }) => invalidate(quoteId),
  });

  return {
    createAttachment: (quoteId: string, data: CreateQuoteAttachmentRequest) =>
      createMutation.mutateAsync({ quoteId, data }),

    updateAttachment: (
      quoteId: string,
      attachmentId: string,
      data: UpdateQuoteAttachmentRequest,
    ) => updateMutation.mutateAsync({ quoteId, attachmentId, data }),

    deleteAttachment: (quoteId: string, attachmentId: string) =>
      deleteMutation.mutateAsync({ quoteId, attachmentId }),

    loading:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,

    error:
      createMutation.error instanceof Error
        ? createMutation.error
        : updateMutation.error instanceof Error
          ? updateMutation.error
          : deleteMutation.error instanceof Error
            ? deleteMutation.error
            : null,
  };
}
