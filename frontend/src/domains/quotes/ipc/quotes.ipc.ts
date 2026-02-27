import { safeInvoke } from '@/lib/ipc/core';
import type { JsonObject } from '@/types/json';

export const quotesIpc = {
  create: async (data: JsonObject, sessionToken: string) => {
    const result = await safeInvoke('quote_create', {
      request: { session_token: sessionToken, data }
    });
    return result;
  },

  get: (id: string, sessionToken: string) =>
    safeInvoke('quote_get', {
      request: { session_token: sessionToken, id }
    }),

  list: (filters: JsonObject, sessionToken: string) =>
    safeInvoke('quote_list', {
      request: { session_token: sessionToken, filters }
    }),

  update: async (id: string, data: JsonObject, sessionToken: string) => {
    const result = await safeInvoke('quote_update', {
      request: { session_token: sessionToken, id, data }
    });
    return result;
  },

  delete: async (id: string, sessionToken: string) => {
    const result = await safeInvoke('quote_delete', {
      request: { session_token: sessionToken, id }
    });
    return result;
  },

  addItem: async (quoteId: string, item: JsonObject, sessionToken: string) => {
    const result = await safeInvoke('quote_item_add', {
      request: { session_token: sessionToken, quote_id: quoteId, item }
    });
    return result;
  },

  updateItem: async (quoteId: string, itemId: string, data: JsonObject, sessionToken: string) => {
    const result = await safeInvoke('quote_item_update', {
      request: { session_token: sessionToken, quote_id: quoteId, item_id: itemId, data }
    });
    return result;
  },

  deleteItem: async (quoteId: string, itemId: string, sessionToken: string) => {
    const result = await safeInvoke('quote_item_delete', {
      request: { session_token: sessionToken, quote_id: quoteId, item_id: itemId }
    });
    return result;
  },

  markSent: (id: string, sessionToken: string) =>
    safeInvoke('quote_mark_sent', {
      request: { session_token: sessionToken, id }
    }),

  markAccepted: (id: string, sessionToken: string) =>
    safeInvoke('quote_mark_accepted', {
      request: { session_token: sessionToken, id }
    }),

  markRejected: (id: string, sessionToken: string) =>
    safeInvoke('quote_mark_rejected', {
      request: { session_token: sessionToken, id }
    }),

  exportPdf: (id: string, sessionToken: string) =>
    safeInvoke('quote_export_pdf', {
      request: { session_token: sessionToken, id }
    }),
};
