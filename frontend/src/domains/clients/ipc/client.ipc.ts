import { safeInvoke, extractAndValidate, cachedInvoke, invalidatePattern } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import { validateClient, validateClientListResponse } from '@/lib/validation/backend-type-guards';
import type { JsonValue } from '@/types/json';
import type {
  Client,
  CreateClientRequest,
  UpdateClientRequest,
  ClientListResponse,
  ClientStatistics,
  ClientWithTasks,
  ClientQuery
} from '@/lib/backend';

export const clientIpc = {
  create: async (data: CreateClientRequest, sessionToken: string): Promise<Client> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: { action: 'Create', data },
        session_token: sessionToken
      }
    });
    invalidatePattern('client:');
    return extractAndValidate(result, validateClient) as Client;
  },

  get: (id: string, sessionToken: string): Promise<Client | null> =>
    cachedInvoke(`client:${id}`, IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: { action: 'Get', id },
        session_token: sessionToken
      }
    }, (data: JsonValue) => extractAndValidate(data, validateClient, { handleNotFound: true }) as Client | null),

  getWithTasks: (id: string, sessionToken: string): Promise<Client | null> =>
    cachedInvoke(`client-with-tasks:${id}`, IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: { action: 'GetWithTasks', id },
        session_token: sessionToken
      }
    }, (data: JsonValue) => extractAndValidate(data, validateClient, { handleNotFound: true }) as Client | null),

  search: (query: string, limit: number, sessionToken: string): Promise<Client[]> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: { action: 'Search', query, limit },
        session_token: sessionToken
      }
    }).then(result => extractAndValidate(result) as Client[]),

  list: async (filters: Partial<ClientQuery>, sessionToken: string): Promise<ClientListResponse> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: {
          action: 'List',
          filters: {
            page: filters.page ?? 1,
            limit: filters.limit ?? 20,
            search: filters.search ?? null,
            customer_type: filters.customer_type ?? null,
            sort_by: filters.sort_by ?? 'created_at',
            sort_order: filters.sort_order ?? 'desc'
          }
        },
        session_token: sessionToken
      }
    });
    return extractAndValidate(result) as ClientListResponse;
  },

  listWithTasks: async (filters: Partial<ClientQuery>, limitTasks: number, sessionToken: string): Promise<ClientWithTasks[]> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: {
          action: 'ListWithTasks',
          filters: {
            page: filters.page ?? 1,
            limit: filters.limit ?? 20,
            search: filters.search ?? null,
            customer_type: filters.customer_type ?? null,
            sort_by: filters.sort_by ?? 'created_at',
            sort_order: filters.sort_order ?? 'desc'
          },
          limit_tasks: limitTasks
        },
        session_token: sessionToken
      }
    });
    return extractAndValidate(result) as ClientWithTasks[];
  },

  stats: (sessionToken: string): Promise<ClientStatistics> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: { action: 'Stats' },
        session_token: sessionToken
      }
    }).then(result => extractAndValidate(result) as ClientStatistics),

  update: async (id: string, data: UpdateClientRequest, sessionToken: string): Promise<Client> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: { action: 'Update', id, data },
        session_token: sessionToken
      }
    });
    invalidatePattern('client:');
    return extractAndValidate(result, validateClient) as Client;
  },

  delete: async (id: string, sessionToken: string): Promise<void> => {
    await safeInvoke<void>(IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: { action: 'Delete', id },
        session_token: sessionToken
      }
    });
    invalidatePattern('client:');
  },
};
