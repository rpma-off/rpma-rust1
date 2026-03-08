import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/domains/auth';
import { quotesIpc } from '@/domains/quotes/ipc/quotes.ipc';
import type { JsonObject } from '@/types/json';
import type {
  QuoteAttachment,
  CreateQuoteAttachmentRequest,
  UpdateQuoteAttachmentRequest,
} from '@/types/quote.types';
import { normalizeError } from '@/types/utility.types';

// --- useQuoteAttachments ---

export function useQuoteAttachments(quoteId: string | null) {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<QuoteAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAttachments = useCallback(async () => {
    if (!user?.token || !quoteId) return;
      try {
        setLoading(true);
        setError(null);
        const result = await quotesIpc.getAttachments(quoteId, user.token);
        setAttachments(Array.isArray(result) ? (result as QuoteAttachment[]) : []);
      } catch (err: unknown) {
        setError(normalizeError(err));
      } finally {
      setLoading(false);
    }
  }, [user?.token, quoteId]);

  useEffect(() => {
    if (quoteId) {
      fetchAttachments();
    }
  }, [fetchAttachments, quoteId]);

  return { attachments, loading, error, refetch: fetchAttachments };
}

// --- useQuoteAttachmentActions ---

export function useQuoteAttachmentActions() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createAttachment = useCallback(
    async (quoteId: string, data: CreateQuoteAttachmentRequest): Promise<QuoteAttachment | null> => {
      if (!user?.token) return null;
      try {
        setLoading(true);
        setError(null);
        const result = await quotesIpc.createAttachment(
          quoteId,
          data as unknown as JsonObject,
          user.token,
        );
        const attachment = result as QuoteAttachment | null;
        return attachment?.id ? attachment : null;
      } catch (err: unknown) {
        setError(normalizeError(err));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.token],
  );

  const updateAttachment = useCallback(
    async (quoteId: string, attachmentId: string, data: UpdateQuoteAttachmentRequest): Promise<QuoteAttachment | null> => {
      if (!user?.token) return null;
      try {
        setLoading(true);
        setError(null);
        const result = await quotesIpc.updateAttachment(
          quoteId,
          attachmentId,
          data as unknown as JsonObject,
          user.token,
        );
        const attachment = result as QuoteAttachment | null;
        return attachment?.id ? attachment : null;
      } catch (err: unknown) {
        setError(normalizeError(err));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.token],
  );

  const deleteAttachment = useCallback(
    async (quoteId: string, attachmentId: string): Promise<boolean> => {
      if (!user?.token) return false;
      try {
        setLoading(true);
        setError(null);
        const result = await quotesIpc.deleteAttachment(quoteId, attachmentId, user.token);
        return typeof result === 'boolean' ? result : false;
      } catch (err: unknown) {
        setError(normalizeError(err));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user?.token],
  );

  return { createAttachment, updateAttachment, deleteAttachment, loading, error };
}
