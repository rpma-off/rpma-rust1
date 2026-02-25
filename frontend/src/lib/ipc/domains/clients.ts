import { safeInvoke } from '../utils';
import { cachedInvoke, invalidatePattern } from '../cache';
import { extractAndValidate } from '../core';
import { ResponseHandlers } from '../utils/crud-helpers';
import { IPC_COMMANDS } from '../commands';
import {
  validateClient,
  validateClientWithTasks,
  validateClientListResponse,
  parseClientStatistics,
} from '@/lib/validation/backend-type-guards';
import type { JsonValue } from '@/types/json';

/**
 * Client CRUD and query operations using safeInvoke for IPC discipline
 */
export const clientOperations = {
  create: async (data: Record<string, unknown>, sessionToken: string) => {
    const validator = ResponseHandlers.discriminatedUnion('Created', validateClient);
    const rawResult = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: { action: 'Create', data: data as JsonValue },
        session_token: sessionToken,
      },
    }, validator);
    invalidatePattern('client:');
    return validator(rawResult);
  },

  get: async (id: string, sessionToken: string) => {
    const rawResult = await cachedInvoke(`client:${id}`, IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: { action: 'Get', id },
        session_token: sessionToken,
      },
    }, (r: JsonValue) => extractAndValidate(r, validateClient, { handleNotFound: true }));
    if (rawResult && typeof rawResult === 'object' && (rawResult as { type?: string }).type === 'NotFound') {
      return null;
    }
    return rawResult;
  },

  update: async (id: string, data: Record<string, unknown>, sessionToken: string) => {
    const validator = ResponseHandlers.discriminatedUnion('Updated', validateClient);
    const rawResult = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: { action: 'Update', id, data: data as JsonValue },
        session_token: sessionToken,
      },
    }, validator);
    invalidatePattern('client:');
    return validator(rawResult);
  },

  delete: async (id: string, sessionToken: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: { action: 'Delete', id },
        session_token: sessionToken,
      },
    });
    invalidatePattern('client:');
    return result;
  },

  list: async (filters: Record<string, unknown>, sessionToken: string) => {
    const validator = ResponseHandlers.list((r: JsonValue) => validateClientListResponse(r));
    const rawResult = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: { action: 'List', filters: filters as JsonValue },
        session_token: sessionToken,
      },
    }, validator);
    return validator(rawResult);
  },

  getWithTasks: async (id: string, sessionToken: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: { action: 'GetWithTasks', id },
        session_token: sessionToken,
      },
    });
    return extractAndValidate(result, validateClientWithTasks, {
      handleNotFound: true,
      expectedTypes: ['FoundWithTasks', 'NotFound'],
    });
  },

  search: async (query: string, limit: number, sessionToken: string) => {
    const rawResult = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: { action: 'Search', query, limit },
        session_token: sessionToken,
      },
    });
    if (Array.isArray(rawResult)) {
      return rawResult.map(item => validateClient(item));
    }
    return rawResult;
  },

  listWithTasks: async (
    filters: Record<string, unknown>,
    limitTasks: number,
    sessionToken: string,
  ) => {
    if (limitTasks === 0) {
      const validator = ResponseHandlers.list((r: JsonValue) => validateClientListResponse(r));
      const rawResult = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_CRUD, {
        request: {
          action: { action: 'List', filters: filters as JsonValue },
          session_token: sessionToken,
        },
      }, validator);
      return validator(rawResult);
    }
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: {
          action: 'ListWithTasks',
          filters: {
            page: (filters.page as number) ?? 1,
            limit: (filters.limit as number) ?? 20,
            search: (filters.search as string) ?? null,
            customer_type: (filters.customer_type as string) ?? null,
            sort_by: 'name',
            sort_order: 'asc',
          },
          limit_tasks: limitTasks,
        },
        session_token: sessionToken,
      },
    });
    if (result && typeof result === 'object' && 'data' in result && Array.isArray((result as Record<string, unknown>).data)) {
      return ((result as Record<string, unknown>).data as Record<string, unknown>[]).map(client => ({ ...client, tasks: [] as unknown[] }));
    }
    return [];
  },

  stats: async (sessionToken: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: { action: 'Stats' },
        session_token: sessionToken,
      },
    });
    return extractAndValidate(result, parseClientStatistics);
  },
};

export { clientIpc } from '@/domains/clients/ipc';
