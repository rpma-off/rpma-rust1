import { safeInvoke, invalidatePattern } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import { signalMutation } from '@/lib/data-freshness';
import { validateQuote, validateQuoteList, validateQuoteAcceptResponse } from '@/lib/validation/backend-type-guards';
import type { Quote, QuoteListResponse, QuoteAcceptResponse } from '@/types/quote.types';
import type { QuoteStats } from '@/lib/backend';
import type { JsonObject, JsonValue } from '@/types/json';

export const quotesIpc = {
  getStats: async (): Promise<QuoteStats> => {
    return safeInvoke<QuoteStats>(IPC_COMMANDS.QUOTE_GET_STATS, {});
  },

  create: async (data: JsonObject): Promise<Quote> => {
    const result = await safeInvoke<Quote>(IPC_COMMANDS.QUOTE_CREATE, {
      request: { data }
    }, validateQuote);
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  get: async (id: string): Promise<Quote | null> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.QUOTE_GET, {
      request: { id }
    });
    if (result === null || result === undefined) return null;
    return validateQuote(result);
  },

  list: async (filters: JsonObject): Promise<QuoteListResponse> => {
    return safeInvoke<QuoteListResponse>(IPC_COMMANDS.QUOTE_LIST, {
      request: { filters }
    }, validateQuoteList);
  },

  update: async (id: string, data: JsonObject): Promise<Quote> => {
    const result = await safeInvoke<Quote>(IPC_COMMANDS.QUOTE_UPDATE, {
      request: { id, data }
    }, validateQuote);
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  delete: async (id: string): Promise<void> => {
    await safeInvoke<void>(IPC_COMMANDS.QUOTE_DELETE, {
      request: { id }
    });
    invalidatePattern('quote:');
    signalMutation('quotes');
  },

  addItem: async (quoteId: string, item: JsonObject): Promise<Quote> => {
    const result = await safeInvoke<Quote>(IPC_COMMANDS.QUOTE_ITEM_ADD, {
      request: { quote_id: quoteId, item }
    }, validateQuote);
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  updateItem: async (quoteId: string, itemId: string, data: JsonObject): Promise<Quote> => {
    const result = await safeInvoke<Quote>(IPC_COMMANDS.QUOTE_ITEM_UPDATE, {
      request: { quote_id: quoteId, item_id: itemId, data }
    }, validateQuote);
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  deleteItem: async (quoteId: string, itemId: string): Promise<Quote> => {
    const result = await safeInvoke<Quote>(IPC_COMMANDS.QUOTE_ITEM_DELETE, {
      request: { quote_id: quoteId, item_id: itemId }
    }, validateQuote);
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  markSent: async (id: string): Promise<Quote> => {
    const result = await safeInvoke<Quote>(IPC_COMMANDS.QUOTE_MARK_SENT, {
      request: { id }
    }, validateQuote);
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  markAccepted: async (id: string): Promise<QuoteAcceptResponse> => {
    const result = await safeInvoke<QuoteAcceptResponse>(IPC_COMMANDS.QUOTE_MARK_ACCEPTED, {
      request: { id }
    }, validateQuoteAcceptResponse);
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  markRejected: async (id: string): Promise<Quote> => {
    const result = await safeInvoke<Quote>(IPC_COMMANDS.QUOTE_MARK_REJECTED, {
      request: { id }
    }, validateQuote);
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  markExpired: async (id: string): Promise<Quote> => {
    const result = await safeInvoke<Quote>(IPC_COMMANDS.QUOTE_MARK_EXPIRED, {
      request: { id }
    }, validateQuote);
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  markChangesRequested: async (id: string): Promise<Quote> => {
    const result = await safeInvoke<Quote>(IPC_COMMANDS.QUOTE_MARK_CHANGES_REQUESTED, {
      request: { id }
    }, validateQuote);
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  reopen: async (id: string): Promise<Quote> => {
    const result = await safeInvoke<Quote>(IPC_COMMANDS.QUOTE_REOPEN, {
      request: { id }
    }, validateQuote);
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  duplicate: async (id: string): Promise<Quote> => {
    const result = await safeInvoke<Quote>(IPC_COMMANDS.QUOTE_DUPLICATE, {
      request: { id }
    }, validateQuote);
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

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

  createAttachment: async (quoteId: string, data: JsonObject) => {
    const result = await safeInvoke(IPC_COMMANDS.QUOTE_ATTACHMENT_CREATE, {
      request: { quote_id: quoteId, data }
    });
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  updateAttachment: async (quoteId: string, attachmentId: string, data: JsonObject) => {
    const result = await safeInvoke(IPC_COMMANDS.QUOTE_ATTACHMENT_UPDATE, {
      request: { quote_id: quoteId, attachment_id: attachmentId, data }
    });
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  deleteAttachment: async (quoteId: string, attachmentId: string) => {
    const result = await safeInvoke(IPC_COMMANDS.QUOTE_ATTACHMENT_DELETE, {
      request: { quote_id: quoteId, attachment_id: attachmentId }
    });
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

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
