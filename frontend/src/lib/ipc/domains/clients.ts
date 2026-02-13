import { safeInvoke, extractAndValidate, ResponseHandlers } from '../core';
import { createCrudOperations } from '../utils/crud-helpers';
import { IPC_COMMANDS } from '../commands';
import { parseClientStatistics, validateClient, validateClientWithTasks, validateClientListResponse, validateClientWithTasksList } from '@/lib/validation/backend-type-guards';
import type { JsonValue } from '@/types/json';
import type {
  Client,
  CreateClientRequest,
  UpdateClientRequest,
  ClientListResponse,
  ClientStatistics,
  ClientWithTasks,
  ClientQuery
} from '../types/index';

/**
 * Client management operations including CRUD and specialized client operations
 */

// Create the base CRUD operations using the generic helper
const clientCrud = createCrudOperations<
  Client,
  CreateClientRequest,
  UpdateClientRequest,
  Partial<ClientQuery>,
  ClientListResponse
>(
  IPC_COMMANDS.CLIENT_CRUD,
  validateClient,
  'client'
);

// Specialized client operations
const specializedOperations = {
  /**
   * Gets a client with associated tasks
   * @param id - Client ID
   * @param sessionToken - User's session token
   * @returns Promise resolving to the client with tasks or null if not found
   */
  getWithTasks: (id: string, sessionToken: string): Promise<ClientWithTasks | null> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: { action: 'GetWithTasks', id },
        session_token: sessionToken
      }
    }).then(result =>
      extractAndValidate(result, validateClientWithTasks, {
        handleNotFound: true,
        expectedTypes: ['FoundWithTasks', 'NotFound']
      }) as ClientWithTasks | null
    ),

  /**
   * Searches clients by query string
   * @param query - Search query
   * @param limit - Maximum number of results
   * @param sessionToken - User's session token
   * @returns Promise resolving to array of matching clients
   */
  search: (query: string, limit: number, sessionToken: string): Promise<Client[]> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: { action: 'Search', query, limit },
        session_token: sessionToken
      }
    }).then(result => {
      const clients = extractAndValidate(result, (data) => {
        // Search returns an array of clients
        if (Array.isArray(data)) {
          return data.map(validateClient);
        }
        return [];
      });
      return Array.isArray(clients) ? clients : [];
    }),

   /**
    * Lists clients with associated tasks
    * @param filters - Query filters
    * @param limitTasks - Maximum number of tasks per client
    * @param sessionToken - User's session token
    * @returns Promise resolving to array of clients with tasks
    */
    listWithTasks: async (
      filters: Partial<ClientQuery>,
      limitTasks: number,
      sessionToken: string
    ): Promise<ClientWithTasks[]> => {
     // TEMPORARY: Use the regular list function and convert to ClientWithTasks
     // This bypasses the complex task fetching that seems to be failing
     console.log('[DEBUG] Using simplified listWithTasks implementation');
     const listResult = await clientCrud.list({
       page: filters.page ?? 1,
       limit: filters.limit ?? 20,
       search: filters.search || undefined,
       customer_type: filters.customer_type || undefined,
       sort_by: filters.sort_by ?? 'created_at',
       sort_order: filters.sort_order ?? 'desc'
      }, sessionToken);

      if (!validateClientListResponse(listResult)) {
        throw new Error('Invalid response format for list clients with tasks');
      }

      // Convert Client[] to ClientWithTasks[]
      const clientsWithTasks: ClientWithTasks[] = listResult.data.map((client) => ({
        ...client,
        tasks: [] // No tasks for now
      }));

      return clientsWithTasks;
   },

  /**
   * Retrieves client statistics
   * @param sessionToken - User's session token
   * @returns Promise resolving to client statistics
   */
  stats: (sessionToken: string): Promise<ClientStatistics> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.CLIENT_CRUD, {
      request: {
        action: { action: 'Stats' },
        session_token: sessionToken
      }
    }).then(result => {
      const statistics = extractAndValidate(result, parseClientStatistics);
      if (!statistics) {
        throw new Error('Invalid response format for client statistics');
      }
      return statistics;
    }),
};

/**
 * Combined client operations - CRUD + specialized operations
 */
export const clientOperations = {
  ...clientCrud,
  ...specializedOperations,
};
