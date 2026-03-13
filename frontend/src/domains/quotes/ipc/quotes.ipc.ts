import { safeInvoke, invalidatePattern } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import { signalMutation } from '@/lib/data-freshness';
import { validateQuote, validateQuoteList, validateQuoteAcceptResponse } from '@/lib/validation/backend-type-guards';
import type { Quote, QuoteListResponse, QuoteAcceptResponse } from '@/types/quote.types';
import type { JsonObject, JsonValue } from '@/types/json';

export const quotesIpc = {
  create: async (data: JsonObject): Promise<Quote> => {
    const result = await safeInvoke<Quote>('quote_create', {
      request: { data }
    }, validateQuote);
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  get: async (id: string): Promise<Quote | null> => {
    const result = await safeInvoke<JsonValue>('quote_get', {
      request: { id }
    });
    if (result === null || result === undefined) return null;
    return validateQuote(result);
  },

  list: async (filters: JsonObject): Promise<QuoteListResponse> => {
    return safeInvoke<QuoteListResponse>('quote_list', {
      request: { filters }
    }, validateQuoteList);
  },

  update: async (id: string, data: JsonObject): Promise<Quote> => {
    const result = await safeInvoke<Quote>('quote_update', {
      request: { id, data }
    }, validateQuote);
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  delete: async (id: string): Promise<void> => {
    await safeInvoke<void>('quote_delete', {
      request: { id }
    });
    invalidatePattern('quote:');
    signalMutation('quotes');
  },

  addItem: async (quoteId: string, item: JsonObject): Promise<Quote> => {
    const result = await safeInvoke<Quote>('quote_item_add', {
      request: { quote_id: quoteId, item }
    }, validateQuote);
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  updateItem: async (quoteId: string, itemId: string, data: JsonObject): Promise<Quote> => {
    const result = await safeInvoke<Quote>('quote_item_update', {
      request: { quote_id: quoteId, item_id: itemId, data }
    }, validateQuote);
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  deleteItem: async (quoteId: string, itemId: string): Promise<Quote> => {
    const result = await safeInvoke<Quote>('quote_item_delete', {
      request: { quote_id: quoteId, item_id: itemId }
    }, validateQuote);
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  markSent: async (id: string): Promise<Quote> => {
    const result = await safeInvoke<Quote>('quote_mark_sent', {
      request: { id }
    }, validateQuote);
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  markAccepted: async (id: string): Promise<QuoteAcceptResponse> => {
    const result = await safeInvoke<QuoteAcceptResponse>('quote_mark_accepted', {
      request: { id }
    }, validateQuoteAcceptResponse);
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  markRejected: async (id: string): Promise<Quote> => {
    const result = await safeInvoke<Quote>('quote_mark_rejected', {
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
    return safeInvoke('quote_export_pdf', {
      request: { id }
    });
  },

  getAttachments: async (quoteId: string) => {
    return safeInvoke('quote_attachments_get', {
      request: { quote_id: quoteId }
    });
  },

  openAttachment: async (attachmentId: string) => {
    return safeInvoke(IPC_COMMANDS.QUOTE_ATTACHMENT_OPEN, {
      request: { attachment_id: attachmentId }
    });
  },

  createAttachment: async (quoteId: string, data: JsonObject) => {
    const result = await safeInvoke('quote_attachment_create', {
      request: { quote_id: quoteId, data }
    });
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  updateAttachment: async (quoteId: string, attachmentId: string, data: JsonObject) => {
    const result = await safeInvoke('quote_attachment_update', {
      request: { quote_id: quoteId, attachment_id: attachmentId, data }
    });
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  deleteAttachment: async (quoteId: string, attachmentId: string) => {
    const result = await safeInvoke('quote_attachment_delete', {
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
