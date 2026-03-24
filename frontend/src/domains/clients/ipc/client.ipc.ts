import {
  safeInvoke,
  extractAndValidate,
  cachedInvoke,
  invalidatePattern,
} from "@/lib/ipc/core";
import { signalMutation } from "@/lib/data-freshness";
import { IPC_COMMANDS } from "@/lib/ipc/commands";
import {
  validateClient,
  validateClientListResponse,
} from "@/lib/validation/backend-type-guards";
import type {
  CreateClientRequest,
  UpdateClientRequest,
} from "@/lib/validation/ipc-schemas";
import type {
  Client,
  ClientListResponse,
  ClientStatistics,
  ClientWithTasks,
  ClientQuery,
} from "@/lib/backend";
import type { JsonValue } from "@/types/json";

type ClientListFilters = Partial<ClientQuery> & {
  page?: number | null;
  limit?: number | null;
  sort_by?: string | null;
  sort_order?: "asc" | "desc" | null;
};

const buildClientQuery = (filters: ClientListFilters): ClientQuery => ({
  pagination: {
    page: filters.page ?? 1,
    page_size: filters.limit ?? 20,
    sort_by: filters.sort_by ?? "created_at",
    sort_order: filters.sort_order ?? "desc",
  },
  search: filters.search ?? null,
  customer_type: filters.customer_type ?? null,
});

export const clientIpc = {
  create: async (data: CreateClientRequest): Promise<Client> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_CREATE, {
      data,
    });
    invalidatePattern("client:");
    signalMutation("clients");
    return extractAndValidate(result, validateClient) as Client;
  },

  get: async (id: string): Promise<Client | null> => {
    return cachedInvoke(
      `client:${id}`,
      IPC_COMMANDS.CLIENT_GET,
      {
        id,
      },
      (data: JsonValue) =>
        extractAndValidate(data, validateClient, {
          handleNotFound: true,
        }) as Client | null,
    );
  },

  getWithTasks: async (id: string): Promise<Client | null> => {
    return cachedInvoke(
      `client-with-tasks:${id}`,
      IPC_COMMANDS.CLIENT_GET_WITH_TASKS,
      {
        id,
      },
      (data: JsonValue) =>
        extractAndValidate(data, validateClient, {
          handleNotFound: true,
        }) as Client | null,
    );
  },

  search: async (query: string, limit: number): Promise<Client[]> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_SEARCH, {
      query,
      limit,
    });
    const payload = extractAndValidate(result) as JsonValue;
    if (Array.isArray(payload)) {
      return (payload as Client[]).map((client) => validateClient(client));
    }
    throw new Error("Invalid client search response: expected array payload");
  },

  list: async (filters: ClientListFilters): Promise<ClientListResponse> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_LIST, {
      filters: buildClientQuery(filters),
    });
    const data = result as unknown as ClientListResponse;
    if (!validateClientListResponse(data)) {
      throw new Error("Invalid client list response payload");
    }
    return data;
  },

  listWithTasks: async (
    filters: ClientListFilters,
    limitTasks: number,
  ): Promise<ClientWithTasks[]> => {
    const result = await safeInvoke<JsonValue>(
      IPC_COMMANDS.CLIENT_LIST_WITH_TASKS,
      {
        filters: buildClientQuery(filters),
        limit_tasks: limitTasks,
      },
    );
    const payload = extractAndValidate(result) as JsonValue;
    if (Array.isArray(payload)) {
      return payload as ClientWithTasks[];
    }
    throw new Error(
      "Invalid client list with tasks response: expected array payload",
    );
  },

  stats: async (): Promise<ClientStatistics> => {
    const result = await safeInvoke<JsonValue>(
      IPC_COMMANDS.CLIENT_GET_STATS,
      {},
    );
    return extractAndValidate(result) as ClientStatistics;
  },

  update: async (id: string, data: UpdateClientRequest): Promise<Client> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_UPDATE, {
      id,
      data,
    });
    invalidatePattern("client:");
    signalMutation("clients");
    return extractAndValidate(result, validateClient) as Client;
  },

  delete: async (id: string): Promise<void> => {
    await safeInvoke<void>(IPC_COMMANDS.CLIENT_DELETE, {
      id,
    });
    invalidatePattern("client:");
    signalMutation("clients");
  },
};
