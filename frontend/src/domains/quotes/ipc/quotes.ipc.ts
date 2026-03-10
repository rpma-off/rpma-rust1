import { safeInvoke, invalidatePattern } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import { signalMutation } from '@/lib/data-freshness';
import { requireSessionToken } from '@/shared/contracts/session';
import type { JsonObject } from '@/types/json';

export const quotesIpc = {
  create: async (data: JsonObject) => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke('quote_create', {
      request: { session_token: sessionToken, data }
    });
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  get: async (id: string) => {
    const sessionToken = await requireSessionToken();
    return safeInvoke('quote_get', {
      request: { session_token: sessionToken, id }
    });
  },

  list: async (filters: JsonObject) => {
    const sessionToken = await requireSessionToken();
    return safeInvoke('quote_list', {
      request: { session_token: sessionToken, filters }
    });
  },

  update: async (id: string, data: JsonObject) => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke('quote_update', {
      request: { session_token: sessionToken, id, data }
    });
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  delete: async (id: string) => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke('quote_delete', {
      request: { session_token: sessionToken, id }
    });
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  addItem: async (quoteId: string, item: JsonObject) => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke('quote_item_add', {
      request: { session_token: sessionToken, quote_id: quoteId, item }
    });
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  updateItem: async (quoteId: string, itemId: string, data: JsonObject) => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke('quote_item_update', {
      request: { session_token: sessionToken, quote_id: quoteId, item_id: itemId, data }
    });
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  deleteItem: async (quoteId: string, itemId: string) => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke('quote_item_delete', {
      request: { session_token: sessionToken, quote_id: quoteId, item_id: itemId }
    });
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  markSent: async (id: string) => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke('quote_mark_sent', {
      request: { session_token: sessionToken, id }
    });
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  markAccepted: async (id: string) => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke('quote_mark_accepted', {
      request: { session_token: sessionToken, id }
    });
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  markRejected: async (id: string) => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke('quote_mark_rejected', {
      request: { session_token: sessionToken, id }
    });
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  markExpired: async (id: string) => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke(IPC_COMMANDS.QUOTE_MARK_EXPIRED, {
      request: { session_token: sessionToken, id }
    });
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  markChangesRequested: async (id: string) => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke(IPC_COMMANDS.QUOTE_MARK_CHANGES_REQUESTED, {
      request: { session_token: sessionToken, id }
    });
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  reopen: async (id: string) => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke(IPC_COMMANDS.QUOTE_REOPEN, {
      request: { session_token: sessionToken, id }
    });
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  duplicate: async (id: string) => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke(IPC_COMMANDS.QUOTE_DUPLICATE, {
      request: { session_token: sessionToken, id }
    });
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  exportPdf: async (id: string) => {
    const sessionToken = await requireSessionToken();
    return safeInvoke('quote_export_pdf', {
      request: { session_token: sessionToken, id }
    });
  },

  getAttachments: async (quoteId: string) => {
    const sessionToken = await requireSessionToken();
    return safeInvoke('quote_attachments_get', {
      request: { session_token: sessionToken, quote_id: quoteId }
    });
  },

  openAttachment: async (attachmentId: string) => {
    const sessionToken = await requireSessionToken();
    return safeInvoke(IPC_COMMANDS.QUOTE_ATTACHMENT_OPEN, {
      request: { session_token: sessionToken, attachment_id: attachmentId }
    });
  },

  createAttachment: async (quoteId: string, data: JsonObject) => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke('quote_attachment_create', {
      request: { session_token: sessionToken, quote_id: quoteId, data }
    });
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  updateAttachment: async (quoteId: string, attachmentId: string, data: JsonObject) => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke('quote_attachment_update', {
      request: { session_token: sessionToken, quote_id: quoteId, attachment_id: attachmentId, data }
    });
    invalidatePattern('quote:');
    signalMutation('quotes');
    return result;
  },

  deleteAttachment: async (quoteId: string, attachmentId: string) => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke('quote_attachment_delete', {
      request: { session_token: sessionToken, quote_id: quoteId, attachment_id: attachmentId }
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
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke(IPC_COMMANDS.QUOTE_CONVERT_TO_TASK, {
      request: {
        session_token: sessionToken,
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
