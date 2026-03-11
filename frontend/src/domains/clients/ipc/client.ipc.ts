import { safeInvoke, extractAndValidate, cachedInvoke, invalidatePattern } from '@/lib/ipc/core';
import { signalMutation } from '@/lib/data-freshness';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import { validateClient, validateClientListResponse } from '@/lib/validation/backend-type-guards';
import { requireSessionToken } from '@/shared/contracts/session';
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
  create: async (data: CreateClientRequest): Promise<Client> => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: { action: 'Create', data },
        session_token: sessionToken
      }
    });
    invalidatePattern('client:');
    signalMutation('clients');
    // safeInvoke already unwrapped ApiResponse; result = { type: "Created", data: client }
    const tagged = result as Record<string, unknown>;
    return (tagged?.data ?? result) as Client;
  },

  get: async (id: string): Promise<Client | null> => {
    const sessionToken = await requireSessionToken();
    return cachedInvoke(`client:${id}`, IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: { action: 'Get', id },
        session_token: sessionToken
      }
    }, (data: JsonValue) => extractAndValidate(data, validateClient, { handleNotFound: true }) as Client | null);
  },

  getWithTasks: async (id: string): Promise<Client | null> => {
    const sessionToken = await requireSessionToken();
    return cachedInvoke(`client-with-tasks:${id}`, IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: { action: 'GetWithTasks', id },
        session_token: sessionToken
      }
    }, (data: JsonValue) => extractAndValidate(data, validateClient, { handleNotFound: true }) as Client | null);
  },

  search: async (query: string, limit: number): Promise<Client[]> => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: { action: 'Search', query, limit },
        session_token: sessionToken
      }
    });
    const payload = extractAndValidate(result) as JsonValue;
    const clients = unwrapTaggedArray<Client>(payload, 'SearchResults', 'client search');
    return clients.map((client) => validateClient(client));
  },

  list: async (filters: Partial<ClientQuery>): Promise<ClientListResponse> => {
    const sessionToken = await requireSessionToken();
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
    // safeInvoke already unwrapped ApiResponse; result = { type: "List", data: ClientListResponse }
    const tagged = result as Record<string, unknown>;
    const listData = (tagged?.type === 'List' ? tagged?.data : result) as unknown;
    if (!validateClientListResponse(listData)) {
      throw new Error('Invalid client list response payload');
    }
    return listData as ClientListResponse;
  },

  listWithTasks: async (filters: Partial<ClientQuery>, limitTasks: number): Promise<ClientWithTasks[]> => {
    const sessionToken = await requireSessionToken();
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
    const payload = extractAndValidate(result) as JsonValue;
    return unwrapTaggedArray<ClientWithTasks>(payload, 'ListWithTasks', 'client list with tasks');
  },

  stats: async (): Promise<ClientStatistics> => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: { action: 'Stats' },
        session_token: sessionToken
      }
    });
    return extractAndValidate(result) as ClientStatistics;
  },

  update: async (id: string, data: UpdateClientRequest): Promise<Client> => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: { action: 'Update', id, data },
        session_token: sessionToken
      }
    });
    invalidatePattern('client:');
    signalMutation('clients');
    return extractAndValidate(result, validateClient) as Client;
  },

  delete: async (id: string): Promise<void> => {
    const sessionToken = await requireSessionToken();
    await safeInvoke<void>(IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: { action: 'Delete', id },
        session_token: sessionToken
      }
    });
    invalidatePattern('client:');
    signalMutation('clients');
  },
};

type TaggedPayload = {
  type: string;
  data?: JsonValue;
};

function isTaggedPayload(value: JsonValue): value is TaggedPayload {
  return typeof value === 'object' && value !== null && 'type' in value && typeof (value as { type?: unknown }).type === 'string';
}

function unwrapTaggedObject(value: JsonValue, expectedType: string, context: string): JsonValue {
  // Some IPC paths already return the inner payload (no { type, data } envelope).
  // Callers validate the returned object shape separately.
  if (!isTaggedPayload(value)) {
    return value;
  }
  if (value.type !== expectedType) {
    throw new Error(`Invalid ${context} response type: expected ${expectedType}, received ${value.type}`);
  }
  if (!('data' in value)) {
    throw new Error(`Invalid ${context} response: missing data`);
  }
  return value.data as JsonValue;
}

function unwrapTaggedArray<T>(value: JsonValue, expectedType: string, context: string): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  const data = unwrapTaggedObject(value, expectedType, context);
  if (!Array.isArray(data)) {
    throw new Error(`Invalid ${context} response: expected array payload`);
  }
  return data as T[];
}
