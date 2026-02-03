import type { Client, ClientWithTasks } from '@/lib/backend';
import type { CreateClientDTO, UpdateClientDTO, ClientListResponse, ClientStats } from '@/types/client.types';
import type { ServiceResponse, ApiResponse } from '@/types/unified.types';
import { ApiError } from '@/types/unified.types';
import { ipcClient } from '@/lib/ipc';
import type { ClientQuery, PaginationInfo } from '@/lib/backend';

// Export types
export type { ClientWithTasks, ClientStats };
export type ClientWithStats = Client;

// Client service class
export class ClientService {
  static async getClientWithTasks(id: string, sessionToken?: string): Promise<ApiResponse<ClientWithTasks>> {
    if (!sessionToken) {
      return { success: false, error: new ApiError('Session token required', 401, 'CLIENT_FETCH_FAILED'), data: undefined };
    }

    try {
      const client = await ipcClient.clients.getWithTasks(id, sessionToken);
      return { success: true, data: client as ClientWithTasks };
    } catch (error) {
      return {
        success: false,
        error: new ApiError(error instanceof Error ? error.message : 'Failed to fetch client', 500, 'CLIENT_FETCH_FAILED'),
        data: undefined
      };
    }
  }

  static async createClient(data: CreateClientDTO, sessionToken?: string): Promise<ServiceResponse<Client>> {
    if (!sessionToken) {
      return { success: false, error: 'Session token required', status: 401 };
    }

    try {
      const client = await ipcClient.clients.create(data, sessionToken);
      return { success: true, data: client, status: 200 };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err.message, status: 500 };
    }
  }

  static async updateClient(id: string, body: unknown, sessionToken?: string): Promise<ServiceResponse<Client>> {
    if (!sessionToken) {
      return { success: false, error: 'Session token required', status: 401 };
    }

    try {
      const client = await ipcClient.clients.update(id, body as any, sessionToken);
      return { success: true, data: client, status: 200 };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err.message, status: 500 };
    }
  }

  static async deleteClient(id: string, sessionToken?: string): Promise<ServiceResponse<void>> {
    if (!sessionToken) {
      return { success: false, error: 'Session token required', status: 401 };
    }

    try {
      await ipcClient.clients.delete(id, sessionToken);
      return { success: true, data: undefined, status: 200 };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err.message, status: 500 };
    }
  }

  static async getClientById(id: string, sessionToken?: string): Promise<ApiResponse<Client>> {
    if (!sessionToken) {
      return { success: false, error: new ApiError('Session token required', 401, 'CLIENT_FETCH_FAILED'), data: undefined };
    }

    try {
      const client = await ipcClient.clients.get(id, sessionToken);
      return { success: true, data: client ?? undefined };
    } catch (error) {
      return { success: false, error: new ApiError(error instanceof Error ? error.message : 'Failed to fetch client', 500, 'CLIENT_FETCH_FAILED'), data: undefined };
    }
  }

    static async getClients(sessionToken?: string, query?: { page?: number; limit?: number; search?: string; sort_by?: string; sort_order?: string; customer_type?: string; has_tasks?: boolean; created_after?: string; created_before?: string }): Promise<ApiResponse<ClientListResponse>> {
      if (!sessionToken) {
          return { success: false, error: new ApiError('Session token required', 401, 'CLIENTS_FETCH_FAILED'), data: undefined };
      }

        try {
          // Convert string types to proper enum types
          const clientQuery: Partial<ClientQuery> = {
            ...query,
            customer_type: query?.customer_type as 'individual' | 'business' | null | undefined,
            sort_order: query?.sort_order as 'asc' | 'desc' | undefined
          };
           const clientListResponse = await ipcClient.clients.list(clientQuery, sessionToken);

           return { success: true, data: clientListResponse };
      } catch (error) {
        return { success: false, error: new ApiError(error instanceof Error ? error.message : 'Failed to fetch clients', 500, 'CLIENTS_FETCH_FAILED'), data: undefined };
      }
     }

      static async getClientsWithTasks(sessionToken?: string, query?: { page?: number; limit?: number; search?: string; sort_by?: string; sort_order?: string; customer_type?: string; has_tasks?: boolean; created_after?: string; created_before?: string }, limitTasks?: number): Promise<ApiResponse<{ data: ClientWithTasks[], pagination: PaginationInfo }>> {
        if (!sessionToken) {
        return { success: false, error: new ApiError('Session token required', 401, 'CLIENTS_FETCH_FAILED'), data: undefined };
        }

        try {
          const clientQuery: Partial<ClientQuery> = {
            ...query,
            customer_type: query?.customer_type as 'individual' | 'business' | null | undefined,
            sort_order: query?.sort_order as 'asc' | 'desc' | undefined
          };
          try {
            const clients = await ipcClient.clients.listWithTasks(clientQuery, limitTasks || 5, sessionToken);
            // Wrap in ListResponse structure as expected by ApiResponse<T[]> conditional type
            const page = query?.page || 1;
            const limit = query?.limit || 20;
            const total = clients.length;
            const totalPages = Math.ceil(total / limit);
            const listResponse = {
              data: clients,
              pagination: {
                page,
                limit,
                total: BigInt(total),
                total_pages: totalPages
              }
            };
            return { success: true, data: listResponse };
          } catch (error) {
            // Fallback: use basic client list without tasks if ListWithTasks fails
            const listResponse = await ipcClient.clients.list(clientQuery, sessionToken);
            const clientsWithTasks: ClientWithTasks[] = listResponse.data.map((client: Client) => ({
              ...client,
              tasks: []
            }));

            return {
              success: true,
              data: {
                data: clientsWithTasks,
                pagination: listResponse.pagination
              }
            };
          }
        } catch (error) {
          return { success: false, error: new ApiError(error instanceof Error ? error.message : 'Failed to fetch clients with tasks', 500, 'CLIENTS_FETCH_FAILED'), data: undefined };
        }
      }

  static async searchClients(search: string, sessionToken?: string): Promise<ApiResponse<Client[]>> {
    if (!sessionToken) {
      return { success: false, error: new ApiError('Session token required', 401, 'CLIENTS_SEARCH_FAILED'), data: undefined };
    }

    try {
      const clients = await ipcClient.clients.search(search || '', 10, sessionToken);
      return {
        success: true,
        data: clients
      };
    } catch (error) {
      return { success: false, error: new ApiError(error instanceof Error ? error.message : 'Failed to search clients', 500, 'CLIENTS_SEARCH_FAILED'), data: undefined };
    }
   }

  static async getClientStats(sessionToken?: string): Promise<ApiResponse<ClientStats>> {
     if (!sessionToken) {
       return { success: false, error: new ApiError('Session token required', 401, 'CLIENT_STATS_FETCH_FAILED'), data: undefined };
     }

      try {
        const response = await ipcClient.clients.stats(sessionToken);

        if (response && (response as any).type === 'Statistics') {
          return { success: true, data: (response as any).data as ClientStats };
        }

         return { success: false, error: new ApiError('Failed to fetch client stats', 500, 'CLIENT_STATS_FETCH_FAILED'), data: undefined };
     } catch (error) {
       return { success: false, error: new ApiError(error instanceof Error ? error.message : 'Failed to fetch client stats', 500, 'CLIENT_STATS_FETCH_FAILED'), data: undefined };
     }
    }
}

// Export singleton instance
export const clientService = ClientService;
