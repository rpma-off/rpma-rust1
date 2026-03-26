import { signalMutation } from '@/lib/data-freshness';
import {
  validateClient,
  validateClientWithTasks,
  validateClientListResponse,
  parseClientStatistics,
} from '@/lib/validation/backend-type-guards';
import type { JsonValue } from '@/types/json';
import { safeInvoke } from '../utils';
import { cachedInvoke, invalidatePattern } from '../cache';
import { IPC_COMMANDS } from '../commands';

/**
 * Client CRUD and query operations using safeInvoke for IPC discipline
 */
export const clientOperations = {
  create: async (data: Record<string, unknown>) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_CREATE, { data: data as unknown as JsonValue });
    invalidatePattern('client:');
    signalMutation('clients');
    return validateClient(result);
  },

  get: async (id: string) => {
    return await cachedInvoke(`client:${id}`, IPC_COMMANDS.CLIENT_GET, { id }, (r: JsonValue) => {
        if (r === null) return null;
        return validateClient(r);
    });
  },

  update: async (id: string, data: Record<string, unknown>) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_UPDATE, { id, data: data as unknown as JsonValue });
    invalidatePattern('client:');
    signalMutation('clients');
    return validateClient(result);
  },

  delete: async (id: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_DELETE, { id });
    invalidatePattern('client:');
    signalMutation('clients');
    return result;
  },

  list: async (filters: Record<string, unknown>) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_LIST, { filters: filters as unknown as JsonValue });
    if (validateClientListResponse(result)) {
        return result;
    }
    throw new Error('Invalid client list response');
  },

  getWithTasks: async (id: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_GET_WITH_TASKS, { id });
    if (result === null) return null;
    if (validateClientWithTasks(result)) return result;
    throw new Error('Invalid client with tasks response');
  },

  search: async (query: string, limit: number) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_SEARCH, { query, limit });
    if (Array.isArray(result)) {
      return result.map(item => validateClient(item));
    }
    throw new Error('Invalid client search response');
  },

  listWithTasks: async (
    filters: Record<string, unknown>,
    limitTasks: number,
  ) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_LIST_WITH_TASKS, { 
        filters: {
            page: (filters.page as number) ?? 1,
            limit: (filters.limit as number) ?? 20,
            search: (filters.search as string) ?? null,
            customer_type: (filters.customer_type as string) ?? null,
            sort_by: 'name',
            sort_order: 'asc',
          } as unknown as JsonValue,
          limit_tasks: limitTasks 
    });
    if (Array.isArray(result)) {
        return result.filter(validateClientWithTasks);
    }
    return [];
  },

  stats: async () => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_GET_STATS, {});
    return parseClientStatistics(result);
  },
};

export { clientIpc } from '@/domains/clients';
