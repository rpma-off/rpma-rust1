import { safeInvoke, invalidatePattern } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import { signalMutation } from '@/lib/data-freshness';
import { runWithMutationEffects } from '@/lib/ipc/utils';
import { validateQuote, validateQuoteList, validateQuoteAcceptResponse } from '@/lib/validation/backend-type-guards';
import type { QuoteStats } from '@/lib/backend';
import type { Quote, QuoteListResponse, QuoteAcceptResponse } from '@/types/quote.types';
import type { JsonObject, JsonValue } from '@/types/json';

const quoteMutationEffects = {
  invalidate: ['quote:'],
  signal: ['quotes'],
} as const;

export const quotesIpc = {
  getStats: async (): Promise<QuoteStats> => {
    return safeInvoke<QuoteStats>(IPC_COMMANDS.QUOTE_GET_STATS, { request: {} });
  },

  create: async (data: JsonObject): Promise<Quote> =>
    runWithMutationEffects(() => safeInvoke<Quote>(IPC_COMMANDS.QUOTE_CREATE, {
      request: { data }
    }, validateQuote), quoteMutationEffects),

  get: async (id: string): Promise<Quote | null> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.QUOTE_GET, {
      request: { id }
    });
    if (result === null || result === undefined) return null;
    return validateQuote(result);
  },

  list: async (filters: JsonObject): Promise<QuoteListResponse> => {
    // Map flat filters to nested pagination expected by backend QuoteQuery
    const { page, limit, sort_by, sort_order, ...queryFilters } = filters;

    const request = {
      filters: {
        ...queryFilters,
        pagination: {
          page: page || 1,
          page_size: limit || 20,
          sort_by: sort_by || "created_at",
          sort_order: sort_order || "desc",
        },
      },
    };

    return safeInvoke<QuoteListResponse>(IPC_COMMANDS.QUOTE_LIST, {
      request
    }, validateQuoteList);
  },

  update: async (id: string, data: JsonObject): Promise<Quote> =>
    runWithMutationEffects(() => safeInvoke<Quote>(IPC_COMMANDS.QUOTE_UPDATE, {
      request: { id, data }
    }, validateQuote), quoteMutationEffects),

  delete: async (id: string): Promise<void> =>
    runWithMutationEffects(() => safeInvoke<void>(IPC_COMMANDS.QUOTE_DELETE, {
      request: { id }
    }), quoteMutationEffects),

  addItem: async (quoteId: string, item: JsonObject): Promise<Quote> =>
    runWithMutationEffects(() => safeInvoke<Quote>(IPC_COMMANDS.QUOTE_ITEM_ADD, {
      request: { quote_id: quoteId, item }
    }, validateQuote), quoteMutationEffects),

  updateItem: async (quoteId: string, itemId: string, data: JsonObject): Promise<Quote> =>
    runWithMutationEffects(() => safeInvoke<Quote>(IPC_COMMANDS.QUOTE_ITEM_UPDATE, {
      request: { quote_id: quoteId, item_id: itemId, data }
    }, validateQuote), quoteMutationEffects),

  deleteItem: async (quoteId: string, itemId: string): Promise<Quote> =>
    runWithMutationEffects(() => safeInvoke<Quote>(IPC_COMMANDS.QUOTE_ITEM_DELETE, {
      request: { quote_id: quoteId, item_id: itemId }
    }, validateQuote), quoteMutationEffects),

  markSent: async (id: string): Promise<Quote> =>
    runWithMutationEffects(() => safeInvoke<Quote>(IPC_COMMANDS.QUOTE_MARK_SENT, {
      request: { id }
    }, validateQuote), quoteMutationEffects),

  markAccepted: async (id: string): Promise<QuoteAcceptResponse> =>
    runWithMutationEffects(() => safeInvoke<QuoteAcceptResponse>(IPC_COMMANDS.QUOTE_MARK_ACCEPTED, {
      request: { id }
    }, validateQuoteAcceptResponse), quoteMutationEffects),

  markRejected: async (id: string): Promise<Quote> =>
    runWithMutationEffects(() => safeInvoke<Quote>(IPC_COMMANDS.QUOTE_MARK_REJECTED, {
      request: { id }
    }, validateQuote), quoteMutationEffects),

  markExpired: async (id: string): Promise<Quote> =>
    runWithMutationEffects(() => safeInvoke<Quote>(IPC_COMMANDS.QUOTE_MARK_EXPIRED, {
      request: { id }
    }, validateQuote), quoteMutationEffects),

  markChangesRequested: async (id: string): Promise<Quote> =>
    runWithMutationEffects(() => safeInvoke<Quote>(IPC_COMMANDS.QUOTE_MARK_CHANGES_REQUESTED, {
      request: { id }
    }, validateQuote), quoteMutationEffects),

  reopen: async (id: string): Promise<Quote> =>
    runWithMutationEffects(() => safeInvoke<Quote>(IPC_COMMANDS.QUOTE_REOPEN, {
      request: { id }
    }, validateQuote), quoteMutationEffects),

  duplicate: async (id: string): Promise<Quote> =>
    runWithMutationEffects(() => safeInvoke<Quote>(IPC_COMMANDS.QUOTE_DUPLICATE, {
      request: { id }
    }, validateQuote), quoteMutationEffects),

  exportPdf: async (id: string) => {
    return safeInvoke(IPC_COMMANDS.QUOTE_EXPORT_PDF, {
      request: { id }
    });
  },

  getAttachments: async (quoteId: string) => {
    return safeInvoke(IPC_COMMANDS.QUOTE_ATTACHMENTS_GET, {
      request: { quote_id: quoteId }
    });
  },

  createAttachment: async (quoteId: string, data: JsonObject) =>
    runWithMutationEffects(() => safeInvoke(IPC_COMMANDS.QUOTE_ATTACHMENT_CREATE, {
      request: { quote_id: quoteId, data }
    }), quoteMutationEffects),

  updateAttachment: async (quoteId: string, attachmentId: string, data: JsonObject) =>
    runWithMutationEffects(() => safeInvoke(IPC_COMMANDS.QUOTE_ATTACHMENT_UPDATE, {
      request: { quote_id: quoteId, attachment_id: attachmentId, data }
    }), quoteMutationEffects),

  deleteAttachment: async (quoteId: string, attachmentId: string) =>
    runWithMutationEffects(() => safeInvoke(IPC_COMMANDS.QUOTE_ATTACHMENT_DELETE, {
      request: { quote_id: quoteId, attachment_id: attachmentId }
    }), quoteMutationEffects),

  convertToTask: async (
    quoteId: string,
    vehicleInfo: {
      plate: string;
      make: string;
      model: string;
      year: string;
      vin: string;
      scheduledDate?: string;
      ppfZones?: string[];
    }
  ) => {
    const result = await safeInvoke(IPC_COMMANDS.QUOTE_CONVERT_TO_TASK, {
      request: {
        quote_id: quoteId,
        vehicle_plate: vehicleInfo.plate,
        vehicle_model: vehicleInfo.model,
        vehicle_make: vehicleInfo.make || null,
        vehicle_year: vehicleInfo.year || null,
        vehicle_vin: vehicleInfo.vin || null,
        scheduled_date: vehicleInfo.scheduledDate || null,
        ppf_zones: vehicleInfo.ppfZones || null,
      }
    });
    invalidatePattern('quote:');
    invalidatePattern('task:');
    signalMutation('quotes');
    signalMutation('tasks');
    return result;
  },
};
