import { safeInvoke, cachedInvoke, invalidatePattern, ResponseHandlers } from '../core';
import type { JsonObject, JsonValue } from '@/types/json';

export { ResponseHandlers } from '../core';

/**
 * Generic CRUD operation helpers to eliminate code duplication across domains
 */
export function createCrudOperations<
  T,
  CreateData,
  UpdateData,
  ListFilters = JsonObject,
  ListResponse = T[]
>(
  commandBase: string,
  validator: (data: JsonValue) => T,
  cachePrefix: string
) {
  return {
    /**
     * Create a new entity
     */
    create: async (data: CreateData, sessionToken: string): Promise<T> => {
      const result = await safeInvoke<T>(commandBase, {
        request: {
          action: { action: 'Create', data },
          session_token: sessionToken
        }
      } as unknown as JsonObject, ResponseHandlers.discriminatedUnion('Created', validator));
      invalidatePattern(`${cachePrefix}:`);
      return result;
    },

    /**
     * Get an entity by ID
     */
    get: (id: string, sessionToken: string): Promise<T | null> =>
      cachedInvoke(`${cachePrefix}:${id}`, commandBase, {
        request: {
          action: { action: 'Get', id },
          session_token: sessionToken
        }
      }, ResponseHandlers.discriminatedUnionNullable('Found', validator)) as Promise<T | null>,

    /**
     * Update an existing entity
     */
    update: async (id: string, data: UpdateData, sessionToken: string): Promise<T> => {
      const result = await safeInvoke<T>(commandBase, {
        request: {
          action: { action: 'Update', id, data },
          session_token: sessionToken
        }
      } as unknown as JsonObject, ResponseHandlers.discriminatedUnion('Updated', validator));
      invalidatePattern(`${cachePrefix}:`);
      return result;
    },

    /**
     * Delete an entity by ID
     */
    delete: async (id: string, sessionToken: string): Promise<void> => {
      await safeInvoke<void>(commandBase, {
        request: {
          action: { action: 'Delete', id },
          session_token: sessionToken
        }
      });
      invalidatePattern(`${cachePrefix}:`);
    },

    /**
     * List entities with filters
     */
    list: (filters: Partial<ListFilters>, sessionToken: string): Promise<ListResponse> =>
      safeInvoke<ListResponse>(commandBase, {
        request: {
          action: { action: 'List', filters },
          session_token: sessionToken
        }
      } as unknown as JsonObject, ResponseHandlers.list((data: JsonValue) => data as ListResponse)),

    /**
     * Get statistics for the entity type
     */
    statistics: (sessionToken: string): Promise<JsonValue> =>
      safeInvoke(commandBase, {
        request: {
          action: { action: 'GetStatistics' },
          session_token: sessionToken
        }
      }, ResponseHandlers.statistics()),
  };
}

/**
 * Helper for cache management in CRUD operations
 */
export const CacheHelpers = {
  /**
   * Invalidate cache for a specific domain
   */
  invalidateDomain: (domain: string) => invalidatePattern(`${domain}:`),

  /**
   * Invalidate cache for a specific entity
   */
  invalidateEntity: (domain: string, id: string) => invalidatePattern(`${domain}:${id}`),
};
